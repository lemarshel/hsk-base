# HSK Base — Data Architecture

## Overview

Word content has been separated from presentation. The single editable master
file is `data/words.xlsx`. Everything else is generated from it.

```
data/words.xlsx          ← YOU EDIT THIS
        │
        └─ python tools/make_test_page.py
                │
                ├─ test-render.html   (self-contained preview with debug banner)
                └─ index.html         (production — same pipeline, no banner)

data/groups.json         ← generated ONCE by tools/migrate.py from original HTML
        │
        └─ python tools/migrate.py  (re-run only if group structure changes)
                │
                └─ data/groups-data.js   (inlined into HTML at build time)

Inlined script order inside both HTML files:
  window.HSK_WORDS  (from words.xlsx, inlined by make_test_page.py)
  window.HSK_GROUPS (from groups-data.js, inlined by make_test_page.py)
  js/render-words.js    → fills #word-tables-mount with the full DOM
  sortable.min.js
  hanzi-writer.min.js
  hsk.js                → scans DOM (finds all rows already rendered)
  text-topics.js        → adds data-text attributes to rows
```

Both `test-render.html` and `index.html` are **fully self-contained** — all data
is inlined at build time, so they work when opened via `file://` with no server.

---

## Workflow

### Editing word content

1. Open `data/words.xlsx`
2. Edit any cells in the **Words** sheet (`en`, `ru`, `example_en`, `example_ru`, etc.)
3. Save and close Excel
4. Run:
   ```
   python tools/make_test_page.py
   ```
5. Refresh `test-render.html` in the browser — changes are visible immediately
6. `index.html` is also rebuilt automatically in the same step

### If group structure changes (rare)

Re-run the full migration:
```
python tools/migrate.py
```
This overwrites `words.xlsx`, `groups.json`, and `groups-data.js`.
**Warning:** this overwrites words.xlsx — back it up first if you have edits.

---

## words.xlsx — Column Reference

| Column | Values | Used by |
|---|---|---|
| `id` | integer 1–5369 | ordering only |
| `word` | Chinese characters | `data-key` attr; search; TTS |
| `pinyin` | tone-marked pinyin | `data-py` attr; search; sort; pinyin coloring |
| `en` | English translation | `data-en` attr; alpha filter (EN mode); export. **Your value wins over the built-in dictionary.** Leave blank to use the dictionary fallback. |
| `ru` | Russian translation | `data-ru` attr; alpha filter (RU mode); export |
| `example_zh` | Chinese example sentence | displayed in `ex` column; TTS |
| `example_pinyin` | Pinyin of example | displayed in `ex` column; pinyin coloring |
| `example_en` | English example translation | shown below example pinyin in EN mode; first letter auto-capitalised |
| `example_ru` | Russian example translation | shown below example pinyin in RU mode; first letter auto-capitalised |
| `pos` | `pos_noun` / `pos_verb` / `pos_adj` / `pos_adv` / `pos_mw` / `pos_particle` / `pos_conj` / `pos_prep` / `pos_pron` | `data-section` attr; POS filter buttons |
| `phonetic_group` | `tb_0` … `tb_398` | which `<tbody id="tb_N">` the word belongs to; groups ordering |
| `component` | Chinese component character | `data-component` attr; Component A–Z sort |
| `hsk` | 1–6 | `data-hsk` attr; HSK level filter; HSK badge in word cell |

---

## EN Translation Priority

`hsk.js` carries a built-in English dictionary (`window.EN_DICT`, ~5 000 entries).
The priority is:

```
data-en from words.xlsx  →  EN_DICT fallback  →  empty
```

Fill in `en` for any word to override the dictionary. Leave it blank and the
dictionary value shows automatically. This means you only need to enter
translations that differ from or are missing from the built-in dictionary.

---

## groups.json — Structure Reference

Generated once by `tools/migrate.py` from `index.html`. Never hand-edited.
Re-run `migrate.py` only if the phonetic group structure changes.

