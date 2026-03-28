/* ==========================================================================
   js/filter.js — Search, HSK/POS/alpha filters, rebuildView

   OWNS (registers to window._hsk):
     rebuildView, stripTones, applyAlphaFilter, getCurrentAlpha,
     renumVisible, getVisibleRowCount, updateWordCount

   CONSUMES (reads from window._hsk):
     getLang         ← lang.js   (guarded; called inside buildFilteredView)
     getCurrentSort,
     sortRows,
     sortRowsByHsk,
     updateDragState ← sort.js   (sort.js loads before filter.js ✓)

   INPUT:  #search-input, #search-lang, .hsk-btn, .pos-btn, .alpha-btn; data-hsk/data-py/data-ru/data-en on rows
   ACTION: stripTones/doSearch for basic search; rebuildView is the single entry point that applies all active filters + sort
   OUTPUT: sr-hide/hsk-hide/pos-hide/alpha-hide on rows; #filtered-view table; #hsk-count-val; window._hsk (via _register)
   ========================================================================== */
(function(){
"use strict";

/* search */
/* ── doSearch — real-time row filtering ───────────────────────────────────────
   INPUT:  #search-input value; #search-lang value ('zh'|'py'|'ru'|'en');
           .zh / .py / trans-cell text content on each visible row
   ACTION: adds sr-hide to rows that don't contain the query in the selected field
   OUTPUT: sr-hide CSS class toggled on each tbody row
   ────────────────────────────────────────────────────────────────────────────── */
function stripTones(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
var sTimer=null;
function doSearch(){
  var q=document.getElementById('search-input').value.trim();
  var lang=document.getElementById('search-lang').value;
  var qn=lang==='py'?stripTones(q):q.toLowerCase();
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    if(!q){tr.classList.remove('sr-hide');return;}
    var txt='',cells=tr.cells;
    if(lang==='zh'){var z=cells[3]&&cells[3].querySelector('.zh');txt=z?z.textContent.trim():'';}
    else if(lang==='py'){var p=cells[3]&&cells[3].querySelector('.py');txt=p?stripTones(p.textContent.trim()):'';}
    else{txt=cells[4]?cells[4].textContent.toLowerCase():'';}
    tr.classList.toggle('sr-hide',!txt.includes(qn));
  });
}
document.getElementById('search-input').addEventListener('input',function(){clearTimeout(sTimer);sTimer=setTimeout(doSearch,130);});
/* ── Search event wiring ──────────────────────────────────────────────────────
   INPUT:  #search-input (text), #search-lang (select), #search-clear (button)
   ACTION: input event debounces doSearch() by 130 ms;
           lang change and clear button call doSearch() immediately
   OUTPUT: doSearch() called; sr-hide class on rows
   ────────────────────────────────────────────────────────────────────────────── */
document.getElementById('search-lang').addEventListener('change',doSearch);
document.getElementById('search-clear').addEventListener('click',function(){document.getElementById('search-input').value='';doSearch();});

/* ── Search improvements (EN mode + flat filtered view) ──────────────────── */
var searchActive = false;
var filteredView = document.getElementById('filtered-view');

function buildFilteredView(rows, bySect){
  filteredView.innerHTML = '';
  if(!rows.length){ filteredView.style.display='none'; return; }
  var _en = (window._hsk && window._hsk.getLang ? window._hsk.getLang() : 'ru') === 'en';

  function makeTable(rowSet, startNum){
    var tbl = document.createElement('table');
    tbl.style.cssText = 'width:100%;border-collapse:collapse;margin-bottom:8px';
    tbl.className = 'fv-table';
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th data-col="cb" class="cb-col">&#10004;</th><th data-col="fam" class="fam-col">?</th><th data-col="num" style="width:3%">#</th>'
      +'<th data-col="word" style="width:22%">'+(_en?'Word':'Слово')+'</th>'
      +'<th data-col="trans" style="width:30%">'+(_en?'Translation':'Перевод')+'</th>'
      +'<th data-col="ex" style="width:45%">'+(_en?'Example':'Пример')+'</th></tr>';
    tbl.appendChild(thead);
    var tbody = document.createElement('tbody');
    rowSet.forEach(function(tr, i){
      var clone = tr.cloneNode(true);
      var rn = clone.querySelector('.rownum'); if(rn) rn.textContent = startNum + i;
      // Highlight search match
      var _q = (document.getElementById('search-input')||{}).value||'';
      var _ql = (document.getElementById('search-lang')||{}).value||'ru';
      if(_q.trim()){
        var _qt = _q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        var _sel = _ql==='zh'?'.zh':_ql==='py'?'.py':_ql==='en'?'.trans-en':'.trans-ru';
        var _el = clone.querySelector(_sel);
        if(_el){ _el.innerHTML = _el.textContent.replace(new RegExp('('+_qt+')','gi'),'<mark>$1</mark>'); }
      }
      tbody.appendChild(clone);
    });
    tbl.appendChild(tbody);
    return tbl;
  }

  if(bySect){
    var secOrder = ['pos_noun','pos_verb','pos_adj','pos_adv','pos_mw','pos_particle','pos_conj','pos_prep','pos_pron'];
    var secMap = {};
    rows.forEach(function(tr){
      var s = tr.getAttribute('data-section') || 'other';
      if(!secMap[s]) secMap[s] = [];
      secMap[s].push(tr);
    });
    var rowNum = 1;
    secOrder.forEach(function(secId){
      var secRows = secMap[secId];
      if(!secRows || !secRows.length) return;
      var origH2 = document.getElementById(secId);
      if(origH2){
        var h2c = origH2.cloneNode(true);
        h2c.removeAttribute('id');
        h2c.style.cursor = 'default';
        filteredView.appendChild(h2c);
      }
      filteredView.appendChild(makeTable(secRows, rowNum));
      rowNum += secRows.length;
    });
    if(secMap['other'] && secMap['other'].length)
      filteredView.appendChild(makeTable(secMap['other'], rowNum));
  } else {
    filteredView.appendChild(makeTable(rows, 1));
  }
  filteredView.style.display = 'block';
}

// Override old doSearch to no-op; rebuildView() is the single search handler
function doSearch(){}
function cdxDoSearch(){ rebuildView(); }

document.addEventListener('DOMContentLoaded', function(){
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

  // Limit visible translations to max 2 items (RU/EN)
  document.querySelectorAll('.trans-ru, .trans-en').forEach(function(span){
    span.textContent = limitTranslationText(span.textContent, 2);
  });

  var inp = document.getElementById('search-input');
  var langSel = document.getElementById('search-lang');
  var clr = document.getElementById('search-clear');
  var sTimer = null;
  function debounced(){ clearTimeout(sTimer); sTimer=setTimeout(cdxDoSearch, 130); }
  if(inp){ inp.removeEventListener('input', inp._cdx_handler); inp.addEventListener('input', debounced); inp._cdx_handler = debounced; }
  if(langSel){ langSel.addEventListener('change', cdxDoSearch); }
  if(clr){ clr.addEventListener('click', function(){ if(inp) inp.value=''; cdxDoSearch(); }); }
});

/* ── HSK level filter (multi-select) ──────────────────────────── */
/* ── HSK level filter ─────────────────────────────────────────────────────────
   INPUT:  checkbox clicks on .hsk-filter-cb; data-hsk attribute on each row
   ACTION: maintains activeHSKLevels Set; calls rebuildView() on change;
           rebuildView() adds hsk-hide to rows not in activeHSKLevels
   OUTPUT: activeHSKLevels Set; hsk-hide CSS class on rows; rebuildView() call
   ────────────────────────────────────────────────────────────────────────────── */
var activeHSKLevels = new Set(); // empty = show all
document.querySelectorAll('.hsk-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    var h = this.dataset.hsk;
    if(h === 'all'){
      activeHSKLevels.clear();
    } else {
      if(activeHSKLevels.has(h)){ activeHSKLevels.delete(h); }
      else { activeHSKLevels.add(h); }
    }
    var hasSel = activeHSKLevels.size > 0;
    document.querySelector('.hsk-btn[data-hsk="all"]').classList.toggle('active', !hasSel);
    document.querySelectorAll('.hsk-btn:not([data-hsk="all"])').forEach(function(b){
      b.classList.toggle('active', activeHSKLevels.has(b.dataset.hsk));
    });
    applyHSKFilter();
    rebuildView();
  });
});
function applyHSKFilter(){
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    if(activeHSKLevels.size === 0){
      tr.classList.remove('hsk-hide');
    } else {
      var h = tr.getAttribute('data-hsk') || '';
      tr.classList.toggle('hsk-hide', !activeHSKLevels.has(h));
    }
  });
}

