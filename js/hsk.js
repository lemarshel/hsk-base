/* ==========================================================================
   js/hsk.js — IIFE 1: Core word-state management + UI interactions

   INPUT:  window.HSK_LS (from app-config.js); rendered DOM word rows;
           localStorage for all persistent state
   ACTION: builds word index (wMap), restores learned/fam state, wires all
           interactive UI: TTS, search, filters, sort, theme, font, drag,
           column toggle, group collapse, snapshot bridge, HanziWriter popup
   OUTPUT: DOM mutations; localStorage writes; window._hsk bridge;
           window._cdxOrigOrder; window._cdxSortables
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

/* tone coloring */
/* ── Pinyin tone helpers ──────────────────────────────────────────────────────
   INPUT:  pinyin syllable string
   ACTION: getTone() detects tone 1-4 from diacritic vowels (āáǎà etc.);
           capFirstLetter() uppercases the first alphabetic character
   OUTPUT: tone integer (0-4); capitalised token string
   ────────────────────────────────────────────────────────────────────────────── */
function getTone(syl){
  if(/[āēīōūĀĒĪŌŪ]/.test(syl)) return 1;
  if(/[áéíóúÁÉÍÓÚ]/.test(syl)) return 2;
  if(/[ǎěǐǒǔǍĚǏǑǓ]/.test(syl)) return 3;
  if(/[àèìòùÀÈÌÒÙ]/.test(syl)) return 4;
  return 0;
}
function capFirstLetter(token){
  for(var i=0;i<token.length;i++){
    var ch = token[i];
    if(/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(ch)){
      return token.slice(0,i) + ch.toLocaleUpperCase() + token.slice(i+1);
    }
  }
  return token;
}
function colorPinyin(){
/* ── colorPinyin — tone coloring ──────────────────────────────────────────────
   INPUT:  all .py and .ex-py elements; their raw pinyin text
   ACTION: splits each pinyin string into syllables; wraps each in
           <span class='py-t{0-4}'> using getTone(); capitalises first syllable
           of example pinyin
   OUTPUT: .py / .ex-py innerHTML replaced with tone-colored spans
   ────────────────────────────────────────────────────────────────────────────── */
  document.querySelectorAll('.py,.ex-py').forEach(function(el){
    var raw = el.textContent
      .replace(/[，]/g, ',')
      .replace(/[。]/g, '.')
      .replace(/[？]/g, '?')
      .replace(/[！]/g, '!')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase();
    if(!raw){ el.textContent=''; return; }
    var isExample = el.classList.contains('ex-py');
    var parts = raw.split(' ');
    el.innerHTML = parts.map(function(p, idx){
      var tok = (isExample && idx === 0) ? capFirstLetter(p) : p;
      return '<span class="py-t'+getTone(tok)+'">'+tok+'</span>';
    }).join(' ');
  });
}
document.addEventListener('DOMContentLoaded', colorPinyin);
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

/* keyboard shortcuts */
/* ── Global keyboard shortcuts ────────────────────────────────────────────────
   INPUT:  keydown events on document (skipped inside inputs and study overlay)
   ACTION: '/' or Ctrl+F focuses and selects #search-input;
           Escape clears search if populated
   OUTPUT: focus on search input; search cleared
   ────────────────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', function(e){
  // Don't fire when typing in inputs
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA') return;
  // Don't fire when study overlay is open
  var so = document.getElementById('study-overlay');
  if(so && so.style.display!=='none') return;
  if(e.key==='/' || e.key==='f' && (e.ctrlKey||e.metaKey)){
    e.preventDefault();
    var inp = document.getElementById('search-input');
    if(inp){ inp.focus(); inp.select(); }
  } else if(e.key==='Escape'){
    var inp = document.getElementById('search-input');
    if(inp && inp.value){ inp.value=''; if(typeof cdxDoSearch==='function') cdxDoSearch(); }
  }
});

/* mode */
/* ── Theme mode ───────────────────────────────────────────────────────────────
   INPUT:  localStorage hsk_mode; click on .mode-btn
   ACTION: setMode() strips light/dark/sepia from body.className, adds new mode;
           toggles .active on mode buttons; persists to localStorage
   OUTPUT: body class; .mode-btn.active; localStorage hsk_mode
   ────────────────────────────────────────────────────────────────────────────── */
function setMode(m){
  document.body.className=document.body.className.replace(/\b(light|dark|sepia)\b/g,'').trim();
  if(m!=='light')document.body.classList.add(m);
  document.querySelectorAll('.mode-btn').forEach(function(b){b.classList.toggle('active',b.dataset.mode===m);});
  localStorage.setItem(LS.M,m);
}
document.querySelectorAll('.mode-btn').forEach(function(b){b.addEventListener('click',function(){setMode(this.dataset.mode);});});
setMode(localStorage.getItem(LS.M)||'light');

/* font controls */
/* ── Font controls ────────────────────────────────────────────────────────────
   INPUT:  localStorage hsk_prefs; #font-zh/py/ru, #size-zh/py/ru inputs
   ACTION: applyF() builds a CSS string for .zh, .py, .trans-cell overrides
           and writes it to a #dyn-font <style> tag; persists prefs to localStorage
   OUTPUT: #dyn-font style innerHTML; localStorage hsk_prefs
   ────────────────────────────────────────────────────────────────────────────── */
var prefs={};try{prefs=JSON.parse(localStorage.getItem(LS.P)||'{}');}catch(e){}
var dynSt=document.createElement('style');dynSt.id='dyn-font';document.head.appendChild(dynSt);
function applyF(){
  var fz=document.getElementById('font-zh').value,sz=document.getElementById('size-zh').value;
  var fp=document.getElementById('font-py').value,sp=document.getElementById('size-py').value;
  var fr=document.getElementById('font-ru').value,sr=document.getElementById('size-ru').value;
  document.getElementById('sv-zh').textContent=sz+'px';
  document.getElementById('sv-py').textContent=sp+'px';
  document.getElementById('sv-ru').textContent=sr+'px';
  var css='';
  if(fz)css+='.zh{font-family:'+fz+',sans-serif!important}';
  css+='.zh{font-size:'+sz+'px!important}';
  if(fp)css+='.py,.ex-py{font-family:'+fp+',sans-serif!important}';
  css+='.py,.ex-py{font-size:'+sp+'px!important}';
  if(fr)css+='td.trans-cell{font-family:'+fr+',sans-serif!important}';
  css+='td.trans-cell{font-size:'+sr+'px!important}';
  dynSt.textContent=css;
  prefs={fz:fz,sz:sz,fp:fp,sp:sp,fr:fr,sr:sr};localStorage.setItem(LS.P,JSON.stringify(prefs));
}
if(prefs.sz)document.getElementById('size-zh').value=prefs.sz;
if(prefs.sp)document.getElementById('size-py').value=prefs.sp;
if(prefs.sr)document.getElementById('size-ru').value=prefs.sr;
if(prefs.fz)document.getElementById('font-zh').value=prefs.fz;
if(prefs.fp)document.getElementById('font-py').value=prefs.fp;
if(prefs.fr)document.getElementById('font-ru').value=prefs.fr;
applyF();
['font-zh','font-py','font-ru','size-zh','size-py','size-ru'].forEach(function(id){
  var el=document.getElementById(id);
  el.addEventListener('change',applyF);el.addEventListener('input',applyF);
});
document.getElementById('font-toggle').addEventListener('click',function(){
  var p=document.getElementById('font-panel');p.style.display=p.style.display==='flex'?'none':'flex';
});

/* TTS */
/* ── TTS (Text-to-Speech) core ────────────────────────────────────────────────
   INPUT:  localStorage hsk-volume; #vol-range slider
   ACTION: initialises ttsVolume, zhVoice, fallbackAudio state;
           setTtsVolume() clamps value 0-1, syncs slider, persists to localStorage
   OUTPUT: ttsVolume float; slider display; localStorage hsk-volume
   ────────────────────────────────────────────────────────────────────────────── */
var zhVoice=null;
var voicesReady=false;
var fallbackAudio=null;
var ttsVolume=parseFloat(localStorage.getItem('hsk-volume'));
if(isNaN(ttsVolume)) ttsVolume=1;
function clampVolume(v){
  v=parseFloat(v);
  if(isNaN(v)) return 1;
  if(v<0) return 0;
  if(v>1) return 1;
  return v;
}
function setTtsVolume(v, save){
  ttsVolume=clampVolume(v);
  var range=document.getElementById('vol-range');
  var val=document.getElementById('vol-val');
  if(range){ range.value=Math.round(ttsVolume*100); }
  if(val){ val.textContent=Math.round(ttsVolume*100)+'%'; }
  if(save) localStorage.setItem('hsk-volume', String(ttsVolume));
  if(fallbackAudio){ try{ fallbackAudio.volume=ttsVolume; }catch(e){} }
}
function pickZhVoice(vs){
/* ── Voice selection & loading ────────────────────────────────────────────────
   INPUT:  speechSynthesis.getVoices() list; onvoiceschanged event
   ACTION: pickZhVoice() finds the best zh-CN voice; ensureVoices() retries
           up to 6 times (200 ms apart) until voices are available
   OUTPUT: zhVoice SpeechSynthesisVoice object; voicesReady boolean
   ────────────────────────────────────────────────────────────────────────────── */
  return vs.find(function(v){return v.lang==='zh-CN';})
    || vs.find(function(v){return /^zh/i.test(v.lang);})
    || vs.find(function(v){return /chinese|mandarin|huihui|yaoyao|kangkang/i.test(v.name);});
}
function refreshVoices(){
  if(typeof speechSynthesis==='undefined') return;
  var vs=speechSynthesis.getVoices();
  if(vs && vs.length){
    zhVoice=pickZhVoice(vs) || null;
    voicesReady=true;
  }
}
function ensureVoices(cb){
  if(typeof speechSynthesis==='undefined'){ if(cb) cb(); return; }
  refreshVoices();
  if(voicesReady){ if(cb) cb(); return; }
  var tries=0;
  (function tryLoad(){
    var vs=speechSynthesis.getVoices();
    if(vs && vs.length){
      zhVoice=pickZhVoice(vs) || null;
      voicesReady=true;
      if(cb) cb();
      return;
    }
    tries++;
    if(tries>=6){ if(cb) cb(); return; }
    setTimeout(tryLoad, 200);
  })();
}
if(typeof speechSynthesis!=='undefined'){
  speechSynthesis.onvoiceschanged=function(){ voicesReady=false; refreshVoices(); };
  refreshVoices();
}
function stopFallback(){
/* ── Audio stop helpers ───────────────────────────────────────────────────────
   INPUT:  fallbackAudio Audio object; active SpeechSynthesis; .tts-btn.on buttons
   ACTION: stopFallback() pauses fallback Audio; stopAllAudio() cancels synthesis,
           stops fallback, and removes .on class from all play buttons
   OUTPUT: audio stopped; .tts-btn.on removed
   ────────────────────────────────────────────────────────────────────────────── */
  if(fallbackAudio){
    try{ fallbackAudio.pause(); }catch(e){}
    fallbackAudio = null;
  }
}
function stopAllAudio(){
  try{ if(typeof speechSynthesis!=='undefined') speechSynthesis.cancel(); }catch(e){}
  stopFallback();
  document.querySelectorAll('.tts-btn.on').forEach(function(b){b.classList.remove('on');});
}
function chunkTTS(text, maxLen){
/* ── chunkTTS — text chunker for TTS ─────────────────────────────────────────
   INPUT:  text string, maxLen integer
   ACTION: splits text at punctuation boundaries (。！？,；) to stay under maxLen;
           hard-splits any remaining segment that still exceeds maxLen
   OUTPUT: array of string chunks, each <= maxLen chars
   ────────────────────────────────────────────────────────────────────────────── */
  var clean = String(text||'').replace(/\s+/g,' ').trim();
  if(!clean) return [];
  if(clean.length <= maxLen) return [clean];
  var parts = clean.split(/([。！？!?.；;，,])/);
  var out = [], cur = '';
  for(var i=0;i<parts.length;i++){
    var p = parts[i];
    if(!p) continue;
    if(cur.length + p.length > maxLen && cur){
      out.push(cur.trim());
      cur = p;
    }else{
      cur += p;
    }
  }
  if(cur.trim()) out.push(cur.trim());
  var final = [];
  out.forEach(function(s){
    if(s.length <= maxLen){ final.push(s); return; }
    for(var j=0;j<s.length;j+=maxLen){ final.push(s.slice(j,j+maxLen)); }
  });
  return final;
}
function playFallbackTTS(text, onDone){
/* ── playFallbackTTS — Google TTS fallback ────────────────────────────────────
   INPUT:  text string; chunkTTS() chunks (max 160 chars each)
   ACTION: fetches audio from translate.googleapis.com for each chunk sequentially;
           stores Audio object in fallbackAudio so stopFallback() can cancel it
   OUTPUT: sequential Audio playback; calls onDone() when all chunks finish
   ────────────────────────────────────────────────────────────────────────────── */
  var chunks = chunkTTS(text, 160);
  var idx = 0;
  stopFallback();
  function next(){
    if(idx >= chunks.length){ if(onDone) onDone(); return; }
    var url = 'https://translate.googleapis.com/translate_tts?client=gtx&tl=zh-CN&q=' + encodeURIComponent(chunks[idx]);
    var a = new Audio();
    fallbackAudio = a;
    a.volume = ttsVolume;
    a.src = url;
    a.onended = function(){ idx++; next(); };
    a.onerror = function(){ idx++; next(); };
    var p = a.play();
    if(p && p.catch) p.catch(function(){});
  }
  next();
}
document.body.addEventListener('click',function(e){
/* ── TTS click handler ────────────────────────────────────────────────────────
   INPUT:  click events on .tts-btn (delegated from document.body);
           button.dataset.t (cached text) or nearest .zh / .ex-zh text
   ACTION: stops any current audio; plays text via SpeechSynthesis (zh-CN voice);
           falls back to playFallbackTTS() if SpeechSynthesis stalls after 1.2 s
   OUTPUT: audio playback; .tts-btn.on class while playing
   ────────────────────────────────────────────────────────────────────────────── */
  var btn=e.target.closest('.tts-btn');if(!btn)return;
  e.stopPropagation();
  /* Read text at click-time: prefer cached dataset, else find nearest .zh or .ex-zh */
  var txt=(btn.dataset && btn.dataset.t) ? btn.dataset.t : '';
  if(!txt){
    var wc=btn.closest('.wordcell');
    if(wc){
      var zDiv=wc.querySelector('.zh');
      if(zDiv)txt=zDiv.textContent.replace(/\s+/g,'').trim();
    }else{
      var td=btn.closest('td');
      if(td){var ez=td.querySelector('.ex-zh');if(ez)txt=ez.textContent.trim();}
    }
  }
  if(!txt)return;
  if(btn.classList.contains('on')){ stopAllAudio(); return; }
  stopAllAudio();

  var spd=parseFloat((document.getElementById('speed-sel')||{}).value||'1');
  btn.classList.add('on');

  if(typeof speechSynthesis==='undefined'){
    playFallbackTTS(txt, function(){ btn.classList.remove('on'); });
    return;
  }

  try{ speechSynthesis.resume(); }catch(e){}
  ensureVoices(function(){
    var u=new SpeechSynthesisUtterance(txt);u.lang='zh-CN';u.rate=spd||1;u.volume=ttsVolume;
    if(zhVoice)u.voice=zhVoice;
    var started=false, finished=false;
    u.onstart=function(){ started=true; };
    u.onend=function(){ finished=true; btn.classList.remove('on'); };
    u.onerror=function(){
      if(finished) return;
      finished=true;
      try{ speechSynthesis.cancel(); }catch(e){}
      playFallbackTTS(txt, function(){ btn.classList.remove('on'); });
    };
    setTimeout(function(){
      if(finished) return;
      if(!started){
        try{ speechSynthesis.cancel(); }catch(e){}
        playFallbackTTS(txt, function(){ btn.classList.remove('on'); });
      }
    }, 1200);
    setTimeout(function(){ speechSynthesis.speak(u); }, 0);
  });
});
/* inject TTS into wordcells */
/* ── TTS button injection — word cells ────────────────────────────────────────
   INPUT:  all .wordcell td elements
   ACTION: wraps cell children in .wc-inner div; appends ▶ button before it;
           stores word text in button.dataset.t for instant playback
   OUTPUT: .tts-btn + .wc-inner inside each .wordcell
   ────────────────────────────────────────────────────────────────────────────── */
