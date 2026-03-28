"""
Insert INPUT/ACTION/OUTPUT block comments into js/hsk.js.
Run from project root: python prod/comment_hsk.py
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

PATH = 'js/hsk.js'
with open(PATH, encoding='utf-8') as f:
    lines = f.readlines()

# Each entry: (0-based line index to INSERT BEFORE, comment text)
# We insert in reverse order so indices stay valid.
inserts = [
    # ── window._hsk bridge (near end of file)
    (1676, "/* ── window._hsk bridge ──────────────────────────────────────────────────────\n"
           "   INPUT:  ttsVolume (IIFE 1 var), renum(), cdxConfirm(), currentLang (IIFE 2 vars)\n"
           "   ACTION: exposes four internals as properties of window._hsk so extracted\n"
           "           files (storage.js, quiz.js) can call them without accessing the IIFE scope\n"
           "   OUTPUT: window._hsk.getLang / .renum / .confirm / .getTtsVolume\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Mobile hamburger
    (1663, "/* ── Mobile hamburger ─────────────────────────────────────────────────────────\n"
           "   INPUT:  click on #hamburger-btn; input on #mobile-search-input\n"
           "   ACTION: toggles toolbar.mobile-open + overlay visibility;\n"
           "           syncs mobile search input bidirectionally with #search-input\n"
           "   OUTPUT: DOM class toggle; search-input.value mirrored\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Back to top
    (1651, "/* ── Back to top ──────────────────────────────────────────────────────────────\n"
           "   INPUT:  window scroll events\n"
           "   ACTION: adds/removes .visible on #back-to-top when scrollY > 500;\n"
           "           click scrolls to top smoothly\n"
           "   OUTPUT: button visibility; window scroll position\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Sortable init patch
    (1605, "/* ── Sortable.js init patch ───────────────────────────────────────────────────\n"
           "   INPUT:  all tbody[id] elements (excluding learned/fam); localStorage hsk_row_order\n"
           "   ACTION: initialises SortableJS on each tbody; restores saved drag order;\n"
           "           on drag-end persists new order to localStorage and renumbers rows\n"
           "   OUTPUT: DOM row order; localStorage hsk_row_order; window._cdxSortables array\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── cdxConfirm
    (1588, "/* ── cdxConfirm — custom confirmation modal ───────────────────────────────────\n"
           "   INPUT:  msg string, onOk callback, okLabel, cancelLabel strings\n"
           "   ACTION: shows #cdx-confirm modal with custom text; wires OK/Cancel buttons\n"
           "   OUTPUT: calls onOk() if user confirms; hides modal on either button\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Drag integration note
    (1578, "/* ── Drag integration ─────────────────────────────────────────────────────────\n"
           "   INPUT:  window._cdxSortables array; currentSort and searchActive state\n"
           "   ACTION: disables all Sortable instances when search is active or sort != default\n"
           "   OUTPUT: Sortable.option('disabled') toggled on all instances\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── rebuildView
    (1415, "/* ── rebuildView — master view rebuild ────────────────────────────────────────\n"
           "   INPUT:  activeHSKLevels, currentPOS, currentAlpha, currentSort, all tbody rows\n"
           "   ACTION: applies hsk-hide / pos-hide / alpha-hide to rows; re-sorts tbodies;\n"
           "           merges small phoneme groups; renumbers; updates word count and HSK stats;\n"
           "           rebuilds filtered-view flat table for EN search mode\n"
           "   OUTPUT: DOM row visibility + order; #word-count text; #hsk-stats-bar HTML\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Alpha filter
    (1396, "/* ── Alpha filter ─────────────────────────────────────────────────────────────\n"
           "   INPUT:  currentAlpha string ('all' or a letter); data-py attribute on each row\n"
           "   ACTION: clicking a letter button sets currentAlpha and calls rebuildView();\n"
           "           rebuildView() adds alpha-hide to rows whose pinyin doesn't start with it\n"
           "   OUTPUT: currentAlpha var; alpha-hide CSS class on rows; rebuildView() call\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── POS filter
    (1379, "/* ── POS filter ───────────────────────────────────────────────────────────────\n"
           "   INPUT:  currentPOS string ('all' or 'pos_noun' etc.); data-section on rows\n"
           "   ACTION: clicking a POS button sets currentPOS and calls rebuildView();\n"
           "           rebuildView() adds pos-hide to rows not matching the selected section\n"
           "   OUTPUT: currentPOS var; pos-hide CSS class on rows; rebuildView() call\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Sort modes
    (1342, "/* ── Sort modes ───────────────────────────────────────────────────────────────\n"
           "   INPUT:  sort button clicks; currentSort string; data-py / data-radical /\n"
           "           data-component / data-hsk attributes on rows\n"
           "   ACTION: clicking a sort button sets currentSort and calls rebuildView();\n"
           "           rebuildView() re-orders rows within each tbody by the chosen key\n"
           "   OUTPUT: currentSort var; DOM row order inside each tbody\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Show/hide phoneme group headers
    (1267, "/* ── Phoneme group header toggle ──────────────────────────────────────────────\n"
           "   INPUT:  localStorage ph_hidden; click on #btn-ph-toggle\n"
           "   ACTION: toggles body.ph-hidden class which CSS uses to hide h3 headings;\n"
           "           persists state to localStorage\n"
           "   OUTPUT: body.ph-hidden class; localStorage ph_hidden\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Merge small phoneme groups
    (1209, "/* ── Merge small phoneme groups ───────────────────────────────────────────────\n"
           "   INPUT:  all phonetic-group h3 + their tbody row counts\n"
           "   ACTION: on DOMContentLoaded, groups with fewer than 3 visible rows are\n"
           "           folded into a synthetic 'Other / 其他' group heading in the UI\n"
           "   OUTPUT: DOM h3 text and tbody grouping for small groups\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Mark first POS section table
    (1191, "/* ── Mark first table per POS section ─────────────────────────────────────────\n"
           "   INPUT:  all h2.pos-group elements and their sibling tables\n"
           "   ACTION: adds .first-in-section class to the first table after each h2\n"
           "           so CSS can display the section heading only once\n"
           "   OUTPUT: .first-in-section class on select tables\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── renumVisible
    (1172, "/* ── renumVisible — continuous row numbering ───────────────────────────────────\n"
           "   INPUT:  all visible rows across all non-learned tbodies\n"
           "   ACTION: assigns sequential integers 1-N to .rownum cells, skipping hidden rows\n"
           "   OUTPUT: .rownum textContent updated in DOM\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Word count display
    (1157, "/* ── Word count display ───────────────────────────────────────────────────────\n"
           "   INPUT:  n (integer count of currently visible rows)\n"
           "   ACTION: updates #word-count element text\n"
           "   OUTPUT: #word-count textContent\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── HSK level filter
    (1087, "/* ── HSK level filter ─────────────────────────────────────────────────────────\n"
           "   INPUT:  checkbox clicks on .hsk-filter-cb; data-hsk attribute on each row\n"
           "   ACTION: maintains activeHSKLevels Set; calls rebuildView() on change;\n"
           "           rebuildView() adds hsk-hide to rows not in activeHSKLevels\n"
           "   OUTPUT: activeHSKLevels Set; hsk-hide CSS class on rows; rebuildView() call\n"
           "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Search improvements
    (984, "/* ── Search / filtered-view (EN mode) ─────────────────────────────────────────\n"
          "   INPUT:  #search-input value; body.lang-en class; all visible tbody rows\n"
          "   ACTION: in EN mode builds a flat #filtered-view table from matching rows;\n"
          "           in RU mode uses sr-hide CSS class toggling on the main table\n"
          "   OUTPUT: #filtered-view innerHTML; sr-hide class on rows; #word-count update\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Language switching
    (712, "/* ── Language switching (RU / EN) ─────────────────────────────────────────────\n"
          "   INPUT:  localStorage hsk_lang; click on lang toggle buttons\n"
          "   ACTION: setLang() swaps body.lang-en class; translates all toolbar text,\n"
          "           section headings, stat labels, button labels via string maps\n"
          "   OUTPUT: body.lang-en class; DOM text of ~30 UI elements; localStorage hsk_lang\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Palette
    (679, "/* ── Palette (colour scheme) ──────────────────────────────────────────────────\n"
          "   INPUT:  localStorage hsk_palette; click on .pal-btn buttons\n"
          "   ACTION: sets --pal-accent and --pal-dark CSS custom properties on :root;\n"
          "           highlights active button; persists selection\n"
          "   OUTPUT: CSS custom properties on document.documentElement; localStorage hsk_palette\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Populate data-en
    (668, "/* ── Populate data-en on page load ────────────────────────────────────────────\n"
          "   INPUT:  .trans-en span textContent on each row\n"
          "   ACTION: DOMContentLoaded: reads each row's .trans-en text and writes it to\n"
          "           data-en attribute so sort/export can access it without querying the DOM\n"
          "   OUTPUT: data-en attribute on every tbody tr\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Original row order restore
    (663, "/* ── Restore saved drag order ─────────────────────────────────────────────────\n"
          "   INPUT:  window._cdxOrigOrder (pre-drag snapshot); localStorage hsk_row_order\n"
          "   ACTION: on load, reorders tbody rows to match the last saved drag order\n"
          "   OUTPUT: DOM row order within each tbody\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── _cdxOrigOrder capture
    (568, "/* ── Capture original row order ───────────────────────────────────────────────\n"
          "   INPUT:  all non-learned/fam tbodies and their current row order\n"
          "   ACTION: runs immediately (before drag-restore); snapshots each tbody's row order\n"
          "           by Hanzi text into window._cdxOrigOrder\n"
          "   OUTPUT: window._cdxOrigOrder object {tbodyId: [hanziStrings]}\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Speed + Volume restore
    (549, "/* ── Speed and volume preferences ─────────────────────────────────────────────\n"
          "   INPUT:  localStorage hsk-speed, hsk-volume; #speed-sel, #vol-range elements\n"
          "   ACTION: restores saved TTS speed and volume sliders on load;\n"
          "           persists changes on user interaction\n"
          "   OUTPUT: speedSel.value; ttsVolume; localStorage hsk-speed, hsk-volume\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Dead CSV stub
    (519, "/* ── DEAD CODE — old CSV export stub ──────────────────────────────────────────\n"
          "   This handler was replaced by js/export.js. The IIFE returns immediately.\n"
          "   TODO: delete this block entirely.\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Show all columns button
    (505, "/* ── Show all columns button ───────────────────────────────────────────────────\n"
          "   INPUT:  click on #btn-show-all-cols\n"
          "   ACTION: removes all hide-* body classes and clears localStorage flags\n"
          "   OUTPUT: body classes cleaned; col-btn .hidden removed; localStorage cleared\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Column visibility
    (467, "/* ── Column visibility toggle ─────────────────────────────────────────────────\n"
          "   INPUT:  click / right-click on .col-btn or thead th; localStorage hsk-hide-*\n"
          "   ACTION: toggleCol() flips body.hide-{key} class; persists to localStorage;\n"
          "           right-click on column header also calls toggleCol via delegation\n"
          "   OUTPUT: body.hide-num/word/trans/ex class; col-btn .hidden class; localStorage\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Collapse/expand all
    (456, "/* ── Collapse / expand all groups ─────────────────────────────────────────────\n"
          "   INPUT:  click on #btn-col-all or #btn-exp-all\n"
          "   ACTION: adds or removes .grp-col on every .grp-wrap; updates arrow button text\n"
          "   OUTPUT: .grp-col class on all group wrappers; coll-btn text\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Group collapse
    (445, "/* ── Phonetic group collapse ───────────────────────────────────────────────────\n"
          "   INPUT:  all h3.phonetic-group elements\n"
          "   ACTION: appends a collapse button to each h3; wraps the sibling table in .grp-wrap;\n"
          "           click toggles .grp-col on the wrapper\n"
          "   OUTPUT: collapse button injected into DOM; .grp-wrap wrapper added; table hidden/shown\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Drag handle injection
    (428, "/* ── Drag handle injection ────────────────────────────────────────────────────\n"
          "   INPUT:  all .trans-cell td elements (translation column)\n"
          "   ACTION: prepends a ⠿ drag-handle <button> to each translation cell for\n"
          "           SortableJS row dragging\n"
          "   OUTPUT: .drag-handle button element at start of each .trans-cell\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── TTS example injection
    (415, "/* ── TTS button injection — example cells ─────────────────────────────────────\n"
          "   INPUT:  all td elements containing .ex-zh div\n"
          "   ACTION: wraps cell content in .ex-td-inner; prepends ▶ button inside .ex-zh;\n"
          "           stores example text in button.dataset.t\n"
          "   OUTPUT: .tts-btn inside each .ex-zh; td.ex-td class\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── TTS word cell injection
    (406, "/* ── TTS button injection — word cells ────────────────────────────────────────\n"
          "   INPUT:  all .wordcell td elements\n"
          "   ACTION: wraps cell children in .wc-inner div; appends ▶ button before it;\n"
          "           stores word text in button.dataset.t for instant playback\n"
          "   OUTPUT: .tts-btn + .wc-inner inside each .wordcell\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── TTS click handler
    (356, "/* ── TTS click handler ────────────────────────────────────────────────────────\n"
          "   INPUT:  click events on .tts-btn (delegated from document.body);\n"
          "           button.dataset.t (cached text) or nearest .zh / .ex-zh text\n"
          "   ACTION: stops any current audio; plays text via SpeechSynthesis (zh-CN voice);\n"
          "           falls back to playFallbackTTS() if SpeechSynthesis stalls after 1.2 s\n"
          "   OUTPUT: audio playback; .tts-btn.on class while playing\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── playFallbackTTS
    (338, "/* ── playFallbackTTS — Google TTS fallback ────────────────────────────────────\n"
          "   INPUT:  text string; chunkTTS() chunks (max 160 chars each)\n"
          "   ACTION: fetches audio from translate.googleapis.com for each chunk sequentially;\n"
          "           stores Audio object in fallbackAudio so stopFallback() can cancel it\n"
          "   OUTPUT: sequential Audio playback; calls onDone() when all chunks finish\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── chunkTTS
    (314, "/* ── chunkTTS — text chunker for TTS ─────────────────────────────────────────\n"
          "   INPUT:  text string, maxLen integer\n"
          "   ACTION: splits text at punctuation boundaries (。！？,；) to stay under maxLen;\n"
          "           hard-splits any remaining segment that still exceeds maxLen\n"
          "   OUTPUT: array of string chunks, each <= maxLen chars\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── stopFallback / stopAllAudio
    (303, "/* ── Audio stop helpers ───────────────────────────────────────────────────────\n"
          "   INPUT:  fallbackAudio Audio object; active SpeechSynthesis; .tts-btn.on buttons\n"
          "   ACTION: stopFallback() pauses fallback Audio; stopAllAudio() cancels synthesis,\n"
          "           stops fallback, and removes .on class from all play buttons\n"
          "   OUTPUT: audio stopped; .tts-btn.on removed\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Voice loading
    (268, "/* ── Voice selection & loading ────────────────────────────────────────────────\n"
          "   INPUT:  speechSynthesis.getVoices() list; onvoiceschanged event\n"
          "   ACTION: pickZhVoice() finds the best zh-CN voice; ensureVoices() retries\n"
          "           up to 6 times (200 ms apart) until voices are available\n"
          "   OUTPUT: zhVoice SpeechSynthesisVoice object; voicesReady boolean\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── TTS core vars
    (246, "/* ── TTS (Text-to-Speech) core ────────────────────────────────────────────────\n"
          "   INPUT:  localStorage hsk-volume; #vol-range slider\n"
          "   ACTION: initialises ttsVolume, zhVoice, fallbackAudio state;\n"
          "           setTtsVolume() clamps value 0-1, syncs slider, persists to localStorage\n"
          "   OUTPUT: ttsVolume float; slider display; localStorage hsk-volume\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Font controls
    (211, "/* ── Font controls ────────────────────────────────────────────────────────────\n"
          "   INPUT:  localStorage hsk_prefs; #font-zh/py/ru, #size-zh/py/ru inputs\n"
          "   ACTION: applyF() builds a CSS string for .zh, .py, .trans-cell overrides\n"
          "           and writes it to a #dyn-font <style> tag; persists prefs to localStorage\n"
          "   OUTPUT: #dyn-font style innerHTML; localStorage hsk_prefs\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── setMode
    (201, "/* ── Theme mode ───────────────────────────────────────────────────────────────\n"
          "   INPUT:  localStorage hsk_mode; click on .mode-btn\n"
          "   ACTION: setMode() strips light/dark/sepia from body.className, adds new mode;\n"
          "           toggles .active on mode buttons; persists to localStorage\n"
          "   OUTPUT: body class; .mode-btn.active; localStorage hsk_mode\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Keyboard shortcuts
    (184, "/* ── Global keyboard shortcuts ────────────────────────────────────────────────\n"
          "   INPUT:  keydown events on document (skipped inside inputs and study overlay)\n"
          "   ACTION: '/' or Ctrl+F focuses and selects #search-input;\n"
          "           Escape clears search if populated\n"
          "   OUTPUT: focus on search input; search cleared\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Search listeners
    (180, "/* ── Search event wiring ──────────────────────────────────────────────────────\n"
          "   INPUT:  #search-input (text), #search-lang (select), #search-clear (button)\n"
          "   ACTION: input event debounces doSearch() by 130 ms;\n"
          "           lang change and clear button call doSearch() immediately\n"
          "   OUTPUT: doSearch() called; sr-hide class on rows\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── doSearch
    (164, "/* ── doSearch — real-time row filtering ───────────────────────────────────────\n"
          "   INPUT:  #search-input value; #search-lang value ('zh'|'py'|'ru'|'en');\n"
          "           .zh / .py / trans-cell text content on each visible row\n"
          "   ACTION: adds sr-hide to rows that don't contain the query in the selected field\n"
          "   OUTPUT: sr-hide CSS class toggled on each tbody row\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── updateHSKStats
    (139, "/* ── updateHSKStats — HSK progress bar ────────────────────────────────────────\n"
          "   INPUT:  all tbody rows; data-hsk attribute; .learn-cb:checked state\n"
          "   ACTION: counts total and learned words per HSK level 1-6;\n"
          "           renders colored progress spans into #hsk-stats-bar\n"
          "   OUTPUT: #hsk-stats-bar innerHTML\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── HSK badge injection
    (125, "/* ── HSK level badge injection ────────────────────────────────────────────────\n"
          "   INPUT:  data-hsk attribute on each non-learned/fam row\n"
          "   ACTION: DOMContentLoaded: appends a .hsk-{N} badge span to each .wordcell;\n"
          "           then calls updateHSKStats() for initial bar render\n"
          "   OUTPUT: .hsk-badge span appended to each word cell; stats bar rendered\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── colorPinyin
    (105, "/* ── colorPinyin — tone coloring ──────────────────────────────────────────────\n"
          "   INPUT:  all .py and .ex-py elements; their raw pinyin text\n"
          "   ACTION: splits each pinyin string into syllables; wraps each in\n"
          "           <span class='py-t{0-4}'> using getTone(); capitalises first syllable\n"
          "           of example pinyin\n"
          "   OUTPUT: .py / .ex-py innerHTML replaced with tone-colored spans\n"
          "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── getTone helpers
    (88, "/* ── Pinyin tone helpers ──────────────────────────────────────────────────────\n"
         "   INPUT:  pinyin syllable string\n"
         "   ACTION: getTone() detects tone 1-4 from diacritic vowels (āáǎà etc.);\n"
         "           capFirstLetter() uppercases the first alphabetic character\n"
         "   OUTPUT: tone integer (0-4); capitalised token string\n"
         "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Checkbox delegation
    (62, "/* ── Checkbox delegation — learned / familiar ─────────────────────────────────\n"
         "   INPUT:  change events on .learn-cb and .fam-cb checkboxes (delegated from body)\n"
         "   ACTION: moves row to #learned-tbody or #fam-tbody on check;\n"
         "           returns row to its original tbody (data-orig) on uncheck;\n"
         "           unchecks the other checkbox if both would be set; renumbers; saves\n"
         "   OUTPUT: row moved in DOM; renum() called; updVis(); save() to localStorage\n"
         "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── DOMContentLoaded preload removal
    (52, "/* ── Preload class removal ────────────────────────────────────────────────────\n"
         "   INPUT:  DOMContentLoaded event\n"
         "   ACTION: removes .preload from body and documentElement (deferred 0 ms) to\n"
         "           allow CSS transitions after initial paint; removes #preload-font style tag\n"
         "   OUTPUT: body.preload and documentElement.preload removed; #preload-font removed\n"
         "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── Restore IIFE
    (39, "/* ── Restore learned/familiar state ───────────────────────────────────────────\n"
         "   INPUT:  localStorage LS.L (learned) and LS.F (familiar) JSON arrays\n"
         "   ACTION: parses stored Hanzi lists; looks up each word in wMap; moves matching\n"
         "           rows to learned/fam tbodies; checks their checkboxes; renumbers\n"
         "   OUTPUT: rows moved to #learned-tbody / #fam-tbody; .learn-cb/.fam-cb checked;\n"
         "           renum() on affected tbodies; updVis()\n"
         "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── save()
    (30, "/* ── save — persist learned/familiar to localStorage ──────────────────────────\n"
         "   INPUT:  current rows of #learned-tbody and #fam-tbody\n"
         "   ACTION: collects Hanzi text from each row; serialises to JSON;\n"
         "           writes to localStorage[LS.L] and localStorage[LS.F];\n"
         "           calls updateHSKStats() if available\n"
         "   OUTPUT: localStorage LS.L and LS.F updated\n"
         "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── updVis()
    (23, "/* ── updVis — section visibility + stat counters ──────────────────────────────\n"
         "   INPUT:  #learned-tbody and #fam-tbody row counts\n"
         "   ACTION: shows or hides #learned-section / #fam-section based on row count;\n"
         "           updates #st-lrn and #st-fam counter text\n"
         "   OUTPUT: display style on sections; counter textContent\n"
         "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── renum()
    (22, "/* ── renum — renumber a tbody ─────────────────────────────────────────────────\n"
         "   INPUT:  a <tbody> element\n"
         "   ACTION: iterates all rows, writes sequential integers to .rownum cells\n"
         "   OUTPUT: .rownum textContent updated in the given tbody\n"
         "   ────────────────────────────────────────────────────────────────────────────── */\n"),

    # ── wMap / IIFE 1 header
    (0, "/* ==========================================================================\n"
        "   js/hsk.js — IIFE 1: Core word-state management + UI interactions\n"
        "\n"
        "   INPUT:  window.HSK_LS (from app-config.js); rendered DOM word rows;\n"
        "           localStorage for all persistent state\n"
        "   ACTION: builds word index (wMap), restores learned/fam state, wires all\n"
        "           interactive UI: TTS, search, filters, sort, theme, font, drag,\n"
        "           column toggle, group collapse, snapshot bridge, HanziWriter popup\n"
        "   OUTPUT: DOM mutations; localStorage writes; window._hsk bridge;\n"
        "           window._cdxOrigOrder; window._cdxSortables\n"
        "   ========================================================================== */\n"),
]

# Apply in reverse line order so earlier insertions don't shift later indices
inserts.sort(key=lambda x: x[0], reverse=True)
for idx, comment in inserts:
    lines.insert(idx, comment)

with open(PATH, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'Done. {PATH} now has {len(lines)} lines.')
