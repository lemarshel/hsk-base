"""
prod/split_hsk.py — Split js/hsk.js into 6 focused files.

Run from project root:
    python prod/split_hsk.py

Creates:
    js/tts.js      — TTS engine, voice loading, button injection
    js/ui.js       — pinyin coloring, theme, font, collapse, columns,
                     phoneme toggle, back-to-top, hamburger
    js/palette.js  — color palette picker
    js/lang.js     — RU/EN language switching
    js/sort.js     — sort modes, applySort, drag state
    js/filter.js   — search, HSK/POS/alpha filters, rebuildView

Rewrites js/hsk.js keeping only the core state layer.
Updates index.html script tags.
"""

import re
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HSK_JS  = os.path.join(ROOT, 'js', 'hsk.js')
INDEX   = os.path.join(ROOT, 'index.html')
JS_DIR  = os.path.join(ROOT, 'js')

with open(HSK_JS, encoding='utf-8') as f:
    src_lines = f.readlines()

def L(start, end=None):
    """Return lines start..end inclusive (1-indexed). end=None → single line."""
    if end is None:
        end = start
    return ''.join(src_lines[start - 1:end])


# ── helpers ────────────────────────────────────────────────────────────────────

def iife_wrap(body, strict=True):
    """Wrap body in an IIFE with use strict."""
    header = '(function(){\n'
    if strict:
        header += '"use strict";\n\n'
    return header + body.rstrip('\n') + '\n})();\n'

def file_header(path, description, inp, action, out):
    return (
        '/* ==========================================================================\n'
        f'   {path}\n\n'
        f'   INPUT:  {inp}\n'
        f'   ACTION: {action}\n'
        f'   OUTPUT: {out}\n'
        '   ========================================================================== */\n'
    )


# ══════════════════════════════════════════════════════════════════════════════
# 1.  tts.js
# ══════════════════════════════════════════════════════════════════════════════

TTS_BODY = (
    L(350, 579)   # TTS core vars, voice loading, stop/chunk/play, click handler,
                  # wordcell injection, example injection
    + '\n'
    + L(734, 756) # speed & volume pref restore (uses setTtsVolume)
    + '\n'
    + '/* ── Expose TTS internals via window._hsk ── */\n'
    + 'window._hsk = window._hsk || {};\n'
    + 'window._hsk.getTtsVolume = function(){ return ttsVolume; };\n'
    + 'window._hsk.stopAllAudio = stopAllAudio;\n'
)

TTS_HEADER = file_header(
    'js/tts.js — Text-to-Speech engine',
    description='',
    inp='#vol-range, #speed-sel, window.speechSynthesis; all .wordcell and .ex-zh cells',
    action='voice selection (zh-CN), chunked playback with Google TTS fallback; '
           'injects ▶ buttons into word and example cells; restores speed/volume prefs',
    out='audio playback; .tts-btn DOM elements; localStorage hsk-volume/hsk-speed; '
        'window._hsk.getTtsVolume, .stopAllAudio'
)

tts_content = TTS_HEADER + iife_wrap(TTS_BODY)

with open(os.path.join(JS_DIR, 'tts.js'), 'w', encoding='utf-8') as f:
    f.write(tts_content)
print('Written: js/tts.js')


# ══════════════════════════════════════════════════════════════════════════════
# 2.  ui.js
# ══════════════════════════════════════════════════════════════════════════════

# Phoneme toggle (1528-1600) needs renumVisible → window._hsk.renumVisible()
phoneme_section = L(1528, 1600)
phoneme_section = phoneme_section.replace(
    'renumVisible();',
    'if(window._hsk && window._hsk.renumVisible) window._hsk.renumVisible();'
)

UI_BODY = (
    L(137, 186)    # colorPinyin: getTone, capFirstLetter, colorPinyin + DOMContentLoaded
    + '\n'
    + L(270, 291)  # keyboard shortcuts
    + '\n'
    + L(293, 307)  # setMode (theme)
    + '\n'
    + L(309, 348)  # font controls (applyF, prefs restore, event wiring, font-toggle)
    + '\n'
    + L(603, 635)  # phonetic group collapse + collapse/expand all buttons
    + '\n'
    + L(637, 698)  # column visibility toggle (toggleCol, restore, buttons, show-all)
    + '\n'
    # ── from IIFE 2 ──
    + L(1433, 1455) # mark first table per POS section
    + '\n'
    + L(1456, 1527) # merge small phoneme groups (< 3 words) into Other
    + '\n'
    + phoneme_section  # phoneme group header toggle
)

