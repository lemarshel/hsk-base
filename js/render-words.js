/* ==========================================================================
   render-words.js — Dynamic vocabulary table renderer
   INPUT:  data/words.json (fetched at runtime) and window.HSK_GROUPS
           (from data/groups-data.js).
   ACTION: Loads words (JSON fetch with words-data.js fallback), builds all
           h2/h3 headings and <table> HTML strings, and stamps them into the
           #word-tables-mount element.
   OUTPUT: Sets innerHTML of #word-tables-mount with all vocabulary tables,
           sets window.HSK_WORDS, and dispatches 'hsk:words-ready'.
   ========================================================================== */
(function () {
  'use strict';

  /* ── helpers ───────────────────────────────────────────────────────────────
     INPUT: any value. ACTION: converts to string and escapes HTML special chars.
     OUTPUT: safe HTML string suitable for attribute values and text content. */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function markReady() {
    window.HSK_WORDS_READY = true;
    document.dispatchEvent(new Event('hsk:words-ready'));
  }

  function ensureGroups() {
    return new Promise(function (resolve, reject) {
      if (window.HSK_GROUPS && Array.isArray(window.HSK_GROUPS)) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = 'data/groups-data.js';
      s.async = true;
      s.onload = function () {
        if (window.HSK_GROUPS && Array.isArray(window.HSK_GROUPS)) resolve();
        else reject(new Error('groups-data.js loaded but HSK_GROUPS missing'));
      };
      s.onerror = function () { reject(new Error('Failed to load groups-data.js')); };
      document.head.appendChild(s);
    });
  }

  /* ── core render ─────────────────────────────────────────────────────────── */
  function render(words) {
    /* Guard: group metadata must be present before rendering */
    if (!window.HSK_GROUPS) {
      console.error('render-words: HSK_GROUPS not loaded');
      return false;
    }

    /* Guard: mount point must exist in the DOM */
    var mount = document.getElementById('word-tables-mount');
    if (!mount) {
      console.error('render-words: #word-tables-mount not found');
      return false;
    }

    /* ── index words by group ───────────────────────────────────────────────
       INPUT:  window.HSK_GROUPS and words array.
       ACTION: builds groupById lookup and wordsByGroup map, preserving the row
               order from words.xlsx (words.json preserves spreadsheet order).
       OUTPUT: populated groupById {id→group} and wordsByGroup {id→[word,...]}. */
    var groupById = {};
    window.HSK_GROUPS.forEach(function (g) {
      groupById[g.id] = g;
    });

    var wordsByGroup = {};
    window.HSK_GROUPS.forEach(function (g) { wordsByGroup[g.id] = []; });

    (words || []).forEach(function (w) {
      if (wordsByGroup.hasOwnProperty(w.phonetic_group)) {
        wordsByGroup[w.phonetic_group].push(w);
      }
    });

    /* ── shared thead ─────────────────────────────────────────────────────── */
    var THEAD =
      '<thead><tr>' +
      '<th data-col="cb"  class="cb-col">&#10004;</th>' +
      '<th data-col="fam" class="fam-col" title="Знакомо / к повторению">?</th>' +
      '<th data-col="num" style="width:3%">#</th>' +
      '<th data-col="word"  style="width:22%">Слово</th>' +
      '<th data-col="trans" style="width:30%">Перевод</th>' +
      '<th data-col="ex"    style="width:45%">Пример</th>' +
      '</tr></thead>';

    /* ── build one <tr> ───────────────────────────────────────────────────── */
    function buildRow(w, rownum, g) {
      var radical   = g.radical    || w.component || '';
      var radicalPy = g.radical_py || '';
      var compPy    = g.component_py || '';

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

    /* ── assemble all sections ───────────────────────────────────────────── */
    var parts = [];

    window.HSK_GROUPS.forEach(function (g) {
      var wordsInGroup = wordsByGroup[g.id];
      if (!wordsInGroup || wordsInGroup.length === 0) return;

      var ph = g.pos_heading_before;
      if (ph && ph.id) {
        parts.push(
          '<h2 class="pos-group" id="' + esc(ph.id) + '">' +
          esc(ph.ru) + " <span class='pos-zh'>" + esc(ph.zh) + '</span>' +
          '</h2>'
        );
      }

      parts.push('<h3 class="phonetic-group">' + g.h3_inner + '</h3>');

      var rows = '';
      wordsInGroup.forEach(function (w, i) { rows += buildRow(w, i + 1, g); });

      parts.push(
        '<table>' + THEAD +
        '<tbody id="' + esc(g.id) + '">' + rows + '</tbody>' +
        '</table>'
      );
    });

    mount.innerHTML = parts.join('\\n');

    console.log(
      'render-words: rendered ' + (words ? words.length : 0) + ' words in ' +
      window.HSK_GROUPS.length + ' groups'
    );

    window.HSK_WORDS_RENDERED = true;
    document.dispatchEvent(new Event('words-rendered'));

    return true;
  }

  function loadWordsFromJson() {
    return fetch('data/words.json', { cache: 'no-store' }).then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.json();
    });
  }

  function loadWordsFromScript() {
    return new Promise(function (resolve, reject) {
      if (window.HSK_WORDS && Array.isArray(window.HSK_WORDS)) {
        resolve(window.HSK_WORDS);
        return;
      }
      var s = document.createElement('script');
      s.src = 'data/words-data.js';
      s.async = true;
      s.onload = function () {
        if (window.HSK_WORDS && Array.isArray(window.HSK_WORDS)) {
          resolve(window.HSK_WORDS);
        } else {
          reject(new Error('words-data.js loaded but HSK_WORDS missing'));
        }
      };
      s.onerror = function () { reject(new Error('Failed to load words-data.js')); };
      document.head.appendChild(s);
    });
  }

  function loadWords() {
    if (location && location.protocol === 'file:') {
      return loadWordsFromScript();
    }
    return loadWordsFromJson().catch(function (err) {
      console.warn('render-words: fetch words.json failed, falling back to words-data.js', err);
      return loadWordsFromScript();
    });
  }

  function start(){
    ensureGroups().then(function(){
      return loadWords();
    }).then(function (words) {
      window.HSK_WORDS = words || [];
      try {
        if (render(window.HSK_WORDS)) {
          markReady();
        } else {
          var mount = document.getElementById('word-tables-mount');
          if(mount) mount.innerHTML = '<div style="padding:16px;color:#c44">Render failed. Check console.</div>';
        }
      } catch(e) {
        console.error('render-words: render exception', e);
        var mount = document.getElementById('word-tables-mount');
        if(mount) mount.innerHTML = '<div style="padding:16px;color:#c44">Render exception. Check console.</div>';
      }
    }).catch(function (err) {
      console.error('render-words: failed to load words', err);
      var mount = document.getElementById('word-tables-mount');
      if(mount) mount.innerHTML = '<div style="padding:16px;color:#c44">Load failed. Check console.</div>';
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());


