# HSK Base — Development Progress Log

## CSS Split (2026-03-29)

Split `css/hsk.css` (834 lines) into three focused files. Entry point `css/hsk.css` replaced with 3-line `@import` chain.

### Files created

**`css/base.css`** (330 lines) — Platform-level primitives shared by all future pages (Story Reader, Dashboard, etc.)
- Full CSS design token set in `:root`: `--pal-accent/dark`, `--color-*`, `--tone-*`, `--space-*`, `--radius-*`, `--text-*`, `--shadow-*`, `--z-*`, `--transition-*`
- Flash-free preload states
- Page layout (h1, .subtitle)
- Search primitives (mark, .sr-hide)
- Language switching (.trans-en, .lang-en, .gnote-ru/en)
- Toolbar (#toolbar, .tb-row, search controls, mode-btn, font panel, speed/vol)
- Mode-dot theme swatches
- Toolbar 3-column section grid (#tb-sections, #tb-tools)
- TTS buttons (.tts-btn, .wordcell, .ex-td)
- Dropdown component (.cdx-btn, .cdx-dropdown)
- Confirmation modal (#cdx-confirm, #cdx-confirm-box)
- Drag primitives (.drag-ghost, .grip-handle, tr.dragging-row, tr.drag-over-row)
- Donate bar
- Back-to-top button (#back-to-top)
- Title row (.title-row, .main-page-hero)
- Mobile header + slide-in toolbar (@media 1024px)
- Responsive toolbar breakpoints (1200px, 900px)
- Print base (@media print)

**`css/vocabulary.css`** — Vocabulary page-specific rules
- @supports content-visibility for .grp-wrap
- POS group headings (h2.pos-group, h3.phonetic-group, .comp)
- body.flat-view, body.searching, #filtered-view header hiding
- Vocabulary table (table, thead, th, td, tr:nth-child, .rownum, .zh, .py, .ex-zh, .ex-py)
- .trans-cell, .drag-handle, .gnote, .no-sent
- TOC (.toc, .toc a, .toc-count)
- Checkbox columns (.cb-col, .cb-cell, .learn-cb, .fam-col, .fam-cb)
- #learned-section, #fam-section, #fam-table
- Tone colors (.py-t1 through .py-t0)
- HSK progress bar (.hsk-prog, .hsk-prog-bar, .hsk-prog-fill)
- HSK level badges (.hsk-badge, .hsk-1 through .hsk-6)
- Flashcard study overlay (#study-overlay, #study-card, all children)
- Multiple choice quiz overlay (#quiz-overlay, #quiz-card, .quiz-choice)
- Stroke order popup (#hz-popup, .hz-char)
- Group collapse (.grp-wrap.grp-col, .coll-btn)
- Column visibility: nth-child + data-col selectors (body.hide-num/word/trans/ex)
- Column toggle buttons (.col-btn)
- Table layout compensation for hidden columns
- Example sub-column visibility (.hide-ex-zh, .hide-ex-py)
- POS / Alpha / Sort / HSK filter buttons with row-hide classes
- Show-all-cols + export buttons (#btn-show-all-cols, .export-btn)
- Filtered view (#filtered-view, .fv-table, Bug2 fix for group headers)
- Duplicate thead hiding (non-first tables in POS sections)
- Example sentence translations (.ex-trans, .ex-trans-ru/en)
- Responsive table breakpoints (900px, 600px)
- Text-topics strip (#tb-row-texts, .text-btn, .text-indicator, .text-hide)
- Example-filter dropdown (.ex-filter-btn, #ex-filter-menu)
- Snapshot delete button (.snap-del-btn)
- HanziWriter containers (#hz-anim-canvas, #hz-practice-area)

**`css/themes.css`** — All dark and sepia theme overrides (loads last to win specificity)
- body.dark: base page, toolbar, vocabulary table, POS/TOC, TTS, collapse btn, col-btn, filter buttons, study/quiz overlays, hz popup, familiar/learned sections, dropdown, confirmation modal, filtered view, export, donate bar, mobile header
- body.sepia: base page, toolbar, vocabulary table, POS headings, TOC, filter and action buttons, mobile header

**`css/hsk.css`** (replaced) — Pure @import entry point:
```css
@import url("base.css");
@import url("vocabulary.css");
@import url("themes.css");
```

### Import order rationale
`themes.css` loads last so `body.dark`/`body.sepia` override rules beat both base and vocabulary rules without needing extra specificity. When Story Reader and Dashboard are added, they import only `base.css` (plus their own page file) — no vocabulary magic numbers leak across pages.

---

## localStorage Key Centralization (2026-03-29)

Moved `<script src="js/app-config.js"></script>` to immediately before `hsk-head.js` in both `index.html` and `test/index.html` (app-config.js is purely declarative — no DOM access, safe to run in `<head>`).

Updated `js/hsk-head.js` and `js/hsk-body.js` to use `window.HSK_LS.*` refs:
- `hsk-head.js`: `hsk_mode` → `HSK_LS.M`, `hsk_palette` → `HSK_LS.PA`, `hsk_prefs` → `HSK_LS.P`
- `hsk-body.js`: `hsk_mode` → `HSK_LS.M`, `hsk_lang` → `HSK_LS.LG`, `hsk-hide-` → `HSK_LS.H`, `ph_hidden` → `HSK_LS.PH`

All localStorage keys now flow through `window.HSK_LS` in every file.

---

## Codebase Analysis Report (2026-03-29)

Generated `Desktop/You are gay.docx` via `prod/gen_report.py` (python-docx).

Sections: Executive Summary, Strengths, Weaknesses (CRITICAL/HIGH/MEDIUM/LOW graded), Recommendations, Priority Matrix, What Not To Do, Current vs Target State, Closing Note.

---

## JS Refactoring (2026-03-28)

Split `js/hsk.js` (2007 lines) into focused modules:

| File | Lines | Responsibility |
|------|-------|----------------|
| js/app-config.js | — | Constants: HSK_LS, HSK_LEVEL_COLORS, HSK_PALETTES, POS labels, EN_DICT |
| js/hsk-api.js | — | `window._hsk` bridge, stub declarations, `_register()` helper |
| js/hsk.js | 424 | Core: wMap, learn/fam tracking, Sortable init, cdxConfirm |
| js/tts.js | 271 | TTS engine, voice loading, button injection, speed/vol prefs |
| js/ui.js | 465 | Theme, font, group collapse, columns, phoneme toggle, back-to-top, hamburger |
| js/palette.js | 50 | Color palette picker |
| js/lang.js | 295 | RU/EN language switching with full string maps |
| js/sort.js | 157 | Sort modes, applySort, drag state |
| js/filter.js | 415 | Search, HSK/POS/alpha filters, rebuildView |
| js/storage.js | — | Snapshot lifecycle (capture, save, restore, reset-all) |
| js/export.js | — | Excel (SheetJS/CSV fallback) + JSON export |
| js/quiz.js | — | Flashcard study mode + MCQ quiz |
| js/hanzi.js | — | HanziWriter popup + stroke-practice mode |

**Script load order:**
sortable.min.js → hanzi-writer.min.js → app-config.js → hsk-api.js → hsk.js → tts.js → ui.js → palette.js → lang.js → sort.js → filter.js → storage.js → export.js → quiz.js → hanzi.js → text-topics.js

---

## Bug Fixes — Batch 1 (2026-03-28)

1. **filter.js unclosed comment (CRITICAL):** `rebuildView()` was invisible due to missing `*/`. Fixed.
2. **IIFE wrapping (HIGH):** storage.js, export.js, quiz.js, hanzi.js were leaking globals. Wrapped in `(function(){ "use strict"; ... })();`.
3. **text-hide in filter visibility (HIGH):** `updateEmptyGroups()` / `getVisibleRowCount()` didn't check `.text-hide`. Fixed.

## Bug Fixes — Batch 2 (2026-03-28)

1. **Centralize `hsk_row_order` key (HIGH):** Added `R: 'hsk_row_order'` to `window.HSK_LS`.
2. **Duplicate SortableJS init (HIGH):** Removed first drag IIFE's `loadOrder` + `initSortable` calls; moved into the 800ms setTimeout IIFE.
3. **`ph_hidden` not cleared on reset (MEDIUM):** Added `'ph_hidden'` to storage.js reset key list.
4. **Dead code (MEDIUM):** Removed duplicate `stripTones` in filter.js; removed dead `#btn-export-pdf` block in lang.js.

## Dead-Code Cleanup (2026-03-29)

- **filter.js:** Removed dead `doSearch()`, `sTimer`, and 3 stale event listeners.
- **hsk.js:** Removed dead `initSortable()` from first drag IIFE.
- **hsk.js:** Removed entire first drag IIFE (`updateNumbers`, `saveOrder`, `KEY`).
- **hsk.js:** Removed dead `_origOrder` local alias from CODEX ADDITIONS IIFE.
  - NOTE: `window._cdxOrigOrder` is LIVE — read by sort.js:23,81. Never remove it.

## Substantial Maintenance Batch (2026-03-29)

- **filter.js:** Cached 4 static DOM refs at module scope.
- **tts.js:** Fixed stuck ▶ button with deduplication flag on `play()` promise.
- **app-config.js:** Added 7 keys to `window.HSK_LS`: `V`, `S`, `H`, `PH`, `LG`, `PA`, `SN`. All files updated.
- **Inline styles → CSS:** snap-del-btn, #hz-anim-canvas, #hz-practice-area moved from JS `style.cssText` to css/hsk.css.

## Final Targeted Batch (2026-03-29)

- **filter.js:** Removed dead `POS_LABELS_RU` / `POS_LABELS_EN` local aliases.
- **tts.js:** Added 15s outer failsafe for SpeechSynthesis stuck-button browser bug.

---

## Architecture Notes

- `window._hsk` bridge: all cross-file functions registered via `_register(moduleName, api)`.
- `window._cdxOrigOrder` + `window._cdxSortables` — raw globals (drag subsystem internals).
- Row visibility uses CSS classes: hsk-hide, pos-hide, alpha-hide, sr-hide, text-hide.
- TTS button textContent leak: use `_elText()` which clones and strips .tts-btn children.
- `<base href="../">` in test/index.html for relative path resolution.
- Rebuild both HTML files: `python prod/make_test_page.py` from project root.
