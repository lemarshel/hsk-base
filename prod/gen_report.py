"""Generate codebase report 2.docx — run from project root."""
import datetime
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

OUT = Path(__file__).parent.parent / "codebase report 2.docx"
doc = Document()

section = doc.sections[0]
section.page_width = Inches(8.5); section.page_height = Inches(11)
section.left_margin = section.right_margin = Inches(1)
section.top_margin  = section.bottom_margin = Inches(1)

RED    = RGBColor(0xe9, 0x45, 0x60)
NAVY   = RGBColor(0x1a, 0x1a, 0x2e)
ORANGE = RGBColor(0xf3, 0x9c, 0x12)
GREEN  = RGBColor(0x27, 0xae, 0x60)
CRIT   = RGBColor(0xe7, 0x4c, 0x3c)

def h1(t):
    p = doc.add_paragraph(); run = p.add_run(t)
    run.bold = True; run.font.size = Pt(18); run.font.color.rgb = NAVY
def h2(t):
    p = doc.add_paragraph(); run = p.add_run(t)
    run.bold = True; run.font.size = Pt(13); run.font.color.rgb = RED
def body(t, indent=0):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(indent * 0.3)
    p.add_run(t).font.size = Pt(11)
def sep(): doc.add_paragraph()

def score_table(rows_data):
    t = doc.add_table(rows=1, cols=5); t.style = "Table Grid"
    for i, h in enumerate(["Category","Score","Max","%","Notes"]):
        c = t.rows[0].cells[i]; c.text = h
        c.paragraphs[0].runs[0].bold = True
    for label, score, mx, note in rows_data:
        row = t.add_row().cells
        row[0].text = label; row[1].text = str(score)
        row[2].text = str(mx); row[3].text = f"{round(score/mx*100)}%"
        row[4].text = note
        r = row[1].paragraphs[0].add_run(); r.text = ""
        pct = score / mx
        clr = GREEN if pct >= .75 else (ORANGE if pct >= .5 else CRIT)
        run = row[1].paragraphs[0].runs[0]; run.font.color.rgb = clr

def action_table(rows_data):
    t = doc.add_table(rows=1, cols=3); t.style = "Table Grid"
    for i, h in enumerate(["Priority","Action","Effort"]):
        c = t.rows[0].cells[i]; c.text = h
        c.paragraphs[0].runs[0].bold = True
    PCOLORS = {"CRITICAL": CRIT, "HIGH": ORANGE, "MEDIUM": NAVY, "LOW": GREEN}
    for prio, action, effort in rows_data:
        row = t.add_row().cells
        row[0].text = prio; row[1].text = action; row[2].text = effort
        run = row[0].paragraphs[0].runs[0]
        run.font.color.rgb = PCOLORS.get(prio, NAVY)
        run.bold = (prio in ("CRITICAL","HIGH"))

def file_table(rows_data):
    t = doc.add_table(rows=1, cols=3); t.style = "Table Grid"
    for i, h in enumerate(["File","Folder","Purpose"]):
        c = t.rows[0].cells[i]; c.text = h
        c.paragraphs[0].runs[0].bold = True
    for fname, folder, purpose in rows_data:
        row = t.add_row().cells
        row[0].text = fname; row[1].text = folder; row[2].text = purpose

# ── Title ─────────────────────────────────────────────────────────
doc.add_paragraph()
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("HSK-BASE"); r.bold = True; r.font.size = Pt(32); r.font.color.rgb = RED
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Codebase Review & Scoring Report"); r.font.size = Pt(18); r.font.color.rgb = NAVY
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run(f"Version 2  ·  {datetime.date.today()}").font.size = Pt(12)
doc.add_page_break()

# ── 1. Executive Summary ──────────────────────────────────────────
h1("1. Executive Summary")
body("HSK-Base is a client-side Chinese vocabulary learning app serving 5 369 words (HSK 1–5). "
     "The codebase was recently refactored from a monolithic single-file HTML into a modular "
     "multi-file structure. This report scores the project across eight dimensions and lists "
     "the highest-priority improvements.")