UI_HEADER = file_header(
    'js/ui.js — UI interactions',
    description='',
    inp='DOM elements: .py/.ex-py cells, .mode-btn, font inputs, h3.phonetic-group, '
        '.col-btn, h2.pos-group, #btn-phoneme-toggle',
    action='colorPinyin tone spans; keyboard shortcuts; theme mode; font controls; '
           'phonetic group collapse; column toggle; mark first POS table; '
           'merge small phoneme groups; phoneme header toggle',
    out='DOM mutations; body class; localStorage hsk_mode/hsk_prefs/hsk-hide-*'
)

# Back-to-top and mobile hamburger are standalone IIFEs — append verbatim
back_top  = '\n' + L(1953, 1969)
hamburger = '\n' + L(1971, 2006)

ui_content = UI_HEADER + iife_wrap(UI_BODY) + back_top + hamburger

with open(os.path.join(JS_DIR, 'ui.js'), 'w', encoding='utf-8') as f:
    f.write(ui_content)
print('Written: js/ui.js')


# ══════════════════════════════════════════════════════════════════════════════
# 3.  palette.js
# ══════════════════════════════════════════════════════════════════════════════

# Palette comment header starts at 888, code at 893 (after INPUT/ACTION/OUTPUT block)
# initPalette IIFE closes at 925
PAL_BODY = L(888, 925)  # includes comment block + PALETTES var + applyPalette + initPalette

PAL_HEADER = file_header(
    'js/palette.js — Color palette',
    description='',
    inp='localStorage hsk_palette; window.HSK_PALETTES; .pal-btn and #palette-dropdown',
    action='applyPalette() sets CSS custom properties --pal-accent/--pal-dark; '
           'initPalette restores saved palette and wires dropdown clicks',
    out='CSS vars on :root; #dyn-palette style; localStorage hsk_palette'
)

pal_content = PAL_HEADER + iife_wrap(PAL_BODY)

with open(os.path.join(JS_DIR, 'palette.js'), 'w', encoding='utf-8') as f:
    f.write(pal_content)
print('Written: js/palette.js')


# ══════════════════════════════════════════════════════════════════════════════
# 4.  lang.js
# ══════════════════════════════════════════════════════════════════════════════

# Lang section: lines 927-1203 (currentLang var → DOMContentLoaded wiring close)
lang_section = L(927, 1203)

# Replace POS label local vars (defined later in IIFE 2) with global references
lang_section = lang_section.replace('POS_LABELS_EN', 'window.HSK_POS_LABELS_EN')
lang_section = lang_section.replace('POS_LABELS_RU', 'window.HSK_POS_LABELS_RU')

# applyAlphaFilter + currentAlpha are now in filter.js — use window._hsk bridge
lang_section = lang_section.replace(
    'if(currentAlpha !== \'all\'){ applyAlphaFilter(\'all\'); }',
    'if(window._hsk && window._hsk.getCurrentAlpha && window._hsk.getCurrentAlpha() !== \'all\'){\n'
    '    if(window._hsk.applyAlphaFilter) window._hsk.applyAlphaFilter(\'all\');\n'
    '  }'
)

LANG_BODY = (
    lang_section
    + '\n'
    + '/* ── Expose language internals via window._hsk ── */\n'
    + 'window._hsk = window._hsk || {};\n'
    + 'window._hsk.getLang = function(){ return currentLang; };\n'
)

LANG_HEADER = file_header(
    'js/lang.js — RU / EN language switching',
    description='',
    inp='localStorage hsk_lang; #btn-lang-toggle; window.HSK_SECTION_NAMES_EN/RU; '
        'window.HSK_POS_LABELS_EN/RU',
    action='setLang() swaps body.lang-en and translates ~30 UI strings; '
           'DOMContentLoaded applies saved language and wires toggle button',
    out='body.lang-en class; DOM text of toolbar/TOC/headings; localStorage hsk_lang; '
        'window._hsk.getLang'
)

lang_content = LANG_HEADER + iife_wrap(LANG_BODY)

with open(os.path.join(JS_DIR, 'lang.js'), 'w', encoding='utf-8') as f:
    f.write(lang_content)
print('Written: js/lang.js')


# ══════════════════════════════════════════════════════════════════════════════
# 5.  sort.js
# ══════════════════════════════════════════════════════════════════════════════

# applySort (1784-1832): renum → window._hsk.renum, rebuildView → window._hsk.rebuildView
apply_sort = L(1784, 1832)
apply_sort = re.sub(r'\brenum\(tb\)', 'window._hsk.renum(tb)', apply_sort)
apply_sort = re.sub(r'\brebuildView\(\)', 'window._hsk.rebuildView()', apply_sort)

