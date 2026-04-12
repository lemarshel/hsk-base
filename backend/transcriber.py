import os
import threading
import subprocess
import time
from collections import deque
from typing import Callable, Optional

import numpy as np
from faster_whisper import WhisperModel

MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE", "int8")
LANGUAGE = os.getenv("WHISPER_LANG", "zh")

CHUNK_SECONDS = float(os.getenv("WHISPER_CHUNK_SECONDS", "1.6"))
SAMPLE_RATE = 16000
BYTES_PER_SAMPLE = 2  # s16le
CHUNK_BYTES = int(SAMPLE_RATE * CHUNK_SECONDS * BYTES_PER_SAMPLE)


def _norm(text: str) -> str:
    return "".join(ch for ch in text.lower() if ch.isalnum())


class TranscriptionSession:
    def __init__(self, proc: subprocess.Popen, thread: threading.Thread, stop_evt: threading.Event):
        self.proc = proc
        self.thread = thread
        self.stop_evt = stop_evt

    def stop(self):
        self.stop_evt.set()
        if self.proc:
            try:
                self.proc.terminate()
            except Exception:
                pass
            try:
                self.proc.kill()
            except Exception:
                pass
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2)


class StreamTranscriber:
    def __init__(self):
        self.model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)

    def start(
        self,
        url: str,
        on_result: Callable[[str, bool], None],
        stop_evt: threading.Event,
    ) -> TranscriptionSession:
        proc = self._start_ffmpeg(url)
        thread = threading.Thread(
            target=self._run_loop,
            args=(proc, on_result, stop_evt),
            daemon=True,
        )
        thread.start()
        return TranscriptionSession(proc, thread, stop_evt)

    def _start_ffmpeg(self, url: str) -> subprocess.Popen:
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-reconnect",
            "1",
            "-reconnect_streamed",
            "1",
            "-reconnect_delay_max",
            "2",
            "-i",
            url,
            "-f",
            "s16le",
            "-ac",
            "1",
            "-ar",
            str(SAMPLE_RATE),
            "pipe:1",
        ]
        return subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            bufsize=0,
        )

    def _run_loop(self, proc: subprocess.Popen, on_result: Callable[[str, bool], None], stop_evt: threading.Event):
        last_norm = ""
        recent = deque(maxlen=8)
        while not stop_evt.is_set():
            try:
                chunk = proc.stdout.read(CHUNK_BYTES)
            except Exception:
                break
            if not chunk:
                time.sleep(0.1)
                continue
            audio = np.frombuffer(chunk, np.int16).astype(np.float32) / 32768.0
            try:
                segments, _ = self.model.transcribe(
                    audio,
                    language=LANGUAGE,
                    vad_filter=True,
                    vad_parameters={"min_silence_duration_ms": 500},
                    beam_size=5,
                    best_of=3,
                    condition_on_previous_text=False,
                )
                text = " ".join(seg.text.strip() for seg in segments if seg.text).strip()
            except Exception:
                text = ""
            if not text:
                continue
            norm = _norm(text)
            if not norm or norm == last_norm or norm in recent:
                continue
            last_norm = norm
            recent.append(norm)
            on_result(text, True)

        try:
            if proc and proc.poll() is None:
                proc.terminate()
        except Exception:
            pass