document.querySelectorAll('.wordcell').forEach(function(cell){
  var zh=cell.querySelector('.zh');if(!zh)return;
  var txt=zh.textContent.trim();
  var inner=document.createElement('div');inner.className='wc-inner';
  while(cell.firstChild)inner.appendChild(cell.firstChild);
  var btn=document.createElement('button');btn.className='tts-btn';btn.title='Прослушать';btn.textContent='\u25b6';btn.dataset.t=txt;
  cell.appendChild(btn);cell.appendChild(inner);
});
/* inject TTS into example cells */
/* ── TTS button injection — example cells ─────────────────────────────────────
   INPUT:  all td elements containing .ex-zh div
   ACTION: wraps cell content in .ex-td-inner; prepends ▶ button inside .ex-zh;
           stores example text in button.dataset.t
   OUTPUT: .tts-btn inside each .ex-zh; td.ex-td class
   ────────────────────────────────────────────────────────────────────────────── */
document.querySelectorAll('td').forEach(function(td){
  var ez=td.querySelector('.ex-zh');if(!ez)return;
  var txt=ez.textContent.trim();
  var inner=document.createElement('div');inner.className='ex-td-inner';
  while(td.firstChild)inner.appendChild(td.firstChild);
  td.classList.add('ex-td');td.appendChild(inner);
  var btn=document.createElement('button');btn.className='tts-btn';btn.title='Прослушать пример';btn.textContent='\u25b6';btn.dataset.t=txt;
  var ezInner = inner.querySelector('.ex-zh');
  if(ezInner){ ezInner.insertBefore(btn, ezInner.firstChild); }
  else { inner.insertBefore(btn, inner.firstChild); }
});
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

/* Group collapse */
/* ── Phonetic group collapse ───────────────────────────────────────────────────
   INPUT:  all h3.phonetic-group elements
   ACTION: appends a collapse button to each h3; wraps the sibling table in .grp-wrap;
           click toggles .grp-col on the wrapper
   OUTPUT: collapse button injected into DOM; .grp-wrap wrapper added; table hidden/shown
   ────────────────────────────────────────────────────────────────────────────── */
document.querySelectorAll('h3.phonetic-group').forEach(function(h3){
  var btn=document.createElement('button');btn.className='coll-btn';btn.textContent='\u25bc';h3.appendChild(btn);
  var tbl=h3.nextElementSibling;while(tbl&&tbl.tagName!=='TABLE')tbl=tbl.nextElementSibling;
  if(!tbl)return;
  var wrap=document.createElement('div');wrap.className='grp-wrap';tbl.parentNode.insertBefore(wrap,tbl);wrap.appendChild(tbl);
  btn.addEventListener('click',function(ev){
    ev.stopPropagation();
    var c=wrap.classList.toggle('grp-col');btn.textContent=c?'\u25b6':'\u25bc';
  });
});
document.getElementById('btn-col-all').addEventListener('click',function(){
/* ── Collapse / expand all groups ─────────────────────────────────────────────
   INPUT:  click on #btn-col-all or #btn-exp-all
   ACTION: adds or removes .grp-col on every .grp-wrap; updates arrow button text
   OUTPUT: .grp-col class on all group wrappers; coll-btn text
   ────────────────────────────────────────────────────────────────────────────── */
  document.querySelectorAll('h3.phonetic-group').forEach(function(h3){
    var w=h3.nextElementSibling;if(w&&w.classList.contains('grp-wrap')){w.classList.add('grp-col');var b=h3.querySelector('.coll-btn');if(b)b.textContent='\u25b6';}
  });
});
document.getElementById('btn-exp-all').addEventListener('click',function(){
  document.querySelectorAll('h3.phonetic-group').forEach(function(h3){
    var w=h3.nextElementSibling;if(w&&w.classList.contains('grp-wrap')){w.classList.remove('grp-col');var b=h3.querySelector('.coll-btn');if(b)b.textContent='\u25bc';}
  });
});

/* Column visibility toggle (data cols: #, Слово, Перевод, Пример) */
/* ── Column visibility toggle ─────────────────────────────────────────────────
   INPUT:  click / right-click on .col-btn or thead th; localStorage hsk-hide-*
   ACTION: toggleCol() flips body.hide-{key} class; persists to localStorage;
           right-click on column header also calls toggleCol via delegation
   OUTPUT: body.hide-num/word/trans/ex class; col-btn .hidden class; localStorage
   ────────────────────────────────────────────────────────────────────────────── */
var colMap={2:'num',3:'word',4:'trans',5:'ex'};
function toggleCol(key){
  var h=document.body.classList.toggle('hide-'+key);
  localStorage.setItem('hsk-hide-'+key,h?'1':'');
  var btn=document.querySelector('.col-btn[data-col="'+key+'"]');
  if(btn)btn.classList.toggle('hidden',h);
}
/* Restore hidden cols */
Object.keys(colMap).forEach(function(i){
  var key=colMap[i];
  if(localStorage.getItem('hsk-hide-'+key)){
    document.body.classList.add('hide-'+key);
    var btn=document.querySelector('.col-btn[data-col="'+key+'"]');
    if(btn)btn.classList.add('hidden');
  }
});
/* Toolbar col-btn clicks (left-click toggles; right-click also toggles) */
document.querySelectorAll('.col-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    toggleCol(this.dataset.col);
  });
  btn.addEventListener('contextmenu',function(e){
    e.preventDefault();
    toggleCol(this.dataset.col);
  });
});
/* Column header right-click (event delegation — works for all tables) */
document.addEventListener('contextmenu',function(e){
  var th=e.target.closest('thead th');
  if(!th||th.classList.contains('cb-col')||th.classList.contains('fam-col'))return;
  var idx=Array.prototype.indexOf.call(th.parentNode.children,th);
  var key=colMap[idx];
  if(key){
    e.preventDefault();
    toggleCol(key);
  }
},true);
/* Show all columns */
/* ── Show all columns button ───────────────────────────────────────────────────
   INPUT:  click on #btn-show-all-cols
   ACTION: removes all hide-* body classes and clears localStorage flags
   OUTPUT: body classes cleaned; col-btn .hidden removed; localStorage cleared
   ────────────────────────────────────────────────────────────────────────────── */
(function(){
  var btn = document.getElementById('btn-show-all-cols');
  if(!btn) return;
  btn.addEventListener('click', function(){
    ['num','word','trans','ex'].forEach(function(key){
      document.body.classList.remove('hide-'+key);
      localStorage.removeItem('hsk-hide-'+key);
      var b = document.querySelector('.col-btn[data-col="'+key+'"]');
      if(b) b.classList.remove('hidden');
    });
  });
})();

/* old CSV handler removed — handled by SheetJS below */
/* ── DEAD CODE — old CSV export stub ──────────────────────────────────────────
   This handler was replaced by js/export.js. The IIFE returns immediately.
   TODO: delete this block entirely.
   ────────────────────────────────────────────────────────────────────────────── */
(function(){
  var _REMOVED_CSV = true;
  if(_REMOVED_CSV) return;
  var btn = document.getElementById('btn-export-csv');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var isEn = document.body.classList.contains('lang-en');
    var lines = [
      ['"#"','"汉字"','"Pinyin"', isEn?'"Translation"':'"Перевод"', isEn?'"Example (ZH)"':'"Пример (ZH)"', '"Example (Pinyin)"','"HSK"'].join(',')
    ];
    var n = 0;
    document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
      if(tr.classList.contains('sr-hide') || tr.classList.contains('hsk-hide')) return;
      n++;
      function cell(sel){ var el=tr.querySelector(sel); return el ? '"'+el.textContent.trim().replace(/"/g,'""')+'"' : '""'; }
      var trans = isEn ? cell('.trans-en') : cell('.trans-ru');
      lines.push([n, cell('.zh'), cell('.py'), trans, cell('.ex-zh'), cell('.ex-py'), tr.getAttribute('data-hsk')||''].join(','));
    });
    var bom = '\ufeff'; // UTF-8 BOM so Excel reads Chinese correctly
    var blob = new Blob([bom + lines.join('\r\n')], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'HSK_vocabulary.csv'; a.click();
    URL.revokeObjectURL(url);
  });
})();

/* old PDF print handler removed — handled by iframe+print below */

/* Restore speed pref */
/* ── Speed and volume preferences ─────────────────────────────────────────────
   INPUT:  localStorage hsk-speed, hsk-volume; #speed-sel, #vol-range elements
   ACTION: restores saved TTS speed and volume sliders on load;
           persists changes on user interaction
   OUTPUT: speedSel.value; ttsVolume; localStorage hsk-speed, hsk-volume
   ────────────────────────────────────────────────────────────────────────────── */
var speedSel=document.getElementById('speed-sel');
var savedSpeed=localStorage.getItem('hsk-speed');
if(savedSpeed&&speedSel){speedSel.value=savedSpeed;}
speedSel&&speedSel.addEventListener('change',function(){localStorage.setItem('hsk-speed',this.value);});

/* Restore volume pref */
var volRange=document.getElementById('vol-range');
var savedVol=localStorage.getItem('hsk-volume');
if(volRange){
  if(savedVol!==null){ setTtsVolume(parseFloat(savedVol), false); }
  else { setTtsVolume(ttsVolume, false); }
  volRange.addEventListener('input', function(){
    setTtsVolume(parseFloat(this.value)/100, true);
  });
}

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

