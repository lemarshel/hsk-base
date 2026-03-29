/* ==========================================================================
   js/tts.js — Text-to-Speech engine

   OWNS (registers to window._hsk):
     getTtsVolume, stopAllAudio

   CONSUMES (reads from window._hsk): nothing

   INPUT:  #vol-range, #speed-sel, window.speechSynthesis; all .wordcell and .ex-zh cells
   ACTION: voice selection (zh-CN), chunked playback with Google TTS fallback; injects ▶ buttons into word and example cells; restores speed/volume prefs
   OUTPUT: audio playback; .tts-btn DOM elements; localStorage hsk-volume/hsk-speed
   ========================================================================== */
(function(){
"use strict";

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
var ttsVolume=parseFloat(localStorage.getItem(window.HSK_LS.V));
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
  if(save) localStorage.setItem(window.HSK_LS.V, String(ttsVolume));
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
    var done = false;
    function advance(){ if(!done){ done=true; idx++; next(); } }
    a.onended = advance;
    a.onerror = advance;
    var p = a.play();
    if(p && p.catch) p.catch(advance);
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

/* Restore speed pref */
/* ── Speed and volume preferences ─────────────────────────────────────────────
   INPUT:  localStorage hsk-speed, hsk-volume; #speed-sel, #vol-range elements
   ACTION: restores saved TTS speed and volume sliders on load;
           persists changes on user interaction
   OUTPUT: speedSel.value; ttsVolume; localStorage hsk-speed, hsk-volume
   ────────────────────────────────────────────────────────────────────────────── */
var speedSel=document.getElementById('speed-sel');
var savedSpeed=localStorage.getItem(window.HSK_LS.S);
if(savedSpeed&&speedSel){speedSel.value=savedSpeed;}
speedSel&&speedSel.addEventListener('change',function(){localStorage.setItem(window.HSK_LS.S,this.value);});

/* Restore volume pref */
var volRange=document.getElementById('vol-range');
var savedVol=localStorage.getItem(window.HSK_LS.V);
if(volRange){
  if(savedVol!==null){ setTtsVolume(parseFloat(savedVol), false); }
  else { setTtsVolume(ttsVolume, false); }
  volRange.addEventListener('input', function(){
    setTtsVolume(parseFloat(this.value)/100, true);
  });
}


/* ── Register TTS internals via shared API ── */
window._hsk._register('tts', {
  getTtsVolume: function() { return ttsVolume; },
  stopAllAudio: stopAllAudio
});
})();
