import os
import requests

TRANSLATE_ENABLED = os.getenv("TRANSLATE_ENABLED", "0") == "1"
TRANSLATE_URL = os.getenv("TRANSLATE_URL", "")
TRANSLATE_API_KEY = os.getenv("TRANSLATE_API_KEY", "")


def translate_text(text: str) -> str:
    if not TRANSLATE_ENABLED or not TRANSLATE_URL:
        return ""
    try:
        payload = {"q": text, "source": "zh", "target": "en", "format": "text"}
        headers = {}
        if TRANSLATE_API_KEY:
            headers["Authorization"] = f"Bearer {TRANSLATE_API_KEY}"
        r = requests.post(TRANSLATE_URL, json=payload, headers=headers, timeout=12)
        r.raise_for_status()
        data = r.json()
        return data.get("translatedText", "") or data.get("translation", "")
    except Exception:
        return ""
