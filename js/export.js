/* ==========================================================================
   js/export.js — PDF, Excel and JSON export handlers.

   All blocks are self-contained IIFEs. They read data from DOM attributes
   and use document.body.classList for language — no hsk.js internal vars.

   Row visibility: a row is exported only if it has none of the hide classes
   (hsk-hide, pos-hide, alpha-hide, sr-hide, text-hide) that the filter
   system applies.

   DEPENDS ON (CDN, loaded with defer in index.html):
     html2pdf   → PDF export
     XLSX       → Excel export (falls back to CSV if unavailable)

   MUST BE LOADED AFTER hsk.js.
   ========================================================================== */
"use strict";

/* shared visibility helper */
function _rowVisible(tr){
  return !tr.classList.contains('hsk-hide') &&
         !tr.classList.contains('pos-hide') &&
         !tr.classList.contains('alpha-hide') &&
         !tr.classList.contains('sr-hide') &&
         !tr.classList.contains('text-hide');
}

/* shared: collect all data for a visible row */
function _rowData(tr){
  return {
    word:            tr.getAttribute('data-key')     || '',
    pinyin:          tr.getAttribute('data-py')      || '',
    en:              tr.getAttribute('data-en')      || '',
    ru:              tr.getAttribute('data-ru')      || '',
    example_zh:      (tr.querySelector('.ex-zh')        || {}).textContent || '',
    example_pinyin:  (tr.querySelector('.ex-py')        || {}).textContent || '',
    example_en:      (tr.querySelector('.ex-trans-en')  || {}).textContent || '',
    example_ru:      (tr.querySelector('.ex-trans-ru')  || {}).textContent || '',
    pos:             tr.getAttribute('data-section') || '',
    phonetic_group:  tr.getAttribute('data-tbody')   || '',
    component:       tr.getAttribute('data-component')|| '',
    hsk:             tr.getAttribute('data-hsk')     || ''
  };
}

