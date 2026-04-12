import asyncio
import threading
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from transcriber import StreamTranscriber
from translator import translate_text

app = FastAPI()
transcriber = StreamTranscriber()


@app.websocket("/ws/transcribe")
async def ws_transcribe(ws: WebSocket):
    await ws.accept()
    loop = asyncio.get_running_loop()
    stop_evt = threading.Event()
    session = None
    translate = False

    async def send_json(payload):
        await ws.send_json(payload)

    def emit(text: str, is_final: bool):
        # Always send partial then final to satisfy UI expectations
        asyncio.run_coroutine_threadsafe(
            send_json({"type": "subtitle", "text": text, "translation": "", "is_final": False}),
            loop,
        )
        translation = translate_text(text) if translate else ""
        asyncio.run_coroutine_threadsafe(
            send_json({"type": "subtitle", "text": text, "translation": translation, "is_final": True}),
            loop,
        )

    def status(msg: str):
        asyncio.run_coroutine_threadsafe(
            send_json({"type": "status", "text": msg}),
            loop,
        )

    try:
        while True:
            msg = await ws.receive_json()
            mtype = msg.get("type")
            if mtype == "start":
                url = msg.get("url", "")
                translate = bool(msg.get("translate"))
                if session:
                    session.stop()
                    session = None
                if url:
                    stop_evt.clear()
                    status("Starting transcription...")
                    try:
                        session = transcriber.start(url, emit, stop_evt, status)
                    except Exception as exc:
                        status(f"Failed to start ffmpeg: {exc}")
            elif mtype == "stop":
                if session:
                    session.stop()
                    session = None
            elif mtype == "config":
                translate = bool(msg.get("translate"))
    except WebSocketDisconnect:
        pass
    finally:
        if session:
            session.stop()
