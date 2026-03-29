# Code Report 3 — OUR_HSK Codebase Review

**Date:** 2026-03-28
**Scope:** Full read of all JS modules after the architecture stabilisation work (Reports 1–2).
**References:** `docs/architecture.md`, `progress_hsk.md`, `js/hsk-api.js` ownership table.

---

## Summary

The module split and `window._hsk._register()` system are solid. The ownership table in `hsk-api.js` is clean and the three ui.js bugs from the previous pass are fixed. What remains is one **show-stopping broken function**, four **silent architecture leaks**, and a cluster of **minor smells**. Fix the items below in order and the codebase is in very good shape.

---

## CRITICAL — Fix First

### 1. `filter.js` — `rebuildView()` is entirely dead code

**File:** `js/filter.js`, lines 327–332
**Symptom:** All filter buttons (HSK levels, POS, alpha), search, and sort-then-filter all silently do nothing. The view rebuild loop never runs.

**Root cause:** The doc-comment block that opens at line 327 is never closed. There is no `*/` before `function rebuildView(){` at line 334. The entire function (lines 334–414) plus the `_register` call (lines 416–425) are inside the unclosed comment.

The first `*/` the parser encounters after line 327 is the one that closes the one-liner at line 416 (`/* ── Register filter internals via shared API ── */`). Everything between lines 327–416 is treated as comment text, meaning:

- `rebuildView` is never declared as a function
- `window._hsk._register('filter', { rebuildView: rebuildView, ... })` references an undeclared identifier → ReferenceError in strict mode, or registers `undefined` in non-strict
- Either way `window._hsk.rebuildView` ends up as the original stub no-op from `hsk-api.js`

**Fix:** Add the closing line at the end of the OUTPUT line (after line 332):

```
   ────────────────────────────────────────────────────────────────────────────── */
```

So lines 326–335 should look like:

```javascript
/* ── rebuildView: single source of truth for what is shown ──────────────── */
/* ── rebuildView — master view rebuild ────────────────────────────────────────
   INPUT:  activeHSKLevels, currentPOS, currentAlpha, currentSort, all tbody rows
   ACTION: applies hsk-hide / pos-hide / alpha-hide to rows; re-sorts tbodies;
           merges small phoneme groups; renumbers; updates word count and HSK stats;
           rebuilds filtered-view flat table for EN search mode
   OUTPUT: DOM row visibility + order; #word-count text; #hsk-stats-bar HTML
   ────────────────────────────────────────────────────────────────────────────── */
function rebuildView(){
```

---

## HIGH — Architecture Leaks

### 2. `storage.js`, `export.js`, `quiz.js`, `hanzi.js` — not wrapped in IIFEs

**Files:** all four
**Problem:** These files use `"use strict"` at the top level of the script but are not wrapped in an IIFE. In a non-module script (which these are — no `type="module"`), top-level strict mode does not create a private scope. All their top-level functions and variables leak to `window`:

| File | Leaked globals |
|---|---|
| `storage.js` | `getSnapshots`, `saveSnapshots`, `captureSnapshot`, `renderSnapshotDropdown`, `restoreSnapshot`, `SNAP_KEY` |
| `export.js` | `_rowVisible`, `_elText`, `_rowData`, `_progressBar` |
| `quiz.js` | `"use strict"` at top level only; internal IIFEs are fine |
| `hanzi.js` | `hzPop`, `hzTimer`, `_hzPracticeChar`, `_hzPracticeWriter`, `showHz` |

**Fix:** Wrap each file's content in `(function(){ "use strict"; ... })();` just like `hsk.js`, `filter.js`, `sort.js`, `lang.js`, `tts.js`, `ui.js`, `palette.js` already are.

### 3. `hsk-head.js` duplicates the palette table from `app-config.js`

