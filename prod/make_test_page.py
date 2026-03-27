"""
Builds both test/index.html (with debug banner) and index.html (production).

Both files are fully self-contained — data inlined from words.xlsx — so they
work when opened via file:// with no server required.

Workflow:
    1. Edit data/words.xlsx
    2. python prod/make_test_page.py
    3. Refresh test/index.html  (or index.html) in the browser

Run from the project root:  python prod/make_test_page.py
"""
import json
from datetime import datetime
from pathlib import Path
import openpyxl

ROOT         = Path(__file__).parent.parent
INDEX_HTML   = ROOT / "index.html"
TEST_OUT     = ROOT / "test" / "index.html"

MARKER_FILTERED_VIEW = '<div id="filtered-view" style="display:none"></div>'
MARKER_FAM_START     = '<div id="fam-section"'
MARKER_LEARNED_START = '<div id="learned-section"'
MARKER_SORTABLE      = '<script src="js/vendor/sortable.min.js">'


def read_words_xlsx():
    wb = openpyxl.load_workbook(ROOT / "data" / "words.xlsx", data_only=True, read_only=True)
    ws = wb["Words"]
    rows    = iter(ws.rows)
    headers = [cell.value for cell in next(rows)]
    words   = []
    for row in rows:
        obj = {}
        for col, cell in zip(headers, row):
            val = cell.value
            if val is None:
                val = 0 if col in ("id", "hsk") else ""
            obj[col] = val
        try:
            obj["hsk"] = int(obj["hsk"]) if obj["hsk"] else 0
        except (TypeError, ValueError):
            obj["hsk"] = 0
        try:
            obj["id"] = int(obj["id"]) if obj["id"] else 0
        except (TypeError, ValueError):
            pass
        for k in ("word", "pinyin", "en", "ru",
                  "example_zh", "example_pinyin", "example_en", "example_ru",
                  "pos", "phonetic_group", "component"):
            obj[k] = str(obj[k]) if obj[k] is not None else ""
        words.append(obj)
    wb.close()
    return words


def build_data_scripts(words, include_banner_js=False):
    groups_js  = (ROOT / "data" / "groups-data.js").read_text(encoding="utf-8")
    render_js  = (ROOT / "js"   / "render-words.js").read_text(encoding="utf-8")
    words_json = json.dumps(words, ensure_ascii=False, separators=(",", ":"))

    extra = ""
    if include_banner_js:
        extra = (
            "\ndocument.addEventListener('DOMContentLoaded',function(){"
            "var b=document.getElementById('test-build-banner');if(!b)return;"
            "b.style.display='block';"
            "var w0=window.HSK_WORDS&&window.HSK_WORDS[0];"
            "var el=document.getElementById('test-banner-js-en');"
            "if(el)el.textContent=w0?(w0.en||'(empty)'):'missing';"
            "var tr=document.querySelector('tbody[id] tr');"
            "var el2=document.getElementById('test-banner-dom-en');"
            "if(el2)el2.textContent=tr?(tr.querySelector('.trans-en')?tr.querySelector('.trans-en').textContent||'(empty)':'no span'):'no rows';"
            "});"
        )

    return (
        "<script>window.HSK_WORDS=" + words_json + ";" + extra + "</script>\n"
        "<script>" + groups_js + "</script>\n"
        "<script>\n" + render_js + "\n</script>\n"
    )


def build_banner(words, build_time):
    w0 = words[0] if words else {}
    return (
        '<div id="test-build-banner" style="display:none;position:fixed;top:0;left:0;right:0;'
        'background:#1a1a2e;color:#e0e0ff;font-family:monospace;font-size:13px;'
        'padding:8px 16px;z-index:99999;border-bottom:2px solid #4f8ef7">'
        '<b>TEST BUILD</b> &nbsp;|&nbsp; ' + build_time +
        ' &nbsp;|&nbsp; ' + str(len(words)) + ' words &nbsp;|&nbsp; '
        'first word [' + (w0.get('word', '') or '') + '] &nbsp; '
        'ru=<b>' + (w0.get('ru', '') or '(empty)') + '</b> &nbsp; '
        'en(xlsx)=<b>' + (w0.get('en', '') or '(empty)') + '</b>'
        ' &nbsp;|&nbsp; en(JS)=<b id="test-banner-js-en">...</b>'
        ' &nbsp;|&nbsp; en(DOM)=<b id="test-banner-dom-en">...</b>'
        '</div>\n'
    )


def find_block_end(html, start_idx):
    end = html.index("</div>\n", start_idx) + len("</div>\n")
    return end


def extract_skeleton(html, words, include_banner=False, build_time="", add_base_href=False):
    """Strip hardcoded word HTML from index.html and inject dynamic pipeline."""
    idx_fv        = html.index(MARKER_FILTERED_VIEW) + len(MARKER_FILTERED_VIEW)
    head          = html[:idx_fv]

    # For test/ subfolder, all relative asset paths (hsk.css, hsk.js, etc.)
    # must resolve to the project root. Inject <base href="../"> into <head>.
    if add_base_href:
        head = head.replace('<head>', '<head>\n<base href="../">', 1)

    idx_fam_start = html.index(MARKER_FAM_START)
    idx_fam_end   = find_block_end(html, idx_fam_start)
    fam_block     = html[idx_fam_start:idx_fam_end]

    idx_lrn_start = html.index(MARKER_LEARNED_START)
    idx_lrn_end   = find_block_end(html, idx_lrn_start)
    learned_block = html[idx_lrn_start:idx_lrn_end]

    idx_sort = html.index(MARKER_SORTABLE)
    tail     = build_data_scripts(words, include_banner_js=include_banner) + html[idx_sort:]

    banner = build_banner(words, build_time) if include_banner else ""

    return (
        head + "\n"
        + banner
        + '<div id="word-tables-mount"></div>\n\n'
        + fam_block + "\n"
        + learned_block + "\n"
        + tail
    )


def main():
    html       = INDEX_HTML.read_text(encoding="utf-8")
    words      = read_words_xlsx()
    build_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ── test/index.html  (with debug banner) ─────────────────────────────────
    TEST_OUT.parent.mkdir(exist_ok=True)
    test_html = extract_skeleton(html, words, include_banner=False, add_base_href=True)
    TEST_OUT.write_text(test_html, encoding="utf-8")
    print(f"Wrote {TEST_OUT}  [{build_time}]")
    print(f"  Words : {len(words)}  |  Size: {len(test_html):,} chars")

    # ── index.html  (production — replaces hardcoded word HTML) ──────────────
    prod_html = extract_skeleton(html, words, include_banner=False)
    INDEX_HTML.write_text(prod_html, encoding="utf-8")
    print(f"Wrote {INDEX_HTML}")
    print(f"  Words : {len(words)}  |  Size: {len(prod_html):,} chars")


if __name__ == "__main__":
    main()
