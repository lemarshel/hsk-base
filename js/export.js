/* ==========================================================================
   js/export.js — PDF, Excel and Anki export handlers.

   All three blocks are self-contained IIFEs.  They read data from DOM
   attributes (data-key, data-py, data-en, data-ru, data-hsk, data-section)
   and from document.body.classList for the current language — no dependency
   on any hsk.js internal variable.

   DEPENDS ON (loaded lazily by CDN, only needed when user clicks export):
     html2pdf   → PDF export
     XLSX       → Excel export (falls back to CSV if unavailable)

   MUST BE LOADED AFTER hsk.js.
   ========================================================================== */
"use strict";

/* ── PDF Export (direct download) ─────────────────────────────── */
(function(){
  var btn = document.getElementById('btn-export-pdf');
  if(!btn) return;
  btn.addEventListener('click', function(){
    if(typeof html2pdf === 'undefined'){
      alert('PDF export is not available yet. Please reload the page.');
      return;
    }
    var isEn = document.body.classList.contains('lang-en');
    var today = new Date().toISOString().slice(0,10);

    var sections = {};
    var sectionOrder = [];
    function rowVisible(tr){
      return !tr.classList.contains('hsk-hide') &&
             !tr.classList.contains('pos-hide') &&
             !tr.classList.contains('alpha-hide') &&
             !tr.classList.contains('sr-hide');
    }
    document.querySelectorAll('tr[data-key]').forEach(function(tr){
      if(!rowVisible(tr)) return;
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
        var zh  = tr.getAttribute('data-key') || '';
        var py  = tr.getAttribute('data-py') || '';
        var trans = isEn ? (tr.getAttribute('data-en')||'') : (tr.getAttribute('data-ru')||'');
        trans = limitTranslationText(trans, 2);
        var hsk = tr.getAttribute('data-hsk') || '';
        var exZh = (tr.querySelector('.ex-zh')||{}).textContent || '';
        var exPy = (tr.querySelector('.ex-py')||{}).textContent || '';
        rows += '<tr><td>'+n+'</td><td class="zh">'+zh+'</td><td>'+py+'</td><td>'+
          trans.replace(/</g,'&lt;')+'</td><td>HSK'+hsk+'</td><td>'+
          exZh+'</td><td class="sm">'+exPy+'</td></tr>';
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

    var opt = {
      margin: 6,
      filename: 'HSK_Dictionary_' + today + '.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 1.6, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    html2pdf().set(opt).from(wrap).save().then(function(){
      if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }).catch(function(){
      if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
  });
})();

/* ── Excel Export (SheetJS) ──────────────────────────────────────── */
(function(){
  var btn = document.getElementById('btn-export-csv');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var today = new Date().toISOString().slice(0,10);
    var rows = [['Word','Pinyin','English','Russian','POS','HSK','Example (ZH)','Example (PY)']];
    document.querySelectorAll('tr[data-key]').forEach(function(tr){
      if(tr.offsetParent === null) return;
      rows.push([
        tr.getAttribute('data-key') || '',
        tr.getAttribute('data-py') || '',
        tr.getAttribute('data-en') || '',
        tr.getAttribute('data-ru') || '',
        (tr.getAttribute('data-section') || '').replace('pos_',''),
        tr.getAttribute('data-hsk') || '',
        (tr.querySelector('.ex-zh') || {}).textContent || '',
        (tr.querySelector('.ex-py') || {}).textContent || ''
      ]);
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

/* ── Anki Export (tab-separated .txt) ──────────────────────────── */
(function(){
  var btn = document.getElementById('btn-export-anki');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var today = new Date().toISOString().slice(0,10);
    var lines = [];
    document.querySelectorAll('tr[data-key]').forEach(function(tr){
      if(tr.offsetParent === null) return;
      var zh  = tr.getAttribute('data-key') || '';
      var py  = tr.getAttribute('data-py')  || '';
      var en  = tr.getAttribute('data-en')  || '';
      var ru  = tr.getAttribute('data-ru')  || '';
      var hsk = tr.getAttribute('data-hsk') || '';
      var pos = (tr.getAttribute('data-section') || '').replace('pos_','');
      var exZh = (tr.querySelector('.ex-zh') || {}).textContent || '';
      var exPy = (tr.querySelector('.ex-py') || {}).textContent || '';
      var front = zh + '<br>' + py;
      var back  = ru + (en ? '<br>' + en : '');
      if(exZh) back += '<br><br>' + exZh + '<br>' + exPy;
      var tags  = 'HSK' + hsk + ' ' + pos;
      function esc(s){ return s.replace(/\t/g,' ').replace(/\r?\n/g,' '); }
      lines.push(esc(front) + '\t' + esc(back) + '\t' + tags);
    });
    var bom = '\ufeff';
    var blob = new Blob([bom + lines.join('\n')], {type:'text/plain;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'HSK_Anki_' + today + '.txt'; a.click();
    URL.revokeObjectURL(url);
  });
})();