/* Sortable.js inlined */
/*! Sortable 1.15.2 - MIT | git://github.com/SortableJS/Sortable.git */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t=t||self).Sortable=e()}(this,function(){"use strict";function e(e,t){var n,o=Object.keys(e);return Object.getOwnPropertySymbols&&(n=Object.getOwnPropertySymbols(e),t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),o.push.apply(o,n)),o}function I(o){for(var t=1;t<arguments.length;t++){var i=null!=arguments[t]?arguments[t]:{};t%2?e(Object(i),!0).forEach(function(t){var e,n;e=o,t=i[n=t],n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t}):Object.getOwnPropertyDescriptors?Object.defineProperties(o,Object.getOwnPropertyDescriptors(i)):e(Object(i)).forEach(function(t){Object.defineProperty(o,t,Object.getOwnPropertyDescriptor(i,t))})}return o}function o(t){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function a(){return(a=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n,o=arguments[e];for(n in o)Object.prototype.hasOwnProperty.call(o,n)&&(t[n]=o[n])}return t}).apply(this,arguments)}function i(t,e){if(null==t)return{};var n,o=function(t,e){if(null==t)return{};for(var n,o={},i=Object.keys(t),r=0;r<i.length;r++)n=i[r],0<=e.indexOf(n)||(o[n]=t[n]);return o}(t,e);if(Object.getOwnPropertySymbols)for(var i=Object.getOwnPropertySymbols(t),r=0;r<i.length;r++)n=i[r],0<=e.indexOf(n)||Object.prototype.propertyIsEnumerable.call(t,n)&&(o[n]=t[n]);return o}function r(t){return function(t){if(Array.isArray(t))return l(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(t){if("string"==typeof t)return l(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);return"Map"===(n="Object"===n&&t.constructor?t.constructor.name:n)||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?l(t,e):void 0}}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function l(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,o=new Array(e);n<e;n++)o[n]=t[n];return o}function t(t){if("undefined"!=typeof window&&window.navigator)return!!navigator.userAgent.match(t)}var y=t(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i),w=t(/Edge/i),s=t(/firefox/i),u=t(/safari/i)&&!t(/chrome/i)&&!t(/android/i),n=t(/iP(ad|od|hone)/i),c=t(/chrome/i)&&t(/android/i),d={capture:!1,passive:!1};function h(t,e,n){t.addEventListener(e,n,!y&&d)}function f(t,e,n){t.removeEventListener(e,n,!y&&d)}function p(t,e){if(e&&(">"===e[0]&&(e=e.substring(1)),t))try{if(t.matches)return t.matches(e);if(t.msMatchesSelector)return t.msMatchesSelector(e);if(t.webkitMatchesSelector)return t.webkitMatchesSelector(e)}catch(t){return}}function P(t,e,n,o){if(t){n=n||document;do{if(null!=e&&(">"!==e[0]||t.parentNode===n)&&p(t,e)||o&&t===n)return t}while(t!==n&&(t=(i=t).host&&i!==document&&i.host.nodeType?i.host:i.parentNode))}var i;return null}var g,m=/\s+/g;function k(t,e,n){var o;t&&e&&(t.classList?t.classList[n?"add":"remove"](e):(o=(" "+t.className+" ").replace(m," ").replace(" "+e+" "," "),t.className=(o+(n?" "+e:"")).replace(m," ")))}function R(t,e,n){var o=t&&t.style;if(o){if(void 0===n)return document.defaultView&&document.defaultView.getComputedStyle?n=document.defaultView.getComputedStyle(t,""):t.currentStyle&&(n=t.currentStyle),void 0===e?n:n[e];o[e=!(e in o||-1!==e.indexOf("webkit"))?"-webkit-"+e:e]=n+("string"==typeof n?"":"px")}}function v(t,e){var n="";if("string"==typeof t)n=t;else do{var o=R(t,"transform")}while(o&&"none"!==o&&(n=o+" "+n),!e&&(t=t.parentNode));var i=window.DOMMatrix||window.WebKitCSSMatrix||window.CSSMatrix||window.MSCSSMatrix;return i&&new i(n)}function b(t,e,n){if(t){var o=t.getElementsByTagName(e),i=0,r=o.length;if(n)for(;i<r;i++)n(o[i],i);return o}return[]}function O(){var t=document.scrollingElement;return t||document.documentElement}function X(t,e,n,o,i){if(t.getBoundingClientRect||t===window){var r,a,l,s,c,u,d=t!==window&&t.parentNode&&t!==O()?(a=(r=t.getBoundingClientRect()).top,l=r.left,s=r.bottom,c=r.right,u=r.height,r.width):(l=a=0,s=window.innerHeight,c=window.innerWidth,u=window.innerHeight,window.innerWidth);if((e||n)&&t!==window&&(i=i||t.parentNode,!y))do{if(i&&i.getBoundingClientRect&&("none"!==R(i,"transform")||n&&"static"!==R(i,"position"))){var h=i.getBoundingClientRect();a-=h.top+parseInt(R(i,"border-top-width")),l-=h.left+parseInt(R(i,"border-left-width")),s=a+r.height,c=l+r.width;break}}while(i=i.parentNode);return o&&t!==window&&(o=(e=v(i||t))&&e.a,t=e&&e.d,e&&(s=(a/=t)+(u/=t),c=(l/=o)+(d/=o))),{top:a,left:l,bottom:s,right:c,width:d,height:u}}}function Y(t,e,n){for(var o=M(t,!0),i=X(t)[e];o;){var r=X(o)[n];if(!("top"===n||"left"===n?r<=i:i<=r))return o;if(o===O())break;o=M(o,!1)}return!1}function B(t,e,n,o){for(var i=0,r=0,a=t.children;r<a.length;){if("none"!==a[r].style.display&&a[r]!==Ft.ghost&&(o||a[r]!==Ft.dragged)&&P(a[r],n.draggable,t,!1)){if(i===e)return a[r];i++}r++}return null}function F(t,e){for(var n=t.lastElementChild;n&&(n===Ft.ghost||"none"===R(n,"display")||e&&!p(n,e));)n=n.previousElementSibling;return n||null}function j(t,e){var n=0;if(!t||!t.parentNode)return-1;for(;t=t.previousElementSibling;)"TEMPLATE"===t.nodeName.toUpperCase()||t===Ft.clone||e&&!p(t,e)||n++;return n}function E(t){var e=0,n=0,o=O();if(t)do{var i=v(t),r=i.a,i=i.d}while(e+=t.scrollLeft*r,n+=t.scrollTop*i,t!==o&&(t=t.parentNode));return[e,n]}function M(t,e){if(!t||!t.getBoundingClientRect)return O();var n=t,o=!1;do{if(n.clientWidth<n.scrollWidth||n.clientHeight<n.scrollHeight){var i=R(n);if(n.clientWidth<n.scrollWidth&&("auto"==i.overflowX||"scroll"==i.overflowX)||n.clientHeight<n.scrollHeight&&("auto"==i.overflowY||"scroll"==i.overflowY)){if(!n.getBoundingClientRect||n===document.body)return O();if(o||e)return n;o=!0}}}while(n=n.parentNode);return O()}function D(t,e){return Math.round(t.top)===Math.round(e.top)&&Math.round(t.left)===Math.round(e.left)&&Math.round(t.height)===Math.round(e.height)&&Math.round(t.width)===Math.round(e.width)}function S(e,n){return function(){var t;g||(1===(t=arguments).length?e.call(this,t[0]):e.apply(this,t),g=setTimeout(function(){g=void 0},n))}}function H(t,e,n){t.scrollLeft+=e,t.scrollTop+=n}function _(t){var e=window.Polymer,n=window.jQuery||window.Zepto;return e&&e.dom?e.dom(t).cloneNode(!0):n?n(t).clone(!0)[0]:t.cloneNode(!0)}function C(t,e){R(t,"position","absolute"),R(t,"top",e.top),R(t,"left",e.left),R(t,"width",e.width),R(t,"height",e.height)}function T(t){R(t,"position",""),R(t,"top",""),R(t,"left",""),R(t,"width",""),R(t,"height","")}function L(n,o,i){var r={};return Array.from(n.children).forEach(function(t){var e;P(t,o.draggable,n,!1)&&!t.animated&&t!==i&&(e=X(t),r.left=Math.min(null!==(t=r.left)&&void 0!==t?t:1/0,e.left),r.top=Math.min(null!==(t=r.top)&&void 0!==t?t:1/0,e.top),r.right=Math.max(null!==(t=r.right)&&void 0!==t?t:-1/0,e.right),r.bottom=Math.max(null!==(t=r.bottom)&&void 0!==t?t:-1/0,e.bottom))}),r.width=r.right-r.left,r.height=r.bottom-r.top,r.x=r.left,r.y=r.top,r}var K="Sortable"+(new Date).getTime();function x(){var e,o=[];return{captureAnimationState:function(){o=[],this.options.animation&&[].slice.call(this.el.children).forEach(function(t){var e,n;"none"!==R(t,"display")&&t!==Ft.ghost&&(o.push({target:t,rect:X(t)}),e=I({},o[o.length-1].rect),!t.thisAnimationDuration||(n=v(t,!0))&&(e.top-=n.f,e.left-=n.e),t.fromRect=e)})},addAnimationState:function(t){o.push(t)},removeAnimationState:function(t){o.splice(function(t,e){for(var n in t)if(t.hasOwnProperty(n))for(var o in e)if(e.hasOwnProperty(o)&&e[o]===t[n][o])return Number(n);return-1}(o,{target:t}),1)},animateAll:function(t){var c=this;if(!this.options.animation)return clearTimeout(e),void("function"==typeof t&&t());var u=!1,d=0;o.forEach(function(t){var e=0,n=t.target,o=n.fromRect,i=X(n),r=n.prevFromRect,a=n.prevToRect,l=t.rect,s=v(n,!0);s&&(i.top-=s.f,i.left-=s.e),n.toRect=i,n.thisAnimationDuration&&D(r,i)&&!D(o,i)&&(l.top-i.top)/(l.left-i.left)==(o.top-i.top)/(o.left-i.left)&&(t=l,s=r,r=a,a=c.options,e=Math.sqrt(Math.pow(s.top-t.top,2)+Math.pow(s.left-t.left,2))/Math.sqrt(Math.pow(s.top-r.top,2)+Math.pow(s.left-r.left,2))*a.animation),D(i,o)||(n.prevFromRect=o,n.prevToRect=i,e=e||c.options.animation,c.animate(n,l,i,e)),e&&(u=!0,d=Math.max(d,e),clearTimeout(n.animationResetTimer),n.animationResetTimer=setTimeout(function(){n.animationTime=0,n.prevFromRect=null,n.fromRect=null,n.prevToRect=null,n.thisAnimationDuration=null},e),n.thisAnimationDuration=e)}),clearTimeout(e),u?e=setTimeout(function(){"function"==typeof t&&t()},d):"function"==typeof t&&t(),o=[]},animate:function(t,e,n,o){var i,r;o&&(R(t,"transition",""),R(t,"transform",""),i=(r=v(this.el))&&r.a,r=r&&r.d,i=(e.left-n.left)/(i||1),r=(e.top-n.top)/(r||1),t.animatingX=!!i,t.animatingY=!!r,R(t,"transform","translate3d("+i+"px,"+r+"px,0)"),this.forRepaintDummy=t.offsetWidth,R(t,"transition","transform "+o+"ms"+(this.options.easing?" "+this.options.easing:"")),R(t,"transform","translate3d(0,0,0)"),"number"==typeof t.animated&&clearTimeout(t.animated),t.animated=setTimeout(function(){R(t,"transition",""),R(t,"transform",""),t.animated=!1,t.animatingX=!1,t.animatingY=!1},o))}}}var A=[],N={initializeByDefault:!0},W={mount:function(e){for(var t in N)!N.hasOwnProperty(t)||t in e||(e[t]=N[t]);A.forEach(function(t){if(t.pluginName===e.pluginName)throw"Sortable: Cannot mount plugin ".concat(e.pluginName," more than once")}),A.push(e)},pluginEvent:function(e,n,o){var t=this;this.eventCanceled=!1,o.cancel=function(){t.eventCanceled=!0};var i=e+"Global";A.forEach(function(t){n[t.pluginName]&&(n[t.pluginName][i]&&n[t.pluginName][i](I({sortable:n},o)),n.options[t.pluginName]&&n[t.pluginName][e]&&n[t.pluginName][e](I({sortable:n},o)))})},initializePlugins:function(n,o,i,t){for(var e in A.forEach(function(t){var e=t.pluginName;(n.options[e]||t.initializeByDefault)&&((t=new t(n,o,n.options)).sortable=n,t.options=n.options,n[e]=t,a(i,t.defaults))}),n.options){var r;n.options.hasOwnProperty(e)&&(void 0!==(r=this.modifyOption(n,e,n.options[e]))&&(n.options[e]=r))}},getEventProperties:function(e,n){var o={};return A.forEach(function(t){"function"==typeof t.eventProperties&&a(o,t.eventProperties.call(n[t.pluginName],e))}),o},modifyOption:function(e,n,o){var i;return A.forEach(function(t){e[t.pluginName]&&t.optionListeners&&"function"==typeof t.optionListeners[n]&&(i=t.optionListeners[n].call(e[t.pluginName],o))}),i}};function z(t){var e=t.sortable,n=t.rootEl,o=t.name,i=t.targetEl,r=t.cloneEl,a=t.toEl,l=t.fromEl,s=t.oldIndex,c=t.newIndex,u=t.oldDraggableIndex,d=t.newDraggableIndex,h=t.originalEvent,f=t.putSortable,p=t.extraEventProperties;if(e=e||n&&n[K]){var g,m=e.options,t="on"+o.charAt(0).toUpperCase()+o.substr(1);!window.CustomEvent||y||w?(g=document.createEvent("Event")).initEvent(o,!0,!0):g=new CustomEvent(o,{bubbles:!0,cancelable:!0}),g.to=a||n,g.from=l||n,g.item=i||n,g.clone=r,g.oldIndex=s,g.newIndex=c,g.oldDraggableIndex=u,g.newDraggableIndex=d,g.originalEvent=h,g.pullMode=f?f.lastPutMode:void 0;var v,b=I(I({},p),W.getEventProperties(o,e));for(v in b)g[v]=b[v];n&&n.dispatchEvent(g),m[t]&&m[t].call(e,g)}}function G(t,e){var n=(o=2<arguments.length&&void 0!==arguments[2]?arguments[2]:{}).evt,o=i(o,U);W.pluginEvent.bind(Ft)(t,e,I({dragEl:V,parentEl:Z,ghostEl:$,rootEl:Q,nextEl:J,lastDownEl:tt,cloneEl:et,cloneHidden:nt,dragStarted:gt,putSortable:st,activeSortable:Ft.active,originalEvent:n,oldIndex:ot,oldDraggableIndex:rt,newIndex:it,newDraggableIndex:at,hideGhostForTarget:Rt,unhideGhostForTarget:Xt,cloneNowHidden:function(){nt=!0},cloneNowShown:function(){nt=!1},dispatchSortableEvent:function(t){q({sortable:e,name:t,originalEvent:n})}},o))}var U=["evt"];function q(t){z(I({putSortable:st,cloneEl:et,targetEl:V,rootEl:Q,oldIndex:ot,oldDraggableIndex:rt,newIndex:it,newDraggableIndex:at},t))}var V,Z,$,Q,J,tt,et,nt,ot,it,rt,at,lt,st,ct,ut,dt,ht,ft,pt,gt,mt,vt,bt,yt,wt=!1,Et=!1,Dt=[],St=!1,_t=!1,Ct=[],Tt=!1,xt=[],Ot="undefined"!=typeof document,Mt=n,At=w||y?"cssFloat":"float",Nt=Ot&&!c&&!n&&"draggable"in document.createElement("div"),It=function(){if(Ot){if(y)return!1;var t=document.createElement("x");return t.style.cssText="pointer-events:auto","auto"===t.style.pointerEvents}}(),Pt=function(t,e){var n=R(t),o=parseInt(n.width)-parseInt(n.paddingLeft)-parseInt(n.paddingRight)-parseInt(n.borderLeftWidth)-parseInt(n.borderRightWidth),i=B(t,0,e),r=B(t,1,e),a=i&&R(i),l=r&&R(r),s=a&&parseInt(a.marginLeft)+parseInt(a.marginRight)+X(i).width,t=l&&parseInt(l.marginLeft)+parseInt(l.marginRight)+X(r).width;if("flex"===n.display)return"column"===n.flexDirection||"column-reverse"===n.flexDirection?"vertical":"horizontal";if("grid"===n.display)return n.gridTemplateColumns.split(" ").length<=1?"vertical":"horizontal";if(i&&a.float&&"none"!==a.float){e="left"===a.float?"left":"right";return!r||"both"!==l.clear&&l.clear!==e?"horizontal":"vertical"}return i&&("block"===a.display||"flex"===a.display||"table"===a.display||"grid"===a.display||o<=s&&"none"===n[At]||r&&"none"===n[At]&&o<s+t)?"vertical":"horizontal"},kt=function(t){function l(r,a){return function(t,e,n,o){var i=t.options.group.name&&e.options.group.name&&t.options.group.name===e.options.group.name;if(null==r&&(a||i))return!0;if(null==r||!1===r)return!1;if(a&&"clone"===r)return r;if("function"==typeof r)return l(r(t,e,n,o),a)(t,e,n,o);e=(a?t:e).options.group.name;return!0===r||"string"==typeof r&&r===e||r.join&&-1<r.indexOf(e)}}var e={},n=t.group;n&&"object"==o(n)||(n={name:n}),e.name=n.name,e.checkPull=l(n.pull,!0),e.checkPut=l(n.put),e.revertClone=n.revertClone,t.group=e},Rt=function(){!It&&$&&R($,"display","none")},Xt=function(){!It&&$&&R($,"display","")};Ot&&!c&&document.addEventListener("click",function(t){if(Et)return t.preventDefault(),t.stopPropagation&&t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation(),Et=!1},!0);function Yt(t){if(V){t=t.touches?t.touches[0]:t;var e=(i=t.clientX,r=t.clientY,Dt.some(function(t){var e=t[K].options.emptyInsertThreshold;if(e&&!F(t)){var n=X(t),o=i>=n.left-e&&i<=n.right+e,e=r>=n.top-e&&r<=n.bottom+e;return o&&e?a=t:void 0}}),a);if(e){var n,o={};for(n in t)t.hasOwnProperty(n)&&(o[n]=t[n]);o.target=o.rootEl=e,o.preventDefault=void 0,o.stopPropagation=void 0,e[K]._onDragOver(o)}}var i,r,a}function Bt(t){V&&V.parentNode[K]._isOutsideThisEl(t.target)}function Ft(t,e){if(!t||!t.nodeType||1!==t.nodeType)throw"Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(t));this.el=t,this.options=e=a({},e),t[K]=this;var n,o,i={group:null,sort:!0,disabled:!1,store:null,handle:null,draggable:/^[uo]l$/i.test(t.nodeName)?">li":">*",swapThreshold:1,invertSwap:!1,invertedSwapThreshold:null,removeCloneOnHide:!0,direction:function(){return Pt(t,this.options)},ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",dragClass:"sortable-drag",ignore:"a, img",filter:null,preventOnFilter:!0,animation:0,easing:null,setData:function(t,e){t.setData("Text",e.textContent)},dropBubble:!1,dragoverBubble:!1,dataIdAttr:"data-id",delay:0,delayOnTouchOnly:!1,touchStartThreshold:(Number.parseInt?Number:window).parseInt(window.devicePixelRatio,10)||1,forceFallback:!1,fallbackClass:"sortable-fallback",fallbackOnBody:!1,fallbackTolerance:0,fallbackOffset:{x:0,y:0},supportPointer:!1!==Ft.supportPointer&&"PointerEvent"in window&&!u,emptyInsertThreshold:5};for(n in W.initializePlugins(this,t,i),i)n in e||(e[n]=i[n]);for(o in kt(e),this)"_"===o.charAt(0)&&"function"==typeof this[o]&&(this[o]=this[o].bind(this));this.nativeDraggable=!e.forceFallback&&Nt,this.nativeDraggable&&(this.options.touchStartThreshold=1),e.supportPointer?h(t,"pointerdown",this._onTapStart):(h(t,"mousedown",this._onTapStart),h(t,"touchstart",this._onTapStart)),this.nativeDraggable&&(h(t,"dragover",this),h(t,"dragenter",this)),Dt.push(this.el),e.store&&e.store.get&&this.sort(e.store.get(this)||[]),a(this,x())}function jt(t,e,n,o,i,r,a,l){var s,c,u=t[K],d=u.options.onMove;return!window.CustomEvent||y||w?(s=document.createEvent("Event")).initEvent("move",!0,!0):s=new CustomEvent("move",{bubbles:!0,cancelable:!0}),s.to=e,s.from=t,s.dragged=n,s.draggedRect=o,s.related=i||e,s.relatedRect=r||X(e),s.willInsertAfter=l,s.originalEvent=a,t.dispatchEvent(s),c=d?d.call(u,s,a):c}function Ht(t){t.draggable=!1}function Lt(){Tt=!1}function Kt(t){return setTimeout(t,0)}function Wt(t){return clearTimeout(t)}Ft.prototype={constructor:Ft,_isOutsideThisEl:function(t){this.el.contains(t)||t===this.el||(mt=null)},_getDirection:function(t,e){return"function"==typeof this.options.direction?this.options.direction.call(this,t,e,V):this.options.direction},_onTapStart:function(e){if(e.cancelable){var n=this,o=this.el,t=this.options,i=t.preventOnFilter,r=e.type,a=e.touches&&e.touches[0]||e.pointerType&&"touch"===e.pointerType&&e,l=(a||e).target,s=e.target.shadowRoot&&(e.path&&e.path[0]||e.composedPath&&e.composedPath()[0])||l,c=t.filter;if(!function(t){xt.length=0;var e=t.getElementsByTagName("input"),n=e.length;for(;n--;){var o=e[n];o.checked&&xt.push(o)}}(o),!V&&!(/mousedown|pointerdown/.test(r)&&0!==e.button||t.disabled)&&!s.isContentEditable&&(this.nativeDraggable||!u||!l||"SELECT"!==l.tagName.toUpperCase())&&!((l=P(l,t.draggable,o,!1))&&l.animated||tt===l)){if(ot=j(l),rt=j(l,t.draggable),"function"==typeof c){if(c.call(this,e,l,this))return q({sortable:n,rootEl:s,name:"filter",targetEl:l,toEl:o,fromEl:o}),G("filter",n,{evt:e}),void(i&&e.cancelable&&e.preventDefault())}else if(c=c&&c.split(",").some(function(t){if(t=P(s,t.trim(),o,!1))return q({sortable:n,rootEl:t,name:"filter",targetEl:l,fromEl:o,toEl:o}),G("filter",n,{evt:e}),!0}))return void(i&&e.cancelable&&e.preventDefault());t.handle&&!P(s,t.handle,o,!1)||this._prepareDragStart(e,a,l)}}},_prepareDragStart:function(t,e,n){var o,i=this,r=i.el,a=i.options,l=r.ownerDocument;n&&!V&&n.parentNode===r&&(o=X(n),Q=r,Z=(V=n).parentNode,J=V.nextSibling,tt=n,lt=a.group,ct={target:Ft.dragged=V,clientX:(e||t).clientX,clientY:(e||t).clientY},ft=ct.clientX-o.left,pt=ct.clientY-o.top,this._lastX=(e||t).clientX,this._lastY=(e||t).clientY,V.style["will-change"]="all",o=function(){G("delayEnded",i,{evt:t}),Ft.eventCanceled?i._onDrop():(i._disableDelayedDragEvents(),!s&&i.nativeDraggable&&(V.draggable=!0),i._triggerDragStart(t,e),q({sortable:i,name:"choose",originalEvent:t}),k(V,a.chosenClass,!0))},a.ignore.split(",").forEach(function(t){b(V,t.trim(),Ht)}),h(l,"dragover",Yt),h(l,"mousemove",Yt),h(l,"touchmove",Yt),h(l,"mouseup",i._onDrop),h(l,"touchend",i._onDrop),h(l,"touchcancel",i._onDrop),s&&this.nativeDraggable&&(this.options.touchStartThreshold=4,V.draggable=!0),G("delayStart",this,{evt:t}),!a.delay||a.delayOnTouchOnly&&!e||this.nativeDraggable&&(w||y)?o():Ft.eventCanceled?this._onDrop():(h(l,"mouseup",i._disableDelayedDrag),h(l,"touchend",i._disableDelayedDrag),h(l,"touchcancel",i._disableDelayedDrag),h(l,"mousemove",i._delayedDragTouchMoveHandler),h(l,"touchmove",i._delayedDragTouchMoveHandler),a.supportPointer&&h(l,"pointermove",i._delayedDragTouchMoveHandler),i._dragStartTimer=setTimeout(o,a.delay)))},_delayedDragTouchMoveHandler:function(t){t=t.touches?t.touches[0]:t;Math.max(Math.abs(t.clientX-this._lastX),Math.abs(t.clientY-this._lastY))>=Math.floor(this.options.touchStartThreshold/(this.nativeDraggable&&window.devicePixelRatio||1))&&this._disableDelayedDrag()},_disableDelayedDrag:function(){V&&Ht(V),clearTimeout(this._dragStartTimer),this._disableDelayedDragEvents()},_disableDelayedDragEvents:function(){var t=this.el.ownerDocument;f(t,"mouseup",this._disableDelayedDrag),f(t,"touchend",this._disableDelayedDrag),f(t,"touchcancel",this._disableDelayedDrag),f(t,"mousemove",this._delayedDragTouchMoveHandler),f(t,"touchmove",this._delayedDragTouchMoveHandler),f(t,"pointermove",this._delayedDragTouchMoveHandler)},_triggerDragStart:function(t,e){e=e||"touch"==t.pointerType&&t,!this.nativeDraggable||e?this.options.supportPointer?h(document,"pointermove",this._onTouchMove):h(document,e?"touchmove":"mousemove",this._onTouchMove):(h(V,"dragend",this),h(Q,"dragstart",this._onDragStart));try{document.selection?Kt(function(){document.selection.empty()}):window.getSelection().removeAllRanges()}catch(t){}},_dragStarted:function(t,e){var n;wt=!1,Q&&V?(G("dragStarted",this,{evt:e}),this.nativeDraggable&&h(document,"dragover",Bt),n=this.options,t||k(V,n.dragClass,!1),k(V,n.ghostClass,!0),Ft.active=this,t&&this._appendGhost(),q({sortable:this,name:"start",originalEvent:e})):this._nulling()},_emulateDragOver:function(){if(ut){this._lastX=ut.clientX,this._lastY=ut.clientY,Rt();for(var t=document.elementFromPoint(ut.clientX,ut.clientY),e=t;t&&t.shadowRoot&&(t=t.shadowRoot.elementFromPoint(ut.clientX,ut.clientY))!==e;)e=t;if(V.parentNode[K]._isOutsideThisEl(t),e)do{if(e[K])if(e[K]._onDragOver({clientX:ut.clientX,clientY:ut.clientY,target:t,rootEl:e})&&!this.options.dragoverBubble)break}while(e=(t=e).parentNode);Xt()}},_onTouchMove:function(t){if(ct){var e=this.options,n=e.fallbackTolerance,o=e.fallbackOffset,i=t.touches?t.touches[0]:t,r=$&&v($,!0),a=$&&r&&r.a,l=$&&r&&r.d,e=Mt&&yt&&E(yt),a=(i.clientX-ct.clientX+o.x)/(a||1)+(e?e[0]-Ct[0]:0)/(a||1),l=(i.clientY-ct.clientY+o.y)/(l||1)+(e?e[1]-Ct[1]:0)/(l||1);if(!Ft.active&&!wt){if(n&&Math.max(Math.abs(i.clientX-this._lastX),Math.abs(i.clientY-this._lastY))<n)return;this._onDragStart(t,!0)}$&&(r?(r.e+=a-(dt||0),r.f+=l-(ht||0)):r={a:1,b:0,c:0,d:1,e:a,f:l},r="matrix(".concat(r.a,",").concat(r.b,",").concat(r.c,",").concat(r.d,",").concat(r.e,",").concat(r.f,")"),R($,"webkitTransform",r),R($,"mozTransform",r),R($,"msTransform",r),R($,"transform",r),dt=a,ht=l,ut=i),t.cancelable&&t.preventDefault()}},_appendGhost:function(){if(!$){var t=this.options.fallbackOnBody?document.body:Q,e=X(V,!0,Mt,!0,t),n=this.options;if(Mt){for(yt=t;"static"===R(yt,"position")&&"none"===R(yt,"transform")&&yt!==document;)yt=yt.parentNode;yt!==document.body&&yt!==document.documentElement?(yt===document&&(yt=O()),e.top+=yt.scrollTop,e.left+=yt.scrollLeft):yt=O(),Ct=E(yt)}k($=V.cloneNode(!0),n.ghostClass,!1),k($,n.fallbackClass,!0),k($,n.dragClass,!0),R($,"transition",""),R($,"transform",""),R($,"box-sizing","border-box"),R($,"margin",0),R($,"top",e.top),R($,"left",e.left),R($,"width",e.width),R($,"height",e.height),R($,"opacity","0.8"),R($,"position",Mt?"absolute":"fixed"),R($,"zIndex","100000"),R($,"pointerEvents","none"),Ft.ghost=$,t.appendChild($),R($,"transform-origin",ft/parseInt($.style.width)*100+"% "+pt/parseInt($.style.height)*100+"%")}},_onDragStart:function(t,e){var n=this,o=t.dataTransfer,i=n.options;G("dragStart",this,{evt:t}),Ft.eventCanceled?this._onDrop():(G("setupClone",this),Ft.eventCanceled||((et=_(V)).removeAttribute("id"),et.draggable=!1,et.style["will-change"]="",this._hideClone(),k(et,this.options.chosenClass,!1),Ft.clone=et),n.cloneId=Kt(function(){G("clone",n),Ft.eventCanceled||(n.options.removeCloneOnHide||Q.insertBefore(et,V),n._hideClone(),q({sortable:n,name:"clone"}))}),e||k(V,i.dragClass,!0),e?(Et=!0,n._loopId=setInterval(n._emulateDragOver,50)):(f(document,"mouseup",n._onDrop),f(document,"touchend",n._onDrop),f(document,"touchcancel",n._onDrop),o&&(o.effectAllowed="move",i.setData&&i.setData.call(n,o,V)),h(document,"drop",n),R(V,"transform","translateZ(0)")),wt=!0,n._dragStartId=Kt(n._dragStarted.bind(n,e,t)),h(document,"selectstart",n),gt=!0,u&&R(document.body,"user-select","none"))},_onDragOver:function(n){var o,i,r,t,e,a=this.el,l=n.target,s=this.options,c=s.group,u=Ft.active,d=lt===c,h=s.sort,f=st||u,p=this,g=!1;if(!Tt){if(void 0!==n.preventDefault&&n.cancelable&&n.preventDefault(),l=P(l,s.draggable,a,!0),O("dragOver"),Ft.eventCanceled)return g;if(V.contains(n.target)||l.animated&&l.animatingX&&l.animatingY||p._ignoreWhileAnimating===l)return A(!1);if(Et=!1,u&&!s.disabled&&(d?h||(i=Z!==Q):st===this||(this.lastPutMode=lt.checkPull(this,u,V,n))&&c.checkPut(this,u,V,n))){if(r="vertical"===this._getDirection(n,l),o=X(V),O("dragOverValid"),Ft.eventCanceled)return g;if(i)return Z=Q,M(),this._hideClone(),O("revert"),Ft.eventCanceled||(J?Q.insertBefore(V,J):Q.appendChild(V)),A(!0);var m=F(a,s.draggable);if(m&&(S=n,c=r,x=X(F((D=this).el,D.options.draggable)),D=L(D.el,D.options,$),!(c?S.clientX>D.right+10||S.clientY>x.bottom&&S.clientX>x.left:S.clientY>D.bottom+10||S.clientX>x.right&&S.clientY>x.top)||m.animated)){if(m&&(t=n,e=r,C=X(B((_=this).el,0,_.options,!0)),_=L(_.el,_.options,$),e?t.clientX<_.left-10||t.clientY<C.top&&t.clientX<C.right:t.clientY<_.top-10||t.clientY<C.bottom&&t.clientX<C.left)){var v=B(a,0,s,!0);if(v===V)return A(!1);if(E=X(l=v),!1!==jt(Q,a,V,o,l,E,n,!1))return M(),a.insertBefore(V,v),Z=a,N(),A(!0)}else if(l.parentNode===a){var b,y,w,E=X(l),D=V.parentNode!==a,S=(S=V.animated&&V.toRect||o,x=l.animated&&l.toRect||E,_=(e=r)?S.left:S.top,t=e?S.right:S.bottom,C=e?S.width:S.height,v=e?x.left:x.top,S=e?x.right:x.bottom,x=e?x.width:x.height,!(_===v||t===S||_+C/2===v+x/2)),_=r?"top":"left",C=Y(l,"top","top")||Y(V,"top","top"),v=C?C.scrollTop:void 0;if(mt!==l&&(y=E[_],St=!1,_t=!S&&s.invertSwap||D),0!==(b=function(t,e,n,o,i,r,a,l){var s=o?t.clientY:t.clientX,c=o?n.height:n.width,t=o?n.top:n.left,o=o?n.bottom:n.right,n=!1;if(!a)if(l&&bt<c*i){if(St=!St&&(1===vt?t+c*r/2<s:s<o-c*r/2)?!0:St)n=!0;else if(1===vt?s<t+bt:o-bt<s)return-vt}else if(t+c*(1-i)/2<s&&s<o-c*(1-i)/2)return function(t){return j(V)<j(t)?1:-1}(e);if((n=n||a)&&(s<t+c*r/2||o-c*r/2<s))return t+c/2<s?1:-1;return 0}(n,l,E,r,S?1:s.swapThreshold,null==s.invertedSwapThreshold?s.swapThreshold:s.invertedSwapThreshold,_t,mt===l)))for(var T=j(V);(w=Z.children[T-=b])&&("none"===R(w,"display")||w===$););if(0===b||w===l)return A(!1);vt=b;var x=(mt=l).nextElementSibling,D=!1,S=jt(Q,a,V,o,l,E,n,D=1===b);if(!1!==S)return 1!==S&&-1!==S||(D=1===S),Tt=!0,setTimeout(Lt,30),M(),D&&!x?a.appendChild(V):l.parentNode.insertBefore(V,D?x:l),C&&H(C,0,v-C.scrollTop),Z=V.parentNode,void 0===y||_t||(bt=Math.abs(y-X(l)[_])),N(),A(!0)}}else{if(m===V)return A(!1);if((l=m&&a===n.target?m:l)&&(E=X(l)),!1!==jt(Q,a,V,o,l,E,n,!!l))return M(),m&&m.nextSibling?a.insertBefore(V,m.nextSibling):a.appendChild(V),Z=a,N(),A(!0)}if(a.contains(V))return A(!1)}return!1}function O(t,e){G(t,p,I({evt:n,isOwner:d,axis:r?"vertical":"horizontal",revert:i,dragRect:o,targetRect:E,canSort:h,fromSortable:f,target:l,completed:A,onMove:function(t,e){return jt(Q,a,V,o,t,X(t),n,e)},changed:N},e))}function M(){O("dragOverAnimationCapture"),p.captureAnimationState(),p!==f&&f.captureAnimationState()}function A(t){return O("dragOverCompleted",{insertion:t}),t&&(d?u._hideClone():u._showClone(p),p!==f&&(k(V,(st||u).options.ghostClass,!1),k(V,s.ghostClass,!0)),st!==p&&p!==Ft.active?st=p:p===Ft.active&&st&&(st=null),f===p&&(p._ignoreWhileAnimating=l),p.animateAll(function(){O("dragOverAnimationComplete"),p._ignoreWhileAnimating=null}),p!==f&&(f.animateAll(),f._ignoreWhileAnimating=null)),(l===V&&!V.animated||l===a&&!l.animated)&&(mt=null),s.dragoverBubble||n.rootEl||l===document||(V.parentNode[K]._isOutsideThisEl(n.target),t||Yt(n)),!s.dragoverBubble&&n.stopPropagation&&n.stopPropagation(),g=!0}function N(){it=j(V),at=j(V,s.draggable),q({sortable:p,name:"change",toEl:a,newIndex:it,newDraggableIndex:at,originalEvent:n})}},_ignoreWhileAnimating:null,_offMoveEvents:function(){f(document,"mousemove",this._onTouchMove),f(document,"touchmove",this._onTouchMove),f(document,"pointermove",this._onTouchMove),f(document,"dragover",Yt),f(document,"mousemove",Yt),f(document,"touchmove",Yt)},_offUpEvents:function(){var t=this.el.ownerDocument;f(t,"mouseup",this._onDrop),f(t,"touchend",this._onDrop),f(t,"pointerup",this._onDrop),f(t,"touchcancel",this._onDrop),f(document,"selectstart",this)},_onDrop:function(t){var e=this.el,n=this.options;it=j(V),at=j(V,n.draggable),G("drop",this,{evt:t}),Z=V&&V.parentNode,it=j(V),at=j(V,n.draggable),Ft.eventCanceled||(St=_t=wt=!1,clearInterval(this._loopId),clearTimeout(this._dragStartTimer),Wt(this.cloneId),Wt(this._dragStartId),this.nativeDraggable&&(f(document,"drop",this),f(e,"dragstart",this._onDragStart)),this._offMoveEvents(),this._offUpEvents(),u&&R(document.body,"user-select",""),R(V,"transform",""),t&&(gt&&(t.cancelable&&t.preventDefault(),n.dropBubble||t.stopPropagation()),$&&$.parentNode&&$.parentNode.removeChild($),(Q===Z||st&&"clone"!==st.lastPutMode)&&et&&et.parentNode&&et.parentNode.removeChild(et),V&&(this.nativeDraggable&&f(V,"dragend",this),Ht(V),V.style["will-change"]="",gt&&!wt&&k(V,(st||this).options.ghostClass,!1),k(V,this.options.chosenClass,!1),q({sortable:this,name:"unchoose",toEl:Z,newIndex:null,newDraggableIndex:null,originalEvent:t}),Q!==Z?(0<=it&&(q({rootEl:Z,name:"add",toEl:Z,fromEl:Q,originalEvent:t}),q({sortable:this,name:"remove",toEl:Z,originalEvent:t}),q({rootEl:Z,name:"sort",toEl:Z,fromEl:Q,originalEvent:t}),q({sortable:this,name:"sort",toEl:Z,originalEvent:t})),st&&st.save()):it!==ot&&0<=it&&(q({sortable:this,name:"update",toEl:Z,originalEvent:t}),q({sortable:this,name:"sort",toEl:Z,originalEvent:t})),Ft.active&&(null!=it&&-1!==it||(it=ot,at=rt),q({sortable:this,name:"end",toEl:Z,originalEvent:t}),this.save())))),this._nulling()},_nulling:function(){G("nulling",this),Q=V=Z=$=J=et=tt=nt=ct=ut=gt=it=at=ot=rt=mt=vt=st=lt=Ft.dragged=Ft.ghost=Ft.clone=Ft.active=null,xt.forEach(function(t){t.checked=!0}),xt.length=dt=ht=0},handleEvent:function(t){switch(t.type){case"drop":case"dragend":this._onDrop(t);break;case"dragenter":case"dragover":V&&(this._onDragOver(t),function(t){t.dataTransfer&&(t.dataTransfer.dropEffect="move");t.cancelable&&t.preventDefault()}(t));break;case"selectstart":t.preventDefault()}},toArray:function(){for(var t,e=[],n=this.el.children,o=0,i=n.length,r=this.options;o<i;o++)P(t=n[o],r.draggable,this.el,!1)&&e.push(t.getAttribute(r.dataIdAttr)||function(t){var e=t.tagName+t.className+t.src+t.href+t.textContent,n=e.length,o=0;for(;n--;)o+=e.charCodeAt(n);return o.toString(36)}(t));return e},sort:function(t,e){var n={},o=this.el;this.toArray().forEach(function(t,e){e=o.children[e];P(e,this.options.draggable,o,!1)&&(n[t]=e)},this),e&&this.captureAnimationState(),t.forEach(function(t){n[t]&&(o.removeChild(n[t]),o.appendChild(n[t]))}),e&&this.animateAll()},save:function(){var t=this.options.store;t&&t.set&&t.set(this)},closest:function(t,e){return P(t,e||this.options.draggable,this.el,!1)},option:function(t,e){var n=this.options;if(void 0===e)return n[t];var o=W.modifyOption(this,t,e);n[t]=void 0!==o?o:e,"group"===t&&kt(n)},destroy:function(){G("destroy",this);var t=this.el;t[K]=null,f(t,"mousedown",this._onTapStart),f(t,"touchstart",this._onTapStart),f(t,"pointerdown",this._onTapStart),this.nativeDraggable&&(f(t,"dragover",this),f(t,"dragenter",this)),Array.prototype.forEach.call(t.querySelectorAll("[draggable]"),function(t){t.removeAttribute("draggable")}),this._onDrop(),this._disableDelayedDragEvents(),Dt.splice(Dt.indexOf(this.el),1),this.el=t=null},_hideClone:function(){nt||(G("hideClone",this),Ft.eventCanceled||(R(et,"display","none"),this.options.removeCloneOnHide&&et.parentNode&&et.parentNode.removeChild(et),nt=!0))},_showClone:function(t){"clone"===t.lastPutMode?nt&&(G("showClone",this),Ft.eventCanceled||(V.parentNode!=Q||this.options.group.revertClone?J?Q.insertBefore(et,J):Q.appendChild(et):Q.insertBefore(et,V),this.options.group.revertClone&&this.animate(V,et),R(et,"display",""),nt=!1)):this._hideClone()}},Ot&&h(document,"touchmove",function(t){(Ft.active||wt)&&t.cancelable&&t.preventDefault()}),Ft.utils={on:h,off:f,css:R,find:b,is:function(t,e){return!!P(t,e,t,!1)},extend:function(t,e){if(t&&e)for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n]);return t},throttle:S,closest:P,toggleClass:k,clone:_,index:j,nextTick:Kt,cancelNextTick:Wt,detectDirection:Pt,getChild:B},Ft.get=function(t){return t[K]},Ft.mount=function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];(e=e[0].constructor===Array?e[0]:e).forEach(function(t){if(!t.prototype||!t.prototype.constructor)throw"Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(t));t.utils&&(Ft.utils=I(I({},Ft.utils),t.utils)),W.mount(t)})},Ft.create=function(t,e){return new Ft(t,e)};var zt,Gt,Ut,qt,Vt,Zt,$t=[],Qt=!(Ft.version="1.15.2");function Jt(){$t.forEach(function(t){clearInterval(t.pid)}),$t=[]}function te(){clearInterval(Zt)}var ee,ne=S(function(n,t,e,o){if(t.scroll){var i,r=(n.touches?n.touches[0]:n).clientX,a=(n.touches?n.touches[0]:n).clientY,l=t.scrollSensitivity,s=t.scrollSpeed,c=O(),u=!1;Gt!==e&&(Gt=e,Jt(),zt=t.scroll,i=t.scrollFn,!0===zt&&(zt=M(e,!0)));var d=0,h=zt;do{var f=h,p=X(f),g=p.top,m=p.bottom,v=p.left,b=p.right,y=p.width,w=p.height,E=void 0,D=void 0,S=f.scrollWidth,_=f.scrollHeight,C=R(f),T=f.scrollLeft,p=f.scrollTop,D=f===c?(E=y<S&&("auto"===C.overflowX||"scroll"===C.overflowX||"visible"===C.overflowX),w<_&&("auto"===C.overflowY||"scroll"===C.overflowY||"visible"===C.overflowY)):(E=y<S&&("auto"===C.overflowX||"scroll"===C.overflowX),w<_&&("auto"===C.overflowY||"scroll"===C.overflowY)),T=E&&(Math.abs(b-r)<=l&&T+y<S)-(Math.abs(v-r)<=l&&!!T),p=D&&(Math.abs(m-a)<=l&&p+w<_)-(Math.abs(g-a)<=l&&!!p);if(!$t[d])for(var x=0;x<=d;x++)$t[x]||($t[x]={});$t[d].vx==T&&$t[d].vy==p&&$t[d].el===f||($t[d].el=f,$t[d].vx=T,$t[d].vy=p,clearInterval($t[d].pid),0==T&&0==p||(u=!0,$t[d].pid=setInterval(function(){o&&0===this.layer&&Ft.active._onTouchMove(Vt);var t=$t[this.layer].vy?$t[this.layer].vy*s:0,e=$t[this.layer].vx?$t[this.layer].vx*s:0;"function"==typeof i&&"continue"!==i.call(Ft.dragged.parentNode[K],e,t,n,Vt,$t[this.layer].el)||H($t[this.layer].el,e,t)}.bind({layer:d}),24))),d++}while(t.bubbleScroll&&h!==c&&(h=M(h,!1)));Qt=u}},30),c=function(t){var e=t.originalEvent,n=t.putSortable,o=t.dragEl,i=t.activeSortable,r=t.dispatchSortableEvent,a=t.hideGhostForTarget,t=t.unhideGhostForTarget;e&&(i=n||i,a(),e=e.changedTouches&&e.changedTouches.length?e.changedTouches[0]:e,e=document.elementFromPoint(e.clientX,e.clientY),t(),i&&!i.el.contains(e)&&(r("spill"),this.onSpill({dragEl:o,putSortable:n})))};function oe(){}function ie(){}oe.prototype={startIndex:null,dragStart:function(t){t=t.oldDraggableIndex;this.startIndex=t},onSpill:function(t){var e=t.dragEl,n=t.putSortable;this.sortable.captureAnimationState(),n&&n.captureAnimationState();t=B(this.sortable.el,this.startIndex,this.options);t?this.sortable.el.insertBefore(e,t):this.sortable.el.appendChild(e),this.sortable.animateAll(),n&&n.animateAll()},drop:c},a(oe,{pluginName:"revertOnSpill"}),ie.prototype={onSpill:function(t){var e=t.dragEl,t=t.putSortable||this.sortable;t.captureAnimationState(),e.parentNode&&e.parentNode.removeChild(e),t.animateAll()},drop:c},a(ie,{pluginName:"removeOnSpill"});var re,ae,le,se,ce,ue=[],de=[],he=!1,fe=!1,pe=!1;function ge(n,o){de.forEach(function(t,e){e=o.children[t.sortableIndex+(n?Number(e):0)];e?o.insertBefore(t,e):o.appendChild(t)})}function me(){ue.forEach(function(t){t!==le&&t.parentNode&&t.parentNode.removeChild(t)})}return Ft.mount(new function(){function t(){for(var t in this.defaults={scroll:!0,forceAutoScrollFallback:!1,scrollSensitivity:30,scrollSpeed:10,bubbleScroll:!0},this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this))}return t.prototype={dragStarted:function(t){t=t.originalEvent;this.sortable.nativeDraggable?h(document,"dragover",this._handleAutoScroll):this.options.supportPointer?h(document,"pointermove",this._handleFallbackAutoScroll):t.touches?h(document,"touchmove",this._handleFallbackAutoScroll):h(document,"mousemove",this._handleFallbackAutoScroll)},dragOverCompleted:function(t){t=t.originalEvent;this.options.dragOverBubble||t.rootEl||this._handleAutoScroll(t)},drop:function(){this.sortable.nativeDraggable?f(document,"dragover",this._handleAutoScroll):(f(document,"pointermove",this._handleFallbackAutoScroll),f(document,"touchmove",this._handleFallbackAutoScroll),f(document,"mousemove",this._handleFallbackAutoScroll)),te(),Jt(),clearTimeout(g),g=void 0},nulling:function(){Vt=Gt=zt=Qt=Zt=Ut=qt=null,$t.length=0},_handleFallbackAutoScroll:function(t){this._handleAutoScroll(t,!0)},_handleAutoScroll:function(e,n){var o,i=this,r=(e.touches?e.touches[0]:e).clientX,a=(e.touches?e.touches[0]:e).clientY,t=document.elementFromPoint(r,a);Vt=e,n||this.options.forceAutoScrollFallback||w||y||u?(ne(e,this.options,t,n),o=M(t,!0),!Qt||Zt&&r===Ut&&a===qt||(Zt&&te(),Zt=setInterval(function(){var t=M(document.elementFromPoint(r,a),!0);t!==o&&(o=t,Jt()),ne(e,i.options,t,n)},10),Ut=r,qt=a)):this.options.bubbleScroll&&M(t,!0)!==O()?ne(e,this.options,M(t,!1),!1):Jt()}},a(t,{pluginName:"scroll",initializeByDefault:!0})}),Ft.mount(ie,oe),Ft.mount(new function(){function t(){this.defaults={swapClass:"sortable-swap-highlight"}}return t.prototype={dragStart:function(t){t=t.dragEl;ee=t},dragOverValid:function(t){var e=t.completed,n=t.target,o=t.onMove,i=t.activeSortable,r=t.changed,a=t.cancel;i.options.swap&&(t=this.sortable.el,i=this.options,n&&n!==t&&(t=ee,ee=!1!==o(n)?(k(n,i.swapClass,!0),n):null,t&&t!==ee&&k(t,i.swapClass,!1)),r(),e(!0),a())},drop:function(t){var e,n,o=t.activeSortable,i=t.putSortable,r=t.dragEl,a=i||this.sortable,l=this.options;ee&&k(ee,l.swapClass,!1),ee&&(l.swap||i&&i.options.swap)&&r!==ee&&(a.captureAnimationState(),a!==o&&o.captureAnimationState(),n=ee,t=(e=r).parentNode,l=n.parentNode,t&&l&&!t.isEqualNode(n)&&!l.isEqualNode(e)&&(i=j(e),r=j(n),t.isEqualNode(l)&&i<r&&r++,t.insertBefore(n,t.children[i]),l.insertBefore(e,l.children[r])),a.animateAll(),a!==o&&o.animateAll())},nulling:function(){ee=null}},a(t,{pluginName:"swap",eventProperties:function(){return{swapItem:ee}}})}),Ft.mount(new function(){function t(o){for(var t in this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this));o.options.avoidImplicitDeselect||(o.options.supportPointer?h(document,"pointerup",this._deselectMultiDrag):(h(document,"mouseup",this._deselectMultiDrag),h(document,"touchend",this._deselectMultiDrag))),h(document,"keydown",this._checkKeyDown),h(document,"keyup",this._checkKeyUp),this.defaults={selectedClass:"sortable-selected",multiDragKey:null,avoidImplicitDeselect:!1,setData:function(t,e){var n="";ue.length&&ae===o?ue.forEach(function(t,e){n+=(e?", ":"")+t.textContent}):n=e.textContent,t.setData("Text",n)}}}return t.prototype={multiDragKeyDown:!1,isMultiDrag:!1,delayStartGlobal:function(t){t=t.dragEl;le=t},delayEnded:function(){this.isMultiDrag=~ue.indexOf(le)},setupClone:function(t){var e=t.sortable,t=t.cancel;if(this.isMultiDrag){for(var n=0;n<ue.length;n++)de.push(_(ue[n])),de[n].sortableIndex=ue[n].sortableIndex,de[n].draggable=!1,de[n].style["will-change"]="",k(de[n],this.options.selectedClass,!1),ue[n]===le&&k(de[n],this.options.chosenClass,!1);e._hideClone(),t()}},clone:function(t){var e=t.sortable,n=t.rootEl,o=t.dispatchSortableEvent,t=t.cancel;this.isMultiDrag&&(this.options.removeCloneOnHide||ue.length&&ae===e&&(ge(!0,n),o("clone"),t()))},showClone:function(t){var e=t.cloneNowShown,n=t.rootEl,t=t.cancel;this.isMultiDrag&&(ge(!1,n),de.forEach(function(t){R(t,"display","")}),e(),ce=!1,t())},hideClone:function(t){var e=this,n=(t.sortable,t.cloneNowHidden),t=t.cancel;this.isMultiDrag&&(de.forEach(function(t){R(t,"display","none"),e.options.removeCloneOnHide&&t.parentNode&&t.parentNode.removeChild(t)}),n(),ce=!0,t())},dragStartGlobal:function(t){t.sortable;!this.isMultiDrag&&ae&&ae.multiDrag._deselectMultiDrag(),ue.forEach(function(t){t.sortableIndex=j(t)}),ue=ue.sort(function(t,e){return t.sortableIndex-e.sortableIndex}),pe=!0},dragStarted:function(t){var e,n=this,t=t.sortable;this.isMultiDrag&&(this.options.sort&&(t.captureAnimationState(),this.options.animation&&(ue.forEach(function(t){t!==le&&R(t,"position","absolute")}),e=X(le,!1,!0,!0),ue.forEach(function(t){t!==le&&C(t,e)}),he=fe=!0)),t.animateAll(function(){he=fe=!1,n.options.animation&&ue.forEach(function(t){T(t)}),n.options.sort&&me()}))},dragOver:function(t){var e=t.target,n=t.completed,t=t.cancel;fe&&~ue.indexOf(e)&&(n(!1),t())},revert:function(t){var n,o,e=t.fromSortable,i=t.rootEl,r=t.sortable,a=t.dragRect;1<ue.length&&(ue.forEach(function(t){r.addAnimationState({target:t,rect:fe?X(t):a}),T(t),t.fromRect=a,e.removeAnimationState(t)}),fe=!1,n=!this.options.removeCloneOnHide,o=i,ue.forEach(function(t,e){e=o.children[t.sortableIndex+(n?Number(e):0)];e?o.insertBefore(t,e):o.appendChild(t)}))},dragOverCompleted:function(t){var e,n=t.sortable,o=t.isOwner,i=t.insertion,r=t.activeSortable,a=t.parentEl,l=t.putSortable,t=this.options;i&&(o&&r._hideClone(),he=!1,t.animation&&1<ue.length&&(fe||!o&&!r.options.sort&&!l)&&(e=X(le,!1,!0,!0),ue.forEach(function(t){t!==le&&(C(t,e),a.appendChild(t))}),fe=!0),o||(fe||me(),1<ue.length?(o=ce,r._showClone(n),r.options.animation&&!ce&&o&&de.forEach(function(t){r.addAnimationState({target:t,rect:se}),t.fromRect=se,t.thisAnimationDuration=null})):r._showClone(n)))},dragOverAnimationCapture:function(t){var e=t.dragRect,n=t.isOwner,t=t.activeSortable;ue.forEach(function(t){t.thisAnimationDuration=null}),t.options.animation&&!n&&t.multiDrag.isMultiDrag&&(se=a({},e),e=v(le,!0),se.top-=e.f,se.left-=e.e)},dragOverAnimationComplete:function(){fe&&(fe=!1,me())},drop:function(t){var e=t.originalEvent,n=t.rootEl,o=t.parentEl,i=t.sortable,r=t.dispatchSortableEvent,a=t.oldIndex,l=t.putSortable,s=l||this.sortable;if(e){var c,u,d,h=this.options,f=o.children;if(!pe)if(h.multiDragKey&&!this.multiDragKeyDown&&this._deselectMultiDrag(),k(le,h.selectedClass,!~ue.indexOf(le)),~ue.indexOf(le))ue.splice(ue.indexOf(le),1),re=null,z({sortable:i,rootEl:n,name:"deselect",targetEl:le,originalEvent:e});else{if(ue.push(le),z({sortable:i,rootEl:n,name:"select",targetEl:le,originalEvent:e}),e.shiftKey&&re&&i.el.contains(re)){var p=j(re),t=j(le);if(~p&&~t&&p!==t)for(var g,m=p<t?(g=p,t):(g=t,p+1);g<m;g++)~ue.indexOf(f[g])||(k(f[g],h.selectedClass,!0),ue.push(f[g]),z({sortable:i,rootEl:n,name:"select",targetEl:f[g],originalEvent:e}))}else re=le;ae=s}pe&&this.isMultiDrag&&(fe=!1,(o[K].options.sort||o!==n)&&1<ue.length&&(c=X(le),u=j(le,":not(."+this.options.selectedClass+")"),!he&&h.animation&&(le.thisAnimationDuration=null),s.captureAnimationState(),he||(h.animation&&(le.fromRect=c,ue.forEach(function(t){var e;t.thisAnimationDuration=null,t!==le&&(e=fe?X(t):c,t.fromRect=e,s.addAnimationState({target:t,rect:e}))})),me(),ue.forEach(function(t){f[u]?o.insertBefore(t,f[u]):o.appendChild(t),u++}),a===j(le)&&(d=!1,ue.forEach(function(t){t.sortableIndex!==j(t)&&(d=!0)}),d&&(r("update"),r("sort")))),ue.forEach(function(t){T(t)}),s.animateAll()),ae=s),(n===o||l&&"clone"!==l.lastPutMode)&&de.forEach(function(t){t.parentNode&&t.parentNode.removeChild(t)})}},nullingGlobal:function(){this.isMultiDrag=pe=!1,de.length=0},destroyGlobal:function(){this._deselectMultiDrag(),f(document,"pointerup",this._deselectMultiDrag),f(document,"mouseup",this._deselectMultiDrag),f(document,"touchend",this._deselectMultiDrag),f(document,"keydown",this._checkKeyDown),f(document,"keyup",this._checkKeyUp)},_deselectMultiDrag:function(t){if(!(void 0!==pe&&pe||ae!==this.sortable||t&&P(t.target,this.options.draggable,this.sortable.el,!1)||t&&0!==t.button))for(;ue.length;){var e=ue[0];k(e,this.options.selectedClass,!1),ue.shift(),z({sortable:this.sortable,rootEl:this.sortable.el,name:"deselect",targetEl:e,originalEvent:t})}},_checkKeyDown:function(t){t.key===this.options.multiDragKey&&(this.multiDragKeyDown=!0)},_checkKeyUp:function(t){t.key===this.options.multiDragKey&&(this.multiDragKeyDown=!1)}},a(t,{pluginName:"multiDrag",utils:{select:function(t){var e=t.parentNode[K];e&&e.options.multiDrag&&!~ue.indexOf(t)&&(ae&&ae!==e&&(ae.multiDrag._deselectMultiDrag(),ae=e),k(t,e.options.selectedClass,!0),ue.push(t))},deselect:function(t){var e=t.parentNode[K],n=ue.indexOf(t);e&&e.options.multiDrag&&~n&&(k(t,e.options.selectedClass,!1),ue.splice(n,1))}},eventProperties:function(){var n=this,o=[],i=[];return ue.forEach(function(t){var e;o.push({multiDragElement:t,index:t.sortableIndex}),e=fe&&t!==le?-1:fe?j(t,":not(."+n.options.selectedClass+")"):j(t),i.push({multiDragElement:t,index:e})}),{items:r(ue),clones:[].concat(de),oldIndicies:o,newIndicies:i}},optionListeners:{multiDragKey:function(t){return"ctrl"===(t=t.toLowerCase())?t="Control":1<t.length&&(t=t.charAt(0).toUpperCase()+t.substr(1)),t}}})}),Ft});

// ── Drag-and-drop reorder + persistence ──────────────────────────────────────
(function(){
  var KEY = 'hsk_row_order';

  // Renumber the # column in a tbody
  function updateNumbers(tb){
    for(var i=0;i<tb.rows.length;i++){
      var c=tb.rows[i].querySelector('.rownum');
      if(c) c.textContent=i+1;
    }
  }

  // Save order of every main tbody (by Chinese word text)
  function saveOrder(){
    var order={};
    document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
      var ids=[];
      for(var i=0;i<tb.rows.length;i++){
        var z=tb.rows[i].querySelector('.zh');
        if(z) ids.push(z.textContent.trim());
      }
      if(ids.length) order[tb.id]=ids;
    });
    localStorage.setItem(KEY, JSON.stringify(order));
  }

  // Restore saved order (runs after existing IIFE has already moved learned/fam rows)
  function loadOrder(){
    var order={};
    try{ order=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){}
    Object.keys(order).forEach(function(tbId){
      var tb=document.getElementById(tbId);
      if(!tb) return;
      // Map zh-text → tr for rows currently in this tbody
      var map={};
      for(var i=0;i<tb.rows.length;i++){
        var z=tb.rows[i].querySelector('.zh');
        if(z) map[z.textContent.trim()]=tb.rows[i];
      }
      // Reorder by appending in saved sequence
      order[tbId].forEach(function(w){ var tr=map[w]; if(tr) tb.appendChild(tr); });
      updateNumbers(tb);
    });
  }

  // Init SortableJS on all main tbodies
  function initSortable(){
    document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
      Sortable.create(tb,{
        animation: 120,
        cursor: 'grab',
        handle: '.drag-handle',
        onEnd: function(){
          updateNumbers(tb); saveOrder();
          renumVisible(); updateWordCount(getVisibleRowCount());
        }
      });
    });
    // Also make learned + fam tbodies sortable (order saved via existing save())
    ['learned-tbody','fam-tbody'].forEach(function(id){
      var tb=document.getElementById(id);
      if(tb) Sortable.create(tb,{ animation:120, cursor:'grab',
        handle: '.drag-handle',
        onEnd:function(){ updateNumbers(tb); renumVisible(); updateWordCount(getVisibleRowCount()); }
      });
    });
  }

  loadOrder();
  initSortable();
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