# updateDragState (1836-1842): searchActive → body class check
update_drag = L(1836, 1842)
update_drag = update_drag.replace(
    'var disable = searchActive || currentSort',
    'var disable = document.body.classList.contains(\'searching\') || currentSort'
)

# Sort button wiring + drag integration (1844-1875):
# rd.change listener calls rebuildView() directly → window._hsk.rebuildView()
sort_wiring = L(1844, 1875)
sort_wiring = re.sub(
    r'\belse rebuildView\(\)',
    'else window._hsk.rebuildView()',
    sort_wiring
)

SORT_BODY = (
    'var _origOrder = window._cdxOrigOrder || {};\n\n'
    + L(1602, 1644) # currentSort, getTbodiesForSort, sortRows, sortRowsByHsk
    + '\n'
    + apply_sort    # applySort (modified)
    + '\n'
    + update_drag   # updateDragState (modified)
    + '\n'
    + sort_wiring   # sort button wiring + drag integration DOMContentLoaded
    + '\n'
    + '/* ── Expose sort internals via window._hsk ── */\n'
    + 'window._hsk = window._hsk || {};\n'
    + 'window._hsk.applySort        = applySort;\n'
    + 'window._hsk.getCurrentSort   = function(){ return currentSort; };\n'
    + 'window._hsk.sortRows         = sortRows;\n'
    + 'window._hsk.sortRowsByHsk    = sortRowsByHsk;\n'
    + 'window._hsk.updateDragState  = updateDragState;\n'
    + 'window._hsk.getTbodiesForSort = getTbodiesForSort;\n'
)

SORT_HEADER = file_header(
    'js/sort.js — Sort modes and drag state',
    description='',
    inp='sort button clicks; data-py/data-radical/data-component/data-hsk on rows; '
        'window._cdxOrigOrder; window._cdxSortables',
    action='applySort() reorders rows within each tbody by chosen key; '
           'updateDragState() disables/enables Sortable when search or sort is active; '
           'DOMContentLoaded wires sort buttons and the "by section" checkbox',
    out='DOM row order; window._hsk.applySort/.getCurrentSort/.sortRows/.updateDragState'
)

sort_content = SORT_HEADER + iife_wrap(SORT_BODY)

with open(os.path.join(JS_DIR, 'sort.js'), 'w', encoding='utf-8') as f:
    f.write(sort_content)
print('Written: js/sort.js')


# ══════════════════════════════════════════════════════════════════════════════
# 6.  filter.js
# ══════════════════════════════════════════════════════════════════════════════

# Basic doSearch + stripTones from IIFE 1 (lines 238-268)
basic_search = L(238, 268)

# cdxDoSearch / buildFilteredView section (1211-1311)
cdx_search = L(1211, 1311)
# buildFilteredView uses currentLang → window._hsk.getLang()
cdx_search = cdx_search.replace(
    "var _en = currentLang==='en';",
    "var _en = (window._hsk && window._hsk.getLang ? window._hsk.getLang() : 'ru') === 'en';"
)

# HSK filter + counters + renumVisible (1313-1432)
hsk_filter = L(1313, 1432)

# POS filter + alpha filter (1645-1700)
pos_alpha = L(1645, 1700)
# Remove local var POS_LABELS (they're referenced from window.HSK_POS_LABELS_* in lang.js;
# here in applyPOSFilter we don't need them)
# applyPOSFilter doesn't use POS_LABELS_RU/EN — it just toggles classes. Fine as-is.
# applyAlphaFilter uses body.lang-en class, not currentLang var. Fine as-is.

# rebuildView (1702-1782)
rebuild_view = L(1702, 1782)
# currentSort → window._hsk.getCurrentSort()
rebuild_view = re.sub(
    r'\bcurrentSort\b',
    'window._hsk.getCurrentSort()',
    rebuild_view
)
# sortRows( → window._hsk.sortRows(
rebuild_view = re.sub(r'\bsortRows\(', 'window._hsk.sortRows(', rebuild_view)
# sortRowsByHsk( → window._hsk.sortRowsByHsk(
rebuild_view = re.sub(r'\bsortRowsByHsk\(', 'window._hsk.sortRowsByHsk(', rebuild_view)
# updateDragState() → window._hsk.updateDragState()
rebuild_view = re.sub(r'\bupdateDragState\(\)', 'window._hsk.updateDragState()', rebuild_view)
# Fix: local stripTones inside rebuildView was also renamed above — revert that
# (rebuildView defines its own local stripTones)
# The function body has: function stripTones(s){ ... } and then uses stripTones(q)
# These references are LOCAL to the function, not the outer-scope ones — no change needed
# BUT the regex above would have also changed stripTones if it were there.
# Let's verify: rebuildView doesn't call outer stripTones (has its own local), so OK.