sep()
h2("Overall Scores")
score_table([
    ("Architecture & Modularity",  6, 10, "Improved by refactor; hsk.js is still a 1 688-line monolith"),
    ("Data Pipeline",              5, 10, "Manual build; fragile string anchors; no validation"),
    ("Code Quality",               6, 10, "Good naming; inconsistent ES5 vs modern style"),
    ("Performance",                5, 10, "9 sequential script loads; 1.66 MB index.html; no bundling"),
    ("UI/UX Design",               7, 10, "Palette, HanziWriter, quiz modes excellent; mobile partial"),
    ("Maintainability",            5, 10, "Zero tests; blind-overwrite build; dead code stubs"),
    ("Security & Robustness",      7, 10, "Pure client-side; esc() used; undocumented Google TTS API"),
    ("Documentation",              5, 10, "Block comments added this session; no API docs or tests"),
])
sep()
body("TOTAL: 46 / 80  (57%) — Functional and improving, but structural investment needed before scaling.")
doc.add_page_break()

# ── 2. Architecture ───────────────────────────────────────────────
h1("2. Architecture & Modularity  —  6 / 10")
h2("What Is Good")
body("+ js/ is now properly modular: app-config, storage, export, quiz, hanzi are separate files.", 1)
body("+ window._hsk bridge cleanly exposes internals (getLang, renum, confirm, getTtsVolume).", 1)
body("+ prod/make_test_page.py produces both test and production HTML from one source.", 1)
body("+ data/words.xlsx is the single source of truth; render-words.js builds DOM at runtime.", 1)
sep()
h2("Critical Issues")
body("- js/hsk.js (1 688 lines, two nested IIFEs) is still a monolith. IIFE 1 alone covers TTS, "
     "font controls, checkbox handling, drag, search, column toggle — all in one shared scope.", 1)
body("- Dead code stub at line ~519 (old CSV handler wrapped in if(_REMOVED_CSV) return).", 1)
body("- index.html contains ~20 lines of inline <style> that belong in hsk.css.", 1)
body("- tracker.js embeds a 5 357-word WORD_ID_MAP + 40-topic map as raw JS (~60 KB inline data), "
     "blocking main-thread parsing.", 1)
body("- SortableJS is inlined inside hsk.js AND served as js/vendor/sortable.min.js — potential double parse.", 1)
sep()
h2("Recommended Actions")
body("-> Split hsk.js into: tts.js, filter.js, sort.js, lang.js, palette.js, ui.js (each < 250 lines).", 1)
body("-> Delete the dead CSV stub entirely.", 1)
body("-> Move inline <style> from index.html into hsk.css.", 1)
body("-> Move tracker.js embedded data to tracker-data.json; load with fetch() on demand.", 1)
body("-> Remove SortableJS inline copy from hsk.js — it already lives in js/vendor/.", 1)
doc.add_page_break()

# ── 3. Data Pipeline ──────────────────────────────────────────────
h1("3. Data Pipeline  —  5 / 10")
h2("What Is Good")
body("+ words.xlsx is a single editable source for all 5 369 words.", 1)
body("+ make_test_page.py correctly inlines data as window.HSK_WORDS at build time.", 1)
body("+ render-words.js is a clean, fast DOM builder that reads all data-* attributes.", 1)
sep()
h2("Critical Issues")
body("- Pipeline is entirely manual: developer must remember to run make_test_page.py after every xlsx change. "
     "No watch mode, no CI trigger.", 1)
body("- MARKER_SORTABLE and other string anchors in make_test_page.py are fragile — a hand-edit of "
     "index.html breaks the build silently.", 1)
body("- data/groups-data.js and data/words.json are generated artefacts committed to git; they can "
     "drift from words.xlsx.", 1)
