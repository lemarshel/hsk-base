(function(){
"use strict";
/* ==========================================================================
   js/storage.js — Snapshot lifecycle: capture, save, restore, reset.

   DEPENDS ON
     window._hsk (exposed by hsk.js at the end of IIFE 2):
       .getLang()   → current interface language ('ru' | 'en')
       .renum(tb)   → renumbers visible rows in a <tbody>
       .confirm()   → shows the cdxConfirm modal

   MUST BE LOADED AFTER hsk.js.
   ========================================================================== */

/* ── Snapshots ────────────────────────────────────────────────────────────── */
var SNAP_KEY = window.HSK_LS.SN;

function getSnapshots(){
  try{ return JSON.parse(localStorage.getItem(SNAP_KEY)||'[]'); }catch(e){ return []; }
}
function saveSnapshots(snaps){
  localStorage.setItem(SNAP_KEY, JSON.stringify(snaps));
}

function captureSnapshot(){
  var snap = {};
  snap.ts = Date.now();
  snap.isoDate = new Date().toISOString().slice(0,16).replace('T',' ');

  var lT = document.getElementById('learned-tbody');
  var fT = document.getElementById('fam-tbody');
  var learned = [], fam = [];
  if(lT) for(var i=0;i<lT.rows.length;i++){ var z=lT.rows[i].querySelector('.zh'); if(z) learned.push(z.textContent.trim()); }
  if(fT) for(var i=0;i<fT.rows.length;i++){ var z=fT.rows[i].querySelector('.zh'); if(z) fam.push(z.textContent.trim()); }
  snap.learned = learned;
  snap.fam = fam;
  snap.total = document.querySelectorAll('tr[data-key]').length;

  var order = {};
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
    var ids=[];
    for(var i=0;i<tb.rows.length;i++){ var z=tb.rows[i].querySelector('.zh'); if(z) ids.push(z.textContent.trim()); }
    if(ids.length) order[tb.id]=ids;
  });
  snap.order = order;

  snap.hiddenCols = ['num','word','trans','ex'].filter(function(c){ return document.body.classList.contains('hide-'+c); });
  snap.mode = localStorage.getItem('hsk_mode') || 'light';

  return snap;
}

function renderSnapshotDropdown(){
  var dd = document.getElementById('snap-dropdown');
  if(!dd) return;
  var snaps = getSnapshots();
  if(!snaps.length){
    dd.innerHTML = '<div class="cdx-dropdown-item" style="color:#999">'+(window._hsk.getLang()==='en'?'No snapshots':'\u041d\u0435\u0442 \u0441\u043d\u0438\u043c\u043a\u043e\u0432')+'</div>';
    return;
  }
  dd.innerHTML = '';
  snaps.slice().reverse().forEach(function(snap, ri){
    var i = snaps.length - 1 - ri;
    var item = document.createElement('div');
    item.className = 'cdx-dropdown-item';
    var lCount = (snap.learned||[]).length;
    var toLearn = snap.total - lCount;
    var _sL = window._hsk.getLang() === 'en';
    item.innerHTML = '<b>' + snap.isoDate + '</b><br><small>'+(_sL?'Total: ':'\u0412\u0441\u0435\u0433\u043e: ') + snap.total + ' | '+(_sL?'Learned: ':'\u0412\u044b\u0443\u0447\u0435\u043d\u043e: ') + lCount + ' | '+(_sL?'Left: ':'\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c: ') + toLearn + '</small>';
    item.addEventListener('click', (function(idx){ return function(){
      dd.classList.remove('open');
      window._hsk.confirm(
        document.body.classList.contains('lang-en')
          ? 'Restore snapshot from ' + snaps[idx].isoDate + '?\nAll current changes will be replaced.'
          : '\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u0441\u043d\u0438\u043c\u043e\u043a \u043e\u0442 ' + snaps[idx].isoDate + '?\n\u0412\u0441\u0435 \u0442\u0435\u043a\u0443\u0449\u0438\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0431\u0443\u0434\u0443\u0442 \u0437\u0430\u043c\u0435\u043d\u0435\u043d\u044b.',
        function(){ restoreSnapshot(snaps[idx]); },
        document.body.classList.contains('lang-en') ? 'Restore' : '\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c',
        document.body.classList.contains('lang-en') ? 'Cancel' : '\u041e\u0442\u043c\u0435\u043d\u0430'
      );
    }; })(i));
    var del = document.createElement('span');
    del.textContent = ' \u2715';
    del.className = 'snap-del-btn';
    del.addEventListener('click', (function(idx){ return function(e){
      e.stopPropagation();
      var s = getSnapshots(); s.splice(idx,1); saveSnapshots(s); renderSnapshotDropdown();
    }; })(i));
    item.appendChild(del);
    dd.appendChild(item);
  });
}