FILTER_BODY = (
    basic_search      # stripTones + doSearch (basic, replaced by cdxDoSearch on DOMContentLoaded)
    + '\n'
    + cdx_search      # searchActive, buildFilteredView, cdxDoSearch, event re-wiring
    + '\n'
    + hsk_filter      # activeHSKLevels, applyHSKFilter, updateEmptyGroups,
                      # updateWordCount, getVisibleRowCount, renumVisible
    + '\n'
    + pos_alpha       # currentPOS, applyPOSFilter, currentAlpha, applyAlphaFilter
    + '\n'
    + rebuild_view    # rebuildView (modified)
    + '\n'
    + '/* ── Expose filter internals via window._hsk ── */\n'
    + 'window._hsk = window._hsk || {};\n'
    + 'window._hsk.rebuildView      = rebuildView;\n'
    + 'window._hsk.stripTones       = stripTones;\n'
    + 'window._hsk.applyAlphaFilter = applyAlphaFilter;\n'
    + 'window._hsk.getCurrentAlpha  = function(){ return currentAlpha; };\n'
    + 'window._hsk.renumVisible     = renumVisible;\n'
    + 'window._hsk.getVisibleRowCount = getVisibleRowCount;\n'
    + 'window._hsk.updateWordCount  = updateWordCount;\n'
)

FILTER_HEADER = file_header(
    'js/filter.js — Search, HSK/POS/alpha filters, rebuildView',
    description='',
    inp='#search-input, #search-lang, .hsk-btn, .pos-btn, .alpha-btn; '
        'data-hsk/data-py/data-ru/data-en on rows; window._hsk.getCurrentSort/sortRows etc.',
    action='stripTones/doSearch for basic search; cdxDoSearch builds flat filtered-view '
           'table for EN mode; HSK/POS/alpha filters add hide classes; '
           'rebuildView is the single entry point that applies all active filters + sort',
    out='sr-hide/hsk-hide/pos-hide/alpha-hide on rows; #filtered-view table; '
        '#hsk-count-val; window._hsk.rebuildView/.renumVisible/.stripTones etc.'
)

filter_content = FILTER_HEADER + iife_wrap(FILTER_BODY)

with open(os.path.join(JS_DIR, 'filter.js'), 'w', encoding='utf-8') as f:
    f.write(filter_content)
print('Written: js/filter.js')


# ══════════════════════════════════════════════════════════════════════════════
# 7.  Rewrite js/hsk.js (keep only core state layer)
# ══════════════════════════════════════════════════════════════════════════════

# ── IIFE 1 core (lines 12-135: wMap, renum, updVis, save, restore, preload, checkbox)
iife1_core = L(12, 135)

# ── updateHSKStats + badge injection (187-237) — kept because save() calls updateHSKStats
badge_stats = L(187, 237)

# ── trans-cell tag + drag handle injection (580-602) — needed before Sortable init
drag_handles = L(580, 602)

# ── Expose renum from IIFE 1 (before IIFE 1 closes)
bridge_iife1 = (
    '\n/* ── Expose core internals for cross-file use ── */\n'
    'window._hsk = window._hsk || {};\n'
    'window._hsk.renum = renum;\n'
    'window._hsk.updateHSKStats = updateHSKStats;\n'
)

iife1_content = (
    L(1, 11)         # file header comment (updated below)
    + '(function(){\n'
    + '"use strict";\n'
    + 'var LS=window.HSK_LS;\n'
    + 'var lT=document.getElementById(\'learned-tbody\'),lS=document.getElementById(\'learned-section\');\n'
    + 'var fT=document.getElementById(\'fam-tbody\'),fS=document.getElementById(\'fam-section\');\n'
    + '\n'
)

# Actually let's just take the raw IIFE 1 body (12-135 includes the opening and all vars)
# Line 12 is `(function(){`
# We need lines 12..135 + badge_stats (187-237) + drag_handles (580-602) + bridge + `})();`

iife1_full = (
    iife1_core         # (function(){ ... through line 135
    + '\n'
    + badge_stats      # updateHSKStats + badge injection
    + '\n'
    + drag_handles     # trans-cell + drag handles
    + bridge_iife1     # expose renum + updateHSKStats
    + '})();\n'        # close IIFE 1
)