body("- Three prod scripts (migrate.py, xlsx_to_json.py, extract_config.py) are one-time tools with "
     "no guard preventing re-runs.", 1)
body("- No schema validation on words.xlsx — missing HSK level or malformed pinyin silently produces bad UI.", 1)
sep()
h2("Recommended Actions")
body("-> Add a Makefile or package.json so 'make' is the single build command.", 1)
body("-> Add --check flag to make_test_page.py verifying MARKER strings before writing.", 1)
body("-> Add validate_words.py: check required columns, hsk range 1-5, non-empty pinyin.", 1)
body("-> gitignore data/words.json (generated); clearly mark groups-data.js as generated.", 1)
doc.add_page_break()

# ── 4. Code Quality ───────────────────────────────────────────────
h1("4. Code Quality  —  6 / 10")
h2("What Is Good")
body("+ Naming is semantically clear: wMap, lT/fT, _rowVisible, _elText, chunkTTS.", 1)
body("+ Event delegation (body 'change' listener) correctly handles dynamic rows.", 1)
body("+ chunkTTS() correctly splits long text at punctuation for SpeechSynthesis limits.", 1)
body("+ TTS has a proper fallback chain: Web SpeechSynthesis -> Google TTS API.", 1)
sep()
h2("Critical Issues")
body("- Style is inconsistent: IIFE 1 uses heavily minified one-liners; IIFE 2 is readable and spaced. "
     "Both are in the same file.", 1)
body("- ES5 var throughout. No const/let, no arrow functions in a 2025 project.", 1)
body("- rebuildView() (~163 lines) does filtering, DOM mutation, renumbering, section merging, and stat "
     "updates — violates single responsibility.", 1)
body("- updateHSKStats() is called from three places with no debounce — runs multiple times per user action.", 1)
body("- Repeated querySelector calls re-query the same elements (e.g. hsk-stats-bar) on every change event.", 1)
sep()
h2("Recommended Actions")
body("-> Upgrade to ES6+: const/let, arrow functions, template literals.", 1)
body("-> Break rebuildView() into applyFilters(), applySort(), renumberRows().", 1)
body("-> Cache frequently queried elements in module-level variables.", 1)
body("-> Debounce updateHSKStats() with a 50 ms timer.", 1)
doc.add_page_break()

# ── 5. Performance ────────────────────────────────────────────────
h1("5. Performance  —  5 / 10")
h2("What Is Good")
body("+ hsk-head.js / hsk-body.js apply theme and language before first paint — no FOUC.", 1)
body("+ No heavy runtime framework (React/Vue); pure JS.", 1)
body("+ colorPinyin() and badge injection run once at DOMContentLoaded, not on every render.", 1)
sep()
h2("Critical Issues")
body("- 9 sequential <script> tags with no bundling. Each is a separate HTTP round-trip.", 1)
body("- index.html is ~1.66 MB of inlined word HTML parsed by the browser on every load.", 1)
body("- tracker.js (~60 KB of inline JS objects) parsed on main thread even before the user opens the tracker.", 1)
body("- rebuildView() does a full DOM re-scan of all 5 369 rows on every filter or sort change.", 1)
body("- SortableJS is inlined in hsk.js AND in js/vendor/ — potentially parsed twice.", 1)
sep()
h2("Recommended Actions")
body("-> Bundle all JS with esbuild or Rollup into a single main.js (target < 200 KB gzip).", 1)
body("-> Replace inline word HTML with a lazy fetch('data/words.json') + render-words.js call.", 1)
body("-> Move tracker data to tracker-data.json, fetched only when the tracker panel is opened.", 1)
body("-> Remove the SortableJS inline copy from hsk.js.", 1)
doc.add_page_break()

