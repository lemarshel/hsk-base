# Live News Transcription Backend

This service accepts a stream URL over WebSocket and transcribes Mandarin Chinese audio using faster-whisper.

## Requirements
- Python 3.9+
- ffmpeg available on PATH

## Setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

## Run
```bash
.venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000
```

## Optional English translation
Set environment variables:
```
set TRANSLATE_ENABLED=1
set TRANSLATE_URL=http://localhost:5000/translate
set TRANSLATE_API_KEY=your_key_optional
```