```json
[
  {
    "id": "tb_0",
    "h3_inner": "◆ Фонетический компонент <span class=\"comp\">phonetic:人</span>",
    "pos_heading_before": { "id": "pos_noun", "ru": "Существительные", "zh": "名词" },
    "component": "人",
    "component_py": "ren",
    "radical": "人",
    "radical_py": "ren"
  },
  ...
]
```

| Field | Purpose |
|---|---|
| `id` | matches `phonetic_group` column in words.xlsx; becomes `id` of `<tbody>` |
| `h3_inner` | exact inner HTML of the `<h3 class="phonetic-group">` header |
| `pos_heading_before` | if non-null, a `<h2 class="pos-group">` is inserted before this group |
| `component` | Chinese component character (for display reference) |
| `component_py` | pinyin of component → `data-component-py` on every row in group |
| `radical` | radical character → `data-radical` on every row in group |
| `radical_py` | pinyin of radical → `data-radical-py` on every row in group |

There are **458 groups** total. **9 groups** carry a `pos_heading_before` entry,
marking the start of each POS section:

| Group | POS section |
|---|---|
| tb_0 | pos_noun (Существительные) |
| tb_32 | pos_verb (Глаголы) |
| tb_64 | pos_adj (Прилагательные) |
| tb_87 | pos_adv (Наречия) |
| tb_90 | pos_mw (Счётные слова) |
| tb_93 | pos_particle (Частицы) |
| tb_94 | pos_conj (Союзы) |
| tb_95 | pos_prep (Предлоги) |
| tb_98 | pos_pron (Местоимения) |

---

## Filter → Data Attribute Mapping

| UI control | JS class added to `<tr>` | Attribute read |
|---|---|---|
| POS buttons | `pos-hide` | `data-section` |
| HSK buttons | `hsk-hide` | `data-hsk` |
| А–Я / A–Z alpha | `alpha-hide` | `data-ru` (RU mode) / `data-en` (EN mode) |
| Text buttons (1–40) | `text-hide` | `data-text` (set by text-topics.js at runtime) |
| Search input | `sr-hide` | `.zh` / `.py` / `.trans-ru` / `.trans-en` text |
| Sort: Pinyin A–Z | DOM reorder | `data-py` |
| Sort: Radical A–Z | DOM reorder | `data-radical-py` |
| Sort: Component A–Z | DOM reorder | `data-component-py` |
| Sort: HSK 1–6 / 6–1 | DOM reorder | `data-hsk` |

Column visibility toggles (`#`, Слово, Перевод, Пример) use
`body.hide-{num,word,trans,ex}` CSS classes that target `[data-col="..."]`.

---

## Language Toggle → Displayed Content

`body.lang-en` class is absent (RU) or present (EN).

| Element | RU mode | EN mode |
|---|---|---|
| `<span class="trans-ru">` | visible | hidden |
| `<span class="trans-en">` | hidden | visible |
| `<span class="ex-trans-ru">` | visible | hidden |
| `<span class="ex-trans-en">` | hidden | visible |
| Alpha filter panel | Cyrillic А–Я | Latin A–Z |

CSS rules in `hsk.css`:
```css
.trans-en      { display: none; }
.lang-en .trans-ru { display: none; }
.lang-en .trans-en { display: inline; }

/* Example translations */
.ex-trans-en { display: none; }
body.lang-en .ex-trans-ru { display: none; }
body.lang-en .ex-trans-en { display: block; }

/* Hide wrapper when active language has no translation (prevents empty box) */
.ex-trans:not(:has(.ex-trans-ru)) { display: none; }
body.lang-en .ex-trans:not(:has(.ex-trans-en)) { display: none; }
```

---

## DOM Shape Produced by render-words.js