/* ── Palette (colour scheme) ──────────────────────────────────────────────────
   INPUT:  localStorage hsk_palette; click on .pal-btn buttons
   ACTION: sets --pal-accent and --pal-dark CSS custom properties on :root;
           highlights active button; persists selection
   OUTPUT: CSS custom properties on document.documentElement; localStorage hsk_palette
   ────────────────────────────────────────────────────────────────────────────── */
/* ── Palette ──────────────────────────────────────────────────────────────── */


var PALETTES = window.HSK_PALETTES;

function applyPalette(name){
  var pal = PALETTES[name] || PALETTES.rose;
  document.documentElement.style.setProperty('--pal-accent', pal[0]);
  document.documentElement.style.setProperty('--pal-dark', pal[1]);
  localStorage.setItem('hsk_palette', name);
  // Also fix dark mode thead (it overrides)
  var dynPal = document.getElementById('dyn-palette');
  if(!dynPal){ dynPal=document.createElement('style'); dynPal.id='dyn-palette'; document.head.appendChild(dynPal); }
  dynPal.textContent = 'body.dark thead tr{background:'+pal[1]+'!important}';
}

(function initPalette(){
  var saved = localStorage.getItem('hsk_palette') || 'rose';
  applyPalette(saved);
  var dd = document.getElementById('palette-dropdown');
  var btn = document.getElementById('btn-palette-dd');
  if(btn) btn.addEventListener('click', function(e){ e.stopPropagation(); dd.classList.toggle('open'); });
  if(dd){
    dd.querySelectorAll('.cdx-dropdown-item').forEach(function(item){
      item.addEventListener('click', function(){
        applyPalette(this.dataset.pal);
        dd.classList.remove('open');
      });
    });
  }
  document.addEventListener('click', function(){ if(dd) dd.classList.remove('open'); });
})();