function updateEmptyGroups(){
  function rowVisible(tr){
    return !tr.classList.contains('hsk-hide') &&
           !tr.classList.contains('pos-hide') &&
           !tr.classList.contains('alpha-hide') &&
           !tr.classList.contains('text-hide') &&
           !tr.classList.contains('sr-hide');
  }
  function tableHasVisibleRows(tbl){
    if(!tbl) return false;
    for(var i=0;i<tbl.rows.length;i++){
      if(rowVisible(tbl.rows[i])) return true;
    }
    return false;
  }
  // Hide empty phonetic groups
  document.querySelectorAll('h3.phonetic-group').forEach(function(h3){
    var next = h3.nextElementSibling;
    var wrap = (next && next.classList && next.classList.contains('grp-wrap')) ? next : null;
    var tbl = wrap ? wrap.querySelector('table') : (next && next.tagName === 'TABLE' ? next : null);
    var hasRows = tableHasVisibleRows(tbl);
    h3.classList.toggle('grp-empty', !hasRows);
    if(wrap) wrap.classList.toggle('grp-empty', !hasRows);
    else if(tbl) tbl.classList.toggle('grp-empty', !hasRows);
  });
  // Hide empty POS sections
  document.querySelectorAll('h2.pos-group').forEach(function(h2){
    var el = h2.nextElementSibling;
    var hasRows = false;
    while(el && el.tagName !== 'H2'){
      var tbl = null;
      if(el.classList && el.classList.contains('grp-wrap')) tbl = el.querySelector('table');
      else if(el.tagName === 'TABLE') tbl = el;
      if(tbl && tableHasVisibleRows(tbl)) { hasRows = true; break; }
      el = el.nextElementSibling;
    }
    h2.classList.toggle('pos-empty', !hasRows);
  });
}

