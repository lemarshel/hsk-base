(function(){
"use strict";
/* ==========================================================================
   js/export.js — Excel and JSON export handlers.

   Row visibility: rows are exported only when they have none of the filter
   hide-classes (hsk-hide, pos-hide, alpha-hide, sr-hide, text-hide).

   No external CDN dependencies for core exports (XLSX loaded via defer CDN).
   ========================================================================== */

/* ── helpers ──────────────────────────────────────────────────────────────── */
function _rowVisible(tr){
  return !tr.classList.contains('hsk-hide') &&
         !tr.classList.contains('pos-hide') &&
         !tr.classList.contains('alpha-hide') &&
         !tr.classList.contains('sr-hide') &&
         !tr.classList.contains('text-hide');
}

/* Read text from an element, stripping any injected TTS button content. */
function _elText(el){
  if(!el) return '';
  var c = el.cloneNode(true);
  var btn = c.querySelector('.tts-btn');
  if(btn) btn.parentNode.removeChild(btn);
  return c.textContent.trim();
}

function _rowData(tr){
  return {
    word:           tr.getAttribute('data-key')      || '',
    pinyin:         tr.getAttribute('data-py')       || '',
    en:             tr.getAttribute('data-en')       || '',
    ru:             tr.getAttribute('data-ru')       || '',
    example_zh:     _elText(tr.querySelector('.ex-zh')),
    example_pinyin: _elText(tr.querySelector('.ex-py')),
    example_en:     _elText(tr.querySelector('.ex-trans-en')),
    example_ru:     _elText(tr.querySelector('.ex-trans-ru')),
    pos:            tr.getAttribute('data-section')  || '',
    phonetic_group: tr.getAttribute('data-tbody')    || '',
    component:      tr.getAttribute('data-component')|| '',
    hsk:            tr.getAttribute('data-hsk')      || ''
  };
}

/* Thin top progress bar — returns { set(pct), finish() } */
function _progressBar(){
  var bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:0;background:var(--pal-accent,#e94560);z-index:99999;transition:width .3s ease,opacity .3s ease';
  document.body.appendChild(bar);
  requestAnimationFrame(function(){ bar.style.width = '15%'; });
  return {
    set: function(pct){ bar.style.width = pct + '%'; },
    finish: function(){
      bar.style.width = '100%';
      setTimeout(function(){
        bar.style.opacity = '0';
        setTimeout(function(){ if(bar.parentNode) bar.parentNode.removeChild(bar); }, 350);
      }, 200);
    }
  };
}

/* ── Excel Export (SheetJS / CSV fallback) ────────────────────── */
(function(){
  var btn = document.getElementById('btn-export-csv');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var prog = _progressBar();
    prog.set(50);
    var today = new Date().toISOString().slice(0,10);
    var header = ['Word','Pinyin','English','Russian',
                  'Example ZH','Example Pinyin','Example EN','Example RU',
                  'POS','HSK','Component','Phonetic Group'];
    var rows = [header];
    document.querySelectorAll('tr[data-key]').forEach(function(tr){
      if(!_rowVisible(tr)) return;
      var d = _rowData(tr);
      rows.push([d.word, d.pinyin, d.en, d.ru,
                 d.example_zh, d.example_pinyin, d.example_en, d.example_ru,
                 d.pos.replace('pos_',''), d.hsk, d.component, d.phonetic_group]);
    });
    if(typeof XLSX !== 'undefined'){
      var ws = XLSX.utils.aoa_to_sheet(rows);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'HSK Dictionary');
      XLSX.writeFile(wb, 'HSK_Dictionary_' + today + '.xlsx');
    } else {
      var csv = rows.map(function(r){
        return r.map(function(c){ return '"' + String(c).replace(/"/g,'""') + '"'; }).join(',');
      }).join('\n');
      var a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
      a.download = 'HSK_Dictionary_' + today + '.csv';
      a.click();
    }
    prog.finish();
  });
})();

/* ── JSON Export ────────────────────────────────────────────────── */
(function(){
  var btn = document.getElementById('btn-export-anki');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var prog = _progressBar();
    prog.set(50);
    var today = new Date().toISOString().slice(0,10);
    var words = [];
    document.querySelectorAll('tr[data-key]').forEach(function(tr){
      if(!_rowVisible(tr)) return;
      words.push(_rowData(tr));
    });
    var blob = new Blob([JSON.stringify(words, null, 2)], {type:'application/json;charset=utf-8'});
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'HSK_words_' + today + '.json'; a.click();
    URL.revokeObjectURL(url);
    prog.finish();
  });
})();
})();
