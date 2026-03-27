/* ==========================================================================
   js/export.js — PDF (print), Excel and JSON export handlers.

   Row visibility: rows are exported only when they have none of the filter
   hide-classes (hsk-hide, pos-hide, alpha-hide, sr-hide, text-hide).

   No external CDN dependencies — PDF uses window.print().
   ========================================================================== */
"use strict";

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

/* ── PDF Export (html2pdf, loaded on demand) ───────────────────── */
(function(){
  var btn = document.getElementById('btn-export-pdf');
  if(!btn) return;

  /* Load html2pdf only when first needed */
  function ensurePdfLib(onPct, onDone){
    if(typeof html2pdf !== 'undefined'){ onDone(null); return; }
    onPct(30);
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
    s.onload  = function(){ onPct(65); onDone(null); };
    s.onerror = function(){ onDone(new Error('PDF library failed to load — check your internet connection.')); };
    document.head.appendChild(s);
  }

  btn.addEventListener('click', function(){
    var prog = _progressBar();

    ensurePdfLib(function(pct){ prog.set(pct); }, function(err){
      if(err){ prog.finish(); alert(err.message); return; }

      var isEn  = document.body.classList.contains('lang-en');
      var today = new Date().toISOString().slice(0,10);

      var secLabels = {
        pos_noun:'Nouns \u540d\u8bcd', pos_verb:'Verbs \u52a8\u8bcd',
        pos_adj:'Adjectives \u5f62\u5bb9\u8bcd', pos_adv:'Adverbs \u526f\u8bcd',
        pos_mw:'Measure Words \u91cf\u8bcd', pos_particle:'Particles \u52a9\u8bcd',
        pos_conj:'Conjunctions \u8fde\u8bcd', pos_prep:'Prepositions \u4ecb\u8bcd',
        pos_pron:'Pronouns \u4ee3\u8bcd'
      };

      var sections = {}, sectionOrder = [];
      document.querySelectorAll('tr[data-key]').forEach(function(tr){
        if(!_rowVisible(tr)) return;
        var sec = tr.getAttribute('data-section') || 'other';
        if(!sections[sec]){ sections[sec] = []; sectionOrder.push(sec); }
        sections[sec].push(tr);
      });

      var tableRows = '';
      var n = 0;
      sectionOrder.forEach(function(sec){
        tableRows += '<tr class="sh"><td colspan="6">'+(secLabels[sec]||sec)+'</td></tr>';
        sections[sec].forEach(function(tr){
          n++;
          var d = _rowData(tr);
          var trans = isEn ? d.en : d.ru;
          tableRows +=
            '<tr><td>'+n+'</td>'+
            '<td class="zh">'+d.word+'</td>'+
            '<td>'+d.pinyin+'</td>'+
            '<td>'+trans.replace(/</g,'&lt;')+'</td>'+
            '<td>'+d.hsk+'</td>'+
            '<td class="ex">'+d.example_zh+'<br><span class="py">'+d.example_pinyin+'</span></td></tr>';
        });
      });

      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:absolute;left:-9999px;top:0;width:190mm;background:#fff;color:#000';
      wrap.innerHTML =
        '<style>'+
          'body,div{font-family:Arial,"Noto Sans SC",sans-serif}'+
          'h1{font-size:14px;text-align:center;margin:0 0 2px}'+
          '.sub{text-align:center;color:#666;font-size:8px;margin:0 0 8px}'+
          'table{width:100%;border-collapse:collapse;font-size:8px}'+
          'th{background:#e94560;color:#fff;padding:3px 4px;text-align:left}'+
          'td{padding:2px 4px;border:1px solid #ddd;vertical-align:top}'+
          '.zh{font-size:12px;font-weight:bold}'+
          '.sh td{background:#1a1a2e;color:#fff;font-weight:bold;padding:3px 6px}'+
          '.ex{font-size:7px} .py{color:#888}'+
          'tr{page-break-inside:avoid}'+
        '</style>'+
        '<h1>HSK 1\u20136 Master Dictionary</h1>'+
        '<div class="sub">'+today+' &nbsp;\u00b7&nbsp; '+n+' words</div>'+
        '<table><thead><tr>'+
          '<th>#</th><th>Word</th><th>Pinyin</th>'+
          '<th>'+(isEn?'English':'Russian')+'</th><th>HSK</th><th>Example</th>'+
        '</tr></thead><tbody>'+tableRows+'</tbody></table>';
      document.body.appendChild(wrap);
      prog.set(80);

      html2pdf().set({
        margin: 6,
        filename: 'HSK_Dictionary_' + today + '.pdf',
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 1.4, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(wrap).save().then(function(){
        if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
        prog.finish();
      }).catch(function(e){
        if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
        prog.finish();
        alert('PDF generation failed: ' + (e && e.message || e));
      });
    });
  });
})();

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