```html
<div id="word-tables-mount">

  <!-- repeated for each of the 9 POS sections -->
  <h2 class="pos-group" id="pos_noun">Существительные <span class='pos-zh'>名词</span></h2>

  <!-- repeated for each of the 458 phonetic groups -->
  <h3 class="phonetic-group">◆ Фонетический компонент <span class="comp">phonetic:人</span></h3>
  <table>
    <thead>
      <tr>
        <th data-col="cb"  class="cb-col">✔</th>
        <th data-col="fam" class="fam-col">?</th>
        <th data-col="num"   style="width:3%">#</th>
        <th data-col="word"  style="width:22%">Слово</th>
        <th data-col="trans" style="width:30%">Перевод</th>
        <th data-col="ex"    style="width:45%">Пример</th>
      </tr>
    </thead>
    <tbody id="tb_0">

      <!-- repeated for each word in the group -->
      <tr data-key="任何" data-py="rènhé"
          data-ru="любой; какой угодно" data-en="any; whatever"
          data-section="pos_pron"   data-tbody="tb_0"
          data-radical="人"  data-component="人"
          data-radical-py="ren" data-component-py="ren"
          data-hsk="4">
        <td data-col="cb"  class="cb-cell"><input type="checkbox" class="learn-cb"></td>
        <td data-col="fam" class="fam-cell"><input type="checkbox" class="fam-cb"></td>
        <td data-col="num" class="rownum">1</td>
        <td data-col="word" class="wordcell">
          <div class="zh">任何</div>
          <div class="py">rènhé</div>
        </td>
        <td data-col="trans" class="trans-cell">
          <span class="trans-ru">любой; какой угодно</span>
          <span class="trans-en">any; whatever</span>
        </td>
        <td data-col="ex">
          <div class="ex-zh">遇到任何困难都别放弃。</div>
          <div class="ex-py">yù dào rèn hé kùn nán dōu bié fàng qì。</div>
          <!--
            Only rendered when example_ru or example_en is non-empty.
            Only the span for languages that have content are included —
            this lets the CSS :has() rule hide the wrapper cleanly.
            First letter of each translation is auto-capitalised by render-words.js.
          -->
          <div class="ex-trans">
            <span class="ex-trans-ru">Не сдавайся при любых трудностях.</span>
            <span class="ex-trans-en">Don't give up no matter what difficulties you face.</span>
          </div>
        </td>
      </tr>

    </tbody>
  </table>

</div>
```

After `hsk.js` loads it wraps each `<table>` in `<div class="grp-wrap">` and
appends a `<button class="coll-btn">` to each `<h3>`. This is expected and
does not require any changes to `render-words.js`.

---

## Responsive Behaviour

Breakpoints defined in `hsk.css`:

| Viewport | Behaviour |
|---|---|
| > 900 px | full layout, fixed column proportions |
| ≤ 900 px | table fills 100 % width; columns rescale proportionally |
| ≤ 600 px | Example column hidden; Word + Translation split 45 / 55 % |

Column widths are intentionally locked with `!important` so no JS sort or filter
operation can change individual column sizes — only the full table rescales.

---

## File Inventory

| File | Editable? | Generated by |
|---|---|---|
| `data/words.xlsx` | **YES — edit this** | `tools/migrate.py` (initial), then you |
| `data/words.json` | no | `tools/xlsx_to_json.py` |
| `data/words-data.js` | no | `tools/xlsx_to_json.py` |
| `data/groups.json` | no | `tools/migrate.py` |
| `data/groups-data.js` | no | `tools/migrate.py` |
| `js/render-words.js` | only if DOM shape changes | — |
| `hsk.js` | only for app logic changes | — |
| `hsk.css` | only for style changes | — |
| `tools/migrate.py` | only if migration logic changes | — |
| `tools/xlsx_to_json.py` | generates words-data.js for HTTP-served deployments | — |
| `tools/make_test_page.py` | only if index.html structure changes | — |
| `test-render.html` | no — rebuilt every run | `tools/make_test_page.py` |
| `index.html` | no — rebuilt every run | `tools/make_test_page.py` |