# ── Standalone: _cdxOrigOrder + Sortable.js + Sortable init (758-851)
# Modify Sortable init IIFE to use window._hsk.*
sortable_section = L(758, 851)
sortable_section = re.sub(r'\brenumVisible\(\)', 'window._hsk.renumVisible()', sortable_section)
sortable_section = sortable_section.replace(
    'renumVisible(); updateWordCount(getVisibleRowCount());',
    'if(window._hsk.renumVisible) window._hsk.renumVisible();\n'
    '          if(window._hsk.updateWordCount) window._hsk.updateWordCount(window._hsk.getVisibleRowCount ? window._hsk.getVisibleRowCount() : 0);'
)

# ── IIFE 2 (kept parts only)
# Open + _origOrder + populate data-en (853-887)
iife2_open = L(853, 887)

# cdxConfirm + Sortable patch (1877-1941)
iife2_tail = L(1877, 1941)
# Update Sortable patch calls
iife2_tail = re.sub(r'\brenumVisible\(\)', 'if(window._hsk.renumVisible) window._hsk.renumVisible()', iife2_tail)
iife2_tail = iife2_tail.replace(
    'renumVisible(); updateWordCount(getVisibleRowCount());',
    'if(window._hsk.renumVisible) window._hsk.renumVisible();\n'
    '        if(window._hsk.updateWordCount) window._hsk.updateWordCount(window._hsk.getVisibleRowCount ? window._hsk.getVisibleRowCount() : 0);'
)
iife2_tail = re.sub(r'\bupdateDragState\(\)', 'if(window._hsk.updateDragState) window._hsk.updateDragState()', iife2_tail)

# Extended window._hsk bridge (replaces lines 1943-1949)
new_bridge = (
    '\n/* ── window._hsk bridge — extended after split ─────────────────────────────\n'
    '   renum: from IIFE 1 (set above)\n'
    '   confirm: cdxConfirm (defined in this IIFE)\n'
    '   getLang, getTtsVolume, rebuildView etc.: set by their respective files\n'
    '   ────────────────────────────────────────────────────────────────────────────── */\n'
    'window._hsk = window._hsk || {};\n'
    'window._hsk.confirm = cdxConfirm;\n'
)

iife2_full = (
    iife2_open
    + iife2_tail
    + new_bridge
    + '})();\n'  # close IIFE 2
)

NEW_HSK_HEADER = (
    '/* ==========================================================================\n'
    '   js/hsk.js — Core state layer (word map, learn/fam state, drag init)\n\n'
    '   INPUT:  window.HSK_LS (app-config.js); rendered DOM word rows;\n'
    '           localStorage for learn/fam state and row order\n'
    '   ACTION: builds wMap word index; restores learned/familiar state;\n'
    '           computes HSK stats; injects drag handles; inits Sortable;\n'
    '           populates data-en; exposes window._hsk.renum/.confirm\n'
    '   OUTPUT: DOM mutations; localStorage writes; window._hsk bridge;\n'
    '           window._cdxOrigOrder; window._cdxSortables\n\n'
    '   Split-out files (load after this):\n'
    '     tts.js palette.js lang.js sort.js filter.js ui.js\n'
    '   ========================================================================== */\n'
)

new_hsk = (
    NEW_HSK_HEADER
    + iife1_full
    + '\n'
    + sortable_section
    + '\n'
    + iife2_full
)

with open(HSK_JS, 'w', encoding='utf-8') as f:
    f.write(new_hsk)
print('Written: js/hsk.js (trimmed)')


# ══════════════════════════════════════════════════════════════════════════════
# 8.  Update index.html script tags
# ══════════════════════════════════════════════════════════════════════════════

with open(INDEX, encoding='utf-8') as f:
    html = f.read()

OLD_HSK_TAG = '<script src="js/hsk.js"></script>'
NEW_TAGS = (
    '<script src="js/hsk.js"></script>\n'
    '    <script src="js/tts.js"></script>\n'
    '    <script src="js/ui.js"></script>\n'
    '    <script src="js/palette.js"></script>\n'
    '    <script src="js/lang.js"></script>\n'
    '    <script src="js/sort.js"></script>\n'
    '    <script src="js/filter.js"></script>'
)

if OLD_HSK_TAG in html:
    html = html.replace(OLD_HSK_TAG, NEW_TAGS)
    with open(INDEX, 'w', encoding='utf-8') as f:
        f.write(html)
    print('Updated: index.html script tags')
else:
    print('WARNING: Could not find hsk.js script tag in index.html — update manually')

print('\nDone! Load order: hsk.js → tts.js → ui.js → palette.js → lang.js → sort.js → filter.js')
print('Then: storage.js → export.js → quiz.js → hanzi.js → text-topics.js')