/* ── Language switching (RU / EN) ─────────────────────────────────────────────
   INPUT:  localStorage hsk_lang; click on lang toggle buttons
   ACTION: setLang() swaps body.lang-en class; translates all toolbar text,
           section headings, stat labels, button labels via string maps
   OUTPUT: body.lang-en class; DOM text of ~30 UI elements; localStorage hsk_lang
   ────────────────────────────────────────────────────────────────────────────── */
/* ── Language switching (RU / EN) ────────────────────────────────────────── */
var currentLang = localStorage.getItem('hsk_lang') || 'ru';

var SECTION_NAMES_EN = window.HSK_SECTION_NAMES_EN;
var SECTION_NAMES_RU = window.HSK_SECTION_NAMES_RU;

function setLang(lang){
  currentLang = lang;
  localStorage.setItem('hsk_lang', lang);
  var isEn = lang === 'en';

  if(isEn){ document.body.classList.add('lang-en'); }
  else     { document.body.classList.remove('lang-en'); }

  /* title & h1 */
  document.title = isEn ? 'HSK 1\u20136 Master Dictionary v2' : 'HSK 1\u20136 \u041c\u0430\u0441\u0442\u0435\u0440-\u0441\u043b\u043e\u0432\u0430\u0440\u044c v2';
  var h1 = document.querySelector('h1');
  if(h1) h1.textContent = isEn ? 'HSK 1\u20136 Master Dictionary' : 'HSK 1\u20136 \u041c\u0430\u0441\u0442\u0435\u0440-\u0441\u043b\u043e\u0432\u0430\u0440\u044c';

  var _wc = document.querySelectorAll('tr[data-key]').length;
  /* sync search-lang dropdown with interface language */
  var _langSel = document.getElementById('search-lang');
  if(_langSel){
    var optRu = _langSel.querySelector('option[value="ru"]');
    var optEn = _langSel.querySelector('option[value="en"]');
    if(optRu){ optRu.style.display = isEn ? 'none' : ''; optRu.disabled = isEn; }
    if(optEn){ optEn.style.display = isEn ? '' : 'none'; optEn.disabled = !isEn; }
    _langSel.value = isEn ? 'en' : 'ru';
  }

  /* subtitle */
  var sub = document.querySelector('.subtitle');
  var mm = ' &nbsp;&middot;&nbsp; <a href="mindmap.html" style="color:#4f8ef7;text-decoration:none;font-weight:600">🔗 ' + (isEn ? 'Mindmap (Beta)' : 'Mindmap (Бета)') + '</a>';
  if(sub) sub.innerHTML = isEn
    ? (_wc + ' words &nbsp;&middot;&nbsp; Grouped by part of speech' + mm)
    : (_wc + ' \u0441\u043b\u043e\u0432 &nbsp;&middot;&nbsp; \u0421\u0433\u0440\u0443\u043f\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e \u043f\u043e \u0447\u0430\u0441\u0442\u044f\u043c \u0440\u0435\u0447\u0438' + mm);

  /* TOC heading */
  var tocH3 = document.querySelector('.toc h3');
  if(tocH3) tocH3.textContent = isEn ? 'Contents' : '\u0421\u043e\u0434\u0435\u0440\u0436\u0430\u043d\u0438\u0435';

  /* TOC links — Bug1 fix */
  var TOC_NAMES_EN = {pos_noun:'Nouns \u540d\u8bcd', pos_verb:'Verbs \u52a8\u8bcd', pos_adj:'Adjectives \u5f62\u5bb9\u8bcd', pos_adv:'Adverbs \u526f\u8bcd', pos_mw:'Measure Words \u91cf\u8bcd', pos_particle:'Particles & Structural Words \u52a9\u8bcd/\u7ed3\u6784\u8bcd', pos_conj:'Conjunctions \u8fde\u8bcd', pos_prep:'Prepositions \u4ecb\u8bcd', pos_pron:'Pronouns \u4ee3\u8bcd'};
  var TOC_NAMES_RU = {pos_noun:'\u0421\u0443\u0449\u0435\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u540d\u8bcd', pos_verb:'\u0413\u043b\u0430\u0433\u043e\u043b\u044b \u52a8\u8bcd', pos_adj:'\u041f\u0440\u0438\u043b\u0430\u0433\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u5f62\u5bb9\u8bcd', pos_adv:'\u041d\u0430\u0440\u0435\u0447\u0438\u044f \u526f\u8bcd', pos_mw:'\u0421\u0447\u0451\u0442\u043d\u044b\u0435 \u0441\u043b\u043e\u0432\u0430 \u91cf\u8bcd', pos_particle:'\u0427\u0430\u0441\u0442\u0438\u0446\u044b \u0438 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u043d\u044b\u0435 \u0441\u043b\u043e\u0432\u0430 \u52a9\u8bcd/\u7ed3\u6784\u8bcd', pos_conj:'\u0421\u043e\u044e\u0437\u044b \u8fde\u8bcd', pos_prep:'\u041f\u0440\u0435\u0434\u043b\u043e\u0433\u0438 \u4ecb\u8bcd', pos_pron:'\u041c\u0435\u0441\u0442\u043e\u0438\u043c\u0435\u043d\u0438\u044f \u4ee3\u8bcd'};
  document.querySelectorAll('.toc a').forEach(function(a){
    var href = a.getAttribute('href')||'';
    var posId = href.replace('#','');
    var names = isEn ? TOC_NAMES_EN : TOC_NAMES_RU;
    if(!names[posId]) return;
    var span = a.querySelector('.toc-count');
    for(var ni=0; ni<a.childNodes.length; ni++){
      var nd = a.childNodes[ni];
      if(nd.nodeType === 3){
        nd.nodeValue = names[posId] + ' ';
        break;
      }
    }
    if(span){
      var m = span.textContent.match(/\d+/);
      var n = m ? m[0] : '0';
      span.textContent = isEn ? '(' + n + ' words)' : '(' + n + ' \u0441\u043b\u043e\u0432)';
    }
  });

  /* stats bar */
  var stBar = document.getElementById('stats-bar');
  if(stBar){
    var famVal = (document.getElementById('st-fam')||{textContent:'0'}).textContent;
    var lrnVal = (document.getElementById('st-lrn')||{textContent:'0'}).textContent;
    stBar.innerHTML = isEn
      ? 'Familiar:&nbsp;<b id="st-fam">'+famVal+'</b>&nbsp;&nbsp;Learned:&nbsp;<b id="st-lrn">'+lrnVal+'</b>&nbsp;&nbsp;Total:&nbsp;<b>'+_wc+'</b>'
      : '\u0417\u043d\u0430\u043a\u043e\u043c\u044b\u0435:&nbsp;<b id="st-fam">'+famVal+'</b>&nbsp;&nbsp;\u0412\u044b\u0443\u0447\u0435\u043d\u043e:&nbsp;<b id="st-lrn">'+lrnVal+'</b>&nbsp;&nbsp;\u0412\u0441\u0435\u0433\u043e:&nbsp;<b>'+_wc+'</b>';
  }

  /* search */
  var inp = document.getElementById('search-input');
  if(inp) inp.placeholder = isEn ? 'Search...' : '\u041f\u043e\u0438\u0441\u043a...';
  var ruOpt = document.querySelector('#search-lang option[value="ru"]');
  if(ruOpt) ruOpt.textContent = isEn ? 'Russian' : '\u0420\u0443\u0441\u0441\u043a\u0438\u0439';

  /* collapse / expand */
  var bca = document.getElementById('btn-col-all');
  var bea = document.getElementById('btn-exp-all');
  if(bca) bca.textContent = isEn ? '\u25bc Collapse' : '\u25bc \u0421\u0432\u0435\u0440\u043d\u0443\u0442\u044c';
  if(bea) bea.textContent = isEn ? '\u25b6 Expand'   : '\u25b6 \u0420\u0430\u0437\u0432\u0435\u0440\u043d\u0443\u0442\u044c';

  /* toolbar labels */
  document.querySelectorAll('.tb-label').forEach(function(lbl){
    var t = lbl.textContent;
    if(t.indexOf('\u0421\u043a\u043e\u0440') > -1 || t.indexOf('Speed') > -1)
      lbl.textContent = isEn ? '\u25b6 Speed:' : '\u25b6 \u0421\u043a\u043e\u0440\u043e\u0441\u0442\u044c:';
    else if(t.indexOf('\u043e\u043b\u043e\u043d\u043a') > -1 || t.indexOf('Column') > -1)
      lbl.textContent = isEn ? 'Columns:' : '\u041a\u043e\u043b\u043e\u043d\u043a\u0438:';
    else if(t.indexOf('\u043e\u0440\u0442') > -1 || t.indexOf('Sort') > -1)
      lbl.textContent = isEn ? 'Sort:' : '\u0421\u043e\u0440\u0442\u0438\u0440\u043e\u0432\u043a\u0430:';
  });
  var volLbl = document.getElementById('lbl-volume');
  if(volLbl) volLbl.textContent = isEn ? 'Volume:' : '\u0413\u0440\u043e\u043c\u043a\u043e\u0441\u0442\u044c:';
  var volRange = document.getElementById('vol-range');
  if(volRange) volRange.title = isEn ? 'Volume' : '\u0413\u0440\u043e\u043c\u043a\u043e\u0441\u0442\u044c';

  /* col-btn text + title */
  document.querySelectorAll('.col-btn').forEach(function(b){
    var col = b.dataset.col;
    var enMap = {num:'#', word:'Word', trans:'Translation', ex:'Example'};
    var ruMap = {num:'#', word:'\u0421\u043b\u043e\u0432\u043e', trans:'\u041f\u0435\u0440\u0435\u0432\u043e\u0434', ex:'\u041f\u0440\u0438\u043c\u0435\u0440'};
    if(enMap[col]){
      b.textContent = isEn ? enMap[col] : ruMap[col];
      b.title = isEn ? 'Show/hide '+enMap[col]+' column' : '\u0421\u043a\u0440\u044b\u0442\u044c/\u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043a\u043e\u043b\u043e\u043d\u043a\u0443 '+ruMap[col];
    }
  });

  /* POS filter buttons */
  var posLabels = isEn ? POS_LABELS_EN : POS_LABELS_RU;
  document.querySelectorAll('.pos-btn').forEach(function(b){
    var p = b.dataset.pos;
    if(posLabels[p]) b.textContent = posLabels[p];
  });
  var posLbl = document.getElementById('pos-filter-label');
  if(posLbl) posLbl.textContent = isEn ? 'POS:' : '\u0427\u0430\u0441\u0442\u044c \u0440\u0435\u0447\u0438:';

  /* Alpha filter — swap alphabet panel + reset filter when switching language */
  var ruWrap = document.getElementById('alpha-ru-wrap');
  var enWrap = document.getElementById('alpha-en-wrap');
  if(ruWrap) ruWrap.style.display = isEn ? 'none' : 'flex';
  if(enWrap) enWrap.style.display = isEn ? 'flex' : 'none';
  var alphaLbl = document.getElementById('alpha-filter-label');
  if(alphaLbl) alphaLbl.textContent = isEn ? 'A\u2013Z:' : '\u0410\u2013\u042f:';
  /* Reset alpha filter on language switch to avoid showing 0 results */
  if(currentAlpha !== 'all'){ applyAlphaFilter('all'); }

  /* show-all + export buttons */
  var showAll = document.getElementById('btn-show-all-cols');
  if(showAll){ showAll.textContent = isEn ? '\u21ba All' : '\u21ba \u0412\u0441\u0435'; showAll.title = isEn ? 'Show all columns' : '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435 \u043a\u043e\u043b\u043e\u043d\u043a\u0438'; }
  var csvBtn = document.getElementById('btn-export-csv');
  if(csvBtn){ csvBtn.title = isEn ? 'Export to Excel/CSV' : '\u042d\u043a\u0441\u043f\u043e\u0440\u0442 \u0432 Excel/CSV'; }
  var pdfBtn = document.getElementById('btn-export-pdf');
  if(pdfBtn){ pdfBtn.title = isEn ? 'Print / Save as PDF' : '\u041f\u0435\u0447\u0430\u0442\u044c / \u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043a\u0430\u043a PDF'; }

  /* sort buttons */
  var sortMap = {
    'sort-default':   ['\u041f\u043e \u0443\u043c\u043e\u043b\u0447\u0430\u043d\u0438\u044e', 'Default'],
    'sort-pinyin':    ['Pinyin A\u2013Z',                                                      'Pinyin A\u2013Z'],
    'sort-radical':   ['\u0420\u0430\u0434\u0438\u043a\u0430\u043b A\u2013Z',                  'Radical A\u2013Z'],
    'sort-component': ['\u041a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 A\u2013Z',      'Component A\u2013Z'],
    'sort-hsk-asc':   ['HSK 1\u20136 \u2191',                     'HSK 1\u20136 \u2191'],
    'sort-hsk-desc':  ['HSK 6\u20131 \u2193',                     'HSK 6\u20131 \u2193']
  };
  Object.keys(sortMap).forEach(function(id){
    var b = document.getElementById(id);
    if(b) b.textContent = isEn ? sortMap[id][1] : sortMap[id][0];
  });

  /* "По секциям" checkbox label text node */
  document.querySelectorAll('.tb-row label').forEach(function(lbl){
    if(lbl.querySelector && lbl.querySelector('#sort-respect-div')){
      for(var i=0; i<lbl.childNodes.length; i++){
        var n = lbl.childNodes[i];
        if(n.nodeType === 3){
          n.nodeValue = isEn ? ' By section' : ' \u041f\u043e \u0441\u0435\u043a\u0446\u0438\u044f\u043c';
          break;
        }
      }
    }
  });

  /* snapshot / palette buttons */
  var btnSave  = document.getElementById('btn-save-snap');
  var btnSnap  = document.getElementById('btn-snap-dd');
  var btnReset = document.getElementById('btn-reset-all');
  var btnPal   = document.getElementById('btn-palette-dd');
  if(btnSave && btnSave.textContent.indexOf('\u2713') === -1)
    btnSave.textContent  = isEn ? 'Save snapshot'       : '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0441\u043d\u0438\u043c\u043e\u043a';
  if(btnSnap)  btnSnap.textContent  = isEn ? 'Snapshots \u25be'     : '\u0421\u043d\u0438\u043c\u043a\u0438 \u25be';
  if(btnReset) btnReset.textContent = isEn ? '\u21ba Reset'         : '\u21ba \u0421\u0431\u0440\u043e\u0441';
  if(btnPal)   btnPal.textContent   = isEn ? '\ud83c\udfa8 Palette \u25be' : '\ud83c\udfa8 \u041f\u0430\u043b\u0438\u0442\u0440\u0430 \u25be';

  /* word count label */
  var wcWrap = document.getElementById('hsk-word-count');
  if(wcWrap){
    var countVal = document.getElementById('hsk-count-val');
    var n = countVal ? countVal.textContent : '\u2014';
    wcWrap.innerHTML = (isEn ? 'Words: ' : '\u0421\u043b\u043e\u0432: ') + '<b id="hsk-count-val">' + n + '</b>';
  }

  /* phoneme toggle button */
  var phBtn = document.getElementById('btn-phoneme-toggle');
  if(phBtn){
    var phIsHiding = phBtn.textContent.indexOf('\u0421\u043a\u0440') !== -1 || phBtn.textContent.indexOf('Hide') !== -1;
    phBtn.textContent = phIsHiding
      ? (isEn ? 'Hide phonemes' : '\u0421\u043a\u0440\u044b\u0442\u044c \u0444\u043e\u043d\u0435\u043c\u044b')
      : (isEn ? 'Show phonemes' : '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0444\u043e\u043d\u0435\u043c\u044b');
  }

  /* drag handle titles */
  document.querySelectorAll('.drag-handle').forEach(function(b){
    b.title = isEn ? 'Drag row' : '\u041f\u0435\u0440\u0435\u043c\u0435\u0441\u0442\u0438\u0442\u044c \u0441\u0442\u0440\u043e\u043a\u0443';
    b.setAttribute('aria-label', b.title);
  });

  /* font panel */
  var frl = document.getElementById('font-ru-label');
  if(frl) frl.textContent = isEn ? 'English:' : '\u0420\u0443\u0441\u0441\u043a\u0438\u0439:';
  document.querySelectorAll('#font-zh option[value=""], #font-py option[value=""], #font-ru option[value=""]').forEach(function(o){
    o.textContent = isEn ? 'Default' : '\u041f\u043e \u0443\u043c\u043e\u043b\u0447\u0430\u043d\u0438\u044e';
  });

  /* section h2 headings */
  var enH2 = {pos_noun:'Nouns',pos_verb:'Verbs',pos_adj:'Adjectives',pos_adv:'Adverbs',
              pos_mw:'Measure Words',pos_particle:'Particles & Structural Words',
              pos_conj:'Conjunctions',pos_prep:'Prepositions',pos_pron:'Pronouns'};
  var ruH2 = {pos_noun:'\u0421\u0443\u0449\u0435\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435',
              pos_verb:'\u0413\u043b\u0430\u0433\u043e\u043b\u044b',
              pos_adj:'\u041f\u0440\u0438\u043b\u0430\u0433\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435',
              pos_adv:'\u041d\u0430\u0440\u0435\u0447\u0438\u044f',
              pos_mw:'\u0421\u0447\u0451\u0442\u043d\u044b\u0435 \u0441\u043b\u043e\u0432\u0430',
              pos_particle:'\u0427\u0430\u0441\u0442\u0438\u0446\u044b \u0438 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u043d\u044b\u0435 \u0441\u043b\u043e\u0432\u0430',
              pos_conj:'\u0421\u043e\u044e\u0437\u044b',
              pos_prep:'\u041f\u0440\u0435\u0434\u043b\u043e\u0433\u0438',
              pos_pron:'\u041c\u0435\u0441\u0442\u043e\u0438\u043c\u0435\u043d\u0438\u044f'};
  document.querySelectorAll('h2.pos-group').forEach(function(h2){
    var names = isEn ? enH2 : ruH2;
    if(names[h2.id]) h2.childNodes[0].textContent = names[h2.id] + ' ';
  });

  /* phonetic group h3 headers */
  document.querySelectorAll('h3.phonetic-group').forEach(function(h3){
    for(var i=0; i<h3.childNodes.length; i++){
      var n = h3.childNodes[i];
      if(n.nodeType !== 3) continue;
      var t = n.nodeValue;
      if(t.indexOf('\u0424\u043e\u043d\u0435\u0442') > -1 || t.indexOf('Phonetic') > -1){
        n.nodeValue = isEn ? '\u25c6 Phonetic component ' : '\u25c6 \u0424\u043e\u043d\u0435\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 ';
      } else if(t.indexOf('\u041e\u0442\u0434\u0435\u043b\u044c\u043d') > -1 || t.indexOf('Individual') > -1 || t.indexOf('\u0421\u0435\u043c\u0430\u043d\u0442') > -1){
        n.nodeValue = isEn ? '\u25c6 Individual words' : '\u25c6 \u041e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0435 \u0441\u043b\u043e\u0432\u0430';
      }
      break;
    }
  });

  /* table headers in all regular tables */
  var thEnMap = {word:'Word', trans:'Translation', ex:'Example'};
  var thRuMap = {word:'\u0421\u043b\u043e\u0432\u043e', trans:'\u041f\u0435\u0440\u0435\u0432\u043e\u0434', ex:'\u041f\u0440\u0438\u043c\u0435\u0440'};
  document.querySelectorAll('thead th[data-col]').forEach(function(th){
    var dc = th.dataset.col;
    if(thEnMap[dc]) th.textContent = isEn ? thEnMap[dc] : thRuMap[dc];
  });

  /* fam / learned section headings */
  var famH2 = document.querySelector('#fam-section > h2');
  var lrnH2 = document.querySelector('#learned-section > h2');
  if(famH2) famH2.textContent = isEn ? 'Familiar, not yet learned' : '\u0417\u043d\u0430\u043a\u043e\u043c\u044b\u0435, \u043d\u043e \u043d\u0435 \u0432\u044b\u0443\u0447\u0435\u043d\u043d\u044b\u0435';
  if(lrnH2) lrnH2.textContent = isEn ? 'Learned' : '\u0412\u044b\u0443\u0447\u0435\u043d\u043e';

  /* TTS button titles */
  document.querySelectorAll('.tts-btn').forEach(function(btn){
    var inEx = !!(btn.closest && btn.closest('.ex-td'));
    btn.title = inEx ? (isEn ? 'Play example' : '\u041f\u0440\u043e\u0441\u043b\u0443\u0448\u0430\u0442\u044c \u043f\u0440\u0438\u043c\u0435\u0440')
                     : (isEn ? 'Play' : '\u041f\u0440\u043e\u0441\u043b\u0443\u0448\u0430\u0442\u044c');
  });
}

