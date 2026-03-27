"""
Step 1 only: extract pure constants from hsk.js into js/app-config.js.

Rules:
  - Zero behaviour change. Execution order of hsk.js is unchanged.
  - Only constants are moved. Functions, DOM hooks, event listeners
    stay exactly where they are.
  - Every moved constant is replaced with a one-liner alias in hsk.js
    so the rest of hsk.js keeps working without any other edits.
  - app-config.js is loaded BEFORE hsk.js in index.html (one new line).

Run from project root:  python prod/extract_config.py
"""

import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
HSK_JS   = ROOT / "hsk.js"
CFG_JS   = ROOT / "js" / "app-config.js"
IDX_HTML = ROOT / "index.html"

src = HSK_JS.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# Helper: extract a block that starts with `start_marker` and ends just
# before `end_marker`.  Returns (extracted_text, src_with_block_removed).
# ─────────────────────────────────────────────────────────────────────────────
def cut_block(text, start_marker, end_marker):
    si = text.find(start_marker)
    if si == -1:
        raise ValueError(f"start_marker not found: {start_marker!r}")
    ei = text.find(end_marker, si)
    if ei == -1:
        raise ValueError(f"end_marker not found after start: {end_marker!r}")
    extracted = text[si:ei]
    remaining = text[:si] + text[ei:]
    return extracted, remaining

# ─────────────────────────────────────────────────────────────────────────────
# 1.  EN_DICT  (window.EN_DICT = { ... };)
#     Starts: /* ── EN_DICT ... */\nwindow.EN_DICT = {
#     Ends just before: \n\n/* ── Populate data-en on page load
# ─────────────────────────────────────────────────────────────────────────────
EN_DICT_START = "/* ── EN_DICT ──────────────────────────────────────────────────────────────── */"
EN_DICT_END   = "\n\n/* ── Populate data-en on page load"

en_dict_block, src = cut_block(src, EN_DICT_START, EN_DICT_END)
# Remove the section comment from the extracted block so we can re-emit it
# in app-config.js with better formatting.
en_dict_content = en_dict_block  # keep the comment+definition intact

# ─────────────────────────────────────────────────────────────────────────────
# 2.  Manual EN_DICT overrides  (6 lines after the Palette comment)
#     These come right after "/* ── Palette ... */" up to the blank line
#     before "var PALETTES"
# ─────────────────────────────────────────────────────────────────────────────
OVERRIDES_START = "/* ── Manual EN overrides for words not in EN_DICT ───────────────── */"
OVERRIDES_END   = "\n\nvar PALETTES"

overrides_block, src = cut_block(src, OVERRIDES_START, OVERRIDES_END)
# src now has the gap; we need to restore the \n\nvar PALETTES marker (we
# only cut up to it, not including it, so it's still in src).

# ─────────────────────────────────────────────────────────────────────────────
# 3.  PALETTES object  (var PALETTES = { ... };)
#     Replace with alias: var PALETTES = window.HSK_PALETTES;
# ─────────────────────────────────────────────────────────────────────────────
PAL_START = "var PALETTES = {"
PAL_END   = "};\n\nfunction applyPalette"

pi = src.find(PAL_START)
ei = src.find(PAL_END, pi)
if pi == -1 or ei == -1:
    raise ValueError("PALETTES block not found")

palettes_block = src[pi : ei + len("};\n")]     # "var PALETTES = { ... };"
src = src[:pi] + "var PALETTES = window.HSK_PALETTES;\n" + src[ei + len("};\n"):]

# Clean up the extracted object (strip "var PALETTES = " prefix)
palettes_obj = palettes_block[len("var PALETTES = "):]   # "{ ... };"

# ─────────────────────────────────────────────────────────────────────────────
# 4.  SECTION_NAMES_EN / SECTION_NAMES_RU
#     Replace with aliases.
# ─────────────────────────────────────────────────────────────────────────────
SEC_EN_START = "var SECTION_NAMES_EN = {"
SEC_EN_END   = "};\n"
si = src.find(SEC_EN_START)
ei = src.find(SEC_EN_END, si) + len(SEC_EN_END)
section_en_block = src[si:ei]
section_en_obj   = section_en_block[len("var SECTION_NAMES_EN = "):]
src = src[:si] + "var SECTION_NAMES_EN = window.HSK_SECTION_NAMES_EN;\n" + src[ei:]