# ── 6. UI/UX ─────────────────────────────────────────────────────
h1("6. UI/UX Design  —  7 / 10")
h2("What Is Good")
body("+ 15-palette color system with real-time preview and flash-free preloading is excellent.", 1)
body("+ Flashcard + MCQ quiz modes with keyboard shortcuts (Space, Arrows, Esc, 1-4) are well built.", 1)
body("+ HanziWriter popup with stroke animation and practice quiz mode is a high-value feature.", 1)
body("+ Column visibility toggle, snapshot system, drag-to-reorder add real power-user value.", 1)
sep()
h2("Issues")
body("- The subtitle links to mindmap.html which does not exist — broken link in production.", 1)
body("- Filtered-view flat table (EN mode) duplicates DOM state; sync bugs possible.", 1)
body("- No quiz/flashcard session persistence — closing overlay loses score.", 1)
body("- Mobile: hamburger opens toolbar but tap targets (checkboxes, filter chips) are too small.", 1)
sep()
h2("Recommended Actions")
body("-> Remove or stub out the mindmap.html link immediately.", 1)
body("-> Replace the flat filtered-view table with a CSS :not(.sr-hide) approach.", 1)
body("-> Persist quiz session score in sessionStorage so accidental close doesn't lose progress.", 1)
doc.add_page_break()

# ── 7. Maintainability ────────────────────────────────────────────
h1("7. Maintainability  —  5 / 10")
h2("What Is Good")
body("+ Build pipeline is reproducible: same xlsx always produces same HTML.", 1)
body("+ non-usables/ cleanly separates historical artefacts from active code.", 1)
body("+ window._hsk bridge is a testable seam for extracted modules.", 1)
sep()
h2("Critical Issues")
body("- Zero automated tests. No unit tests for helpers, no integration tests, no smoke tests.", 1)
body("- make_test_page.py blind-overwrites index.html — a bad run during uncommitted edits destroys work.", 1)
body("- Three one-time prod scripts have no --dry-run mode and no re-run guard.", 1)
body("- hsk.js has no module boundary — all vars in IIFE 1 are implicitly shared across 1 688 lines.", 1)
sep()
h2("Recommended Actions")
body("-> Add 10+ unit tests for pure helpers using node:test or vitest.", 1)
body("-> make_test_page.py: write to temp file, diff, then replace — never blind-overwrite.", 1)
body("-> Add # ONE-TIME: DO NOT RE-RUN header to migrate.py, xlsx_to_json.py, extract_config.py.", 1)
body("-> Add CHANGELOG.md.", 1)
doc.add_page_break()

# ── 8. Security ───────────────────────────────────────────────────
h1("8. Security & Robustness  —  7 / 10")
h2("What Is Good")
body("+ Entirely client-side — no server attack surface.", 1)
body("+ render-words.js uses esc() consistently; no XSS via word data.", 1)
body("+ localStorage access is try/caught in hsk-head.js and hsk-body.js.", 1)
body("+ TTS fallback handles browser incompatibilities gracefully.", 1)
sep()
h2("Issues")
body("- playFallbackTTS() calls translate.googleapis.com — undocumented API, can break without notice, "
     "leaks vocabulary queries to Google.", 1)
body("- Snapshot system has no localStorage size guard; 5 369 words * 50 snapshots could exceed 5 MB limit.", 1)
body("- Font-family CSS is built by string concatenation of localStorage values (prefs.fz). "
     "A crafted value could inject arbitrary CSS.", 1)
sep()
h2("Recommended Actions")
body("-> Sanitize font-family values against a whitelist before injecting into <style>.", 1)
body("-> Add a localStorage size check before writing snapshots; warn at 4 MB.", 1)
body("-> Replace Google TTS fallback with a supported TTS service or remove it.", 1)
doc.add_page_break()

