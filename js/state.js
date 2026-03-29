(function(){
"use strict";
/* ======================================================================
   js/state.js — Cross-device state export/import (Path A)

   Exports a single JSON file that can be imported on another device.
   No backend required. Works offline.
   ====================================================================== */

var LS = window.HSK_LS || {};
var TRACKER_KEY = 'hsk_learner_events';

function safeParse(raw, fallback){
  if(!raw) return fallback;
  try { return JSON.parse(raw); } catch(e) { return fallback; }
}

function getHideCols(){
  var out = {};
  if(!LS.H) return out;
  for(var i=0;i<localStorage.length;i++){
    var k = localStorage.key(i);
    if(k && k.indexOf(LS.H) === 0){ out[k] = localStorage.getItem(k); }
  }
  return out;
}

function setHideCols(map){
  if(!LS.H) return;
  // Clear existing hide-col keys first
  var toRemove = [];
  for(var i=0;i<localStorage.length;i++){
    var k = localStorage.key(i);
    if(k && k.indexOf(LS.H) === 0){ toRemove.push(k); }
  }
  toRemove.forEach(function(k){ localStorage.removeItem(k); });
  if(!map) return;
  Object.keys(map).forEach(function(k){ localStorage.setItem(k, map[k]); });
}

function buildState(){
  var learned = safeParse(localStorage.getItem(LS.L), []);
  var familiar = safeParse(localStorage.getItem(LS.F), []);
  var tracker = safeParse(localStorage.getItem(TRACKER_KEY), null);

  return {
    schema_version: 1,
    app: 'hsk-base',
    exported_at: new Date().toISOString(),
    words_count: (window.HSK_WORDS && window.HSK_WORDS.length) ? window.HSK_WORDS.length : null,
    learned: Array.isArray(learned) ? learned : [],
    familiar: Array.isArray(familiar) ? familiar : [],
    prefs: {
      mode: localStorage.getItem(LS.M) || null,
      prefs: localStorage.getItem(LS.P) || null,
      row_order: localStorage.getItem(LS.R) || null,
      volume: localStorage.getItem(LS.V) || null,
      speed: localStorage.getItem(LS.S) || null,
      phoneme_hidden: localStorage.getItem(LS.PH) || null,
      lang: localStorage.getItem(LS.LG) || null,
      palette: localStorage.getItem(LS.PA) || null,
      snapshots: localStorage.getItem(LS.SN) || null,
      hide_cols: getHideCols()
    },
    tracker: tracker
  };
}

function applyState(state){
  if(!state || state.schema_version !== 1){
    alert('Unsupported state file.');
    return false;
  }

  localStorage.setItem(LS.L, JSON.stringify(state.learned || []));
  localStorage.setItem(LS.F, JSON.stringify(state.familiar || []));

  var p = state.prefs || {};
  if(p.mode != null) localStorage.setItem(LS.M, p.mode);
  if(p.prefs != null) localStorage.setItem(LS.P, p.prefs);
  if(p.row_order != null) localStorage.setItem(LS.R, p.row_order);
  if(p.volume != null) localStorage.setItem(LS.V, p.volume);
  if(p.speed != null) localStorage.setItem(LS.S, p.speed);
  if(p.phoneme_hidden != null) localStorage.setItem(LS.PH, p.phoneme_hidden);
  if(p.lang != null) localStorage.setItem(LS.LG, p.lang);
  if(p.palette != null) localStorage.setItem(LS.PA, p.palette);
  if(p.snapshots != null) localStorage.setItem(LS.SN, p.snapshots);
  setHideCols(p.hide_cols || {});

  if(state.tracker != null){
    try { localStorage.setItem(TRACKER_KEY, JSON.stringify(state.tracker)); } catch(e) {}
  }

  return true;
}

function downloadState(){
  var data = buildState();
  var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var today = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = 'hsk_state_' + today + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function bindUI(){
  var btnExport = document.getElementById('btn-export-state');
  var btnImport = document.getElementById('btn-import-state');
  var input = document.getElementById('state-file');

  if(btnExport) btnExport.addEventListener('click', downloadState);
  if(btnImport && input){
    btnImport.addEventListener('click', function(){ input.click(); });
    input.addEventListener('change', function(){
      var file = input.files && input.files[0];
      if(!file) return;
      var reader = new FileReader();
      reader.onload = function(){
        try {
          var data = JSON.parse(reader.result);
          if(applyState(data)){
            if(confirm('State imported. Reload now?')){ location.reload(); }
          }
        } catch(e){
          alert('Invalid state file.');
        }
      };
      reader.readAsText(file);
      input.value = '';
    });
  }
}

if(window.onHskWordsReady){
  window.onHskWordsReady(bindUI);
} else {
  document.addEventListener('hsk:words-ready', bindUI, { once: true });
}
})();