SEC_RU_START = "var SECTION_NAMES_RU = {"
SEC_RU_END   = "};\n"
si = src.find(SEC_RU_START)
ei = src.find(SEC_RU_END, si) + len(SEC_RU_END)
section_ru_block = src[si:ei]
section_ru_obj   = section_ru_block[len("var SECTION_NAMES_RU = "):]
src = src[:si] + "var SECTION_NAMES_RU = window.HSK_SECTION_NAMES_RU;\n" + src[ei:]

# ─────────────────────────────────────────────────────────────────────────────
# 5.  POS_LABELS_RU / POS_LABELS_EN
# ─────────────────────────────────────────────────────────────────────────────
POS_RU_START = "var POS_LABELS_RU = {"
POS_RU_END   = "};\n"
si = src.find(POS_RU_START)
ei = src.find(POS_RU_END, si) + len(POS_RU_END)
pos_ru_block = src[si:ei]
pos_ru_obj   = pos_ru_block[len("var POS_LABELS_RU = "):]
src = src[:si] + "var POS_LABELS_RU = window.HSK_POS_LABELS_RU;\n" + src[ei:]

POS_EN_START = "var POS_LABELS_EN = {"
POS_EN_END   = "};\n"
si = src.find(POS_EN_START)
ei = src.find(POS_EN_END, si) + len(POS_EN_END)
pos_en_block = src[si:ei]
pos_en_obj   = pos_en_block[len("var POS_LABELS_EN = "):]
src = src[:si] + "var POS_LABELS_EN = window.HSK_POS_LABELS_EN;\n" + src[ei:]

# ─────────────────────────────────────────────────────────────────────────────
# 6.  LS storage-key map  (first IIFE, line ~9)
#     var LS={L:'hsk_learned',F:'hsk_fam',M:'hsk_mode',P:'hsk_prefs'};
#     Replace with: var LS=window.HSK_LS;
# ─────────────────────────────────────────────────────────────────────────────
LS_OLD = "var LS={L:'hsk_learned',F:'hsk_fam',M:'hsk_mode',P:'hsk_prefs'};"
LS_NEW = "var LS=window.HSK_LS; // storage keys — defined in js/app-config.js"
if LS_OLD not in src:
    raise ValueError("LS definition not found")
