(function () {
  'use strict';

  if (!window.HSK_WORDS || !window.HSK_GROUPS) {
    console.error('render-words: HSK_WORDS or HSK_GROUPS not loaded');
    return;
  }

  var mount = document.getElementById('word-tables-mount');
  if (!mount) {
    console.error('render-words: #word-tables-mount not found');
    return;
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── index words by group, preserving order from words.xlsx ───────────────
  var groupById = {};
  window.HSK_GROUPS.forEach(function (g) {
    groupById[g.id] = g;
  });

  var wordsByGroup = {};
  window.HSK_GROUPS.forEach(function (g) { wordsByGroup[g.id] = []; });

  window.HSK_WORDS.forEach(function (w) {
    if (wordsByGroup.hasOwnProperty(w.phonetic_group)) {
      wordsByGroup[w.phonetic_group].push(w);
    }
  });

  // ── shared thead (identical to every table in the original HTML) ──────────
  var THEAD =
    '<thead><tr>' +
    '<th data-col="cb"  class="cb-col">&#10004;</th>' +
    '<th data-col="fam" class="fam-col" title="Знакомо / к повторению">?</th>' +
    '<th data-col="num" style="width:3%">#</th>' +
    '<th data-col="word"  style="width:22%">Слово</th>' +
    '<th data-col="trans" style="width:30%">Перевод</th>' +
    '<th data-col="ex"    style="width:45%">Пример</th>' +
    '</tr></thead>';

  // ── build one <tr> ─────────────────────────────────────────────────────────
  // Every data-* attribute that hsk.js, the sort logic, text-topics and the
  // alpha/POS/HSK filters depend on is set here.
  function buildRow(w, rownum, g) {
    var radical   = g.radical    || w.component || '';
    var radicalPy = g.radical_py || '';
    var compPy    = g.component_py || '';

    // Example translations — only rendered when at least one is non-empty.
    // Only the span for a given language is included if that translation exists,
    // so the CSS :has() rule can hide the wrapper when the active lang has no content.
    var exRu = String(w.example_ru || '').trim();
    var exEn = String(w.example_en || '').trim();
    var exTransHtml = '';
    if (exRu || exEn) {
      exTransHtml =
        '<div class="ex-trans">' +
        (exRu ? '<span class="ex-trans-ru">' + esc(exRu.charAt(0).toUpperCase() + exRu.slice(1)) + '</span>' : '') +
        (exEn ? '<span class="ex-trans-en">' + esc(exEn.charAt(0).toUpperCase() + exEn.slice(1)) + '</span>' : '') +
        '</div>';
    }

    return (
      '<tr' +
      ' data-key="'         + esc(w.word)          + '"' +
      ' data-py="'          + esc(w.pinyin)         + '"' +
      ' data-ru="'          + esc(w.ru)             + '"' +
      ' data-en="'          + esc(w.en)             + '"' +
      ' data-section="'     + esc(w.pos)            + '"' +
      ' data-tbody="'       + esc(w.phonetic_group) + '"' +
      ' data-radical="'     + esc(radical)          + '"' +
      ' data-component="'   + esc(w.component)      + '"' +
      ' data-radical-py="'  + esc(radicalPy)        + '"' +
      ' data-component-py="'+ esc(compPy)           + '"' +
      ' data-hsk="'         + esc(w.hsk)            + '">' +

      '<td data-col="cb"  class="cb-cell"><input type="checkbox" class="learn-cb"></td>' +
      '<td data-col="fam" class="fam-cell"><input type="checkbox" class="fam-cb"></td>' +
      '<td data-col="num" class="rownum">' + rownum + '</td>' +

      '<td data-col="word" class="wordcell">' +
        '<div class="zh">'  + esc(w.word)   + '</div>' +
        '<div class="py">'  + esc(w.pinyin) + '</div>' +
      '</td>' +

      '<td data-col="trans" class="trans-cell">' +
        '<span class="trans-ru">' + esc(w.ru) + '</span>' +
        '<span class="trans-en">' + esc(w.en) + '</span>' +
      '</td>' +

      '<td data-col="ex">' +
        '<div class="ex-zh">' + esc(w.example_zh)      + '</div>' +
        '<div class="ex-py">' + esc(w.example_pinyin)  + '</div>' +
        exTransHtml +
      '</td>' +

      '</tr>'
    );
  }

  // ── assemble all sections ─────────────────────────────────────────────────
  var parts = [];

  window.HSK_GROUPS.forEach(function (g) {
    var words = wordsByGroup[g.id];
    if (!words || words.length === 0) return;

    // POS section heading — only attached to the first group of each section
    var ph = g.pos_heading_before;
    if (ph && ph.id) {
      parts.push(
        '<h2 class="pos-group" id="' + esc(ph.id) + '">' +
        esc(ph.ru) + " <span class='pos-zh'>" + esc(ph.zh) + '</span>' +
        '</h2>'
      );
    }

    // Phonetic group heading — h3_inner is the exact inner HTML preserved
    // during the one-time migration (keeps the original <span class="comp">
    // where applicable and "Отдельные слова" text where it was used).
    parts.push('<h3 class="phonetic-group">' + g.h3_inner + '</h3>');

    // Table + tbody
    var rows = '';
    words.forEach(function (w, i) { rows += buildRow(w, i + 1, g); });

    parts.push(
      '<table>' + THEAD +
      '<tbody id="' + esc(g.id) + '">' + rows + '</tbody>' +
      '</table>'
    );
  });

  mount.innerHTML = parts.join('\n');

  console.log(
    'render-words: rendered ' + window.HSK_WORDS.length + ' words in ' +
    window.HSK_GROUPS.length + ' groups'
  );
}());