/* ── Word count display ────────────────────────────────────────── */
/* ── Word count display ───────────────────────────────────────────────────────
   INPUT:  n (integer count of currently visible rows)
   ACTION: updates #word-count element text
   OUTPUT: #word-count textContent
   ────────────────────────────────────────────────────────────────────────────── */
function updateWordCount(n){
  var el = document.getElementById('hsk-count-val');
  if(el) el.textContent = n;
}
function getVisibleRowCount(){
  var n = 0;
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    if(tr.classList.contains('hsk-hide') || tr.classList.contains('pos-hide') ||
       tr.classList.contains('alpha-hide') || tr.classList.contains('text-hide') ||
       tr.classList.contains('sr-hide')) return;
    n++;
  });
  return n;
}

/* ── Continuous row numbering across all visible rows ───────────── */
/* ── renumVisible — continuous row numbering ───────────────────────────────────
   INPUT:  all visible rows across all non-learned tbodies
   ACTION: assigns sequential integers 1-N to .rownum cells, skipping hidden rows
   OUTPUT: .rownum textContent updated in DOM
   ────────────────────────────────────────────────────────────────────────────── */
function renumVisible(){
  var n = 0;
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
    Array.prototype.forEach.call(tb.rows, function(tr){
      if(tr.classList.contains('hsk-hide') || tr.classList.contains('pos-hide') ||
         tr.classList.contains('alpha-hide') || tr.classList.contains('sr-hide')) return;
      var c = tr.querySelector('.rownum');
      if(c) c.textContent = ++n;
    });
  });
}

