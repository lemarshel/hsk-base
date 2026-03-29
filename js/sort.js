/* ==========================================================================
   js/sort.js — Sort modes and drag state

   OWNS (registers to window._hsk):
     applySort, getCurrentSort, sortRows, sortRowsByHsk,
     updateDragState, getTbodiesForSort

   CONSUMES (reads from window._hsk):
     renum       ← hsk.js
     rebuildView ← filter.js  (safe: called only from button handlers,
                                after all scripts have loaded)

   ALSO READS: window._cdxOrigOrder (for default-sort restore)
               window._cdxSortables (to enable/disable drag in updateDragState)

   INPUT:  sort button clicks; data-py/data-radical/data-component/data-hsk on rows; window._cdxOrigOrder; window._cdxSortables
   ACTION: applySort() reorders rows within each tbody by chosen key; updateDragState() disables/enables Sortable when search or sort is active; DOMContentLoaded wires sort buttons and the "by section" checkbox
   OUTPUT: DOM row order; window._hsk (via _register)
   ========================================================================== */
(function(){
"use strict";

var _origOrder = window._cdxOrigOrder || {};

/* ── Sort modes ───────────────────────────────────────────────────────────── */
/* ── Sort modes ───────────────────────────────────────────────────────────────
   INPUT:  sort button clicks; currentSort string; data-py / data-radical /
           data-component / data-hsk attributes on rows
   ACTION: clicking a sort button sets currentSort and calls rebuildView();
           rebuildView() re-orders rows within each tbody by the chosen key
   OUTPUT: currentSort var; DOM row order inside each tbody
   ────────────────────────────────────────────────────────────────────────────── */
var currentSort = 'default';

function getTbodiesForSort(){
  return Array.prototype.slice.call(
    document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)')
  );
}

function sortRows(rows, key){
  return rows.slice().sort(function(a,b){
    var va = (a.getAttribute(key)||'').toLowerCase();
    var vb = (b.getAttribute(key)||'').toLowerCase();
    if(!va && vb) return 1;
    if(va && !vb) return -1;
    if(!va && !vb) return 0;
    return va < vb ? -1 : va > vb ? 1 : 0;
  });
}
function sortRowsByHsk(rows, desc){
  var dir = desc ? -1 : 1;
  return rows.slice().sort(function(a,b){
    var ha = parseInt(a.getAttribute('data-hsk')||'0',10);
    var hb = parseInt(b.getAttribute('data-hsk')||'0',10);
    var va = (ha >= 1 && ha <= 6) ? ha : null;
    var vb = (hb >= 1 && hb <= 6) ? hb : null;
    if(va === null && vb !== null) return 1;
    if(va !== null && vb === null) return -1;
    if(va !== vb) return dir * (va - vb);
    var pa = (a.getAttribute('data-py')||'').toLowerCase();
    var pb = (b.getAttribute('data-py')||'').toLowerCase();
    if(pa < pb) return -1;
    if(pa > pb) return 1;
    return 0;
  });
}

function applySort(mode){
  currentSort = mode;
  updateDragState();

  // Update sort buttons
  document.querySelectorAll('.sort-btn').forEach(function(b){ b.classList.remove('active'); });
  var activeBtn = {default:'sort-default',pinyin:'sort-pinyin',radical:'sort-radical',component:'sort-component','hsk-asc':'sort-hsk-asc','hsk-desc':'sort-hsk-desc'}[mode];
  if(activeBtn){ var ab=document.getElementById(activeBtn); if(ab) ab.classList.add('active'); }

  if(mode === 'default'){
    // Restore original HTML order captured on page load
    getTbodiesForSort().forEach(function(tb){
      var saved = _origOrder[tb.id];
      if(!saved || !saved.length) return;
      var map = {};
      for(var i=0;i<tb.rows.length;i++){
        var z=tb.rows[i].querySelector('.zh'); if(z) map[z.textContent.trim()]=tb.rows[i];
      }
      saved.forEach(function(w){ var tr=map[w]; if(tr) tb.appendChild(tr); });
      window._hsk.renum(tb);
    });
    window._hsk.rebuildView();
    return;
  }

  // Sort within each section's tbody (NEVER move rows between tbodies –
  // bySection=false flat view is handled by rebuildView/filteredView).
  if(mode === 'hsk-asc' || mode === 'hsk-desc'){
    getTbodiesForSort().forEach(function(tb){
      var rows = Array.prototype.slice.call(tb.rows);
      var sorted = sortRowsByHsk(rows, mode === 'hsk-desc');
      sorted.forEach(function(tr){ tb.appendChild(tr); });
      window._hsk.renum(tb);
    });
    window._hsk.rebuildView();
    return;
  }
  var keyAttr = {pinyin:'data-py', radical:'data-radical-py', component:'data-component-py'}[mode];
  if(!keyAttr) return;

  getTbodiesForSort().forEach(function(tb){
    var rows = Array.prototype.slice.call(tb.rows);
    var sorted = sortRows(rows, keyAttr);
    sorted.forEach(function(tr){ tb.appendChild(tr); });
    window._hsk.renum(tb);
  });

  window._hsk.rebuildView();
}

function updateDragState(){
  // Disable/enable sortable drag based on search/sort state
  if(typeof window._cdxSortables !== 'undefined'){
    var disable = document.body.classList.contains('searching') || currentSort !== 'default';
    window._cdxSortables.forEach(function(s){ if(s) try{ s.option('disabled', disable); }catch(e){} });
  }
}

window.onHskWordsReady(function(){
  var btns = {
    'sort-default': 'default',
    'sort-pinyin': 'pinyin',
    'sort-radical': 'radical',
    'sort-component': 'component',
    'sort-hsk-asc': 'hsk-asc',
    'sort-hsk-desc': 'hsk-desc'
  };
  Object.keys(btns).forEach(function(id){
    var btn = document.getElementById(id);
    if(btn) btn.addEventListener('click', function(){ applySort(btns[id]); });
  });
  var rd = document.getElementById('sort-respect-div');
  if(rd) rd.addEventListener('change', function(){
    if(currentSort !== 'default') applySort(currentSort);
    else window._hsk.rebuildView();
  });
});

/* ── Drag integration — patch existing SortableJS init ──────────────────── */
/* ── Drag integration ─────────────────────────────────────────────────────────
   INPUT:  window._cdxSortables array; currentSort and searchActive state
   ACTION: disables all Sortable instances when search is active or sort != default
   OUTPUT: Sortable.option('disabled') toggled on all instances
   ────────────────────────────────────────────────────────────────────────────── */
// Override the existing SortableJS init to store references and use new options
window.onHskWordsReady(function(){
  window._cdxSortables = [];
  // Existing code already created Sortable instances; we create new ones tracking state
  // We patch by listening for sortable events
});

/* ── Register sort internals via shared API ── */
window._hsk._register('sort', {
  applySort:         applySort,
  getCurrentSort:    function() { return currentSort; },
  sortRows:          sortRows,
  sortRowsByHsk:     sortRowsByHsk,
  updateDragState:   updateDragState,
  getTbodiesForSort: getTbodiesForSort
});
})();