document.addEventListener('DOMContentLoaded', function(){
  setLang(currentLang);
  var btn = document.getElementById('btn-lang-toggle');
  if(btn){
    btn.addEventListener('click', function(){
      setLang(currentLang === 'ru' ? 'en' : 'ru');
    });
  }
});

/* ── Search / filtered-view (EN mode) ─────────────────────────────────────────
   INPUT:  #search-input value; body.lang-en class; all visible tbody rows
   ACTION: in EN mode builds a flat #filtered-view table from matching rows;
           in RU mode uses sr-hide CSS class toggling on the main table
   OUTPUT: #filtered-view innerHTML; sr-hide class on rows; #word-count update
   ────────────────────────────────────────────────────────────────────────────── */
/* ── Search improvements (EN mode + flat filtered view) ──────────────────── */
var searchActive = false;
var filteredView = document.getElementById('filtered-view');

function buildFilteredView(rows, bySect){
  filteredView.innerHTML = '';
  if(!rows.length){ filteredView.style.display='none'; return; }
  var _en = currentLang==='en';

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
       tr.classList.contains('alpha-hide') || tr.classList.contains('sr-hide')) return;
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

/* ── Mark first table in each POS section (to show only one header) ─── */
/* ── Mark first table per POS section ─────────────────────────────────────────
   INPUT:  all h2.pos-group elements and their sibling tables
   ACTION: adds .first-in-section class to the first table after each h2
           so CSS can display the section heading only once
   OUTPUT: .first-in-section class on select tables
   ────────────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('h2.pos-group').forEach(function(h2){
    var el = h2.nextElementSibling;
    while(el && el.tagName !== 'H2'){
      if(el.tagName === 'TABLE'){
        el.classList.add('pos-first-table');
        break;
      }
      if(el.classList && el.classList.contains('grp-wrap')){
        var t = el.querySelector('table');
        if(t){ t.classList.add('pos-first-table'); break; }
      }
      el = el.nextElementSibling;
    }
  });
});

/* ── Merge small phoneme groups (< 3 words) into 其他 Other ──────── */
/* ── Merge small phoneme groups ───────────────────────────────────────────────
   INPUT:  all phonetic-group h3 + their tbody row counts
   ACTION: on DOMContentLoaded, groups with fewer than 3 visible rows are
           folded into a synthetic 'Other / 其他' group heading in the UI
   OUTPUT: DOM h3 text and tbody grouping for small groups
   ────────────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('h2.pos-group').forEach(function(h2){
    // Collect all (h3, table) pairs until next h2
    var groups = [];
    var el = h2.nextElementSibling;
    while(el && el.tagName !== 'H2'){
      if(el.tagName === 'H3' && el.classList.contains('phonetic-group')){
        var tbl = el.nextElementSibling;
        if(tbl && tbl.tagName === 'TABLE'){
          var tb = tbl.querySelector('tbody');
          groups.push({h3: el, table: tbl, tbody: tb, count: tb ? tb.rows.length : 0});
        }
      }
      el = el.nextElementSibling;
    }

    // Find groups with 0 < count < 3 that are not already "Other"
    var small = groups.filter(function(g){
      return g.count > 0 && g.count < 3 &&
             g.h3.textContent.indexOf('其他') === -1 &&
             g.h3.textContent.indexOf('Отдельные') === -1;
    });
    if(small.length === 0) return;

    // Find existing "其他" / "Отдельные" group, or create one
    var otherGroup = groups.find(function(g){
      return g.h3.textContent.indexOf('其他') !== -1 || g.h3.textContent.indexOf('Отдельные') !== -1;
    });
    if(!otherGroup){
      var lastGroup = groups[groups.length - 1];
      var h3New = document.createElement('h3');
      h3New.className = 'phonetic-group';
      h3New.innerHTML = '\u25c6 \u0424\u043e\u043d\u0435\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 <span class="comp">\u5176\u4ed6 Other</span>';
      var tblNew = document.createElement('table');
      var origThead = lastGroup.table.querySelector('thead');
      if(origThead) tblNew.appendChild(origThead.cloneNode(true));
      var tbNew = document.createElement('tbody');
      tbNew.id = 'tb_other_' + h2.id;
      tblNew.appendChild(tbNew);
      var parent = lastGroup.table.parentNode;
      var insertRef = lastGroup.table.nextSibling;
      parent.insertBefore(h3New, insertRef);
      parent.insertBefore(tblNew, insertRef);
      otherGroup = {h3: h3New, table: tblNew, tbody: tbNew};
    }

    // Move rows from small groups into Other, remove their h3+table
    small.forEach(function(g){
      while(g.tbody && g.tbody.firstChild){
        otherGroup.tbody.appendChild(g.tbody.firstChild);
      }
      if(g.h3.parentNode) g.h3.parentNode.removeChild(g.h3);
      if(g.table.parentNode) g.table.parentNode.removeChild(g.table);
    });
  });
});

/* ── Show/Hide phoneme group headers ───────────────────────────── */
/* ── Phoneme group header toggle ──────────────────────────────────────────────
   INPUT:  localStorage ph_hidden; click on #btn-ph-toggle
   ACTION: toggles body.ph-hidden class which CSS uses to hide h3 headings;
           persists state to localStorage
   OUTPUT: body.ph-hidden class; localStorage ph_hidden
   ────────────────────────────────────────────────────────────────────────────── */