/* ── PDF Export ────────────────────────────────────────────────── */
(function(){
  var btn = document.getElementById('btn-export-pdf');
  if(!btn) return;
  btn.addEventListener('click', function(){
    if(typeof html2pdf === 'undefined'){
      alert('PDF library not loaded yet — please check your internet connection and reload the page.');
      return;
    }
    var isEn = document.body.classList.contains('lang-en');
    var today = new Date().toISOString().slice(0,10);

    var sections = {};
    var sectionOrder = [];
    document.querySelectorAll('tr[data-key]').forEach(function(tr){
      if(!_rowVisible(tr)) return;
      var sec = tr.getAttribute('data-section') || 'other';
      if(!sections[sec]){ sections[sec] = []; sectionOrder.push(sec); }
      sections[sec].push(tr);
    });

    var secLabels = {
      pos_noun:'Nouns \u540d\u8bcd', pos_verb:'Verbs \u52a8\u8bcd', pos_adj:'Adjectives \u5f62\u5bb9\u8bcd',
      pos_adv:'Adverbs \u526f\u8bcd', pos_mw:'Measure Words \u91cf\u8bcd', pos_particle:'Particles \u52a9\u8bcd',
      pos_conj:'Conjunctions \u8fde\u8bcd', pos_prep:'Prepositions \u4ecb\u8bcd', pos_pron:'Pronouns \u4ee3\u8bcd'
    };

    var rows = '';
    var n = 0;
    function limitTranslationText(txt, maxParts){
      if(!txt) return '';
      var t = String(txt).trim();
      if(!t) return t;
      var parts = t.split(/[;；]/).map(function(p){ return p.trim(); }).filter(Boolean);
      var sep = '; ';
      if(parts.length <= 1){
        parts = t.split(',').map(function(p){ return p.trim(); }).filter(Boolean);
        sep = ', ';
      }
      if(parts.length <= 1) return t;
      return parts.slice(0, maxParts).join(sep);
    }
    sectionOrder.forEach(function(sec){
      rows += '<tr class="sec-hdr"><td colspan="7">'+(secLabels[sec]||sec)+'</td></tr>';
      sections[sec].forEach(function(tr){
        n++;
        var d = _rowData(tr);
        var trans = isEn ? d.en : d.ru;
        trans = limitTranslationText(trans, 2);
        rows += '<tr><td>'+n+'</td><td class="zh">'+d.word+'</td><td>'+d.pinyin+'</td><td>'+
          trans.replace(/</g,'&lt;')+'</td><td>HSK'+d.hsk+'</td><td>'+
          d.example_zh+'</td><td class="sm">'+d.example_pinyin+'</td></tr>';
      });
    });

    var wrap = document.createElement('div');
    wrap.id = 'pdf-export-wrap';
    wrap.style.cssText = 'position:fixed;left:0;top:0;width:210mm;padding:8mm;background:#fff;color:#000;z-index:99998;';
    wrap.innerHTML =
      '<style>'+
        '.pdf-root{font-family:Arial,"Noto Sans SC",sans-serif;font-size:10px}'+
        '.pdf-root h1{font-size:16px;text-align:center;margin:0 0 4px}'+
        '.pdf-root .sub{text-align:center;color:#666;font-size:9px;margin:0 0 8px}'+
        '.pdf-root table{width:100%;border-collapse:collapse}'+
        '.pdf-root th{background:#e94560;color:#fff;padding:4px 5px;text-align:left;font-size:9px}'+
        '.pdf-root td{padding:3px 5px;border:1px solid #ddd;vertical-align:top;font-size:9px}'+
        '.pdf-root .zh{font-size:13px;font-weight:bold}'+
        '.pdf-root .sec-hdr td{background:#1a1a2e;color:#fff;font-weight:bold;padding:5px 8px;font-size:10px}'+
        '.pdf-root .sm{font-size:8px;color:#888}'+
        '.pdf-root tr{page-break-inside:avoid}'+
      '</style>'+
      '<div class="pdf-root">'+
        '<h1>HSK 1\u20136 Master Dictionary</h1>'+
        '<div class="sub">Generated '+today+' &nbsp;\u00b7&nbsp; '+n+' words</div>'+
        '<table><thead><tr><th>#</th><th>Word</th><th>Pinyin</th><th>'+(isEn?'English':'Russian')+'</th><th>HSK</th><th>Example</th><th>Example Pinyin</th></tr></thead>'+
        '<tbody>'+rows+'</tbody></table>'+
      '</div>';

    var overlay = document.createElement('div');
    overlay.id = 'pdf-export-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:99999;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:600;';
    overlay.textContent = isEn ? 'Generating PDF\u2026' : '\u0424\u043e\u0440\u043c\u0438\u0440\u0443\u0435\u043c PDF\u2026';

    document.body.appendChild(wrap);
    document.body.appendChild(overlay);

    html2pdf().set({
      margin: 6,
      filename: 'HSK_Dictionary_' + today + '.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 1.6, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(wrap).save().then(function(){
      if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }).catch(function(){
      if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
  });
})();

/* ── Excel Export (SheetJS / CSV fallback) ────────────────────── */
(function(){
  var btn = document.getElementById('btn-export-csv');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var today = new Date().toISOString().slice(0,10);
    var header = ['Word','Pinyin','English','Russian','Example ZH','Example Pinyin',
                  'Example EN','Example RU','POS','HSK','Component','Phonetic Group'];
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
  });
})();

/* ── JSON Export ────────────────────────────────────────────────── */
(function(){
  var btn = document.getElementById('btn-export-anki');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var today = new Date().toISOString().slice(0,10);
    var words = [];
    document.querySelectorAll('tr[data-key]').forEach(function(tr){
      if(!_rowVisible(tr)) return;
      words.push(_rowData(tr));
    });
    var json = JSON.stringify(words, null, 2);
    var blob = new Blob([json], {type:'application/json;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'HSK_words_' + today + '.json'; a.click();
    URL.revokeObjectURL(url);
  });
})();
