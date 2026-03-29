/* ==========================================================================
   js/hsk.js — Core state layer (word map, learn/fam state, drag init)

   OWNS (registers to window._hsk):
     renum, updateHSKStats, confirm

   CONSUMES (reads from window._hsk):
     renumVisible, updateWordCount, getVisibleRowCount  ← filter.js
     updateDragState                                    ← sort.js

   GLOBAL SIDE EFFECTS:
     window._cdxOrigOrder  — written unconditionally before sort.js reads it
     window._cdxSortables  — written in the 800 ms Sortable-patch setTimeout

   INPUT:  window.HSK_LS (app-config.js); rendered DOM word rows;
           localStorage for learn/fam state and row order
   ACTION: builds wMap word index; restores learned/familiar state;
           computes HSK stats; injects drag handles; inits Sortable;
           populates data-en; registers renum/updateHSKStats/confirm
   OUTPUT: DOM mutations; localStorage writes; window._hsk (via _register);
           window._cdxOrigOrder; window._cdxSortables

   Split-out files (load after this):
     tts.js palette.js lang.js sort.js filter.js ui.js
   ========================================================================== */
(function(){
/* ==========================================================================
   HSK Base — Application logic
   - Reads the embedded vocabulary table
   - Handles search, filters, audio, study, quiz, exports
   - Keeps UI state in localStorage
   ========================================================================== */
"use strict";
var LS=window.HSK_LS; // storage keys — defined in js/app-config.js
var lT=document.getElementById('learned-tbody'),lS=document.getElementById('learned-section');
var fT=document.getElementById('fam-tbody'),fS=document.getElementById('fam-section');

/* stamp origin + build wordMap */
/* ===== Word map index (Hanzi -> row) ===== */
var wMap={};
document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
  for(var i=0;i<tb.rows.length;i++){
    var tr=tb.rows[i];tr.dataset.orig=tb.id;
    var z=tr.querySelector('.zh');if(z)wMap[z.textContent.trim()]=tr;
  }
});

/* ── renum — renumber a tbody ─────────────────────────────────────────────────
   INPUT:  a <tbody> element
   ACTION: iterates all rows, writes sequential integers to .rownum cells
   OUTPUT: .rownum textContent updated in the given tbody
   ────────────────────────────────────────────────────────────────────────────── */
function renum(tb){for(var i=0;i<tb.rows.length;i++){var c=tb.rows[i].querySelector('.rownum');if(c)c.textContent=i+1;}}
/* ── updVis — section visibility + stat counters ──────────────────────────────
   INPUT:  #learned-tbody and #fam-tbody row counts
   ACTION: shows or hides #learned-section / #fam-section based on row count;
           updates #st-lrn and #st-fam counter text
   OUTPUT: display style on sections; counter textContent
   ────────────────────────────────────────────────────────────────────────────── */
function updVis(){
  lS.style.display=lT.rows.length?'block':'none';
  fS.style.display=fT.rows.length?'block':'none';
  document.getElementById('st-lrn').textContent=lT.rows.length;
  document.getElementById('st-fam').textContent=fT.rows.length;
}
/* ===== Persist learned/familiar state ===== */
/* ── save — persist learned/familiar to localStorage ──────────────────────────
   INPUT:  current rows of #learned-tbody and #fam-tbody
   ACTION: collects Hanzi text from each row; serialises to JSON;
           writes to localStorage[LS.L] and localStorage[LS.F];
           calls updateHSKStats() if available
   OUTPUT: localStorage LS.L and LS.F updated
   ────────────────────────────────────────────────────────────────────────────── */
function save(){
  var l=[],f=[];
  for(var i=0;i<lT.rows.length;i++){var z=lT.rows[i].querySelector('.zh');if(z)l.push(z.textContent.trim());}
  for(var i=0;i<fT.rows.length;i++){var z=fT.rows[i].querySelector('.zh');if(z)f.push(z.textContent.trim());}
  localStorage.setItem(LS.L,JSON.stringify(l));localStorage.setItem(LS.F,JSON.stringify(f));
  if(typeof updateHSKStats==='function') updateHSKStats();
}

/* ===== Restore state from localStorage ===== */
/* ── Restore learned/familiar state ───────────────────────────────────────────
   INPUT:  localStorage LS.L (learned) and LS.F (familiar) JSON arrays
   ACTION: parses stored Hanzi lists; looks up each word in wMap; moves matching
           rows to learned/fam tbodies; checks their checkboxes; renumbers
   OUTPUT: rows moved to #learned-tbody / #fam-tbody; .learn-cb/.fam-cb checked;
           renum() on affected tbodies; updVis()
   ────────────────────────────────────────────────────────────────────────────── */
