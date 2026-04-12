import os
import json
import asyncio
import tempfile
import subprocess
from collections import deque
from typing import Optional

import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from faster_whisper import WhisperModel

APP = FastAPI()

MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE", "int8")
LANGUAGE = os.getenv("WHISPER_LANG", "zh")

TRANSLATE_ENABLED = os.getenv("TRANSLATE_ENABLED", "0") == "1"
TRANSLATE_URL = os.getenv("TRANSLATE_URL", "")
TRANSLATE_API_KEY = os.getenv("TRANSLATE_API_KEY", "")

model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)


def _norm(text: str) -> str:
    return "".join(ch for ch in text.lower() if ch.isalnum())


def _decode_webm_to_wav(input_bytes: bytes) -> Optional[str]:
    if not input_bytes:
        return None
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as fin:
        fin.write(input_bytes)
        fin.flush()
        in_path = fin.name
    out_fd, out_path = tempfile.mkstemp(suffix=".wav")
    os.close(out_fd)
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                in_path,
                "-ac",
                "1",
                "-ar",
                "16000",
                out_path,
            ],
            check=True,
        )
        return out_path
    except Exception:
        try:
            os.remove(out_path)
        except Exception:
            pass
        return None
    finally:
        try:
            os.remove(in_path)
        except Exception:
            pass


def _transcribe_bytes(input_bytes: bytes) -> str:
    wav_path = _decode_webm_to_wav(input_bytes)
    if not wav_path:
        return ""
    try:
        segments, _info = model.transcribe(
            wav_path,
            language=LANGUAGE,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
            beam_size=5,
            best_of=3,
            condition_on_previous_text=False,
        )
        text = " ".join([seg.text.strip() for seg in segments if seg.text]).strip()
        return text
    finally:
        try:
            os.remove(wav_path)
        except Exception:
            pass


def _translate_text(text: str) -> str:
    if not TRANSLATE_ENABLED or not TRANSLATE_URL:
        return ""
    try:
        payload = {"q": text, "source": "zh", "target": "en", "format": "text"}
        headers = {}
        if TRANSLATE_API_KEY:
            headers["Authorization"] = f"Bearer {TRANSLATE_API_KEY}"
        r = requests.post(TRANSLATE_URL, json=payload, headers=headers, timeout=10)
        r.raise_for_status()
        data = r.json()
        return data.get("translatedText", "") or data.get("translation", "")
    except Exception:
        return ""


@APP.websocket("/ws/transcribe")
async def ws_transcribe(ws: WebSocket):
    await ws.accept()
    translate = False
    recent = deque(maxlen=10)
    last_norm = ""
    try:
        while True:
            msg = await ws.receive()
            if "text" in msg and msg["text"]:
                try:
                    data = json.loads(msg["text"])
                except Exception:
                    data = {}
                if data.get("type") == "start":
                    translate = bool(data.get("translate"))
                    continue
                if data.get("type") == "config":
                    translate = bool(data.get("translate"))
                    continue
                if data.get("type") == "stop":
                    break
            if "bytes" in msg and msg["bytes"]:
                audio_bytes = msg["bytes"]
                text = await asyncio.to_thread(_transcribe_bytes, audio_bytes)
                if not text:
                    continue
                norm = _norm(text)
                if not norm or norm == last_norm or norm in recent:
                    continue
                last_norm = norm
                recent.append(norm)
                en = ""
                if translate:
                    en = await asyncio.to_thread(_translate_text, text)
                await ws.send_json({"type": "transcript", "zh": text, "en": en})
    except WebSocketDisconnect:
        return
    except Exception:
        try:
            await ws.close()
        except Exception:
            pass


@APP.get("/health")
def health():
    return {"ok": True}