(function(){
  var btn = document.getElementById('btn-phoneme-toggle');
  if(!btn) return;
  var hidden = localStorage.getItem('ph_hidden') !== '0';
  var mergeData = null; // saved structure for restoration

  /* Apply initial state after full DOM is ready */
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('h3.phonetic-group').forEach(function(h3){
      h3.style.display = hidden ? 'none' : '';
    });
    var isEn = document.body.classList.contains('lang-en');
    btn.textContent = hidden
      ? (isEn ? 'Show phonemes' : 'Показать фонемы')
      : (isEn ? 'Hide phonemes' : 'Скрыть фонемы');
    if(hidden){ mergeGroups(); }
  });

  function mergeGroups(){
    mergeData = [];
    document.querySelectorAll('h2.pos-group').forEach(function(h2){
      // Collect all grp-wraps in this POS section (until next h2)
      var wraps = [];
      var el = h2.nextElementSibling;
      while(el && el.tagName !== 'H2'){
        if(el.classList && el.classList.contains('grp-wrap')) wraps.push(el);
        el = el.nextElementSibling;
      }
      if(wraps.length < 2) return;

      var masterTbl = wraps[0].querySelector('table');
      var moves = [];
      for(var i = 1; i < wraps.length; i++){
        var tb = wraps[i].querySelector('tbody');
        if(tb){
          moves.push({ tbody: tb, wrap: wraps[i] });
          masterTbl.appendChild(tb); // move tbody into master table
        }
        wraps[i].style.display = 'none'; // hide the now-empty wrapper
      }
      if(moves.length) mergeData.push({ masterTbl: masterTbl, moves: moves });
    });
  }

  function unmergeGroups(){
    if(!mergeData) return;
    mergeData.forEach(function(g){
      g.moves.forEach(function(m){
        var tbl = m.wrap.querySelector('table');
        if(tbl) tbl.appendChild(m.tbody); // move tbody back to its original table
        m.wrap.style.display = ''; // restore wrapper (CSS grp-col handles collapse state)
      });
    });
    mergeData = null;
  }

  btn.addEventListener('click', function(){
    hidden = !hidden;
    // Hide/show h3 phoneme headers
    document.querySelectorAll('h3.phonetic-group').forEach(function(h3){
      h3.style.display = hidden ? 'none' : '';
    });
    if(hidden){ mergeGroups(); }
    else       { unmergeGroups(); }

    var isEn = document.body.classList.contains('lang-en');
    btn.textContent = hidden
      ? (isEn ? 'Show phonemes' : 'Показать фонемы')
      : (isEn ? 'Hide phonemes' : 'Скрыть фонемы');
    localStorage.setItem('ph_hidden', hidden ? '1' : '0');
    renumVisible();
  });
})();

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
  var useFlat = currentSort !== 'default' || !bySection || !!q || forceFlat;

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
    updateDragState();
    return;
  }

  document.body.classList.add('flat-view');
  searchActive = !!q;
  document.body.classList.toggle('searching', searchActive);
  updateDragState();

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
  if(currentSort !== 'default'){
    if(currentSort === 'hsk-asc' || currentSort === 'hsk-desc'){
      matched = sortRowsByHsk(matched, currentSort === 'hsk-desc');
    }else{
      var keyAttr = {pinyin:'data-py', radical:'data-radical-py', component:'data-component-py'}[currentSort];
      if(keyAttr) matched = sortRows(matched, keyAttr);
    }
  }

  matched.forEach(function(tr){ tr.classList.remove('sr-hide'); });
  allRows.filter(function(tr){ return matched.indexOf(tr)===-1; })
         .forEach(function(tr){ tr.classList.add('sr-hide'); });

  buildFilteredView(matched, bySection);
  updateWordCount(matched.length);
  updateEmptyGroups();
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
      renum(tb);
    });
    rebuildView();
    return;
  }

  // Sort within each section's tbody (NEVER move rows between tbodies –
  // bySection=false flat view is handled by rebuildView/filteredView).
  if(mode === 'hsk-asc' || mode === 'hsk-desc'){
    getTbodiesForSort().forEach(function(tb){
      var rows = Array.prototype.slice.call(tb.rows);
      var sorted = sortRowsByHsk(rows, mode === 'hsk-desc');
      sorted.forEach(function(tr){ tb.appendChild(tr); });
      renum(tb);
    });
    rebuildView();
    return;
  }
  var keyAttr = {pinyin:'data-py', radical:'data-radical-py', component:'data-component-py'}[mode];
  if(!keyAttr) return;

  getTbodiesForSort().forEach(function(tb){
    var rows = Array.prototype.slice.call(tb.rows);
    var sorted = sortRows(rows, keyAttr);
    sorted.forEach(function(tr){ tb.appendChild(tr); });
    renum(tb);
  });

  rebuildView();
}