/* restore */
(function(){
  var l=[],f=[];
  try{l=JSON.parse(localStorage.getItem(LS.L)||'[]');}catch(e){}
  try{f=JSON.parse(localStorage.getItem(LS.F)||'[]');}catch(e){}
  var aff={};
  l.forEach(function(w){var tr=wMap[w];if(!tr)return;var cb=tr.querySelector('.learn-cb');if(cb)cb.checked=true;if(tr.dataset.orig)aff[tr.dataset.orig]=1;lT.appendChild(tr);delete wMap[w];});
  f.forEach(function(w){var tr=wMap[w];if(!tr)return;var cb=tr.querySelector('.fam-cb');if(cb)cb.checked=true;if(tr.dataset.orig)aff[tr.dataset.orig]=1;fT.appendChild(tr);delete wMap[w];});
  Object.keys(aff).forEach(function(id){var tb=document.getElementById(id);if(tb)renum(tb);});
  renum(lT);renum(fT);updVis();
})();

/* ── Finalize initial render (avoid staged flashes) ───────────────────── */
/* ── Preload class removal ────────────────────────────────────────────────────
   INPUT:  DOMContentLoaded event
   ACTION: removes .preload from body and documentElement (deferred 0 ms) to
           allow CSS transitions after initial paint; removes #preload-font style tag
   OUTPUT: body.preload and documentElement.preload removed; #preload-font removed
   ────────────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    if(document.body){ document.body.classList.remove('preload'); }
    document.documentElement.classList.remove('preload');
    var pf = document.getElementById('preload-font');
    if(pf && pf.parentNode) pf.parentNode.removeChild(pf);
  }, 0);
});

/* ===== Checkbox delegation (learned/familiar) ===== */
/* ── Checkbox delegation — learned / familiar ─────────────────────────────────
   INPUT:  change events on .learn-cb and .fam-cb checkboxes (delegated from body)
   ACTION: moves row to #learned-tbody or #fam-tbody on check;
           returns row to its original tbody (data-orig) on uncheck;
           unchecks the other checkbox if both would be set; renumbers; saves
   OUTPUT: row moved in DOM; renum() called; updVis(); save() to localStorage
   ────────────────────────────────────────────────────────────────────────────── */
/* checkbox delegation */
document.body.addEventListener('change',function(e){
  var cb=e.target,tr=cb.closest('tr');if(!tr)return;
  var isL=cb.classList.contains('learn-cb'),isF=cb.classList.contains('fam-cb');
  if(!isL&&!isF)return;
  var prev=tr.parentElement,orig=tr.dataset.orig;
  var lcb=tr.querySelector('.learn-cb'),fcb=tr.querySelector('.fam-cb');
  if(isL&&cb.checked){
    if(fcb)fcb.checked=false;
    lT.appendChild(tr);
    if(prev&&prev!==lT)renum(prev);renum(lT);
  }else if(isL){
    var o=orig?document.getElementById(orig):null;
    if(o){o.appendChild(tr);renum(o);}renum(lT);
  }else if(isF&&cb.checked){
    if(lcb)lcb.checked=false;
    fT.appendChild(tr);
    if(prev&&prev!==fT)renum(prev);renum(fT);
  }else{
    var o=orig?document.getElementById(orig):null;
    if(o){o.appendChild(tr);renum(o);}renum(fT);
  }
  updVis();save();
});

