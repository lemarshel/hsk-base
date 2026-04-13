#!/usr/bin/env python
import os
import re
import json
import time
import subprocess
import hashlib
from datetime import datetime
from pathlib import Path

import requests
import feedparser
from gne import GeneralNewsExtractor
import pinyin

try:
    import argostranslate.package as argos_package
    import argostranslate.translate as argos_translate
except Exception:
    argos_package = None
    argos_translate = None

ROOT = Path(__file__).resolve().parent
CHANNELS_PATH = ROOT / 'news_channels.json'
OUT_PATH = ROOT / 'news_data.json'
JS_PATH = ROOT / 'news_data.js'
AUDIO_DIR = ROOT / 'news_audio'
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

MAX_ARTICLES = int(os.environ.get('NEWS_MAX_ARTICLES', '10'))
AUTO_TRANSLATE = os.environ.get('NEWS_AUTO_TRANSLATE', '1') != '0'
PIPER_CMD = os.environ.get('PIPER_CMD', '').strip() or None
PIPER_MODEL = os.environ.get('PIPER_MODEL', '').strip() or None
ESPEAK_CMD = os.environ.get('ESPEAK_CMD', '').strip() or None

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (NewsReader)'
}

extractor = GeneralNewsExtractor()


def load_channels():
    if not CHANNELS_PATH.exists():
        raise SystemExit('news_channels.json not found')
    with CHANNELS_PATH.open('r', encoding='utf-8') as f:
        return json.load(f)


def ensure_argos_models():
    if not argos_translate or not argos_package:
        return False
    installed = argos_translate.get_installed_languages()
    def has_pair(frm, to):
        for lang in installed:
            if lang.code == frm:
                for t in lang.translations:
                    if t.to_lang.code == to:
                        return True
        return False
    if has_pair('zh', 'en') and has_pair('zh', 'ru'):
        return True
    if not AUTO_TRANSLATE:
        return False
    argos_package.update_package_index()
    available = argos_package.get_available_packages()
    def install_pair(frm, to):
        for pkg in available:
            if pkg.from_code == frm and pkg.to_code == to:
                argos_package.install_from_path(pkg.download())
                return True
        return False
    install_pair('zh', 'en')
    install_pair('zh', 'ru')
    return True


def translate_text(text, lang_code):
    if not text or not argos_translate:
        return ''
    try:
        ensure_argos_models()
        installed = argos_translate.get_installed_languages()
        from_lang = None
        to_lang = None
        for lang in installed:
            if lang.code == 'zh':
                from_lang = lang
            if lang.code == lang_code:
                to_lang = lang
        if not from_lang or not to_lang:
            return ''
        translation = from_lang.get_translation(to_lang)
        if not translation:
            return ''
        return translation.translate(text)
    except Exception:
        return ''


def split_lines(text):
    if not text:
        return []
    text = re.sub(r'\s+', ' ', text).strip()
    if not text:
        return []
    parts = re.split(r'(?<=[\u3002\uFF01\uFF1F!?])\s*', text)
    lines = [p.strip() for p in parts if p.strip()]
    return lines


def strip_html(text):
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\\s+', ' ', text).strip()
    return text


def tts_path(text):
    h = hashlib.sha1(text.encode('utf-8')).hexdigest()
    return AUDIO_DIR / f"{h}.wav"


def generate_tts(text, out_path):
    if PIPER_CMD and PIPER_MODEL:
        cmd = [PIPER_CMD, '-m', PIPER_MODEL, '-f', str(out_path)]
        proc = subprocess.run(cmd, input=text, text=True, capture_output=True)
        return proc.returncode == 0
    if ESPEAK_CMD:
        cmd = [ESPEAK_CMD, '-w', str(out_path), text]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        return proc.returncode == 0
    return False


def build_audio(text):
    if not (PIPER_CMD and PIPER_MODEL) and not ESPEAK_CMD:
        return ''
    out_path = tts_path(text)
    if not out_path.exists():
        ok = generate_tts(text, out_path)
        if not ok:
            return ''
    return str(out_path.relative_to(ROOT)).replace('\\', '/')


def fetch_article(url):
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    if resp.apparent_encoding:
        resp.encoding = resp.apparent_encoding
    return resp.text


def extract_article(html):
    return extractor.extract(html)


def process_channel(channel):
    feed = feedparser.parse(channel.get('rss', ''))
    articles = []
    for entry in feed.entries[:MAX_ARTICLES]:
        link = entry.get('link', '')
        title = entry.get('title', '')
        if not link:
            continue
        try:
            html = fetch_article(link)
            result = extract_article(html)
            content = result.get('content', '')
            if not content:
                content = strip_html(entry.get('summary', '') or '')
            if not content and entry.get('content'):
                try:
                    content = strip_html(entry.get('content')[0].get('value', ''))
                except Exception:
                    content = ''
            if not content:
                continue
            lines = []
            for line in split_lines(content):
                try:
                    py = pinyin.get(line, format='diacritical', delimiter=' ')
                except Exception:
                    py = ''
                en = translate_text(line, 'en')
                ru = translate_text(line, 'ru')
                try:
                    audio = build_audio(line)
                except Exception:
                    audio = ''
                lines.append({
                    'zh': line,
                    'py': py,
                    'en': en,
                    'ru': ru,
                    'audio': audio
                })
            if not lines:
                continue
            articles.append({
                'title': title or result.get('title', ''),
                'link': link,
                'lines': lines
            })
            time.sleep(0.5)
        except Exception:
            continue
    return articles


def main():
    channels = load_channels()
    data = {
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'channels': []
    }
    for ch in channels:
        articles = process_channel(ch)
        data['channels'].append({
            'id': ch.get('id'),
            'name': ch.get('name'),
            'articles': articles
        })
    with OUT_PATH.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    JS_PATH.write_text('window.NEWS_DATA = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    print('Saved', OUT_PATH)
    print('Saved', JS_PATH)


if __name__ == '__main__':
    main()