function restoreSnapshot(snap){
  if(snap.order){
    Object.keys(snap.order).forEach(function(tbId){
      var tb = document.getElementById(tbId); if(!tb) return;
      var map={};
      for(var i=0;i<tb.rows.length;i++){ var z=tb.rows[i].querySelector('.zh'); if(z) map[z.textContent.trim()]=tb.rows[i]; }
      snap.order[tbId].forEach(function(w){ var tr=map[w]; if(tr) tb.appendChild(tr); });
    });
    localStorage.setItem(window.HSK_LS.R, JSON.stringify(snap.order));
  }
  var lT = document.getElementById('learned-tbody');
  var fT = document.getElementById('fam-tbody');
  if(lT) while(lT.rows.length){
    var tr=lT.rows[0]; var cb=tr.querySelector('.learn-cb'); if(cb) cb.checked=false;
    var orig=tr.dataset.orig; var o=orig?document.getElementById(orig):null;
    if(o){ o.appendChild(tr); } else { lT.removeChild(tr); }
  }
  if(fT) while(fT.rows.length){
    var tr=fT.rows[0]; var cb=tr.querySelector('.fam-cb'); if(cb) cb.checked=false;
    var orig=tr.dataset.orig; var o=orig?document.getElementById(orig):null;
    if(o){ o.appendChild(tr); } else { fT.removeChild(tr); }
  }
  var wMap={};
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    var z=tr.querySelector('.zh'); if(z) wMap[z.textContent.trim()]=tr;
  });
  (snap.learned||[]).forEach(function(w){
    var tr=wMap[w]; if(!tr) return;
    var cb=tr.querySelector('.learn-cb'); if(cb) cb.checked=true;
    if(lT) lT.appendChild(tr);
  });
  (snap.fam||[]).forEach(function(w){
    var tr=wMap[w]; if(!tr) return;
    var cb=tr.querySelector('.fam-cb'); if(cb) cb.checked=true;
    if(fT) fT.appendChild(tr);
  });
  localStorage.setItem('hsk_learned', JSON.stringify(snap.learned||[]));
  localStorage.setItem('hsk_fam', JSON.stringify(snap.fam||[]));
  document.querySelectorAll('tbody[id]').forEach(function(tb){ window._hsk.renum(tb); });
  var lS=document.getElementById('learned-section'), fS=document.getElementById('fam-section');
  if(lS) lS.style.display=lT&&lT.rows.length?'block':'none';
  if(fS) fS.style.display=fT&&fT.rows.length?'block':'none';
  var stl=document.getElementById('st-lrn'), stf=document.getElementById('st-fam');
  if(stl) stl.textContent=lT?lT.rows.length:0;
  if(stf) stf.textContent=fT?fT.rows.length:0;
  ['num','word','trans','ex'].forEach(function(c){ document.body.classList.remove('hide-'+c); });
  (snap.hiddenCols||[]).forEach(function(c){ document.body.classList.add('hide-'+c); });
  ['num','word','trans','ex'].forEach(function(c){
    var h = document.body.classList.contains('hide-'+c);
    localStorage.setItem(window.HSK_LS.H+c, h ? '1' : '');
    var btn = document.querySelector('.col-btn[data-col="'+c+'"]');
    if(btn) btn.classList.toggle('hidden', h);
  });
  if(snap.mode){
    document.body.classList.remove('light','dark','sepia');
    if(snap.mode !== 'light') document.body.classList.add(snap.mode);
    localStorage.setItem('hsk_mode', snap.mode);
    document.querySelectorAll('.mode-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.mode===snap.mode); });
  }
}

document.addEventListener('DOMContentLoaded', function(){
  var btnSave = document.getElementById('btn-save-snap');
  var btnDd = document.getElementById('btn-snap-dd');
  var snapDd = document.getElementById('snap-dropdown');

  if(btnSave) btnSave.addEventListener('click', function(){
    var snap = captureSnapshot();
    var snaps = getSnapshots();
    snaps.push(snap);
    if(snaps.length > 50) snaps = snaps.slice(-50);
    saveSnapshots(snaps);
    renderSnapshotDropdown();
    var orig = btnSave.textContent;
    btnSave.textContent = window._hsk.getLang()==='en' ? '\u2713 Saved' : '\u2713 \u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e';
    setTimeout(function(){ btnSave.textContent = orig; }, 1500);
  });

  if(btnDd) btnDd.addEventListener('click', function(e){
    e.stopPropagation();
    renderSnapshotDropdown();
    if(snapDd) snapDd.classList.toggle('open');
  });

  document.addEventListener('click', function(){
    if(snapDd) snapDd.classList.remove('open');
  });
  if(snapDd) snapDd.addEventListener('click', function(e){ e.stopPropagation(); });
});

/* ── Reset Everything ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  var btnReset = document.getElementById('btn-reset-all');
  if(btnReset) btnReset.addEventListener('click', function(){
    window._hsk.confirm(
      document.body.classList.contains('lang-en')
        ? 'Reset everything and return to original downloaded state?\nAll progress, snapshots and settings will be removed.'
        : '\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0432\u0441\u0451 \u0438 \u0432\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u043c\u0443 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u044e?\n\u0412\u0441\u0435 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441, \u0441\u043d\u0438\u043c\u043a\u0438 \u0438 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043b\u0435\u043d\u044b.',
      function(){
        var keys = [];
        for(var i=0;i<localStorage.length;i++){
          var k=localStorage.key(i);
          if(k && k.startsWith('hsk')) keys.push(k);
        }
        keys.push(window.HSK_LS.SN, window.HSK_LS.PA, window.HSK_LS.LG, window.HSK_LS.PH);
        keys.forEach(function(k){ localStorage.removeItem(k); });
        location.reload();
      }
    );
  });
});
})();
