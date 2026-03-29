"""
Minimal build validator for HSK Base.
- Validates runtime data files and HTML shell scripts.
- No browser, no test frameworks, no extra deps.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
INDEX_HTML = ROOT / "index.html"
TEST_HTML  = ROOT / "test" / "index.html"
WORDS_JSON = ROOT / "data" / "words.json"
WORDS_JS   = ROOT / "data" / "words-data.js"
GROUPS_JS  = ROOT / "data" / "groups-data.js"

EXPECTED_WORDS = 5369  # update if dataset target changes
POS_SECTIONS = [
  'pos_noun','pos_verb','pos_adj','pos_adv','pos_mw',
  'pos_particle','pos_conj','pos_prep','pos_pron'
]

REQUIRED_SCRIPTS_IN_ORDER = [
  'js/app-config.js',
  'js/hsk-head.js',
  'js/hsk-body.js',
  'data/groups-data.js',
  'js/render-words.js',
  'js/vendor/sortable.min.js',
  'js/vendor/hanzi-writer.min.js',
  'js/hsk-api.js',
  'js/hsk.js',
  'js/tts.js',
  'js/ui.js',
  'js/palette.js',
  'js/lang.js',
  'js/sort.js',
  'js/filter.js',
  'js/storage.js',
  'js/state.js',
  'js/export.js',
  'js/quiz.js',
  'js/hanzi.js',
  'js/text-topics.js',
  'js/tracker.js'
]


def _fail(msg):
  print(f"[FAIL] {msg}")
  return False


def _ok(msg):
  print(f"[OK] {msg}")
  return True


def parse_script_srcs(html_text):
  out = []
  for m in re.findall(r'<script[^>]+src="([^"]+)"', html_text, re.I):
    out.append(m)
  for m in re.findall(r"<script[^>]+src='([^']+)'", html_text, re.I):
    out.append(m)
  return out


def validate_scripts(html_path):
  html = html_path.read_text(encoding='utf-8')
  srcs = parse_script_srcs(html)
  ok = True
  for s in REQUIRED_SCRIPTS_IN_ORDER:
    if s not in srcs:
      ok = _fail(f"{html_path}: missing script {s}") and ok
  # order check
  last_idx = -1
  for s in REQUIRED_SCRIPTS_IN_ORDER:
    try:
      idx = srcs.index(s)
    except ValueError:
      continue
    if idx < last_idx:
      ok = _fail(f"{html_path}: script order wrong at {s}") and ok
    last_idx = idx
  if ok:
    _ok(f"{html_path}: script tags present and ordered")
  return ok


def validate_words():
  ok = True
  if not WORDS_JSON.exists():
    return _fail("words.json missing")
  words = json.loads(WORDS_JSON.read_text(encoding='utf-8'))
  if len(words) != EXPECTED_WORDS:
    ok = _fail(f"words.json count {len(words)} != expected {EXPECTED_WORDS}") and ok
  else:
    _ok(f"words.json count = {EXPECTED_WORDS}")

  # HSK_WORDS assignment fallback
  if 'window.HSK_WORDS=' not in WORDS_JS.read_text(encoding='utf-8'):
    ok = _fail("words-data.js missing window.HSK_WORDS assignment") and ok
  else:
    _ok("words-data.js window.HSK_WORDS assignment found")

  # HSK_GROUPS assignment
  if 'window.HSK_GROUPS=' not in GROUPS_JS.read_text(encoding='utf-8'):
    ok = _fail("groups-data.js missing window.HSK_GROUPS assignment") and ok
  else:
    _ok("groups-data.js window.HSK_GROUPS assignment found")

  # POS coverage
  pos_counts = {p: 0 for p in POS_SECTIONS}
  for w in words:
    p = w.get('pos')
    if p in pos_counts:
      pos_counts[p] += 1
  for p in POS_SECTIONS:
    if pos_counts[p] <= 0:
      ok = _fail(f"No words for POS section {p}") and ok
  if ok:
    _ok("All POS sections have >=1 word")
  return ok


def main():
  ok = True
  ok = validate_words() and ok
  ok = validate_scripts(INDEX_HTML) and ok
  ok = validate_scripts(TEST_HTML) and ok
  if not ok:
    sys.exit(1)
  print("Build validation passed.")


if __name__ == '__main__':
  main()
