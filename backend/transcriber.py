import os
import numpy as np
from faster_whisper import WhisperModel

MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE", "int8")
LANGUAGE = os.getenv("WHISPER_LANG", "zh")

SAMPLE_RATE = 16000


class StreamTranscriber:
    def __init__(self):
        self.model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)

    def transcribe_pcm(self, pcm_bytes: bytes) -> str:
        if not pcm_bytes:
            return ""
        audio = np.frombuffer(pcm_bytes, np.int16).astype(np.float32) / 32768.0
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
            return text
        except Exception:
            return ""