function renum(tb){ for(var i=0;i<tb.rows.length;i++){ var c=tb.rows[i].querySelector('.rownum'); if(c) c.textContent=i+1; } }

function updateDragState(){
  // Disable/enable sortable drag based on search/sort state
  if(typeof window._cdxSortables !== 'undefined'){
    var disable = searchActive || currentSort !== 'default';
    window._cdxSortables.forEach(function(s){ if(s) try{ s.option('disabled', disable); }catch(e){} });
  }
}

document.addEventListener('DOMContentLoaded', function(){
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
    else rebuildView();
  });
});

/* ── Drag integration — patch existing SortableJS init ──────────────────── */
/* ── Drag integration ─────────────────────────────────────────────────────────
   INPUT:  window._cdxSortables array; currentSort and searchActive state
   ACTION: disables all Sortable instances when search is active or sort != default
   OUTPUT: Sortable.option('disabled') toggled on all instances
   ────────────────────────────────────────────────────────────────────────────── */
// Override the existing SortableJS init to store references and use new options
document.addEventListener('DOMContentLoaded', function(){
  window._cdxSortables = [];
  // Existing code already created Sortable instances; we create new ones tracking state
  // We patch by listening for sortable events
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
        localStorage.setItem('hsk_row_order', JSON.stringify(order));
        renumVisible(); updateWordCount(getVisibleRowCount());
      }
    });
    window._cdxSortables.push(s);
  });
  updateDragState();
}, 800);

/* Expose internals needed by js/storage.js, js/quiz.js (set after all functions defined) */
window._hsk = window._hsk || {};
window._hsk.getLang       = function(){ return currentLang; };
window._hsk.renum         = renum;
window._hsk.confirm       = cdxConfirm;
window._hsk.getTtsVolume  = function(){ return ttsVolume; };

})();


/* ── Back to top ──────────────────────────────────────────────── */
/* ── Back to top ──────────────────────────────────────────────────────────────
   INPUT:  window scroll events
   ACTION: adds/removes .visible on #back-to-top when scrollY > 500;
           click scrolls to top smoothly
   OUTPUT: button visibility; window scroll position
   ────────────────────────────────────────────────────────────────────────────── */
(function(){
  var btn = document.getElementById('back-to-top');
  if(!btn) return;
  window.addEventListener('scroll', function(){
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  btn.addEventListener('click', function(){
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ── Mobile hamburger ────────────────────────────────────────── */
/* ── Mobile hamburger ─────────────────────────────────────────────────────────
   INPUT:  click on #hamburger-btn; input on #mobile-search-input
   ACTION: toggles toolbar.mobile-open + overlay visibility;
           syncs mobile search input bidirectionally with #search-input
   OUTPUT: DOM class toggle; search-input.value mirrored
   ────────────────────────────────────────────────────────────────────────────── */
(function(){
  var hbBtn = document.getElementById('hamburger-btn');
  var toolbar = document.getElementById('toolbar');
  var overlay = document.getElementById('mobile-overlay');
  var mSearch = document.getElementById('mobile-search-input');
  var mainSearch = document.getElementById('search-input');
  if(!hbBtn || !toolbar) return;

  hbBtn.addEventListener('click', function(){
    var open = toolbar.classList.toggle('mobile-open');
    if(overlay) overlay.style.display = open ? 'block' : 'none';
  });

/* ── window._hsk bridge ──────────────────────────────────────────────────────
   INPUT:  ttsVolume (IIFE 1 var), renum(), cdxConfirm(), currentLang (IIFE 2 vars)
   ACTION: exposes four internals as properties of window._hsk so extracted
           files (storage.js, quiz.js) can call them without accessing the IIFE scope
   OUTPUT: window._hsk.getLang / .renum / .confirm / .getTtsVolume
   ────────────────────────────────────────────────────────────────────────────── */
  if(mSearch && mainSearch){
    mSearch.addEventListener('input', function(){
      mainSearch.value = this.value;
      mainSearch.dispatchEvent(new Event('input'));
    });
    mainSearch.addEventListener('input', function(){
      if(mSearch.value !== this.value) mSearch.value = this.value;
    });
  }
})();