# ── 9. Priority Action List ───────────────────────────────────────
h1("9. Priority Action List")
body("Ranked by impact vs. effort:")
sep()
action_table([
    ("CRITICAL", "Delete dead CSV stub in hsk.js (~line 519)",                "5 min"),
    ("CRITICAL", "Remove broken mindmap.html link from index.html",            "5 min"),
    ("HIGH",     "Move inline <style> from index.html into hsk.css",           "1 hour"),
    ("HIGH",     "Remove SortableJS inline copy from hsk.js",                  "30 min"),
    ("HIGH",     "Add validate_words.py to catch bad xlsx data before build",  "2 hours"),
    ("HIGH",     "Move tracker.js embedded data to tracker-data.json",         "2 hours"),
    ("MEDIUM",   "Split hsk.js: tts.js / filter.js / sort.js / lang.js / ui.js", "1 day"),
    ("MEDIUM",   "Bundle JS with esbuild (single request, <200 KB gz)",        "4 hours"),
    ("MEDIUM",   "Break rebuildView() into focused functions",                 "2 hours"),
    ("MEDIUM",   "make_test_page.py safe temp-write + --check flag",           "2 hours"),
    ("LOW",      "Upgrade codebase to ES6+ (const/let, arrows)",               "2 days"),
    ("LOW",      "Add unit tests for pure helpers",                             "1 day"),
    ("LOW",      "Replace Google TTS fallback with a supported API",           "4 hours"),
    ("LOW",      "Add CHANGELOG.md + mark one-time scripts",                   "1 hour"),
])
doc.add_page_break()

# ── 10. File Inventory ────────────────────────────────────────────
h1("10. Active File Inventory")
file_table([
    ("index.html",                    "root",       "Production app + inlined word HTML (1.66 MB)"),
    ("css/hsk.css",                   "css/",       "All styles: layout, themes, filters, overlays (733 lines)"),
    ("js/hsk-head.js",                "js/",        "Pre-paint: theme + palette + font CSS (runs in <head>)"),
    ("js/hsk-body.js",                "js/",        "Pre-paint: language + column visibility (runs at <body>)"),
    ("js/app-config.js",              "js/",        "Global constants: LS keys, colors, palettes, POS labels"),
    ("js/hsk.js",                     "js/",        "Main app: word map, TTS, search, filter, sort, lang — 1688 lines"),
    ("js/storage.js",                 "js/",        "Snapshot save / restore / reset; uses window._hsk bridge"),
    ("js/export.js",                  "js/",        "Excel (SheetJS) + JSON export with filter awareness"),
    ("js/quiz.js",                    "js/",        "Flashcard + MCQ quiz; uses window._hsk.getTtsVolume()"),
    ("js/hanzi.js",                   "js/",        "HanziWriter stroke animation popup + practice mode"),
    ("js/render-words.js",            "js/",        "Builds all <table>/<tr> DOM from HSK_WORDS + HSK_GROUPS"),
    ("js/text-topics.js",             "js/",        "Static map: topic ID 1-40 -> English topic name"),
    ("js/tracker.js",                 "js/",        "Learner event tracker; embeds 5357-word map + 40 topics"),
    ("js/vendor/sortable.min.js",     "js/vendor/", "SortableJS 1.15.2 — drag-to-reorder rows"),
    ("js/vendor/hanzi-writer.min.js", "js/vendor/", "HanziWriter — animated stroke-order popup library"),
    ("data/words.xlsx",               "data/",      "SOURCE OF TRUTH: 5369 words, translations, examples"),
    ("data/groups-data.js",           "data/",      "Generated: phonetic group metadata for render-words.js"),
    ("data/words.json",               "data/",      "Generated: machine-readable word export"),
    ("prod/make_test_page.py",        "prod/",      "BUILD SCRIPT: inlines xlsx data into index.html + test/"),
    ("prod/xlsx_to_json.py",          "prod/",      "Converts words.xlsx to data/words.json"),
    ("prod/migrate.py",               "prod/",      "ONE-TIME: extracted word HTML from old monolith"),
    ("prod/extract_config.py",        "prod/",      "ONE-TIME: extracted constants into app-config.js"),
    ("plan.md",                       "root",       "Project plan and roadmap"),
    ("README.md",                     "root",       "Public-facing project description"),
])

doc.save(str(OUT))
print(f"Saved: {OUT}")
