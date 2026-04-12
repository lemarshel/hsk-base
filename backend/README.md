# Live News Transcription Backend

This service accepts tab audio over WebSocket and transcribes Mandarin Chinese audio using faster-whisper.

## Requirements
- Python 3.9+

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

## WebSocket endpoints
- `/ws/audio` (extension sends PCM audio from the active tab)
- `/ws/subs?room=<id>&translate=1` (website receives subtitles)

## Optional English translation
Set environment variables:
```
set TRANSLATE_ENABLED=1
set TRANSLATE_URL=http://localhost:5000/translate
set TRANSLATE_API_KEY=your_key_optional
```