src = src.replace(LS_OLD, LS_NEW, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 7.  HSK level colours  (inline in updateHSKStats)
#     var colors = {1:'#27ae60',2:'#2ecc71',3:'#f39c12',4:'#e67e22',5:'#e74c3c',6:'#8e44ad'};
#     Replace with alias.
# ─────────────────────────────────────────────────────────────────────────────
COLORS_OLD = "var colors = {1:'#27ae60',2:'#2ecc71',3:'#f39c12',4:'#e67e22',5:'#e74c3c',6:'#8e44ad'};"
COLORS_NEW = "var colors = window.HSK_LEVEL_COLORS;"
if COLORS_OLD not in src:
    raise ValueError("HSK level colors not found")
src = src.replace(COLORS_OLD, COLORS_NEW, 1)

# ─────────────────────────────────────────────────────────────────────────────
# Write modified hsk.js
# ─────────────────────────────────────────────────────────────────────────────
HSK_JS.write_text(src, encoding="utf-8")
print(f"hsk.js rewritten  ({len(src):,} chars)")

# ─────────────────────────────────────────────────────────────────────────────
# Build js/app-config.js
# ─────────────────────────────────────────────────────────────────────────────
config_lines = [
    "/* ==========================================================================",
    "   js/app-config.js — All application constants for HSK Base.",
    "",
    "   PURPOSE",
    "     Single source of truth for every constant that was previously",
    "     duplicated or buried inside hsk.js.  No behaviour here — only data.",
    "",
    "   DEPENDS ON",
    "     Nothing.  Must be the first custom script loaded.",
    "",
    "   MUST STAY COMPATIBLE WITH",
    "     hsk.js  — references window.EN_DICT, window.HSK_PALETTES,",
    "               window.HSK_LS, window.HSK_SECTION_NAMES_EN/RU,",
    "               window.HSK_POS_LABELS_RU/EN, window.HSK_LEVEL_COLORS",
    "     hsk-head.js — references localStorage keys by string (independent)",
    "   ========================================================================== */",
    "",
    "/* ── localStorage key map ────────────────────────────────────────────────────",
    "   Used by hsk.js (as var LS = window.HSK_LS) and by hsk-head.js             */",
    "window.HSK_LS = {",
    "  L: 'hsk_learned',   // learned-words array",
    "  F: 'hsk_fam',       // familiar-words array",
    "  M: 'hsk_mode',      // light | dark | sepia",
    "  P: 'hsk_prefs'      // font/size preferences JSON",
    "};",
    "",
    "/* ── HSK level progress-bar colours ─────────────────────────────────────────",
    "   Consumed by updateHSKStats() in hsk.js                                    */",
    "window.HSK_LEVEL_COLORS = {",
    "  1: '#27ae60',",
    "  2: '#2ecc71',",
    "  3: '#f39c12',",
    "  4: '#e67e22',",
    "  5: '#e74c3c',",
    "  6: '#8e44ad'",
    "};",
    "",
    "/* ── POS section display order ───────────────────────────────────────────────",
    "   Canonical order used by filters, filtered-view, and PDF export            */",
    "window.HSK_POS_ORDER = [",
    "  'pos_noun', 'pos_verb', 'pos_adj', 'pos_adv', 'pos_mw',",
    "  'pos_particle', 'pos_conj', 'pos_prep', 'pos_pron'",
    "];",
    "",
    "/* ── POS filter button labels (short form shown on buttons) ─────────────────",
    "   Consumed by hsk.js POS filter and setLang()                               */",
    "window.HSK_POS_LABELS_RU = " + pos_ru_obj,
    "window.HSK_POS_LABELS_EN = " + pos_en_obj,
    "",
    "/* ── POS section headings (full h2 text) ─────────────────────────────────────",
    "   Consumed by setLang() in hsk.js                                           */",
    "window.HSK_SECTION_NAMES_EN = " + section_en_obj,
    "window.HSK_SECTION_NAMES_RU = " + section_ru_obj,
    "",
    "/* ── Colour palettes ─────────────────────────────────────────────────────────",
    "   Each entry: [accent, dark].  Consumed by applyPalette() in hsk.js         */",
    "window.HSK_PALETTES = " + palettes_obj,
    "",
    "/* ── EN_DICT + manual overrides ──────────────────────────────────────────────",
    "   Built-in English translation dictionary (~5 000 entries).                 ",
    "   Priority when resolving a translation:                                    ",
    "     data-en from words.xlsx  →  EN_DICT fallback  →  empty string           ",
    "   Manual overrides at the bottom correct entries missing from the bulk dict. */",
    en_dict_content,
    "",
    overrides_block,
]

CFG_JS.write_text("\n".join(config_lines), encoding="utf-8")
print(f"js/app-config.js written  ({CFG_JS.stat().st_size:,} bytes)")

# ─────────────────────────────────────────────────────────────────────────────
# Patch index.html: insert <script src="js/app-config.js"> before hsk.js
# ─────────────────────────────────────────────────────────────────────────────
html = IDX_HTML.read_text(encoding="utf-8")
HSK_TAG = '<script src="hsk.js"></script>'
CFG_TAG = '<script src="js/app-config.js"></script>\n'

if CFG_TAG.strip() in html:
    print("index.html: app-config.js already present, skipping")
elif HSK_TAG not in html:
    print("WARNING: <script src=\"hsk.js\"> not found in index.html — add manually")
else:
    html = html.replace(HSK_TAG, CFG_TAG + HSK_TAG, 1)
    IDX_HTML.write_text(html, encoding="utf-8")
    print("index.html: inserted app-config.js script tag before hsk.js")

print("\nDone. Verify test/index.html in browser before proceeding to Step 2.")