/* HSK level badge in word cells */
/* ── HSK level badge injection ────────────────────────────────────────────────
   INPUT:  data-hsk attribute on each non-learned/fam row
   ACTION: DOMContentLoaded: appends a .hsk-{N} badge span to each .wordcell;
           then calls updateHSKStats() for initial bar render
   OUTPUT: .hsk-badge span appended to each word cell; stats bar rendered
   ────────────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    var lvl = tr.getAttribute('data-hsk');
    if(!lvl) return;
    var wc = tr.querySelector('.wordcell, td[data-col="word"]');
    if(!wc) return;
    var badge = document.createElement('span');
    badge.className = 'hsk-badge hsk-'+lvl;
    badge.textContent = lvl;
    wc.appendChild(badge);
  });
  updateHSKStats();
});
function updateHSKStats(){
/* ── updateHSKStats — HSK progress bar ────────────────────────────────────────
   INPUT:  all tbody rows; data-hsk attribute; .learn-cb:checked state
   ACTION: counts total and learned words per HSK level 1-6;
           renders colored progress spans into #hsk-stats-bar
   OUTPUT: #hsk-stats-bar innerHTML
   ────────────────────────────────────────────────────────────────────────────── */
  var stats = {}, lrn = {};
  [1,2,3,4,5,6].forEach(function(l){ stats[l]=0; lrn[l]=0; });
  document.querySelectorAll('tbody[id] tr').forEach(function(tr){
    var lvl = parseInt(tr.getAttribute('data-hsk')||'0');
    if(!lvl) return;
    stats[lvl]++;
    if(tr.querySelector('.learn-cb:checked')) lrn[lvl]++;
  });
  var bar = document.getElementById('hsk-stats-bar');
  if(!bar) return;
  var colors = window.HSK_LEVEL_COLORS;
  var html = '';
  [1,2,3,4,5,6].forEach(function(l){
    if(!stats[l]) return;
    var pct = stats[l] ? Math.round(lrn[l]/stats[l]*100) : 0;
    html += '<span class="hsk-prog" title="HSK '+l+': '+lrn[l]+'/'+stats[l]+' learned ('+pct+'%)">'
      +'<span class="hsk-badge hsk-'+l+'">'+l+'</span>'
      +'<span class="hsk-prog-bar"><span class="hsk-prog-fill" style="width:'+pct+'%;background:'+colors[l]+'"></span></span>'
      +'<span style="color:#999">'+lrn[l]+'/'+stats[l]+'</span>'
      +'</span>';
  });
  bar.innerHTML = html || '';
}


/* tag trans cells for font targeting */
document.querySelectorAll('tbody tr').forEach(function(tr){if(tr.cells.length>=6)tr.cells[4].classList.add('trans-cell');});
/* ── Drag handle injection ────────────────────────────────────────────────────
   INPUT:  all .trans-cell td elements (translation column)
   ACTION: prepends a ⠿ drag-handle <button> to each translation cell for
           SortableJS row dragging
   OUTPUT: .drag-handle button element at start of each .trans-cell
   ────────────────────────────────────────────────────────────────────────────── */
/* inject drag handles into translation cells */
(function(){
  var isEn = document.body.classList.contains('lang-en');
  document.querySelectorAll('tbody tr').forEach(function(tr){
    var td = tr.querySelector('td.trans-cell') || tr.querySelector('td[data-col="trans"]');
    if(!td || td.querySelector('.drag-handle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drag-handle';
    btn.title = isEn ? 'Drag row' : '\u041f\u0435\u0440\u0435\u043c\u0435\u0441\u0442\u0438\u0442\u044c \u0441\u0442\u0440\u043e\u043a\u0443';
    btn.setAttribute('aria-label', btn.title);
    btn.textContent = '\u22ee\u22ee';
    td.insertBefore(btn, td.firstChild);
  });
})();

/* ── Register core internals via shared API ── */
window._hsk._register('hsk', {
  renum:          renum,
  updateHSKStats: updateHSKStats
});
})();


/* ── Capture original row order BEFORE drag-restore runs ────────────── */
/* ── Capture original row order ───────────────────────────────────────────────
   INPUT:  all non-learned/fam tbodies and their current row order
   ACTION: runs immediately (before drag-restore); snapshots each tbody's row order
           by Hanzi text into window._cdxOrigOrder
   OUTPUT: window._cdxOrigOrder object {tbodyId: [hanziStrings]}
   ────────────────────────────────────────────────────────────────────────────── */
window._cdxOrigOrder = {};
(function(){
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
    var ids = [];
    for(var i=0;i<tb.rows.length;i++){
      var z=tb.rows[i].querySelector('.zh'); if(z) ids.push(z.textContent.trim());
    }
    if(ids.length) window._cdxOrigOrder[tb.id] = ids;
  });
})();


/* ══════════════════════════════════════════════════════════════
   CODEX ADDITIONS  –  EN_DICT, lang switch, palette, snapshots,
                       sort, filtered search, drag integration
   ══════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* ── Original row order (use pre-drag capture from window._cdxOrigOrder) */
/* ── Restore saved drag order ─────────────────────────────────────────────────
   INPUT:  window._cdxOrigOrder (pre-drag snapshot); localStorage hsk_row_order
   ACTION: on load, reorders tbody rows to match the last saved drag order
   OUTPUT: DOM row order within each tbody
   ────────────────────────────────────────────────────────────────────────────── */
var _origOrder = window._cdxOrigOrder || {};



/* ── Populate data-en on page load ──────────────────────────────────────── */
/* ── Populate data-en on page load ────────────────────────────────────────────
   INPUT:  .trans-en span textContent on each row
   ACTION: DOMContentLoaded: reads each row's .trans-en text and writes it to
           data-en attribute so sort/export can access it without querying the DOM
   OUTPUT: data-en attribute on every tbody tr
   ────────────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('[data-key]').forEach(function(tr){
    var key = tr.getAttribute('data-key');
    // Priority: data-en from words.xlsx → EN_DICT fallback → empty
    var en = tr.getAttribute('data-en') || window.EN_DICT[key] || '';
    tr.setAttribute('data-en', en);
    var enSpan = tr.querySelector('.trans-en');
    if(enSpan) enSpan.textContent = en;
  });
});

/* ── Snapshots, reset → js/storage.js ───────────────────────────────────── */

