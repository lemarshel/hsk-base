import asyncio
import json
from collections import defaultdict, deque
from typing import Dict, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from transcriber import StreamTranscriber
from translator import translate_text

app = FastAPI()
transcriber = StreamTranscriber()

rooms: Dict[str, Set[WebSocket]] = defaultdict(set)
room_translate: Dict[str, bool] = {}

CHUNK_SAMPLES = 16000  # 1 second of 16kHz mono PCM
CHUNK_BYTES = CHUNK_SAMPLES * 2


async def broadcast(room: str, payload: dict):
    if room not in rooms:
        return
    dead = []
    for ws in list(rooms[room]):
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        rooms[room].discard(ws)


def _norm(text: str) -> str:
    return "".join(ch for ch in text.lower() if ch.isalnum())


@app.websocket("/ws/subs")
async def ws_subs(ws: WebSocket):
    await ws.accept()
    room = ws.query_params.get("room", "")
    translate = ws.query_params.get("translate", "0") == "1"
    if room:
        rooms[room].add(ws)
        room_translate[room] = translate
    await ws.send_json({"type": "status", "text": "Connected."})
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        if room:
            rooms[room].discard(ws)


@app.websocket("/ws/audio")
async def ws_audio(ws: WebSocket):
    await ws.accept()
    room = ""
    translate = False
    buf = bytearray()
    recent = deque(maxlen=8)
    last_norm = ""

    try:
        while True:
            msg = await ws.receive()
            if "text" in msg and msg["text"]:
                data = {}
                try:
                    data = json.loads(msg["text"])
                except Exception:
                    data = {}
                if data.get("type") == "start":
                    room = data.get("room", "")
                    translate = bool(data.get("translate"))
                    if room:
                        await broadcast(room, {"type": "status", "text": "Receiving audio..."})
                    continue
                if data.get("type") == "stop":
                    break
            if "bytes" in msg and msg["bytes"]:
                buf.extend(msg["bytes"])
                while len(buf) >= CHUNK_BYTES:
                    chunk = bytes(buf[:CHUNK_BYTES])
                    buf = buf[CHUNK_BYTES:]
                    text = await asyncio.to_thread(transcriber.transcribe_pcm, chunk)
                    if not text:
                        continue
                    norm = _norm(text)
                    if not norm or norm == last_norm or norm in recent:
                        continue
                    last_norm = norm
                    recent.append(norm)
                    tr = ""
                    if room_translate.get(room, False) or translate:
                        tr = await asyncio.to_thread(translate_text, text)
                    if room:
                        await broadcast(room, {"type": "subtitle", "text": text, "translation": tr, "is_final": False})
                        await broadcast(room, {"type": "subtitle", "text": text, "translation": tr, "is_final": True})
    except WebSocketDisconnect:
        pass