document.addEventListener('DOMContentLoaded', function(){
  var total = document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').length;
  updateWordCount(total);
  renumVisible();
});



/* ── POS filter ──────────────────────────────────────────────── */
/* ── POS filter ───────────────────────────────────────────────────────────────
   INPUT:  currentPOS string ('all' or 'pos_noun' etc.); data-section on rows
   ACTION: clicking a POS button sets currentPOS and calls rebuildView();
           rebuildView() adds pos-hide to rows not matching the selected section
   OUTPUT: currentPOS var; pos-hide CSS class on rows; rebuildView() call
   ────────────────────────────────────────────────────────────────────────────── */
var currentPOS = 'all';
var POS_LABELS_RU = window.HSK_POS_LABELS_RU;
var POS_LABELS_EN = window.HSK_POS_LABELS_EN;
function applyPOSFilter(pos){
  currentPOS = pos;
  document.querySelectorAll('.pos-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.pos===pos); });
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    if(pos==='all'){ tr.classList.remove('pos-hide'); }
    else { tr.classList.toggle('pos-hide', (tr.getAttribute('data-section')||'')!==pos); }
  });
  rebuildView();
}
document.querySelectorAll('.pos-btn').forEach(function(btn){
  btn.addEventListener('click', function(){ applyPOSFilter(this.dataset.pos); });
});

/* ── Alpha filter ────────────────────────────────────────────── */
/* ── Alpha filter ─────────────────────────────────────────────────────────────
   INPUT:  currentAlpha string ('all' or a letter); data-py attribute on each row
   ACTION: clicking a letter button sets currentAlpha and calls rebuildView();
           rebuildView() adds alpha-hide to rows whose pinyin doesn't start with it
   OUTPUT: currentAlpha var; alpha-hide CSS class on rows; rebuildView() call
   ────────────────────────────────────────────────────────────────────────────── */
var currentAlpha = 'all';
function applyAlphaFilter(letter){
  currentAlpha = letter;
  var isEn = document.body.classList.contains('lang-en');
  // sync active state across both EN and RU alpha-btn sets
  document.querySelectorAll('.alpha-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.alpha===letter); });
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    if(letter==='all'){ tr.classList.remove('alpha-hide'); return; }
    var val = isEn ? (tr.getAttribute('data-en')||'') : (tr.getAttribute('data-ru')||'');
    var first = val.trim().charAt(0).toUpperCase();
    tr.classList.toggle('alpha-hide', first!==letter);
  });
  rebuildView();
}
document.querySelectorAll('.alpha-btn').forEach(function(btn){
  btn.addEventListener('click', function(){ applyAlphaFilter(this.dataset.alpha); });
});

/* ── rebuildView: single source of truth for what is shown ──────────────── */
/* ── rebuildView — master view rebuild ────────────────────────────────────────
   INPUT:  activeHSKLevels, currentPOS, currentAlpha, currentSort, all tbody rows
   ACTION: applies hsk-hide / pos-hide / alpha-hide to rows; re-sorts tbodies;
           merges small phoneme groups; renumbers; updates word count and HSK stats;
           rebuilds filtered-view flat table for EN search mode
   OUTPUT: DOM row visibility + order; #word-count text; #hsk-stats-bar HTML
   ────────────────────────────────────────────────────────────────────────────── */