/* ── Confirmation popup helper ────────────────────────────────────────────── */
/* ── cdxConfirm — custom confirmation modal ───────────────────────────────────
   INPUT:  msg string, onOk callback, okLabel, cancelLabel strings
   ACTION: shows #cdx-confirm modal with custom text; wires OK/Cancel buttons
   OUTPUT: calls onOk() if user confirms; hides modal on either button
   ────────────────────────────────────────────────────────────────────────────── */
function cdxConfirm(msg, onOk, okLabel, cancelLabel){
  var overlay = document.getElementById('cdx-confirm');
  var msgEl = document.getElementById('cdx-confirm-msg');
  var cancelBtn = document.getElementById('cdx-conf-cancel');
  var okBtn = document.getElementById('cdx-conf-ok');
  if(!overlay) return;
  msgEl.textContent = msg;
  overlay.classList.add('open');
  function close(){ overlay.classList.remove('open'); }
  var isEn = document.body.classList.contains('lang-en');
  cancelBtn.textContent = cancelLabel || (isEn ? 'Cancel' : 'Отмена');
  okBtn.textContent = okLabel || (isEn ? 'Confirm' : 'Подтвердить');
  cancelBtn.onclick = close;
  okBtn.onclick = function(){ close(); onOk(); };
}

/* ── Patch Sortable init to track instances + ghost class ─────────────────── */
/* ── Sortable.js init patch ───────────────────────────────────────────────────
   INPUT:  all tbody[id] elements (excluding learned/fam); localStorage hsk_row_order
   ACTION: initialises SortableJS on each tbody; restores saved drag order;
           on drag-end persists new order to localStorage and renumbers rows
   OUTPUT: DOM row order; localStorage hsk_row_order; window._cdxSortables array
   ────────────────────────────────────────────────────────────────────────────── */
// Wait for the drag script to run, then patch
setTimeout(function(){
  // Re-init sortables with new options (animation:80, ghostClass)
  if(typeof Sortable === 'undefined') return;
  // Restore saved drag order before creating Sortables
  function loadOrder(){
    var order={};
    try{ order=JSON.parse(localStorage.getItem(window.HSK_LS.R)||'{}'); }catch(e){}
    Object.keys(order).forEach(function(tbId){
      var tb=document.getElementById(tbId); if(!tb) return;
      var map={};
      for(var i=0;i<tb.rows.length;i++){
        var z=tb.rows[i].querySelector('.zh'); if(z) map[z.textContent.trim()]=tb.rows[i];
      }
      order[tbId].forEach(function(w){ var tr=map[w]; if(tr) tb.appendChild(tr); });
      for(var i=0;i<tb.rows.length;i++){var c=tb.rows[i].querySelector('.rownum');if(c)c.textContent=i+1;}
    });
  }
  loadOrder();
  window._cdxSortables = [];
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
    // Try to get existing sortable and destroy it
    var existing = Sortable.get ? Sortable.get(tb) : null;
    if(existing) try{ existing.destroy(); }catch(e){}
    var s = Sortable.create(tb, {
      animation: 80,
      cursor: 'grab',
      handle: '.drag-handle',
      ghostClass: 'drag-ghost',
      disabled: false,
      onEnd: function(){
        for(var i=0;i<tb.rows.length;i++){
          var c=tb.rows[i].querySelector('.rownum'); if(c) c.textContent=i+1;
        }
        // save order
        var order={};
        document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(t){
          var ids=[];
          for(var j=0;j<t.rows.length;j++){ var z=t.rows[j].querySelector('.zh'); if(z) ids.push(z.textContent.trim()); }
          if(ids.length) order[t.id]=ids;
        });
        localStorage.setItem(window.HSK_LS.R, JSON.stringify(order));
        if(window._hsk.renumVisible) window._hsk.renumVisible();
        if(window._hsk.updateWordCount) window._hsk.updateWordCount(window._hsk.getVisibleRowCount ? window._hsk.getVisibleRowCount() : 0);
      }
    });
    window._cdxSortables.push(s);
  });
  if(window._hsk.updateDragState) window._hsk.updateDragState();
}, 800);

/* ── Register confirm via shared API ── */
window._hsk._register('hsk', {
  confirm: cdxConfirm
});
})();
