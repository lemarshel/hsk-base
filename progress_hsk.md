---
name: progress_hsk
description: Master memory file — Sultan's profile, OUR_HSK project architecture, completed work, and orchestrator workspace
type: project
---

## User

**Sultan Kulbassov** (email: lemarshel@gmail.com, PayPal: paypal.me/SultanKulbassov)

Building language learning vocabulary apps (starting with Chinese HSK, then Arabic). Uses Claude + Codex dual-agent overnight orchestrator. Comfortable with HTML/CSS/JS apps but needs help with large-scale implementation.

---

## OUR_HSK Project

**OUR_HSK** — Chinese vocabulary learning app with 5369 words, HSK levels 1-5, grouped by part of speech and phonetic components. Hosted at https://lemarshel.github.io/hsk-base/

**Working directory:** `C:/Users/hp/Desktop/Main/hsk-base/`

---

## JS Refactoring (completed 2026-03-28)

Split `js/hsk.js` (2007 lines) into focused modules:

- `js/app-config.js` — constants (HSK_LS, HSK_LEVEL_COLORS, HSK_PALETTES, POS labels, EN_DICT)
- `js/storage.js` — snapshot lifecycle (capture, save, restore, reset-all)
- `js/export.js` — Excel (SheetJS/CSV fallback) + JSON export; PDF deleted entirely
- `js/quiz.js` — flashcard study mode + MCQ quiz
- `js/hanzi.js` — HanziWriter popup + stroke-practice mode
- `js/tts.js` (271 lines) — TTS engine, voice loading, button injection, speed/vol prefs
- `js/ui.js` (465 lines) — pinyin coloring, theme, font, group collapse, columns, phoneme toggle, back-to-top, hamburger
- `js/palette.js` (50 lines) — color palette picker
- `js/lang.js` (295 lines) — RU/EN language switching with full string maps
- `js/sort.js` (157 lines) — sort modes, applySort, drag state
- `js/filter.js` (415 lines) — search, HSK/POS/alpha filters, rebuildView
- `js/hsk.js` trimmed from 2007 → 424 lines (core: wMap, learn/fam, Sortable init, cdxConfirm)
- `prod/split_hsk.py` — extraction script that produced the split

**Script load order:**
sortable.min.js → hanzi-writer.min.js → js/app-config.js → hsk.js → tts.js → ui.js → palette.js → lang.js → sort.js → filter.js → storage.js → export.js → quiz.js → hanzi.js → text-topics.js

---

## Key Architecture Notes

- `window._hsk` bridge exposes cross-file functions: getLang() [lang.js], renum/confirm/updateHSKStats [hsk.js], getTtsVolume/stopAllAudio [tts.js], applySort/getCurrentSort/sortRows/sortRowsByHsk/updateDragState [sort.js], rebuildView/renumVisible/stripTones/applyAlphaFilter/getCurrentAlpha/updateWordCount/getVisibleRowCount [filter.js]
- Row visibility: CSS classes hsk-hide, pos-hide, alpha-hide, sr-hide, text-hide (not offsetParent)
- TTS button leaks ▶ into textContent — use _elText() which clones and strips .tts-btn
- `<base href="../">` injected in test/index.html head for relative path resolution
- prod/make_test_page.py: add_base_href=True for test, False for prod; both include_banner=False
- Rebuild both HTML files: `python prod/make_test_page.py` from project root

---

## CSS Cleanup (completed 2026-03-28)

- Inline `<style>` block removed from index.html; 18 rules moved to end of `css/hsk.css` (790 → 826 lines)
- Rules cover: text-topics toolbar, `.grp-empty`/`.pos-empty` hiding, example-filter dropdown, example column toggles
- Dead CSV stub in hsk.js was already eliminated during the JS split

---

## Tracker Cleanup (completed 2026-03-28)

- Removed SortableJS inline copy from hsk.js (was already in js/vendor/sortable.min.js)
- Extracted embedded data from tracker.js (WORD_ID_MAP 5357 words, TOPIC_WORDS 40 topics, TOTAL_WORDS) → `data/tracker-data.json`
- tracker.js now initializes WORD_ID_MAP/TOPIC_WORDS as `{}` and calls `loadTrackerData()` (fetch) at startup; graceful if file unavailable
- tracker.js: 512 → 524 lines (net gain from added loadTrackerData fn; bulk data removed)

---

## Orchestrator Workspace

**Workspace:** `C:/Users/hp/Documents/New project/`

Contains:
1. `claude-skills-main/` — comprehensive skills library for Claude AI/Code (v2.1.2, 177 skills, 9 domains)
2. `orchestrator.md` — dual-agent overnight orchestrator spec (Claude + Codex)
3. `scripts/orchestrate.ps1` — PowerShell supervisor script
4. `cedict_1_0_ts_utf-8_mdbg.txt.gz` — CC-CEDICT Chinese dictionary
5. `codex_version_hsk.html` — HSK reference file
6. `claude-newproject.md` — project overview/guide

**Orchestrator model policy:**
- Claude planning/research: `--model opusplan`
- Claude coding/default: `--model sonnet`
- Codex: default coding model for implementation; use for token-heavy implementation, Claude for planning/review

**Git policy:** Branch format `nightly/<yyyyMMdd-HHmm>-<runId8>`, requires Claude sign-off before push.

---

## Next Planned

- Arabic vocabulary app (3500 most used words, sorted by roots + nouns/verbs/etc., same format)
- Main landing page explaining language learning method
- (Git + GitHub Pages already live at https://lemarshel.github.io/hsk-base/)

**Why:** Part of Sultan's language learning method project, eventually to be hosted publicly and open-sourced.
**How to apply:** Maintain split file structure. When extracting JS, check for cross-IIFE var references; bridge via window._hsk.