**Files:** `js/hsk-head.js` (lines 23–39), `js/app-config.js` (`window.HSK_PALETTES`)
**Problem:** `hsk-head.js` runs before `app-config.js` loads (it's inside `<head>`) so it can't use `window.HSK_PALETTES`. Instead it has its own hardcoded `PALS` object — an identical copy of the 15 palettes. If you add a new palette to `app-config.js` and forget to add it to `hsk-head.js`, the first paint uses the wrong accent color, then flickers to the correct one when `palette.js` runs.

**Fix (two options):**
- **Option A (simple):** Add a comment to both files: `/* KEEP IN SYNC WITH hsk-head.js / app-config.js */` so it's obvious they're coupled.
- **Option B (proper):** Inline the palette lookup into the HTML `<head>` as a small `<script>` that reads `hsk_palette` from localStorage and sets the CSS vars, then remove the palette lookup from `hsk-head.js`. This is what the architecture already does for mode/lang/columns — palette can follow the same pattern.

### 4. `hsk_row_order` key is a bare string in two files

**Files:** `js/hsk.js` (lines 255, 419), `js/storage.js` (line 100)
**Problem:** The localStorage key `'hsk_row_order'` appears as a raw string literal in three places across two files. If it ever needs renaming (e.g. for v2 format migration), all three must be found and changed manually. The other keys have a central home in `window.HSK_LS` in `app-config.js` — this one doesn't.

**Fix:** Add `R: 'hsk_row_order'` to `window.HSK_LS` in `app-config.js` and replace all three string literals with `window.HSK_LS.R` (or `LS.R` inside `hsk.js` which already aliases `var LS = window.HSK_LS`).

### 5. `text-topics.js` is enormous and runs synchronously

**File:** `js/text-topics.js`
**Problem:** The file exceeds 80,000 tokens (confirmed by the Read tool refusing to open it). It runs synchronously on page load and stamps `data-text` attributes on every row. This is the same problem that tracker.js had before it was split into `tracker.js` + `data/tracker-data.json`. The text-topics data (word → topic mapping) is almost certainly a large embedded data structure.

**Impact:** Blocking parse + execution time proportional to file size, every page load.

**Fix:** Apply the same pattern used for tracker.js:
1. Extract the data into `data/text-topics-data.json`
2. Have `text-topics.js` `fetch()` the data and apply attributes after load
3. Guard all code that reads `data-text` with a check that the data is loaded

---

## MEDIUM — Filter / Visibility Gaps

### 6. `text-hide` class ignored by `updateEmptyGroups()` and `getVisibleRowCount()`

**File:** `js/filter.js`, lines 194–199 and 243–249
**Problem:** Both functions check four hide classes (`hsk-hide`, `pos-hide`, `alpha-hide`, `sr-hide`) but skip `text-hide`. Text-topic filtering (buttons 1–40) therefore:
- Does not collapse phonetic-group headers when all rows in a group are text-hidden
- Reports a word count that includes text-hidden rows

**Fix:** Add `tr.classList.contains('text-hide')` to both `rowVisible()` and `getVisibleRowCount()` predicates.

---

## MEDIUM — Duplicate Sortable Initialization

### 7. `hsk.js` initializes SortableJS twice on every tbody

**File:** `js/hsk.js`
**Problem:** The drag IIFE (lines 253–325) creates SortableJS instances via `initSortable()` for all tbodies immediately. Then 800 ms later, the CODEX ADDITIONS IIFE (lines 394–427) destroys every one of those instances and recreates them with `ghostClass` and tracking in `window._cdxSortables`. The first set is never used; it exists purely to be destroyed.

**Side effects:**
- 800 ms window after page load where drag-and-drop doesn't have `ghostClass` (the first set lacks it)
- Double memory allocation for ~458 tbody Sortable objects
- If the 800 ms timeout fires before a user finishes their first drag, they get the wrong ghostClass behavior

**Fix:** Remove the `loadOrder()` + `initSortable()` call from the first drag IIFE entirely. Move `loadOrder()` into the CODEX ADDITIONS IIFE (before the 800 ms Sortable patch) so there's one init path. The 800 ms delay can then be reduced or removed since it no longer needs to wait for an existing set of instances to settle.

---

## LOW — Code Smells

### 8. `lang.js` has section-name tables that partially duplicate `app-config.js`

**File:** `js/lang.js`, lines 65–67 (`TOC_NAMES_EN/RU`) and lines 234–248 (`enH2/ruH2`)
**Problem:** `app-config.js` already defines `window.HSK_SECTION_NAMES_EN/RU` with the same 9 POS section names. `lang.js` then defines two more versions of the same data (slightly different formatting for the TOC links vs. the h2 headings). Three separate copies of the same 9 names.

**Fix:** Consolidate. `HSK_SECTION_NAMES_EN/RU` in `app-config.js` could carry both the short form (for h2) and the long form (for TOC) as an object, e.g. `{ h2: 'Nouns', toc: 'Nouns 名词' }`. `lang.js` reads from there. No behavior change, one place to edit names.

### 9. `lang.js` references deleted `btn-export-pdf`

**File:** `js/lang.js`, line 163
```javascript
var pdfBtn = document.getElementById('btn-export-pdf');
if(pdfBtn){ pdfBtn.title = ...; }
```
PDF export was removed entirely during the JS split. The element doesn't exist in the HTML. The `if(pdfBtn)` guard prevents a crash but this is dead code. Remove both lines.

### 10. `quiz.js` bypasses `tts.js` voice selection and fallback

**File:** `js/quiz.js`, lines 61–63 and 211–213
**Problem:** The flashcard and MCQ quiz modes call `speechSynthesis.speak(u)` directly with `u.lang = 'zh-CN'` and a fixed rate of 0.9. They don't go through `tts.js`'s `ensureVoices()` (which picks the best zh-CN voice), the 1.2 s stall detector, or the Google TTS fallback. On browsers with no zh-CN voice the audio silently fails.

**Fix (low priority):** Expose a `playTTS(text, onDone)` helper in `tts.js` via `window._hsk` so quiz and study modes can call the same code path as the main ▶ buttons.

### 11. `hanzi.js` practice retry stacks event listeners

**File:** `js/hanzi.js`, line 110
**Problem:** Each click on `hz-practice-btn` creates a new practice area, then attaches a new click listener to the newly created `hz-practice-retry` button. But `_hzPracticeWriter.quiz({...})` receives the same callback object every time, so the callbacks accumulate on subsequent retries, calling `quiz()` N times on the Nth retry click.

**Fix:** Use `{ once: true }` on the retry listener, or capture the retry button in a variable and `removeEventListener` before adding.

### 12. `filter.js` — local `stripTones` shadows module-level one inside `rebuildView()`

**File:** `js/filter.js`, line 350 (inside `rebuildView()`)
```javascript
function stripTones(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
```
This is an identical copy of the module-level `stripTones` at line 29. Just remove the inner one and reference the outer one — it's in scope.

### 13. `storage.js` reset does not clear `ph_hidden`

**File:** `js/storage.js`, line 192–197
**Problem:** "Reset Everything" clears all keys that `startsWith('hsk')` plus an explicit list. `ph_hidden` (phoneme header toggle state) uses the key `'ph_hidden'` which doesn't start with `'hsk'` and isn't in the explicit list. After a full reset, the phoneme headers remain in their previous toggle state instead of resetting to hidden-by-default.

**Fix:** Add `'ph_hidden'` to the explicit keys list in the reset handler.

### 14. `hsk.js` `save()` has an always-true typeof guard

**File:** `js/hsk.js`, line 79
```javascript
if(typeof updateHSKStats==='function') updateHSKStats();
```
`updateHSKStats` is declared in the same IIFE above `save()`, so the guard is always true. After the module split, the intent is probably to call `window._hsk.updateHSKStats()` from outside anyway. Clean it up: either call it directly (it's in scope) or replace with `window._hsk.updateHSKStats()` for consistency with how other modules call across the bridge.

---

## Recommended Fix Order

| Priority | Item | File(s) | Effort |
|---|---|---|---|
| 1 | Missing `*/` kills `rebuildView` | `filter.js` | 1 line |
| 2 | Wrap `storage`, `export`, `quiz`, `hanzi` in IIFEs | 4 files | ~2 lines each |
| 3 | Add `text-hide` to `updateEmptyGroups` + `getVisibleRowCount` | `filter.js` | 2 lines |
| 4 | Extract `text-topics.js` data → JSON | `text-topics.js` + new `data/text-topics-data.json` | Medium |
| 5 | Add `hsk_row_order` to `HSK_LS`; remove string literals | `app-config.js`, `hsk.js`, `storage.js` | 5 lines |
| 6 | Remove duplicate Sortable init | `hsk.js` | ~20 lines removed |
| 7 | Add sync comment to `hsk-head.js` / `app-config.js` palettes | 2 files | 1 line each |
| 8 | Remove dead `btn-export-pdf` reference | `lang.js` | 2 lines |
| 9 | Fix `ph_hidden` not cleared on reset | `storage.js` | 1 line |
| 10 | Remove inner `stripTones` from `rebuildView` | `filter.js` | 1 line |
| 11 | Fix hanzi retry listener stacking | `hanzi.js` | 2 lines |
| 12 | Consolidate POS section name tables | `app-config.js`, `lang.js` | Medium refactor |
| 13 | Route quiz TTS through tts.js | `quiz.js`, `tts.js` | Medium |

Fix items 1–3 and the app is functionally correct. Fix 4–9 and the code is clean. Fix 10–13 and it's polished.

---

## What Is Already Good

- `hsk-api.js` ownership table and stub system — well done, works correctly
- `_register()` migration across all 5 modules — complete and consistent
- `app-config.js` as a pure constants file — correct
- `hsk-head.js` / `hsk-body.js` preloader pattern — correct, eliminates flash-of-unstyled-content
- Build pipeline (`prod/make_test_page.py`) — clean two-output system
- `tracker.js` data extraction to JSON — correct approach (model `text-topics.js` on this)
- CSS custom properties for palette — correct approach
- `export.js` `_elText()` for stripping TTS button from textContent — correct fix for the ▶ leak