function rebuildView(){
  var inp     = document.getElementById('search-input');
  var langSel = document.getElementById('search-lang');
  var rd      = document.getElementById('sort-respect-div');
  var q       = inp ? inp.value.trim() : '';
  var lang    = langSel ? langSel.value : 'ru';
  var bySection = !rd || rd.checked;
  var forceFlat = activeHSKLevels && activeHSKLevels.size > 0;
  if(forceFlat) bySection = false;

  // Use flat filtered view when:
  //   • a non-default sort is active (always global A-Z regardless of bySection), OR
  //   • bySection is off (user explicitly wants flat view), OR
  //   • a search query is active
  var useFlat = window._hsk.getCurrentSort() !== 'default' || !bySection || !!q || forceFlat;

  function stripTones(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
  var qn = (lang==='py') ? stripTones(q) : q.toLowerCase();

  var allRows = [];
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    if(!tr.classList.contains('hsk-hide') && !tr.classList.contains('pos-hide') && !tr.classList.contains('alpha-hide')) allRows.push(tr);
  });

  if(!useFlat){
    // Default sort + bySection on + no search: restore normal section view
    document.body.classList.remove('flat-view');
    document.body.classList.remove('searching');
    searchActive = false;
    filteredView.style.display = 'none';
    filteredView.innerHTML = '';
    allRows.forEach(function(tr){ tr.classList.remove('sr-hide'); });
    updateWordCount(allRows.length);
    renumVisible();
    updateEmptyGroups();
    window._hsk.updateDragState();
    return;
  }

  document.body.classList.add('flat-view');
  searchActive = !!q;
  document.body.classList.toggle('searching', searchActive);
  window._hsk.updateDragState();

  // Filter by search query if one exists
  var isEnUI = document.body.classList.contains('lang-en');
  var matched = q ? allRows.filter(function(tr){
    // Always search Chinese and pinyin
    var zhTxt = (tr.getAttribute('data-key')||'').toLowerCase();
    var pyTxt = stripTones(tr.getAttribute('data-py')||'');
    var transTxt = '';
    if(lang==='zh')      { return zhTxt.includes(qn); }
    else if(lang==='py') { return pyTxt.includes(qn); }
    else if(lang==='en') { transTxt = (tr.getAttribute('data-en')||'').toLowerCase(); }
    else if(lang==='ru') { transTxt = (tr.getAttribute('data-ru')||'').toLowerCase(); }
    else {
      // Auto mode: search active UI translation lang + ZH + PY
      if(isEnUI) transTxt = (tr.getAttribute('data-en')||'').toLowerCase();
      else       transTxt = (tr.getAttribute('data-ru')||'').toLowerCase();
    }
    return zhTxt.includes(qn) || pyTxt.includes(qn) || transTxt.includes(qn);
  }) : allRows;

  // Apply global sort to matched rows when a non-default sort is active
  if(window._hsk.getCurrentSort() !== 'default'){
    if(window._hsk.getCurrentSort() === 'hsk-asc' || window._hsk.getCurrentSort() === 'hsk-desc'){
      matched = window._hsk.sortRowsByHsk(matched, window._hsk.getCurrentSort() === 'hsk-desc');
    }else{
      var keyAttr = {pinyin:'data-py', radical:'data-radical-py', component:'data-component-py'}[window._hsk.getCurrentSort()];
      if(keyAttr) matched = window._hsk.sortRows(matched, keyAttr);
    }
  }

  matched.forEach(function(tr){ tr.classList.remove('sr-hide'); });
  allRows.filter(function(tr){ return matched.indexOf(tr)===-1; })
         .forEach(function(tr){ tr.classList.add('sr-hide'); });

  buildFilteredView(matched, bySection);
  updateWordCount(matched.length);
  updateEmptyGroups();
}

/* ── Register filter internals via shared API ── */
window._hsk._register('filter', {
  rebuildView:        rebuildView,
  stripTones:         stripTones,
  applyAlphaFilter:   applyAlphaFilter,
  getCurrentAlpha:    function() { return currentAlpha; },
  renumVisible:       renumVisible,
  getVisibleRowCount: getVisibleRowCount,
  updateWordCount:    updateWordCount
});
})();
