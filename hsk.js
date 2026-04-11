(function(){
/* ==========================================================================
   HSK Base — Application logic
   - Reads the embedded vocabulary table
   - Handles search, filters, audio, study, quiz, exports
   - Keeps UI state in localStorage
   ========================================================================== */
"use strict";
var LS={L:'hsk_learned',F:'hsk_fam',M:'hsk_mode',P:'hsk_prefs'};
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

function renum(tb){for(var i=0;i<tb.rows.length;i++){var c=tb.rows[i].querySelector('.rownum');if(c)c.textContent=i+1;}}
function updVis(){
  lS.style.display=lT.rows.length?'block':'none';
  fS.style.display=fT.rows.length?'block':'none';
  document.getElementById('st-lrn').textContent=lT.rows.length;
  document.getElementById('st-fam').textContent=fT.rows.length;
}
/* ===== Persist learned/familiar state ===== */
function save(){
  var l=[],f=[];
  for(var i=0;i<lT.rows.length;i++){var z=lT.rows[i].querySelector('.zh');if(z)l.push(z.textContent.trim());}
  for(var i=0;i<fT.rows.length;i++){var z=fT.rows[i].querySelector('.zh');if(z)f.push(z.textContent.trim());}
  localStorage.setItem(LS.L,JSON.stringify(l));localStorage.setItem(LS.F,JSON.stringify(f));
  if(typeof updateHSKStats==='function') updateHSKStats();
}

/* ===== Restore state from localStorage ===== */
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
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    if(document.body){ document.body.classList.remove('preload'); }
    document.documentElement.classList.remove('preload');
    var pf = document.getElementById('preload-font');
    if(pf && pf.parentNode) pf.parentNode.removeChild(pf);
  }, 0);
});

/* ===== Checkbox delegation (learned/familiar) ===== */
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
  var colors = {1:'#27ae60',2:'#2ecc71',3:'#f39c12',4:'#e67e22',5:'#e74c3c',6:'#8e44ad'};
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
document.getElementById('search-lang').addEventListener('change',doSearch);
document.getElementById('search-clear').addEventListener('click',function(){document.getElementById('search-input').value='';doSearch();});

/* keyboard shortcuts */
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
function setMode(m){
  document.body.className=document.body.className.replace(/\b(light|dark|sepia)\b/g,'').trim();
  if(m!=='light')document.body.classList.add(m);
  document.querySelectorAll('.mode-btn').forEach(function(b){b.classList.toggle('active',b.dataset.mode===m);});
  localStorage.setItem(LS.M,m);
}
document.querySelectorAll('.mode-btn').forEach(function(b){b.addEventListener('click',function(){setMode(this.dataset.mode);});});
setMode(localStorage.getItem(LS.M)||'light');

/* font controls */
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
function speakZh(text){
  var txt = String(text||'').replace(/\s+/g,' ').trim();
  if(!txt) return;
  var spd = parseFloat((document.getElementById('speed-sel')||{}).value||'1');
  stopAllAudio();
  if(typeof speechSynthesis==='undefined'){
    playFallbackTTS(txt);
    return;
  }
  try{ speechSynthesis.resume(); }catch(e){}
  ensureVoices(function(){
    var u=new SpeechSynthesisUtterance(txt);u.lang='zh-CN';u.rate=spd||1;u.volume=ttsVolume;
    if(zhVoice)u.voice=zhVoice;
    var started=false, finished=false;
    u.onstart=function(){ started=true; };
    u.onend=function(){ finished=true; };
    u.onerror=function(){
      if(finished) return;
      finished=true;
      try{ speechSynthesis.cancel(); }catch(e){}
      playFallbackTTS(txt);
    };
    setTimeout(function(){
      if(finished) return;
      if(!started){
        try{ speechSynthesis.cancel(); }catch(e){}
        playFallbackTTS(txt);
      }
    }, 1200);
    setTimeout(function(){ speechSynthesis.speak(u); }, 0);
  });
}
document.body.addEventListener('click',function(e){
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
document.body.addEventListener('click',function(e){
  var edit = e.target.closest('[data-edit-word], .edit-word, .edit-btn');
  if(!edit) return;
  var tr = edit.closest('tr');
  if(!tr) return;
  var zh = tr.querySelector('.zh');
  if(zh) speakZh(zh.textContent);
});
/* inject TTS into wordcells */
document.querySelectorAll('.wordcell').forEach(function(cell){
  var zh=cell.querySelector('.zh');if(!zh)return;
  var txt=zh.textContent.trim();
  var inner=document.createElement('div');inner.className='wc-inner';
  while(cell.firstChild)inner.appendChild(cell.firstChild);
  var btn=document.createElement('button');btn.className='tts-btn';btn.title='Прослушать';btn.textContent='\u25b6';btn.dataset.t=txt;
  cell.appendChild(btn);cell.appendChild(inner);
});
/* inject TTS into example cells */
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

/* HanziWriter — wrap CJK chars in wordcell zh (after TTS injection) */
var hzPop=document.getElementById('hz-popup'),hzTimer=null;
document.querySelectorAll('.wc-inner .zh').forEach(function(div){
  var frag=document.createDocumentFragment(),txt=div.textContent;
  div.textContent='';
  for(var i=0;i<txt.length;i++){
    var ch=txt[i];
    if(/[\u4e00-\u9fff\u3400-\u4dbf\u2e80-\u2eff]/.test(ch)){
      var sp=document.createElement('span');sp.className='hz-char';sp.dataset.ch=ch;sp.textContent=ch;frag.appendChild(sp);
    }else{frag.appendChild(document.createTextNode(ch));}
  }
  div.appendChild(frag);
});
document.body.addEventListener('click',function(e){
  if(!e.target.classList.contains('hz-char'))return;
  e.stopPropagation();
  clearTimeout(hzTimer);
  showHz(e.target);
});
document.addEventListener('click',function(e){
  if(hzPop.style.display!=='none'&&!hzPop.contains(e.target)){
    hzPop.style.display='none';
    var oldArea=document.getElementById('hz-practice-area');if(oldArea)oldArea.parentNode.removeChild(oldArea);
    if(_hzPracticeWriter){try{_hzPracticeWriter.cancelQuiz();}catch(ex){}_hzPracticeWriter=null;}
  }
});
function showHz(el){
  if(typeof HanziWriter==='undefined')return;
  var ch=el.dataset.ch;if(!ch)return;
  var r=el.getBoundingClientRect();
  /* clear previous content but keep the practice button */
  var practBtn=document.getElementById('hz-practice-btn');
  Array.from(hzPop.childNodes).forEach(function(n){if(n!==practBtn)n.parentNode.removeChild(n);});
  hzPop.setAttribute('data-char',ch);
  _hzPracticeChar=ch;
  /* reset practice area when char changes */
  var oldArea=document.getElementById('hz-practice-area');if(oldArea)oldArea.parentNode.removeChild(oldArea);
  if(_hzPracticeWriter){try{_hzPracticeWriter.cancelQuiz();}catch(e){}_hzPracticeWriter=null;}
  hzPop.style.display='block';
  if(practBtn){practBtn.style.display='inline-block';}
  var left=r.right+10;if(left+185>window.innerWidth)left=r.left-195;
  var top=r.top-20;if(top+200>window.innerHeight)top=window.innerHeight-210;if(top<4)top=4;
  hzPop.style.left=Math.max(4,left)+'px';hzPop.style.top=top+'px';
  /* create a dedicated svg container so the practice button is not overwritten */
  var svgWrap=document.createElement('div');svgWrap.id='hz-anim-canvas';svgWrap.style.cssText='padding-top:4px';hzPop.insertBefore(svgWrap,practBtn);
  try{
    HanziWriter.create(svgWrap,ch,{width:165,height:165,padding:12,showOutline:true,
      strokeColor:'#e94560',outlineColor:'#ddd',strokeAnimationSpeed:1.2,
      delayBetweenStrokes:250,renderer:'svg'}).animateCharacter();
  }catch(err){svgWrap.innerHTML='<div style="padding:12px;color:#999;font-size:.8em">'+(document.body.classList.contains('lang-en')?'No data: ':'Нет данных: ')+ch+'</div>';}
}

/* ── HanziWriter practice mode ──────────────────────────────── */
var _hzPracticeChar = '';
var _hzPracticeWriter = null;

document.getElementById('hz-practice-btn') && document.getElementById('hz-practice-btn').addEventListener('click', function(){
  var popup = document.getElementById('hz-popup');
  var char = popup.getAttribute('data-char') || _hzPracticeChar;
  if(!char) return;

  // Create practice container inside popup
  var practiceDiv = document.getElementById('hz-practice-area');
  if(!practiceDiv){
    practiceDiv = document.createElement('div');
    practiceDiv.id = 'hz-practice-area';
    practiceDiv.style.cssText = 'margin-top:12px;text-align:center';
    popup.appendChild(practiceDiv);
  }
  practiceDiv.innerHTML = '<div id="hz-practice-canvas" style="display:inline-block;border:2px solid #e94560;border-radius:4px"></div><div id="hz-practice-msg" style="margin-top:8px;font-size:.9em;color:#666">Пишите иероглиф по штрихам</div><button id="hz-practice-retry" style="margin-top:8px;padding:4px 12px;cursor:pointer">&#8635; Повторить</button>';

  if(_hzPracticeWriter) try{ _hzPracticeWriter.cancelQuiz(); }catch(e){}

  _hzPracticeWriter = HanziWriter.create('hz-practice-canvas', char, {
    width: 200, height: 200, padding: 10,
    showOutline: true,
    showCharacter: false,
    strokeColor: '#e94560',
    outlineColor: '#ddd',
    drawingColor: '#1a1a2e',
    drawingWidth: 4,
    showHintAfterMisses: 3,
    highlightOnComplete: true
  });
  _hzPracticeWriter.quiz({
    onMistake: function(strokeData){
      var msg = document.getElementById('hz-practice-msg');
      if(msg) msg.textContent = 'Штрих '+(strokeData.strokeNum+1)+': попробуйте снова (ошибок: ' + strokeData.mistakesOnStroke + ')';
    },
    onCorrectStroke: function(strokeData){
      var msg = document.getElementById('hz-practice-msg');
      if(msg) msg.textContent = 'Штрих '+(strokeData.strokeNum+1)+' верно! (осталось: ' + strokeData.strokesRemaining + ')';
    },
    onComplete: function(summaryData){
      var msg = document.getElementById('hz-practice-msg');
      if(msg) msg.textContent = '\u2713 Complete! Mistakes: ' + summaryData.totalMistakes;
    }
  });

  document.getElementById('hz-practice-retry') && document.getElementById('hz-practice-retry').addEventListener('click', function(){
    if(_hzPracticeWriter) _hzPracticeWriter.quiz({
      onMistake: function(strokeData){
        var msg = document.getElementById('hz-practice-msg');
        if(msg) msg.textContent = 'Штрих '+(strokeData.strokeNum+1)+': попробуйте снова (ошибок: ' + strokeData.mistakesOnStroke + ')';
      },
      onCorrectStroke: function(strokeData){
        var msg = document.getElementById('hz-practice-msg');
        if(msg) msg.textContent = 'Штрих '+(strokeData.strokeNum+1)+' верно! (осталось: ' + strokeData.strokesRemaining + ')';
      },
      onComplete: function(summaryData){
        var msg = document.getElementById('hz-practice-msg');
        if(msg) msg.textContent = '\u2713 Complete! Mistakes: ' + summaryData.totalMistakes;
      }
    });
  });
});

/* Group collapse */
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
/* Toolbar col-btn right-clicks */
document.querySelectorAll('.col-btn').forEach(function(btn){
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
var _origOrder = window._cdxOrigOrder || {};

/* ── EN_DICT ──────────────────────────────────────────────────────────────── */
window.EN_DICT = {
"一":"one","一下儿":"erhua form of 一下[yi1 xia4]","一下子":"in a short while; all at once","一再":"repeatedly",
"一切":"everything; every","一口气":"one breath; in one breath","一句话":"in a word; in short","一向":"a period of time in the recent past; (indicating a period of time up to the present) all along; the whole time",
"一定":"certainly; definitely; must","一带":"region; area","一律":"same; identical; uniformly; all; without exception","一方面":"on the one hand",
"一旦":"in case (sth happens); if","一流":"top quality; front ranking","一生":"all one's life; throughout one's life","一直":"straight (in a straight line); continuously; always; all the way through",
"一致":"consistent; unanimous; in agreement; together; in unison","一般":"general; ordinary; usually","一般来说":"generally speaking","一路":"the whole journey; all the way",
"一身":"whole body; from head to toe","一辈子":"(for) a lifetime","一部分":"portion; part of","七":"seven",
"万":"ten thousand","万一":"just in case; if by any chance","丈夫":"husband","三":"three",
"上":"up; above; on","上下":"the top and bottom of sth; the full vertical extent of sth; from top to bottom","上升":"to rise; to go up","上午":"morning",
"上来":"come up","上涨":"to rise; to go up","上级":"higher authorities; superiors","上衣":"jacket; upper outer garment",
"上门":"to drop in; to visit","下":"down; below; under","下午":"afternoon","下午好":"good afternoon",
"下来":"come down","下载":"to download","下降":"to decline; to drop","下雪":"to snow",
"不":"no; not","不一定":"not necessarily; maybe","不久":"not long (after); before too long","不仅":"not only",
"不停":"incessant","不光":"not the only one; not only","不免":"inevitably","不利":"unfavorable; disadvantageous",
"不同":"different; unlike; varying","不同意":"disagree","不在乎":"not to care","不够":"not enough; insufficient",
"不好意思":"to feel embarrassed; to find it embarrassing","不如":"not equal to; not as good as; inferior to; it would be better to","不安":"unpeaceful; unstable","不客气":"you're welcome",
"不幸":"misfortune; adversity","不得不":"have no choice or option but to; cannot but","不得了":"desperately serious; disastrous","不必":"need not; does not have to",
"不敢当":"lit. I dare not (accept the honor); fig. I don't deserve your praise; you flatter me","不断":"unceasing; uninterrupted","不时":"from time to time; now and then","不易":"not easy to do sth; difficult",
"不曾":"hasn't yet; hasn't ever","不止":"incessantly; without end","不满":"dissatisfied; discontented; resentful; (before a number) to be less than","不然":"not so; no",
"不管":"no matter; regardless","不耐烦":"impatient; to lose patience","不能不":"have to; cannot but","不良":"bad; harmful; unhealthy; (of a device, connection, material etc) defective; faulty",
"不行":"won't do; be out of the question","不要":"don't!; must not","不要紧":"unimportant; not serious","不许":"not to allow; must not",
"不论":"whatever; no matter what (who, how etc)","不足":"insufficient; lacking","不过":"but; however; only; merely","不错":"correct; right",
"不顾":"in spite of; regardless of","丑":"surname Chou","专业":"specialty; specialized field","专利":"patent; sth uniquely enjoyed (or possessed etc) by a certain group of people",
"专家":"expert; specialist","专心":"to focus one's attention; to concentrate on (doing sth)","专辑":"album; record (music)","专门":"specialized; dedicated (to a particular field or purpose); specially; specifically (for a particular purpose)",
"专题":"specific topic (addressed by a book, lecture, TV program etc); article, report or program etc on a specific topic","世界":"world","世界杯":"World Cup","世纪":"century",
"业余":"in one's spare time; outside working hours","业务":"business; professional work","东北":"Northeast China; Manchuria","东南":"southeast",
"东方":"the East; the Orient; two-character surname Dongfang","东部":"the east; eastern part","丢":"to lose; to put aside","两岸":"bilateral; both shores",
"两边":"either side; both sides","严":"surname Yan","严厉":"severe; strict","严格":"strict; stringent; tight; rigorous",
"严肃":"(of an atmosphere etc) solemn; grave; serious; (of a manner etc) earnest; severe; exacting","严重":"grave; serious; severe; critical","个人":"individual; personal","个体":"individual",
"个儿":"size; height","个别":"individual; exceptional","个子":"height; stature","个性":"personality; individuality",
"中":"middle; center","中介":"to act as intermediary; to link","中医":"traditional Chinese medical science; a doctor trained in Chinese medicine","中午":"noon; midday",
"中华民族":"the Chinese nation; the Chinese people (collective reference to all the ethnic groups in China)","中国":"China","中央":"central; middle","中奖":"to win a prize (in a lottery etc)",
"中学":"middle school","中小学":"middle and elementary school","中年":"middle age","中心":"center; core",
"中文":"Chinese language","中断":"to cut short; to break off","中毒":"to be poisoned","中秋":"Mid-Autumn Festival",
"中秋节":"the Mid-Autumn Festival on 15th of 8th lunar month","中级":"intermediate level","中药":"traditional Chinese medicine","中部":"middle part; central section; central region",
"中间":"middle; between","中餐":"lunch; Chinese meal; Chinese food","丰富":"rich; enrich; abundant","丰收":"to reap a bumper harvest",
"临时":"as the time draws near; at the last moment","为":"as (in the capacity of); to take sth as","为主":"to rely mainly on; to attach most importance to","为了":"in order to; for the sake of",
"为什么":"why","为期":"(to be done) by (a certain date); lasting (a certain time)","为止":"until; (used in combination with words like 到[dao4] or 至[zhi4] in constructs of the form 到...為止|到...为止)","为难":"to feel embarrassed or awkward; to make things difficult (for someone)",
"主人":"master; host","主任":"director; head","主体":"main part; bulk","主办":"to organize; to host (a conference or sports event)",
"主动":"to take the initiative; to do sth of one's own accord","主导":"leading; dominant","主席":"chairperson; premier","主张":"to advocate; to stand for",
"主意":"plan; idea","主持":"to take charge of; to manage or direct","主管":"in charge; responsible for","主要":"main; major; primary",
"主观":"subjective","主题":"theme; subject","举":"to lift; to hold up","举办":"to conduct; to hold (an event)",
"举动":"act; action","举手":"to raise a hand; to put up one's hand (as signal)","举行":"to hold (a meeting, ceremony etc)","久":"(of a period of time) long",
"义务":"obligation; duty","之一":"one of (sth); one out of a multitude","之下":"under; beneath","之中":"inside; among",
"之内":"inside; within","之外":"outside; excluding","乐":"surname Le","乐观":"optimistic; hopeful",
"乐趣":"delight; pleasure; joy","乐队":"band; pop group","乘":"surname Cheng","乘坐":"to take (a ship, plane etc); to ride (in a train or other vehicle)",
"乘客":"passenger","乘车":"to ride (in a car or carriage); to drive","乙":"second of the ten Heavenly Stems 十天干[shi2 tian1 gan1]; second in order","九":"nine",
"也":"also; too","也许":"perhaps; maybe","习惯":"habit; custom","乡":"country or countryside; native place",
"乡村":"rustic; village","书":"book","书架":"bookshelf","书柜":"bookcase",
"书桌":"desk","书法":"calligraphy; handwriting","买":"buy; purchase","买卖":"to buy and sell",
"乱":"in confusion or disorder; in a confused state of mind","了":"(particle)","了不起":"amazing; terrific","了解":"understand; know; learn about",
"争":"to strive for; to vie for","争取":"to fight for; to strive for","争议":"controversy; dispute","争论":"argue; dispute; debate",
"事业":"undertaking; project","事先":"in advance; before the event","事故":"accident","事物":"thing; object",
"二":"two","二手":"indirectly acquired; second-hand (information, equipment etc)","二维码":"2D barcode; matrix code; (esp.) QR code","于是":"thereupon; as a result; consequently; thus; hence",
"亏":"to lose (money); to have a deficit; to be deficient","云":"cloud","互联网":"Internet","五":"five",
"五颜六色":"multicolored; every color under the sun","亚军":"second place (in a sports contest); runner-up","亚运会":"Asian Games","些":"classifier indicating a small amount or small number greater than 1: some, a few, several",
"交":"to hand over; to deliver; to pay (money); to turn over; to make friends","交代":"to transfer (duties to sb else); to give instructions; to tell (sb to do sth)","交往":"to associate (with); to have contact (with)","交换":"to exchange; to swap",
"交易":"to deal; to trade; to transact; transaction; deal","交朋友":"to make friends; (dialect) to start an affair with sb","交流":"exchange; communicate; interact","交给":"to give; to deliver; to hand over",
"交警":"traffic police (abbr. for 交通警察[jiao1 tong1 jing3 cha2])","交费":"to pay a fee","交通":"to be connected; traffic","交际":"communication; social intercourse",
"产业":"industry; estate","产品":"product","产生":"to arise; to come into being; to come about; to give rise to; to bring into being; to bring about; to produce; to engender; to generate","享受":"to enjoy; to live it up",
"京剧":"Beijing opera","亮":"bright; light; to shine; to flash","亲":"parent; one's own (flesh and blood)","亲人":"one's close relatives",
"亲切":"amiable; cordial","亲密":"intimate; close","亲爱":"dear; beloved","亲自":"personally; in person",
"人":"person; people","人事":"personnel affairs","人们":"people","人力":"manpower; labor",
"人口":"population","人员":"personnel; staff","人士":"person; figure","人家":"household; dwelling",
"人工":"artificial; manual","人才":"talent; gifted person","人数":"number of people","人权":"human rights",
"人格":"personality; character","人民":"people; the public","人民币":"Renminbi, the official currency of the PRC (currency codes: RMB or CNY)","人物":"person; character; figure",
"人生":"life; human life","人类":"humanity; mankind","人群":"crowd","人间":"the human world; the earth",
"人际":"interpersonal","亿":"hundred million","什么":"what","什么事":"what matter; what happened",
"什么样":"what kind?; what sort?","仅":"barely; only","仅仅":"barely; only","今天":"today",
"今日":"today","介绍":"introduce; introduction","仍":"still; yet; to remain","仍旧":"still (remaining); to remain (the same)",
"仍然":"still; as before; yet","从中":"from within; therefrom","从事":"to go for; to engage in","从前":"previously; formerly",
"从小":"from childhood; from a young age","从而":"thus; thereby","他":"he; him","他们":"they; them",
"付":"surname Fu","付出":"to pay; to expend; to invest (energy or time)","代":"to be a substitute for; to act on behalf of; to replace; to substitute; generation; dynasty; age; period; (historical) era; (geological) eon","代价":"price; cost",
"代替":"to replace; to take the place of","代理":"to act on behalf of sb in a responsible position; to act as an agent or proxy","代表":"representative; delegate","代表团":"delegation",
"令":"used in 脊令[ji2 ling2]; used in 令狐[Ling2 hu2] (Taiwan pr. [ling4])","以上":"above; more than","以下":"below; under","以为":"think; believe",
"以便":"in order to","以内":"within; less than","以前":"before; formerly","以及":"and; as well as",
"以后":"after; later","以外":"beyond; except","以往":"in the past; formerly","以来":"since; ever since",
"件":"item; component","价":"(literary) messenger; servant","价值":"value; worth; (ethical, cultural etc) values","价格":"price; cost",
"价钱":"price","任":"surname Ren","任何":"any; whatever","任务":"task; mission; assignment",
"任意":"arbitrary; random","份":"classifier for gifts, newspaper, magazine, papers, reports, contracts etc","企业":"company; firm; enterprise; corporation","休假":"to go on vacation; to have a holiday; to take leave",
"休闲":"leisure; relaxation","众多":"numerous","优先":"to have priority; to take precedence","优势":"superiority; dominance",
"优化":"optimize; optimization","优惠":"privilege; favorable (terms)","优点":"advantage; strong point; merit","优秀":"outstanding; excellent",
"优美":"graceful; fine","优良":"fine; good","伙":"meals (abbr. for 伙食[huo3 shi2])","伙伴":"partner; companion",
"会员":"member","会计":"accountant; accountancy","会议":"meeting; conference","会谈":"talks; discussions",
"伞":"umbrella; parasol","伟大":"huge; great; grand; worthy of the greatest admiration; important (contribution etc)","传":"to pass on; to spread","传播":"to disseminate; to propagate; to spread",
"传来":"(of a sound) to come through; to be heard","传真":"to fax; a fax","传统":"traditional; tradition","传说":"legend; folklore",
"传达":"convey; communicate","传递":"to transmit; to pass on to sb else; (math.) transitive","伤":"to injure; injury","伤害":"to injure; to harm",
"伤心":"sad; grieved; broken-hearted","估计":"to estimate; to assess; to calculate; (coll.) to reckon; to think (that ...)","伸":"to stretch; to extend","似乎":"it seems; seemingly; as if",
"似的":"seems as if; rather like","但":"but; yet; however; still; merely; only; just","但是":"but; however; yet","位":"position; location",
"位于":"to be located at; to be situated at","位置":"position; location","低":"low; short","低于":"to be lower than",
"住房":"housing","住院":"to stay in hospital; to be hospitalized","体会":"to know from experience; to learn through experience","体力":"physical strength; physical power",
"体操":"gymnastic; gymnastics","体检":"abbr. for 體格檢查|体格检查[ti3 ge2 jian3 cha2]","体现":"to embody; to reflect","体积":"volume (amount of space an object occupies)",
"体育":"physical education; sports","体育场":"stadium","体育馆":"gym; gymnasium","体重":"body weight",
"体验":"experience; feel","作业":"homework; assignment","作为":"one's conduct; deed","作出":"to put out; to come up with",
"作品":"work (of art); opus","作家":"writer; author","作文":"to write an essay; composition (student essay)","作用":"function; role; effect",
"作者":"author; writer","你":"you","你们":"you (plural)","你好":"hello; hi",
"使":"to make; to cause","使劲":"to exert all one's strength","使得":"usable; serviceable; feasible; workable; doable","使用":"use; employ; apply",
"例外":"exception; to be an exception","例如":"for example; for instance; such as","例子":"case; (for) instance","供应":"to supply; to provide (goods, services etc)",
"依据":"according to; basis","依旧":"as before; still; to remain the same","依法":"legal (proceedings); according to law","依然":"still; as before",
"依照":"according to; in light of","依靠":"to rely on sth (for support etc); to depend on","便于":"easy to; convenient for","便利":"convenient; easy",
"便条":"(informal) note","促使":"to prompt; to induce; to spur","促进":"promote; facilitate; advance","促销":"promotion; sale",
"保":"Bulgaria (abbr. for 保加利亞|保加利亚[Bao3 jia1 li4 ya4])","保养":"to take good care of (or conserve) one's health; to keep in good repair","保卫":"to defend; to safeguard","保存":"to conserve; to preserve; to keep; to store; (computing) to save (a file etc)",
"保守":"conservative; preserve","保安":"to ensure public security; to ensure safety (for workers engaged in production)","保密":"to keep sth confidential; to maintain secrecy","保护":"protect; protection",
"保持":"maintain; keep; preserve","保留":"to keep; to retain","保证":"guarantee; ensure; assure","保险":"insurance; to insure",
"信":"letter; mail","信任":"trust; confidence","信号":"signal","信封":"envelope",
"信心":"confidence","信念":"faith; belief","信息":"information; data; message","信用卡":"credit card",
"信箱":"mailbox; post office box","俩":"two (colloquial equivalent of 兩個|两个); both","修":"surname Xiu","修养":"accomplishment; training",
"修复":"to restore; to renovate; (computing) to repair (a corrupted file etc)","修建":"to build; to construct","修改":"to amend; to alter","修理":"to repair; to fix",
"俱乐部":"(loanword) club (the organization or its premises)","倍":"(two, three etc) -fold; times (multiplier)","倒":"to fall; to collapse; to lie horizontally; to fail; to go bankrupt","倒是":"contrary to what one might expect; actually",
"倒车":"to change buses, trains etc","倒闭":"to go bankrupt; to close down","借":"to borrow; (used in combination with 給|给[gei3] or 出[chu1] etc) to lend","倡导":"to advocate; to initiate",
"值":"value; (to be) worth","值得":"worth the money; to merit; to deserve; to be worth (doing sth)","值班":"to work a shift; on duty","假":"used in 假掰[gei1 bai1]",
"假如":"if; suppose","假期":"holiday; vacation","做":"do; make","做到":"to accomplish; to achieve",
"做客":"to be a guest or visitor","做法":"way of handling sth; method for making","停":"to stop; to halt","停下":"to stop",
"停止":"stop; cease; halt","停留":"to stay somewhere temporarily; to stop over","停车":"to pull up (stop one's vehicle); to park","停车场":"parking lot",
"健全":"robust; sound","健康":"healthy; health","健身":"to exercise; to keep fit","偶像":"idol",
"偶然":"incidentally; occasional","偷":"to steal; to pilfer","偷偷":"stealthily; secretly","傻":"foolish",
"像":"to resemble; to be like","儿女":"children; sons and daughters; a young man and a young woman (in love)","儿子":"son","儿童":"child",
"允许":"allow; permit","元":"yuan (currency)","元旦":"New Year's Day","兄弟":"brothers; younger brother",
"充分":"ample; sufficient","充满":"full of; brimming with","充电":"to recharge (a battery); (fig.) to recharge one's batteries (through leisure)","充电器":"battery charger",
"充足":"adequate; sufficient","先前":"before; previously","先后":"early or late; first and last; priority; in succession; one after another","先进":"sophisticated; advanced (technology etc); meritorious; exemplary (deeds etc)",
"光":"light; ray (CL:道[dao4]); bright; shiny","光临":"(formal) to honor with one's presence; to attend","光明":"light; radiance","光盘":"compact disc (CD); DVD; CD-ROM",
"光线":"light ray; light","光荣":"honor and glory; glorious","克":"abbr. for 克羅地亞|克罗地亚[Ke4 luo2 di4 ya4], Croatia; (Tw) abbr. for 克羅埃西亞|克罗埃西亚[Ke4 luo2 ai1 xi1 ya4], Croatia","克服":"overcome; surmount",
"免费":"free (of charge)","兔":"rabbit","入门":"entrance door; to enter a door","全":"surname Quan",
"全世界":"worldwide; entire world","全国":"whole nation; nationwide","全场":"everyone present; the whole audience","全家":"FamilyMart (convenience store chain)",
"全年":"the whole year; all year long","全球":"the whole world; worldwide; global","全身":"the whole body; (typography) em","全都":"all; without exception",
"全面":"all-around; comprehensive","八":"eight","公元":"CE (Common Era); Christian Era","公共":"public; common; communal",
"公共汽车":"bus","公务员":"civil servant; public servant","公司":"company","公告":"post; announcement",
"公园":"park","公布":"to announce; to make public; to publish","公平":"fair; justice","公开":"open; overt; public; to make public; to release",
"公式":"formula","公斤":"kilogram (kg)","公正":"just; fair; equitable","公民":"citizen",
"公认":"publicly known (to be); accepted (as)","公路":"highway; road","公里":"kilometer","六":"six",
"共":"common; general","共享":"to share; to enjoy together","共同":"common; joint","共有":"in total there are ...; to own jointly",
"共计":"to sum up to; to total","关于":"about; regarding; concerning","关心":"care; be concerned about","关怀":"care; solicitude",
"关机":"to turn off (a machine or device); to finish shooting a film","关注":"pay attention to; focus on","关系":"relationship; connection","关键":"crucial point; crux",
"关闭":"to close; to shut (a window etc); (of a shop, school etc) to shut down","兴奋":"excited","兴趣":"interest (desire to know about sth); interest (thing in which one is interested); hobby","兵":"soldiers; a force",
"其":"his; her","其实":"actually; in fact","其次":"next; secondly","具体":"specific; concrete; detailed",
"具备":"to possess; to have","具有":"to have; to possess","典型":"model; typical case","典礼":"ceremony; celebration",
"养":"to raise (animals); to bring up (children)","养成":"to cultivate; to raise","内":"inside; inner","内在":"inner; internal",
"内容":"content; substance","内心":"heart; innermost being; (math.) incenter","内科":"internal medicine; general medicine","内部":"interior; inside (part, section)",
"册":"book; booklet","再":"again; once more","再三":"over and over again; again and again","再也":"(not) ever again; (not) any longer",
"再见":"goodbye; see you","冒":"surname Mao","写作":"to write; to compose","军人":"serviceman; soldier",
"农业":"agriculture; farming","农产品":"agricultural produce","农村":"countryside; rural area","农民":"peasant; farmer",
"冠军":"champion","冬天":"winter","冬季":"winter","冰":"ice; to chill sth",
"冰箱":"refrigerator; (old) icebox","冰雪":"ice and snow","冲":"(of water) to dash against; to mix with water","冲动":"to have an urge; to be impetuous",
"冲突":"conflict; to conflict","决不":"not at all; simply (can) not","决定":"decide; decision","决心":"determination; resolution",
"决策":"decision-making; policy decision","决赛":"finals (of a competition)","冷":"cold","冷静":"calm; cool-headed; dispassionate; (of a place) deserted; quiet",
"冻":"to freeze; to feel very cold","准":"to allow; to grant","准备":"prepare; get ready","准时":"on time; punctual",
"准确":"accurate; precise","凉":"the five Liang of the Sixteen Kingdoms, namely: Former Liang 前涼|前凉 (314-376), Later Liang 後涼|后凉 (386-403), Northern Liang 北涼|北凉 (398-439), Southern Liang 南涼|南凉[Nan2 Liang2] (397-414), Western Liang 西涼|西凉 (400-421)","凉快":"pleasantly cool (weather etc); to cool oneself; to cool off","凉水":"cool water; unboiled water",
"减":"to lower; to decrease","减少":"reduce; decrease","减肥":"to lose weight","减轻":"to lighten; to ease",
"几":"how many; several","几乎":"almost; nearly; practically","凭":"to lean against; to rely on","出于":"due to; to stem from",
"出发":"to set off; to start (on a journey)","出口":"export","出售":"to sell; to offer for sale","出国":"to go abroad; to leave the country",
"出差":"to go on an official or business trip","出席":"to attend; to participate","出来":"come out; emerge","出汗":"to perspire; to sweat",
"出版":"to publish","出现":"appear; emerge; arise","出生":"be born; birth","出租":"to rent",
"出租车":"taxi","出色":"remarkable; outstanding","出门":"to go out; to leave home","出院":"to leave hospital; to be discharged from hospital",
"刀":"surname Dao","分":"minute; cent; divide","分为":"to divide sth into (parts); to subdivide","分享":"to share (let others have some of sth good)",
"分别":"to part; to leave each other; to distinguish; to tell apart","分布":"to scatter; to distribute","分成":"to divide (into); to split a bonus","分手":"to part company; to split up",
"分散":"to scatter; to disperse","分数":"(exam) grade; mark","分析":"analyze; analysis","分离":"to separate",
"分类":"to classify","分组":"to divide into groups; group (formed from a larger group)","分解":"to resolve; to decompose","分配":"allocate; distribute; assign",
"分钟":"minute","切":"to cut; to slice; to carve; (math) tangential","划":"to row; to paddle","划分":"to divide up; to partition",
"划船":"to row a boat; rowing; boating","列":"to arrange; to line up","列为":"to be classified as","列入":"to include on a list",
"列车":"(railway) train","刚":"hard; firm","创业":"to begin an undertaking; to start an enterprise; entrepreneurship","创作":"to create; to produce; to write; a creative work; a creation",
"创建":"create; establish; found","创新":"innovate; innovation","创立":"to establish; to set up; to found","创造":"to create; to bring about",
"初":"(bound form) at first; initially; (bound form) first; early","初期":"initial stage; beginning period","初步":"initial; preliminary","初级":"junior; primary",
"判断":"judge; judgment","利息":"interest (on a loan)","利润":"profits","利用":"use; utilize; exploit",
"利益":"interest; benefit","到处":"everywhere","到底":"finally; in the end","到来":"to arrive; arrival; advent",
"到达":"to reach; to arrive","制作":"to make; to manufacture","制定":"to draw up; to formulate","制度":"system; institution; regulations",
"制成":"to manufacture; to turn out (a product)","制约":"to restrict; condition","制订":"to work out; to formulate","制造":"to manufacture; to make",
"刷":"a brush; to paint; to daub","刷子":"brush; scrub","刷牙":"to brush one's teeth","刺":"(onom.) whoosh",
"刺激":"to provoke; to irritate; to upset; to stimulate; to excite; irritant","刻":"quarter (hour); moment","前后":"around; from beginning to end","前头":"in front; at the head",
"前往":"to leave for; to proceed towards; to go to","前提":"premise; precondition","前景":"foreground; vista","前进":"to go forward; to forge ahead",
"前途":"prospects; future outlook","前面":"ahead; in front","剧场":"theater","剧本":"script; screenplay; scenario; libretto",
"剩":"to remain; to be left","剩下":"to remain; to be left over","剪":"surname Jian","剪刀":"scissors",
"剪子":"clippers; scissors","力":"surname Li","力气":"physical strength","力量":"power; force; strength",
"劝":"to advise; to urge","办":"to take care of (a matter); to deal with (a task, procedure etc); to organize (an event); to establish; to set up; to manage; to run (an enterprise)","办事":"to handle (affairs); to work","办公室":"office; business premises",
"办法":"way of handling sth; means; measure; (practical) solution to a problem","办理":"to handle; to transact; to conduct","功夫":"skill; art","功能":"function; feature",
"功课":"homework; assignment","加":"Canada (abbr. for 加拿大[Jia1 na2 da4]); surname Jia","加上":"plus; to put in","加以":"in addition; moreover",
"加入":"to become a member; to join","加工":"to process; processing","加强":"strengthen; enhance; reinforce","加快":"to accelerate; to speed up; to hasten",
"加油":"to add oil; to top up with gas; to refuel; to accelerate; to step on the gas","加油站":"gas station","加热":"to heat","加班":"to work overtime",
"加速":"to accelerate; to speed up; to expedite","动人":"touching; moving","动力":"motive power; (fig.) motivation; impetus","动员":"to mobilize; mobilization",
"动态":"movement; motion","动手":"to set about (a task); to raise a hand to hit sb","动摇":"to sway; to waver","动机":"motive; motivation",
"动物":"animal","动物园":"zoo","动画片":"animated film","助手":"assistant; helper",
"助理":"assistant","努力":"work hard; strive; make an effort","劳动":"work; toil","势力":"power; influence",
"勇敢":"brave; courageous","勇气":"courage","勤奋":"hardworking; diligent","包含":"to contain; to embody",
"包围":"to surround; to encircle","包括":"include; consist of; contain","包装":"to wrap; to package (goods etc); packaging; packing materials","包裹":"to wrap up; to bind up",
"化":"to make into; to change into","化学":"chemistry","化石":"fossil","北方":"north; the northern part a country",
"北极":"the North Pole; the north magnetic pole","北部":"northern part","匹":"(bound form) matching; comparable to; (bound form) alone; single; one of a pair","区":"surname Ou",
"区别":"difference; distinguish","区域":"area; region","医学":"medicine; medical science","医生":"doctor",
"医疗":"medical treatment","医院":"hospital","十":"ten","十足":"ample; complete",
"千":"thousand","千万":"ten million; countless","千克":"kilogram","升":"to ascend; to rise; to promote; to elevate",
"升级":"upgrade","升高":"to raise; to ascend","午睡":"to take a nap in the afternoon","午餐":"lunch; luncheon",
"半夜":"midnight; in the middle of the night","华人":"ethnic Chinese person or people","华语":"Chinese language","协议":"agreement; pact",
"协议书":"contract; protocol","单":"surname Shan","单一":"single; only","单位":"unit (of measure); unit (group of people as a whole)",
"单元":"unit (forming an entity); element","单独":"alone; by oneself","单纯":"simple; pure","单调":"monotonous",
"卖":"sell","南北":"north and south; north to south","南方":"south; southern direction; (in China) southern regions, often referring to areas south of the Yangtze River","南极":"the South Pole; the south magnetic pole",
"南部":"southern part","博士":"doctor (as an academic degree); (old) person specialized in a skill or trade","博客":"(loanword) a blog; a blogger","博物馆":"museum",
"博览会":"an exposition; an international fair","占":"to observe; to divine","占有":"to have; to own","占领":"to capture; to seize; to occupy by force",
"卡":"to stop; to block","卧室":"bedroom","卫星":"(aerospace) satellite; (astronomy) satellite; moon","卫生":"hygienic; sanitary; hygiene; sanitation",
"卫生间":"bathroom; toilet","印刷":"to print; printing","印象":"impression","危害":"to harm; to jeopardize; to endanger; harmful effect; damage",
"危险":"dangerous; danger; risk","即使":"even if; even though","即将":"about to; on the point of; soon","卷":"to roll up; (fig.) to sweep up; to engulf; to drag into (a situation)",
"厂":"\"cliff\" radical in Chinese characters (Kangxi radical 27), occurring in 原, 历, 压 etc","厂长":"factory director","厅":"(reception) hall; living room","历史":"history; historical",
"厉害":"(used to describe sb or sth that makes a very strong impression, whether favorable or unfavorable) terrible; intense; severe; devastating; amazing; awesome; outstanding; (of a person) stern; strict; harsh; shrewd; tough","压":"to press; to push down","压力":"pressure","厘米":"centimeter",
"厚":"thick; deep or profound","原先":"originally; original","原则":"principle; doctrine","原因":"reason; cause; factor",
"原始":"first; original","原料":"raw material","原有":"original; former","原理":"principle; theory",
"厨师":"cook; chef","厨房":"kitchen","去":"go; leave","去世":"to pass away; to die",
"县":"county","参与":"to participate (in sth)","参加":"participate; attend; join","参考":"consultation; reference",
"参观":"to visit (a place, e.g. museum or factory); to tour; to look around","又":"again; also","叉":"fork; pitchfork","叉子":"fork",
"及时":"timely; at the right time; promptly; without delay","及格":"to pass an exam or a test; to meet a minimum standard","友好":"friendly; amicable; close friend","友谊":"companionship; fellowship",
"双":"surname Shuang","双手":"both hands","双方":"bilateral; both sides","反":"contrary; in reverse",
"反复":"repeatedly; over and over","反对":"oppose; objection","反应":"to react; to respond","反映":"to mirror; to reflect",
"反正":"anyway; in any case","反而":"on the contrary; instead","发":"to send out; to show (one's feeling)","发出":"to issue (an order, decree etc); to send out; to dispatch; to produce (a sound); to let out (a laugh)",
"发动":"to start; to launch","发射":"to shoot (a projectile); to fire (a rocket)","发展":"develop; development","发展机会":"development opportunity",
"发布":"to release; to issue","发挥":"to display; to exhibit","发明":"to invent; an invention","发烧":"to have a high temperature (from illness); to have a fever; (fig.) to be fascinated with; to obsess over",
"发现":"discover; find; realize","发生":"happen; occur; take place","发票":"invoice; receipt; bill; uniform invoice (abbr. for 統一發票|统一发票[tong3 yi1 fa1 piao4])","发行":"to publish; to issue; to release; to distribute",
"发表":"to issue; to publish","发觉":"to become aware; to detect","发言":"to make a speech; statement","发达":"well-developed; flourishing; to develop; to promote; to expand",
"发送":"to transmit; to dispatch","叔叔":"father's younger brother; paternal uncle; form of address used by children for a male one generation older","取":"to take; to get","取得":"to acquire; to get; to obtain",
"取消":"to cancel; to call off; to revoke; to rescind","受":"to receive; to accept","受不了":"unbearable; unable to endure","受伤":"to sustain injuries; wounded (in an accident etc)",
"受到":"to receive (praise, an education, punishment etc); to be ...ed (praised, educated, punished etc)","受灾":"disaster-stricken; to be hit by a natural calamity","变":"to change; to become different","变为":"to change into",
"变动":"to change; to fluctuate","变化":"change; variation","变成":"become; turn into; change into","口号":"slogan; catchphrase",
"口袋":"pocket; bag; sack","口语":"colloquial speech; spoken language","古":"surname Gu","古代":"ancient times",
"古老":"ancient; old","句":"sentence; clause","句子":"sentence","另一方面":"on the other hand; another aspect",
"只":"only; merely; just","只好":"to have no other option but to ...; to have to; to be forced to","只能":"can only; obliged to do sth","只要":"as long as; provided that",
"只见":"to see (the same thing) over and over again; to see, to one's surprise, (sth happen suddenly)","叫作":"to call; to be called","召开":"to convene (a conference or meeting); to convoke","可":"(prefix) can; may; able to; -able; to approve; to permit",
"可乐":"amusing; entertaining","可以":"can; may; be allowed to","可怕":"awful; dreadful","可怜":"pitiful; pathetic",
"可惜":"it is a pity; what a pity","可爱":"cute; lovely; adorable","可能":"possible; maybe; perhaps","可见":"it can clearly be seen (that this is the case); it is (thus) clear",
"可靠":"reliable","台":"Taiwan (abbr.); surname Tai","台上":"on stage","台阶":"steps; flight of steps",
"台风":"stage presence, poise","叶子":"leaf","号":"number; date","号召":"to call; to appeal",
"号码":"number","司机":"driver","吃":"eat","吃力":"to entail strenuous effort; to toil at a task",
"吃惊":"to be startled; to be shocked","各":"each; every","各个":"every; various","各位":"everybody; all (guests, colleagues etc)",
"各地":"in all parts of (a country); various regions","各种":"every kind of; all kinds of; various","各自":"each; respective","合":"100 ml; one-tenth of a peck",
"合作":"cooperate; cooperation","合同":"contract; agreement","合并":"to merge; to annex","合成":"to compose; to constitute",
"合格":"to meet the standard required; qualified","合法":"lawful; legitimate","合理":"rational; reasonable; sensible; fair","合适":"suitable; fitting; appropriate",
"同事":"colleague","同学":"classmate; fellow student","同情":"to sympathize with; sympathy","同意":"agree; consent; approve",
"同样":"same; equal; similar; similarly; also; too","名":"name; noun (part of speech)","名人":"personage; celebrity","名单":"list of names",
"名片":"(business) card","名牌儿":"erhua form of 名牌[ming2 pai2]","名称":"name (of a thing); name (of an organization)","后头":"behind; the back",
"后悔":"to regret; to feel remorse","后来":"afterwards; later; newly arrived","后果":"consequences; aftermath","后面":"the back; the rear; the last bit; behind; near the end; at the back",
"吐":"to spit; to send out (silk from a silkworm, bolls from cotton flowers etc)","向":"surname Xiang","向上":"upward; up","向前":"forward; onward",
"向导":"guide","吓":"to scare; to intimidate","否则":"otherwise; if not; or (else)","否定":"to negate; to deny",
"否认":"to declare to be untrue; to deny","吨":"ton (loanword); Taiwan pr. [dun4]","含":"to keep in the mouth; to contain","含义":"meaning (implicit in a phrase); implied meaning",
"含有":"to contain; including","含量":"content; quantity contained","听":"listen; hear","听众":"audience; listeners",
"听力":"hearing; listening ability","听讲":"to attend a lecture; to listen to a talk","启事":"announcement (written, on billboard, letter, newspaper or website); to post information","启动":"to start (a machine); (fig.) to set in motion",
"启发":"to enlighten; to explain (a text etc)","吵":"to quarrel; to make a noise","吵架":"to quarrel; to have a row","吸":"to breathe; to suck in",
"吸引":"to attract; to appeal to; to fascinate","吸收":"to absorb; to assimilate","吸烟":"to smoke","吸管":"(drinking) straw; pipette",
"吹":"to blow; to play a wind instrument","呀":"ah (used to express surprise); (onom.) creaking","呆":"foolish; stupid; expressionless; blank","告别":"to leave; to part from; to bid farewell to; to say goodbye to",
"员":"(bound form) person engaged in a certain field of activity; (bound form) member","员工":"staff; personnel; employee","周围":"environs; surroundings; periphery","周年":"anniversary; annual",
"周期":"period; cycle","周末":"weekend","味儿":"taste","味道":"flavor; taste; (fig.) feeling (of ...); sense (of ...); hint (of ...)",
"呼吸":"to breathe","命令":"order; command","命运":"fate; destiny","和平":"peace; peaceful",
"咖啡":"coffee","咬":"to bite; to nip","咳":"sound of sighing; (interjection expressing surprise, sorrow, regret, disappointment etc) oh","咸":"surname Xian",
"品":"(bound form) article; commodity; product; goods; (bound form) grade; rank","品种":"breed; variety","品质":"character; intrinsic quality (of a person)","哈哈":"(onom.) laughing out loud",
"响":"echo; sound","哥哥":"elder brother","哪":"which; where","哪个":"which one",
"哪怕":"even; even if","哪里":"where","哭":"to cry; to weep","售货员":"sales clerk; sales associate; retail salesperson",
"唯一":"only; sole","唱片":"gramophone record; LP","商业":"business; trade","商人":"businessman; merchant",
"商务":"commercial affairs; commercial","商品":"goods; commodity","商场":"shopping mall","商标":"trademark; logo",
"商量":"to consult; to talk over","啊":"interjection of surprise; Ah!","啤酒":"beer (loanword)","善于":"to be good at; to be adept at",
"善良":"kind; good-natured; kind-hearted","喊":"to yell; to shout","喜剧":"a comedy","喜爱":"to like; to love",
"喝":"drink","喷":"to spout; to spurt; to spray; to puff; (slang) to criticize scathingly (esp. online)","嘴巴":"mouth (CL:張|张[zhang1]); slap in the face","器官":"(physiology) organ; apparatus",
"四":"four","四周":"all around","回信":"to reply; to write back","回到":"return to; go back to",
"回国":"to return to one's home country","回复":"to recover; to revert; to return to (good health, normal condition etc)","回头":"to turn round; to turn one's head; later; by and by","回忆":"to recall; memories",
"回报":"(in) return; reciprocation","回收":"to recycle; to reclaim","回来":"come back; return","回避":"to shun; to avoid (sb)",
"回顾":"to look back; to review","因为":"because; since","因而":"therefore; as a result","团":"round; lump",
"团体":"group; organization","团结":"to unite; unity; solidarity","团长":"regimental command; head of a delegation","园林":"gardens; park; landscape garden",
"困":"to trap; to surround","困扰":"to perplex; to disturb","困难":"difficult; difficulty; hard","围":"surname Wei",
"围巾":"scarf; shawl","围绕":"to revolve around; to center on (an issue)","固定":"to fix; to fasten","国庆":"National Day",
"国民":"nationals; citizens","国籍":"nationality","国际":"international","图":"picture; map",
"图书馆":"library","图案":"design; pattern","图片":"picture; photograph","图画":"drawing; picture",
"圆":"circle; round","圆满":"satisfactory; consummate; perfect","圈":"to confine; to lock up","土":"Tu (ethnic group); surname Tu",
"土地":"land; soil","土豆":"potato; (Tw) peanut (CL:顆|颗[ke1])","在":"at; in; on; be","在乎":"to rest with; to lie in; to be due to (a certain attribute); (often used in the negative) to care about",
"在于":"to rest with; to lie in; to be due to (a certain attribute); (of a matter) to be determined by; to be up to (sb)","在内":"(included) in it; among them","在场":"to be present; to be on the scene","地位":"position; status",
"地址":"address","地带":"zone","地形":"topography; terrain","地球":"the earth",
"地理":"geography","地铁":"subway; metro","地震":"earthquake","场":"threshing floor; classifier for events and happenings: spell, episode, bout",
"场合":"situation; occasion","场所":"location; place","场面":"scene; spectacle","坏":"bad; broken",
"坏人":"bad person; villain","坏处":"harm; troubles","块":"piece; yuan","坚决":"firm; resolute; determined",
"坚固":"firm; firmly","坚定":"firm; steady","坚强":"staunch; strong","坚持":"persist; insist; keep on",
"垃圾":"trash; refuse","型":"mold; type","型号":"model (particular version of a manufactured article); type (product specification in terms of color, size etc)","城":"city walls; city",
"城市":"city","城里":"в городе, в центре города","培养":"to cultivate; to breed","培育":"to train; to breed",
"培训":"train; training","培训班":"training class","基地":"al-Qaeda","基本":"basic; fundamental; essentially",
"基本上":"basically; on the whole","基础":"base; foundation; basis; basic; fundamental","基金":"fund","堆":"to pile up; to heap up",
"堵":"to block up (a road, pipe etc); to stop up (a hole)","堵车":"traffic jam; (of traffic) to get congested","塑料":"plastic; plastics (general term for synthetic polymer materials)","塑料袋":"plastic bag",
"填":"to fill or stuff; (of a form etc) to fill in","填空":"to fill a job vacancy; to fill in a blank (e.g. on a form, questionnaire or exam paper)","墙":"wall (CL:面[mian4],堵[du3]); (slang) to block (a website) (usu. in the passive: 被牆|被墙[bei4 qiang2])","墙壁":"wall",
"增":"(bound form) to increase; to augment; to add to","增产":"to increase production","增加":"increase; add","增多":"to increase; to grow in number",
"增大":"to enlarge; to amplify","增强":"to increase; to strengthen","增长":"to grow; to increase","士兵":"soldier",
"声":"sound; voice","声明":"to state; to declare","声音":"voice; sound","处":"to reside; to live",
"处于":"to be in (some state, position, or condition)","处分":"to discipline sb; to punish","处在":"to be situated at; to find oneself at","处理":"deal with; handle",
"处罚":"to penalize; to punish","复习":"to review; revision","复制":"to duplicate; to make a copy of","复印":"to photocopy; to duplicate a document",
"复杂":"complex; complicated","夏天":"summer","夏季":"summer","外交":"diplomacy; diplomatic",
"外交官":"diplomat","外公":"grandfather (maternal)","外卖":"(of a restaurant) to provide a takeout or home delivery meal; takeout (business)","外地":"parts of the country other than where one is",
"外套":"coat; jacket","外婆":"grandmother (maternal)","外文":"foreign language (written)","外汇":"foreign (currency) exchange",
"外界":"the outside world; external","多":"many; much","多久":"(of time) how long?; (not) a long time","多么":"how (wonderful etc); what (a great idea etc)",
"多云":"(meteorology) cloudy","多少":"how many; how much","多年":"many years; for many years","多数":"majority; most",
"多样":"diverse; diversity","多次":"many times; repeatedly","多种":"many kinds of; multiple; diverse; multi-","夜":"night",
"夜里":"during the night; at night","夜间":"nighttime; evening or night (e.g. classes)","够":"enough (sufficient); enough (too much)","大":"big; large",
"大事":"major event; major political event (war or change of regime)","大于":"greater than; bigger than; more than","大众":"Volkswagen (automobile manufacturer)","大伙儿":"erhua variant of 大伙[da4 huo3]",
"大会":"general assembly; general meeting","大使馆":"embassy","大厅":"hall; concourse; public lounge; (hotel) lobby","大哥":"eldest brother; big brother (polite address for a man of about the same age as oneself)",
"大型":"large; large-scale","大声":"loud voice; in a loud voice","大多":"for the most part; many","大多数":"(great) majority",
"大大":"greatly; enormously","大夫":"senior official (in imperial China)","大奖赛":"grand prix","大妈":"father's elder brother's wife; aunt (affectionate term for an elderly woman)",
"大姐":"big sister; elder sister","大学":"university","大巴":"(coll.) large bus; coach","大方":"expert; scholar",
"大楼":"building (a relatively large, multistory one)","大概":"roughly; probably","大海":"sea; ocean","大熊猫":"giant panda (Ailuropoda melanoleuca)",
"大爷":"arrogant idler; self-centered show-off","大约":"approximately; probably","大纲":"synopsis; outline","大胆":"brazen; audacious",
"大脑":"brain; cerebrum","大自然":"nature (the natural world)","大致":"more or less; roughly; approximately","大衣":"overcoat; topcoat",
"大规模":"large scale; extensive","大象":"elephant","大部分":"the greater part; the majority; most; Taiwan pr. [da4bu4fen4]","大都":"Dadu, capital of China during the Yuan Dynasty (1280-1368), modern day Beijing",
"大量":"great amount; large quantity","大门":"the Doors, US rock band","大陆":"mainland China (reference to the PRC)","天上":"the sky; the heavens",
"天才":"talent; gift","天文":"astronomy","天然气":"natural gas","天真":"naive; innocent",
"天空":"sky","太太":"married woman; Mrs.","太空":"outer space","太阳":"sun",
"夫人":"lady; madam","夫妇":"a (married) couple; husband and wife","夫妻":"husband and wife; married couple","失业":"unemployment; to lose one's job",
"失去":"lose; be deprived of","失望":"disappointed; lose hope","失误":"lapse; mistake","失败":"fail; failure",
"头发":"hair (on the head)","头脑":"brains; mind","夹":"used in 夾肢窩|夹肢窝[ga1 zhi5 wo1]","奇怪":"strange; odd",
"奋斗":"to strive; to struggle","奖":"prize; award; bonus; reward; (bound form) to encourage; to commend; to praise","奖励":"to reward; reward (as encouragement)","奖学金":"scholarship",
"奖金":"premium; award money","套":"to cover; to encase","套餐":"set meal; (fig.) product or service package (e.g. for a cell phone subscription)","女儿":"daughter",
"女士":"lady; madam","女子":"woman; female","女性":"woman; the female sex","奶奶":"grandmother (paternal)",
"奶茶":"milk tea","她":"she; her","好":"good; well","好久":"quite a while",
"好事":"good action, deed, thing or work (also sarcastic, \"a fine thing indeed\"); charity","好人":"good person; healthy person","好友":"close friend; pal","好处":"easy to get along with",
"好多":"many; quite a lot","好奇":"inquisitive; curious","好好":"well; carefully; nicely; properly","好的":"ok; alright; yes",
"好运":"good luck","如下":"as follows","如今":"nowadays; now","如何":"how; what way",
"如同":"like; as","如果":"if; in case; in the event that","如此":"like this; so; such","妈妈":"mother; mom",
"妹妹":"younger sister","妻子":"wife","始终":"from beginning to end; all along","姐妹":"sisters; siblings",
"姐姐":"elder sister","姑娘":"girl; young woman","姓":"family name; surname; to be surnamed ...","姓名":"surname and given name; full name",
"委托":"to entrust; to trust","婚礼":"wedding ceremony; wedding","媒体":"media, esp. news media","子女":"children; sons and daughters",
"字典":"Chinese character dictionary (containing entries for single characters, contrasted with a 詞典|词典[ci2 dian3], which has entries for words of one or more characters); (coll.) dictionary","字母":"letter (of the alphabet)","存":"to exist; to deposit","存在":"exist; be; presence",
"存款":"to deposit money (in a bank etc); bank savings","孙女":"son's daughter; granddaughter","孙子":"Sun Tzu, also known as Sun Wu 孫武|孙武[Sun1 Wu3] (c. 500 BC, dates of birth and death uncertain), general, strategist and philosopher of the Spring and Autumn Period (700-475 BC), believed to be the author of the “Art of War” 孫子兵法|孙子兵法[Sun1 zi3 Bing1 fa3], one of the Seven Military Classics of ancient China 武經七書|武经七书[Wu3 jing1 Qi1 shu1]","季":"surname Ji",
"季度":"quarter of a year; season (sports)","季节":"time; season","学习":"study; learn","学会":"learn to do; master",
"学位":"academic degree; place in school","学分":"course credit","学年":"academic year","学时":"class hour; period",
"学期":"term; semester","学术":"learning; science","学校":"school","学生":"student",
"学科":"subject; branch of learning","学者":"scholar","学费":"tuition fee; tuition","学问":"learning; knowledge; scholarship; a body of specialized knowledge (CL:門|门[men2]); (fig.) any activity that demands expertise, skill or experience (e.g. gathering forensic evidence, selecting clothing, managing relationships)",
"孩子":"child; children","宁静":"tranquil; tranquility","它们":"they; them","守":"to guard; to defend",
"安":"surname An","安全":"safe; safety; secure","安慰":"to comfort; to console","安排":"arrange; plan; schedule",
"安置":"to find a place for; to help settle down","安装":"to install; to erect","安静":"quiet; peaceful","完":"to finish; to be over",
"完了":"to be finished; to be done for","完全":"complete; whole; totally; entirely","完善":"improve; perfect; consummate","完成":"complete; fulfill",
"完整":"complete; intact","完美":"perfect","官":"surname Guan","官方":"government; official (approved or issued by an authority)",
"定":"to fix; to set; to make definite; to subscribe to (a newspaper etc); to book (tickets etc); to order (goods etc)","定期":"at set dates; at regular intervals","宝":"jewel; gem","宝宝":"baby",
"宝石":"precious stone; gem","宝贝":"treasured object; treasure","宝贵":"valuable; precious","实习":"to practice; field work",
"实力":"strength","实在":"really; actually","实惠":"tangible benefit; material advantages","实施":"implement; carry out",
"实现":"realize; achieve; fulfill","实用":"to apply in practice; practical; functional; pragmatic; applied (science)","实行":"to implement; to carry out","实践":"practice; put into practice",
"实际":"reality; practice","实际上":"in fact; in reality","实验":"experiment; test","实验室":"laboratory",
"客人":"guest; visitor","客厅":"living room; sitting room","客户":"client; customer","客气":"polite; courteous",
"客观":"objective; impartial","宣传":"to disseminate; to give publicity to","宣布":"to declare; to announce","室":"surname Shi",
"害":"to do harm to; to cause trouble to","害怕":"be afraid; fear; dread","家":"home; family","家乡":"hometown; native place",
"家具":"furniture","家务":"household duties; housework","家属":"family member; (family) dependent","家庭":"family",
"家长":"head of a household; family head","容易":"easy; simple; likely","宽":"surname Kuan","宽广":"wide; broad",
"宽度":"width","宾馆":"hotel","宿舍":"dormitory","寄":"to entrust; to place in sb's care; (bound form) to depend on; to attach oneself to; to reside temporarily",
"密":"surname Mi; name of an ancient state","密切":"close; familiar","密码":"cipher; secret code; password; PIN","富":"surname Fu",
"寒假":"winter vacation","寒冷":"cold (climate); frigid","寸":"a unit of length; inch","对不起":"sorry; excuse me",
"对于":"regarding; as for; concerning","对付":"to handle; to deal with; to tackle; to get by with; to make do","对应":"to correspond (to); to be equivalent to; to be a counterpart to","对待":"to treat; treatment",
"对手":"opponent; rival","对方":"the other person; the other side; the other party","对比":"to contrast; contrast","对立":"to oppose; to set sth against",
"对话":"to talk (with sb); dialogue; conversation","对象":"target; object; partner; boyfriend; girlfriend","对面":"(sitting) opposite; across (the street)","寻找":"to seek; to look for",
"寻求":"to seek; to look for","导游":"tour guide; guidebook","导演":"to direct; director (film etc)","导致":"to lead to; to create; to cause; to bring about",
"寿司":"sushi","封":"surname Feng","封闭":"to close; to seal off; to close down (an illegal venue)","射":"to shoot; to launch",
"射击":"to shoot; to fire (a gun)","将":"will; shall","将要":"will; shall","将近":"almost; nearly",
"尊敬":"to respect; to revere; to esteem; honorable; distinguished (used on formal occasions before a term of address)","尊重":"to esteem; to respect","小":"small","小伙子":"young man; young guy",
"小偷儿":"erhua form of 小偷[xiao3 tou1]","小吃":"street food; snack","小型":"small scale; small size","小声":"in a low voice; (speak) in whispers",
"小心":"to be careful; to take care","小组":"group","小说":"novel","少":"few; little",
"少年":"early youth; youngster","少数":"small number; few","尝":"to taste; to try (food); to experience","尝试":"to try; to attempt",
"尤其":"especially; particularly","就":"then; just; right away","就业":"to get a job; employment","就是":"exactly; precisely; only; simply; just",
"就要":"will; shall","尺":"one of the characters used to represent a musical note in gongche notation, 工尺譜|工尺谱[gong1 che3 pu3]","尺子":"ruler (measuring instrument)","尺寸":"size; dimensions; measurements (esp. of clothes); (coll.) propriety",
"尽力":"to strive one's hardest; to spare no effort","尽可能":"as far as possible; to the best of one's ability","尽快":"as quickly as possible; as soon as possible","尽管":"despite; although",
"尽量":"as much as possible; to the greatest extent","尾巴":"tail; colloquial pr. [yi3 ba5]","局":"narrow","局部":"partial; local; part",
"局长":"bureau chief","局面":"aspect; phase","层":"to pile on top of one another; layer; stratum","层次":"layer; level",
"居住":"to reside; to dwell","居民":"resident; inhabitant","居然":"unexpectedly; to one's surprise","届":"to arrive at (place or time); period",
"屋":"(bound form) house; (bound form) room","屋子":"house; room","展开":"to unfold; to spread out; to open up; to launch; to carry out","展现":"to unfold before one's eyes; to emerge; to reveal; to display",
"展示":"to reveal; to display; to show; to exhibit","展览":"to put on display; to exhibit","属":"category; genus (taxonomy)","属于":"belong to; be part of",
"山":"mountain","山区":"mountain area","岁月":"years; time","岸":"bank; shore; beach; coast",
"岸上":"ashore; on the riverbank","工业":"industry","工作":"work; job","工作日":"workday; working day",
"工具":"tool; instrument; means","工厂":"factory","工夫":"(old) laborer","工程":"engineering; an engineering project",
"工程师":"engineer","工艺":"arts and crafts; industrial arts","工资":"wages; pay","巧":"opportunely; coincidentally",
"巧克力":"(loanword) chocolate","巨大":"huge; immense; enormous; gigantic","差别":"difference; distinction; disparity","差点儿":"erhua variant of 差點|差点[cha4 dian3]",
"差距":"disparity; gap","已":"already; to stop","已经":"already; by now","巴士":"bus (loanword); motor coach",
"市":"market; city","市区":"urban district; downtown","市场":"market","市长":"mayor",
"布":"to announce; to spread","布置":"to put in order; to arrange","帅":"surname Shuai","帅哥":"handsome guy; lady-killer",
"师傅":"master; qualified worker","希望":"hope; wish","带":"band; belt","带动":"to spur; to provide impetus; to drive",
"带有":"to have as a feature or characteristic; to have an element of (confidence, sweetness, malevolence etc); to carry (a pathogen, connotation etc)","带领":"to guide; to lead","帮助":"help; assist; assistance","常用":"in common usage",
"常见":"commonly seen; common","常识":"common sense; general knowledge","帽子":"hat; cap","幅":"width; roll",
"幅度":"width; extent","干吗":"зачем; что делать; почему","干扰":"to disturb; to interfere","干杯":"to drink a toast; Cheers! (proposing a toast)",
"干活儿":"erhua variant of 幹活|干活[gan4 huo2]","干脆":"candid; direct and to the point","干预":"to meddle; to intervene","平":"surname Ping",
"平原":"field; plain","平台":"platform","平均":"average; on average; evenly; in equal proportions","平坦":"level; even",
"平安":"safe and sound; well","平常":"ordinary; common","平方":"square (as in square foot, square mile, square root)","平稳":"smooth; steady",
"平等":"equal; equality","平静":"tranquil; undisturbed","年":"year","年代":"a decade of a century (e.g. the Sixties); age",
"年初":"beginning of the year","年前":"by the end of the year; at the end of the year; shortly before New Year","年底":"the end of the year; year-end","年度":"year (e.g. school year, fiscal year); annual",
"年级":"grade; year (in school, college etc)","年纪":"age","年轻":"young","年龄":"(a person's) age",
"并":"and; furthermore","并且":"and; besides; moreover; furthermore; in addition","幸福":"happy; happiness; fortunate","幸运":"fortunate; lucky; good fortune; luck",
"幽默":"(loanword) humor; humorous","广":"\"house on a cliff\" radical in Chinese characters (Kangxi radical 53), occurring in 店, 序, 底 etc","广告":"to advertise; a commercial","广场":"square; plaza",
"广大":"(of an area) vast or extensive; large-scale","广播":"broadcast; broadcasting","广泛":"wide; broad; extensive; widespread","庆祝":"to celebrate",
"床":"bed","库":"warehouse; storehouse","应":"surname Ying; Taiwan pr. [Ying4]","应付":"deal with; cope with",
"应对":"cope with; deal with; respond to","应当":"should; ought to","应用":"apply; application; use","应该":"should; ought to",
"底":"(equivalent to 的 as possessive particle)","底下":"the location below sth; afterwards","店":"inn; old-style hotel (CL:家[jia1]); (bound form) shop; store","度":"to pass; to spend (time)",
"度过":"to pass; to spend (time)","座":"seat; base; stand","座位":"seat","延伸":"extend; stretch",
"延期":"to delay; to extend","延续":"to continue; to go on","延长":"Yanchang county in Yan'an 延安[Yan2 an1], Shaanxi","建":"to establish; to found",
"建成":"to establish; to build","建立":"establish; build; set up","建筑":"to construct; building","建议":"suggest; recommend; proposal",
"建设":"construction; build","建造":"to construct; to build","开业":"to open a business; to open a practice","开发":"develop; development",
"开始":"begin; start","开学":"(of a student) to start school; (of a semester) to begin","开展":"to launch; to develop","开幕":"to open (a conference); to inaugurate",
"开幕式":"opening ceremony","开心":"happy; cheerful","开放":"open; open-minded","开机":"to start an engine; to boot up (a computer)",
"开水":"boiled water; boiling water","开花":"to bloom; to blossom; to flower; (fig.) to burst; to split open","弄":"lane; alley","式":"type; form",
"引":"to draw (e.g. a bow); to pull","引导":"to guide; to lead (around)","引起":"to give rise to; to lead to; to cause; to arouse","引进":"to recommend; to introduce (from outside)",
"弟弟":"younger brother","张":"surname Zhang","弯":"to bend; bent","弱":"weak; feeble; young",
"弹":"crossball; bullet","强":"surname Qiang","强大":"big and strong; formidable; powerful","强度":"strength; intensity",
"强烈":"strong; intense","强调":"emphasize; stress","强迫":"to compel; to force","归":"surname Gui",
"当":"(onom.) dong; ding dong (bell)","当中":"among; in the middle","当代":"the present age; the contemporary era","当初":"at that time; originally",
"当前":"the present time; to be faced with","当地":"local","当场":"at the scene; on the spot","当年":"in those days; back then; in those years; to be in the prime of life",
"当然":"of course; certainly","当选":"to be elected; to be selected","录":"to carve wood","录取":"to accept an applicant (prospective student, employee etc) who passes an entrance exam; to admit (a student)",
"录音":"to record sound; an audio recording (CL:段[duan4])","形势":"circumstances; situation","形容":"to describe; (literary) countenance; appearance","形式":"form; format; appearance",
"形态":"shape; form","形成":"to form; to take shape","形状":"form; shape","形象":"image; form",
"彩票":"lottery ticket","彩色":"color; multicolored","影响":"influence; affect; impact","影子":"shadow; reflection",
"影片":"a copy of a film; film; motion picture; movie","影视":"movies and television","彻底":"thorough; thoroughly","彼此":"each other; one another",
"往":"to go (in a direction); to","往往":"usually; in many cases","征服":"to conquer; to subdue","征求":"to solicit; to seek",
"待":"to stay; to remain","待遇":"treatment; pay","律师":"lawyer","得":"to obtain; to get",
"得了":"all right!; that's enough!","得以":"able to; so that sb can","得出":"to obtain (a result); to arrive at (a conclusion)","得分":"to score a point (in a competition, test etc); score; rating; grade",
"得到":"get; obtain; receive","得意":"proud of oneself; pleased with oneself","微信":"Weixin or WeChat (mobile text and voice messaging service developed by Tencent 騰訊|腾讯[Teng2 xun4])","微博":"Weibo (Chinese social media platform)",
"微笑":"smile; to smile","心":"heart; mind","心中":"central point; in one's thoughts","心态":"attitude (of the heart); state of one's psyche",
"心情":"mood; frame of mind","心理":"psychology; mentality","心疼":"to love dearly; to feel sorry for sb","心里":"chest; heart; mind",
"必":"certainly; must","必然":"inevitable; certain","必要":"necessary; essential","必需":"to need; to require",
"必须":"must; have to","忍":"to bear; to endure","忍不住":"cannot help; unable to bear","忍受":"to bear; to endure",
"志愿":"aspiration; ambition","志愿者":"volunteer","忘记":"forget","快":"fast; quick",
"快乐":"happy; joyful; cheerful","快活":"happy; cheerful","快点儿":"erhua variant of 快點|快点[kuai4 dian3]","快要":"nearly at the point of (doing sth); about to (do sth)",
"快递":"express delivery","快速":"fast; high-speed; rapid","快速发展":"rapid development","快餐":"fast food; snack",
"念":"to read; to study (a subject)","忽然":"suddenly; all of a sudden","忽视":"to neglect; to overlook; to disregard; to ignore","怀念":"to cherish the memory of; to think of",
"怀疑":"to doubt (sth); to be skeptical of; to have one's doubts; to harbor suspicions; to suspect that","态度":"manner; bearing","怎么":"how; why","怎么了":"what's wrong; what happened",
"怎么办":"what's to be done","怎样":"how; what kind","怕":"surname Pa","思想":"thought; thinking",
"思维":"(line of) thought; thinking","思考":"think; ponder; reflect","急":"urgent; pressing","急忙":"hastily",
"性":"nature; character","性别":"sex; gender","性格":"nature; disposition","性能":"function; performance; behavior",
"性质":"nature; characteristic","怨":"to blame; (bound form) resentment; hatred; grudge","怪":"bewildering; odd","总":"(bound form) general; overall; to sum up",
"总之":"in a word; in short","总体":"completely; totally","总共":"altogether; in sum; in all; in total","总数":"total; sum",
"总是":"always","总理":"premier; prime minister","总算":"at long last; finally","总结":"to sum up; to conclude",
"总统":"president (of a country)","总裁":"chairman; director-general (of a company etc)","恋爱":"(romantic) love; in love","恐怕":"fear; to dread",
"恢复":"to reinstate; to resume","恨":"to hate; to regret","恶心":"nausea; to feel sick","悄悄":"quiet; making little or no noise; surreptitious; stealthy",
"您好":"hello (polite)","悲伤":"sad; sorrowful","悲剧":"tragedy","情况":"circumstances; state of affairs; situation",
"情形":"circumstances; situation","情感":"feeling; emotion","情景":"scene; spectacle; circumstances; situation","情节":"circumstances; plot; storyline",
"想":"think; want","想到":"to think of; to call to mind","想念":"to miss; to remember with longing","想法":"way of thinking; opinion; notion; to think of a way (to do sth)",
"想象":"to imagine; to envision; imagination","想起":"to recall; to think of","愁":"to worry about","意义":"sense; meaning",
"意味着":"to signify; to mean","意外":"unexpected; accident","意志":"will; willpower; determination","意思":"meaning; idea; intention",
"意见":"opinion; suggestion","意识":"consciousness; awareness; (usu. followed by 到[dao4]) to be aware of; to realize","感兴趣":"to be interested","感冒":"to catch cold; (common) cold",
"感到":"to feel; to sense; to perceive","感动":"to move (sb); to touch (sb emotionally)","感受":"feel; experience; impression","感情":"emotion; sentiment; affection; feelings between two persons",
"感想":"impressions; reflections","感觉":"feeling; impression; sensation; to feel; to perceive","感谢":"(express) thanks; gratitude","愿":"honest and prudent",
"愿意":"to wish; to want","愿望":"desire; wish","慌":"to get panicky; to lose one's head; (coll.) (after 得[de2]) unbearably; terribly","慌忙":"in a great rush; in a flurry",
"慢":"slow","慢慢":"slowly; gradually","慰问":"to express sympathy, greetings, consolation etc","懂":"to understand; to comprehend",
"懂得":"to understand; to know; to comprehend","戏":"trick; drama","戏剧":"a drama; a play; theater; script of a play","成":"surname Cheng; short name for Chengdu 成都[Cheng2 du1]",
"成为":"become; turn into","成交":"to complete a contract; to reach a deal","成人":"to reach adulthood; an adult","成功":"succeed; success",
"成员":"member","成就":"accomplishment; success","成效":"effect; result","成本":"(manufacturing, production etc) costs",
"成果":"result; achievement","成熟":"mature; ripe; to mature; to ripen","成立":"to establish; to set up","成绩":"grade; result; achievement",
"成语":"Chinese set expression, typically of 4 characters, often alluding to a story or historical quotation; idiom; proverb; saying; adage","成长":"grow up; develop","我":"I; me","我们":"we; us",
"戒":"to guard against; to exhort","或":"maybe; perhaps","或是":"or; either one or the other","或者":"or; possibly; maybe; perhaps",
"或许":"perhaps; maybe","战争":"war; conflict","战士":"fighter; soldier","战斗":"to fight; to engage in combat",
"战胜":"to prevail over; to defeat","戴":"surname Dai","户":"a household; door","房东":"landlord",
"房子":"house","房屋":"house; building","房租":"rent for a room or house","房间":"room",
"所":"actually; place","所以":"so; therefore; consequently","所在":"place; location","所长":"what one is good at",
"扇":"to fan; to slap sb on the face","扇子":"fan","手套":"glove; mitten","手工":"handwork; manual",
"手指":"finger","手术":"(surgical) operation; surgery","手机":"mobile phone","手段":"method; way; means (of doing sth); skill; ability",
"手法":"technique; trick","手续":"procedure; formalities","手表":"wristwatch","手里":"in hand; (a situation is) in sb's hands",
"才":"only then; just now; only","才能":"talent; ability","打":"(loanword) dozen; Taiwan pr. [da3]","打击":"to hit; to strike",
"打包":"to wrap; to pack; to put leftovers in a doggy bag for take-out","打听":"to ask about; to make some inquiries","打工":"to work a temporary or casual job; (of students) to have a job outside of class time, or during vacation","打扫":"to clean; to sweep",
"打扮":"to decorate; to dress","打扰":"to disturb; to bother","打折":"to give a discount","打架":"to fight; to scuffle",
"打破":"to break; to smash","打算":"to plan; to intend","打败":"to defeat; to overpower","打针":"to give or get an injection",
"打雷":"to rumble with thunder; clap of thunder","扔":"to throw; to throw away","执行":"execute; carry out","扩大":"expand; enlarge",
"扩展":"expand; extend","扫":"to sweep (with a brush or broom); to sweep away; to wipe out; to get rid of","扮演":"to play the role of; to act","扶":"to support with the hand; to help sb up",
"批":"to ascertain; to act on","批准":"to approve; to ratify","批评":"criticize; criticism","找出":"to find; to search out",
"承办":"to undertake; to accept a contract","承受":"to bear; to support","承担":"to undertake; to assume (responsibility etc)","承认":"to admit; to concede",
"技巧":"skill; technique","技术":"technology; technique","技能":"technical ability; skill","抄":"to make a copy; to plagiarize",
"抄写":"to copy; to transcribe","把":"to hold; to grasp; to hold a baby in position to help it urinate or defecate","把握":"to grasp (also fig.); to seize","抓":"to grab; to catch",
"抓住":"to grab hold of; to capture","抓紧":"to keep a firm grip on; to pay close attention to","投":"to throw (sth in a specific direction: ball, javelin, grenade etc); to cast (a ballot)","投入":"to throw into; to put into",
"投诉":"to lodge a complaint","投资":"investment; to invest","折":"to snap; to break (a stick, a bone etc)","抢":"(literary) to knock against (esp. to knock one's head on the ground in grief or rage); opposite in direction; contrary",
"抢救":"to rescue","护士":"nurse","护照":"passport","报":"to report; to inform; to announce; to respond; to reply",
"报到":"to report for duty; to check in","报名":"to sign up; to enter one's name","报告":"report; tell; inform","报答":"to repay; to requite",
"报纸":"newspaper; newsprint","报警":"to sound an alarm; to report sth to the police","报道":"to report (news); report","披":"to drape over one's shoulders; to open",
"抬":"to lift; to raise","抬头":"to raise one's head; to look up; (fig.) to begin to emerge; to show signs of growth","抱":"to hold; to carry (in one's arms)","抱怨":"to complain; to grumble",
"押金":"deposit; down payment","抽":"to draw out; to pull out from in between","抽奖":"to draw a prize; a lottery","抽烟":"to smoke (tobacco)",
"担任":"to hold a governmental office or post; to assume office of","担保":"to guarantee; to vouch for","担心":"worry; be worried","拆":"to tear open; to tear down",
"拆除":"to tear down; to demolish","拉":"to pull; to play (a bowed instrument)","拉开":"to pull open; to pull apart","拍":"to pat; to clap",
"拍摄":"to take (a picture); to shoot (a film)","拍照":"to take a picture","拒绝":"refuse; reject","拔":"to pull up; to pull out",
"招呼":"to call out to; to greet","招手":"to wave; to beckon","招生":"to enroll new students; to get students","拜访":"to pay a visit; to call on",
"拥抱":"to embrace; to hug","拥有":"to have; to possess","括号":"parentheses; brackets","拼":"to piece together; to put together; to pool (resources etc); to share",
"拾":"to ascend in light steps","拿出":"to take out; to put out","拿到":"to get; to obtain","持续":"to continue; to persist",
"持续发展":"sustainable development","挂":"to hang; to suspend (from a hook etc); to hang up (the phone)","指":"finger; to point at or to","指出":"to indicate; to point out",
"指导":"guide; instruct; coach","指挥":"to conduct; to command","指标":"(production) target; quota; index; indicator","指甲":"fingernail",
"指示":"to point out; to indicate","指责":"to criticize; to find fault with","按":"to press; to push","按摩":"massage; to massage",
"按照":"according to; in accordance with","挑":"to carry on a shoulder pole; to choose","挑战":"challenge","挑选":"to choose; to select",
"挡":"to resist; to obstruct","挣":"used in 掙扎|挣扎[zheng1 zha2]","挣钱":"to make money","挤":"to crowd in; to cram in",
"振动":"to vibrate; to shake","挺":"straight; erect","挺好":"very good","损失":"loss; damage",
"损害":"harm; to damage","换":"to exchange; to change (clothes etc)","掉":"to fall; to drop","掌握":"master; grasp; know well",
"排":"to arrange in order; to line up; to exclude; to eliminate; to repel; to expel; to discharge","排列":"to arrange in order; (math.) permutation","排名":"to rank (1st, 2nd etc); ranking","排球":"volleyball",
"排队":"to line up","排除":"to eliminate; to remove","接":"to receive; to answer (the phone)","接下来":"to accept; to take",
"接到":"to receive (letter etc)","接受":"to accept (a suggestion, punishment, bribe etc); to acquiesce","接待":"to receive; to entertain; to host (guests, visitors or clients)","接触":"to touch; to contact",
"接近":"to approach; to get close to","接连":"on end; in a row","控制":"control; manage; regulate","推":"to push; to cut",
"推动":"promote; push forward; drive","推广":"to extend; to spread","推开":"to push open (a gate etc); to push away","推行":"to implement; to carry out; to introduce (a policy, system, reform etc); to promote; to advance (the practice of an art form, the use of a language etc)",
"推进":"to impel; to carry forward","推迟":"to postpone; to put off","推销":"to market; to sell","措施":"measure; step",
"描写":"to describe; to depict; to portray; depiction; portrayal","描述":"to describe; description","提":"used in 提防[di1 fang5] and 提溜[di1 liu5]","提供":"provide; supply",
"提倡":"to promote; to advocate","提出":"to raise (an issue); to propose","提到":"to mention; to raise (a subject)","提前":"to shift to an earlier date; to do sth ahead of time",
"提升":"improve; promote; enhance","提示":"to point out; to remind (sb of sth)","提起":"to mention; to bring up; (lit. and fig.) to lift; to raise","提醒":"to remind; to call attention to",
"提问":"to question; to quiz; to grill","提高":"improve; raise","插":"to insert; stick in","握":"to hold; to grasp; to clench (one's fist)",
"握手":"to shake hands","搜":"to search","搜索":"to search (a place, a database, online etc); to search for (sth)","搞":"to do; to make",
"搞好":"to do well at; to do a good job","搬":"to move (i.e. relocate oneself); to move (sth relatively heavy or bulky)","搬家":"to move house; to relocate; to remove (sth)","摄像":"to videotape",
"摄像机":"video camera","摄影":"to take a photograph; photography","摄影师":"photographer; cinematographer; cameraman","摆":"to arrange; to exhibit",
"摆动":"to sway; to swing","摆脱":"to break away from; to cast off (old ideas etc)","摇":"surname Yao","摇头":"to shake one's head",
"摔":"to throw down; to fall","摔倒":"to fall down; to slip and fall","摘":"to take; to pick (flowers, fruit etc); to pluck; to remove; to take off (glasses, hat etc); to select; to pick out","摩托":"(loanword) motor; (loanword) motorbike; motorcycle (abbr. for 摩托車|摩托车[mo2 tuo1 che1])",
"摩擦":"friction; rubbing","摸":"to feel with the hand; to touch","播出":"to broadcast; to air (a TV program etc)","播放":"to broadcast; to transmit (by radio or TV)",
"操作":"operate; operation","操场":"playground","擦":"to rub; to scratch; to wipe; to polish","支":"surname Zhi",
"支付":"to pay (money)","支出":"expenditure","支持":"support; sustain","支配":"to control; to dominate",
"收":"to receive; to accept","收入":"income; revenue","收到":"to receive","收听":"to listen to (a radio broadcast)",
"收回":"to regain; to retake","收拾":"to put in order; to tidy up","收益":"earnings; profit","收看":"to watch (a TV program)",
"收获":"to harvest; to reap","收购":"to purchase or acquire in bulk or at an official level (esp. by a state or organization); to acquire or take over (a company or equity); acquisition; takeover","收费":"to charge a fee","收集":"to gather; to collect",
"收音机":"radio","改":"to change; to alter","改变":"change; alter; transform","改善":"to make better; to improve",
"改正":"to correct; to amend","改进":"improve; improvement","改造":"to transform; to reform","改革":"reform",
"放下":"to lay down; to put down; to let go of; to relinquish; to set aside","放到":"положить в, поместить","放大":"to enlarge; to magnify","放弃":"give up; abandon",
"放心":"to feel relieved; to feel reassured","放松":"relax; loosen","政府":"government","政治":"politics",
"政策":"policy","故乡":"home; homeland","故事":"story","故意":"deliberately; on purpose",
"效果":"effect; result; effectiveness","效率":"efficiency","敌人":"enemy","敏感":"sensitive; susceptible",
"救":"to save; to assist","救灾":"to relieve disaster; to help disaster victims","教学":"to teach (as a professor)","教室":"classroom",
"教师":"teacher","教授":"professor; to instruct","教材":"teaching material","教练":"to coach; to train; instructor; sports coach; trainer (CL:位[wei4],名[ming2])",
"教育":"educate; education","教训":"to provide guidance; to lecture sb; to upbraid; a talking-to; a bitter lesson","敢":"to dare; daring","散":"scattered; loose",
"散文":"(broadly) prose (as opposed to verse); (more narrowly) free-form literary prose, such as essays, sketches and reflections","散步":"to take a walk; to go for a walk","数":"to count; to count as; to regard as","数字":"numeral; digit",
"数学":"mathematics","数据":"data; statistics","数目":"amount; number","数码":"number; numerals",
"数量":"quantity; amount","敲":"to hit; to strike","敲门":"to knock on a door","整":"(bound form) whole; complete; entire; (before a measure word) whole; (before or after number + measure word) exactly; (bound form) in good order; tidy; neat",
"整体":"overall; whole; entirety","整合":"integrate; consolidate","整天":"all day long; whole day","整整":"whole; full",
"整理":"to arrange; to tidy up","整齐":"orderly; neat","文件":"document; file","文化":"culture",
"文字":"character; script","文学":"literature","文明":"civilized; civilization","文章":"article; essay",
"文艺":"literature and art","斜":"inclined; slanting","斤":"catty; (PRC) weight equal to 500 g","断":"to break; to snap",
"新":"new","新型":"new type; new kind","新娘":"bride","新年快乐":"Happy New Year",
"新郎":"bridegroom; groom","新闻":"news","新鲜":"fresh (experience, food etc); freshness","方":"surname Fang",
"方便":"convenient; handy","方便面":"instant noodles","方向":"direction; orientation","方式":"way; method; manner",
"方案":"plan; scheme","方法":"method; approach; technique","方针":"policy; guidelines","旁":"one side; other",
"旅客":"traveler; tourist","旅游":"trip; journey","旅行":"to travel; journey; trip","旅行社":"travel agency",
"旅馆":"hotel","无":"used in 南無|南无[na1 mo2]","无奈":"to have no alternative; frustrated","无所谓":"to be indifferent; not to matter",
"无数":"countless; numberless","无法":"unable to; incapable of","无疑":"undoubtedly; without doubt; for sure","无聊":"bored; boring",
"无论":"no matter; regardless of","无限":"unlimited; unbounded","既":"already; since","既然":"since; as; this being the case",
"日":"day; sun","日历":"calendar","日子":"day; a (calendar) date","日常":"day-to-day; daily; everyday",
"日报":"daily newspaper","日记":"diary","日语":"Japanese language","旧":"old; used",
"早上":"morning","早上好":"good morning","早就":"already at an earlier time","早已":"for a long time; long since; (dialect) in the past",
"早期":"early period; early phase; early stage","早餐":"breakfast","时事":"current trends; the present situation; how things are going","时代":"Time, US weekly news magazine",
"时光":"time; era","时刻":"time; juncture","时常":"often; frequently","时机":"opportunity; opportune moment",
"时间":"time","明亮":"bright; shining","明天":"tomorrow","明明":"obviously; plainly",
"明星":"star; celebrity","明显":"obvious; apparent; clear","明白":"understand; clear","明确":"clear-cut; definite; explicit; to clarify; to specify; to make definite",
"星星":"star","星期":"week","星期一":"Monday","星期三":"Wednesday",
"星期二":"Tuesday","星期五":"Friday","星期六":"Saturday","星期四":"Thursday",
"星期日":"Sunday","春天":"spring (season)","春季":"springtime","春节":"Spring Festival (Chinese New Year)",
"昨天":"yesterday","是":"be; am; is; are","是否":"whether (or not); if","显":"to make visible; to reveal",
"显得":"to seem; to look","显然":"clearly; evidently; obviously","显示":"show; display; demonstrate","显著":"outstanding; notable",
"晒":"(of the sun) to shine on; to bask in (the sunshine)","晚上":"evening; night","晚上好":"good evening","晚会":"evening party",
"晚安":"good night","晚报":"evening newspaper; (in a newspaper's name) Evening News","晚点":"(of trains etc) late; delayed","晚餐":"evening meal; dinner",
"普及":"to spread extensively; to generalize","普通":"ordinary; common; usual","普通话":"Mandarin (common language); Putonghua (common speech of the Chinese language)","普遍":"universal; general",
"景色":"scenery; landscape; view","景象":"scene; sight (to behold)","晴":"clear; fine (weather)","晴天":"clear sky; sunny day",
"晴朗":"sunny and cloudless","智力":"intelligence; intellect","智能":"intelligent; able","暂停":"to suspend; time-out (e.g. in sports)",
"暂时":"temporary; provisional; for the time being","暑假":"summer vacation","暖":"warm","暖和":"warm; nice and warm",
"暖气":"central heating; heater","暗":"dark; to turn dark","暗示":"to hint; to suggest; hint; suggestion","更":"to change or replace; to experience",
"更加":"more (than sth else); even more","更换":"to replace (a worn-out tire etc); to change (one's address etc)","更新":"to replace the old with new; to renew","曾":"surname Zeng",
"替":"to substitute for; to take the place of","替代":"replace; substitute; alternative","最初":"first; primary","最近":"recently; soon",
"月":"month","月亮":"moon","月底":"end of the month","月球":"the moon",
"月饼":"mooncake (esp. for the Mid-Autumn Festival)","有":"have; there is","有利":"advantageous; favorable","有利于":"to be advantageous to; to be beneficial for",
"有力":"powerful; forceful","有劲儿":"сильный; энергичный; интересный","有害":"destructive; harmful","有意思":"interesting; meaningful",
"有效":"effective; in effect","有毒":"poisonous","有点儿":"slightly; a little","有的是":"have plenty of; there's no lack of",
"有着":"to have; to possess","有空儿":"erhua form of 有空[you3 kong4]","有趣":"interesting; fascinating; amusing","有限":"limited; finite",
"朋友":"friend","服从":"to obey (an order); to comply","服务":"service","服务员":"waiter; attendant",
"服装":"dress; clothing","朗读":"to read aloud","朝":"abbr. for 朝鮮|朝鲜[Chao2 xian3] Korea","期":"period; cycle",
"期中":"interim; midterm","期待":"to look forward to; to await","期望":"expect; hope","期末":"the end of a term or semester (in school)",
"期间":"period of time; time","期限":"time limit; deadline","木头":"slow-witted; blockhead","未必":"not necessarily; maybe not",
"未来":"future","未来发展":"future development","末":"tip; end","本事":"source material; original story",
"本人":"I; me; myself; oneself; yourself; himself; herself; the person concerned","本子":"notebook","本科":"undergraduate course; undergraduate (attributive)","本领":"skill; ability",
"朵":"flower; earlobe","机会":"opportunity; chance","机制":"mechanism","机器":"machine; machinery",
"机器人":"robot; android","机场":"airport","机构":"mechanism; structure","机遇":"opportunity; favorable turn of events; stroke of luck",
"杀":"to kill; to slay; to murder; to attack; to weaken; to reduce","杀毒":"to disinfect; (computing) to destroy a computer virus","杂志":"magazine","权利":"right; entitlement",
"材料":"material; data; ingredient","村":"village; (dialect) to scold","束":"surname Shu","条":"strip; item",
"条件":"condition; requirement; terms","来":"come; arrive","来不及":"there's not enough time (to do sth); it's too late","来信":"incoming letter; to send us a letter",
"来得及":"to have enough time; can do it in time; can still make it","来源":"source (of information etc); origin","来自":"come from; be from","松":"surname Song",
"松树":"pine; pine tree","板":"board; plank","极":"extremely; pole (geography, physics)","构成":"to constitute; to form",
"构造":"structure; composition","果实":"fruit; result","果汁":"juice","果然":"really; sure enough",
"枪":"surname Qiang","架":"to support; frame","某":"some; a certain","染":"to dye; to catch (a disease)",
"柜子":"cupboard; cabinet","查":"surname Zha","查询":"to check; to inquire","标准":"standard; criterion",
"标志":"sign; mark; symbol; logo; to symbolize; to indicate; to mark","标题":"title; heading","树":"tree","树叶":"tree leaves",
"树林":"Shulin city in New Taipei City 新北市[Xin1 bei3 shi4], Taiwan","校园":"campus","校长":"(college, university) president; headmaster","样子":"appearance; manner",
"根":"root; basis","根据":"according to; based on","根本":"fundamental; basic","桃":"peach",
"桃树":"peach tree","桃花":"peach blossom; (fig.) love affair","桌子":"table; desk","桥":"bridge",
"梦":"dream (CL:場|场[chang2]); (bound form) to dream","梦想":"(fig.) to dream of; dream","梦见":"to dream about (sth or sb); to see in a dream","梨":"pear",
"检查":"check; examine; inspect","检测":"to detect; to test","检验":"to inspect; to examine","棒":"stick; club",
"森林":"forest","棵":"classifier for trees, cabbages, plants etc","椅子":"chair","植物":"plant; vegetation",
"楼梯":"stair; staircase","概念":"concept; idea","概括":"to summarize; to generalize; briefly; in broad outline","模仿":"to imitate; to copy",
"模型":"model; mold","模式":"mode; pattern; model","模样":"look; style","模特儿":"(fashion) model (loanword)",
"模糊":"vague; indistinct; fuzzy; to blur; to obscure; to confuse; to mix up","模范":"model; fine example","橙子":"orange (fruit)","橙色":"orange",
"欠":"to owe; to lack","欢乐":"gaiety; gladness","欢迎":"to welcome; welcome","欣赏":"to appreciate; to enjoy; to admire",
"歇":"to rest; to take a break","歌声":"singing voice; fig. original voice of a poet","歌手":"singer","歌曲":"song",
"歌迷":"fan of a singer","正义":"justice; righteousness","正好":"just (in time); just right","正如":"just as; precisely as",
"正常":"regular; normal","正式":"formal; official","正是":"is precisely","正版":"genuine; legal",
"正确":"correct; right","正规":"regular; according to standards","此":"this; these","此刻":"this moment; now",
"此后":"after this; afterwards","此时":"now; this moment","步":"surname Bu","步行":"to go on foot; to walk",
"武器":"weapon; arms","武术":"military skill or technique (in former times); all kinds of martial art sports (some claiming spiritual development)","死":"to die; impassable","死亡":"die; death",
"段":"surname Duan","每":"each; every","毒":"poison; to poison","比例":"proportion; scale",
"比分":"score (of a game or competition)","比如":"for example; for instance; such as","比如说":"for example","比方":"analogy; instance",
"比赛":"competition (sports etc); match","比较":"compare; comparison; relatively","比重":"proportion; specific gravity","毕业":"graduation; to graduate",
"毕业生":"graduate","毕竟":"after all; all in all","毛":"hair; ten cents","毛巾":"towel",
"毛病":"fault; defect","毛笔":"writing brush","毛衣":"(wool) sweater","毫升":"milliliter",
"毫米":"millimeter","民族":"nationality; ethnic group","民间":"among the people; popular","气":"gas; air; smell",
"气体":"gas (i.e. gaseous substance)","气候":"climate; atmosphere","气温":"air temperature","气球":"balloon",
"气象":"meteorological condition; weather; meteorology","水":"water; river","水产品":"aquatic products (including fish, crabs, seaweed etc)","水分":"moisture content; (fig.) overstatement",
"水平":"level; standard","水库":"reservoir","水果":"fruit","水灾":"flood; flood damage",
"永远":"forever; eternal","求":"to seek; to look for","汇":"to remit; to converge (of rivers)","汇报":"to report; to give an account of",
"汇款":"to remit money; remittance","汇率":"exchange rate","汉语":"Chinese language","汗":"perspiration; sweat",
"江":"surname Jiang; (bound form) Yangtze River","池子":"pond; bathhouse pool","污染":"(lit. and fig.) to pollute; to contaminate","污水":"sewage",
"汤":"surname Tang","汽水":"soda pop; carbonated soft drink","汽油":"gasoline","汽车":"car; automobile",
"汽车站":"bus station","沉":"to submerge; to immerse","沉重":"heavy; hard","沉默":"taciturn; uncommunicative",
"沙发":"(loanword) sofa (CL:條|条[tiao2],張|张[zhang1]); (Internet slang) first reply to a forum post","沙子":"sand; grit","沙漠":"desert","沟":"ditch; gutter",
"沟通":"communicate; liaison","没关系":"it doesn't matter; never mind","没想到":"didn't expect","没法儿":"(coll.) can't do anything about it; (coll.) there's no way that ...; it's simply not credible that ...",
"没用":"useless","没错":"that's right; sure!","没问题":"no problem; sure","河":"river",
"油":"oil; fat","治":"to rule; to govern","治安":"law and order; public security","治理":"to govern; to administer",
"治疗":"to treat (an illness); medical treatment","泉":"spring (small stream); mouth of a spring","法":"France; French","法制":"legal system and institutions",
"法官":"judge (in court)","法律":"law; legislation","法规":"legislation; statute","法语":"French language",
"法院":"court of law; court","注册":"to register; to enroll","注射":"injection; to inject","注意":"pay attention; notice",
"注视":"to look attentively at; to closely watch; to gaze at","注重":"to pay attention to; to emphasize","泪":"(bound form) tears; teardrops","泪水":"teardrop; tears",
"泼":"to splash; to spill","洒":"to sprinkle; to spray","洗澡":"to bathe; to take a shower","洗衣机":"washing machine; washer",
"洞":"cave; hole","活":"to live; alive","活力":"energy; vitality","活泼":"lively; vivacious",
"派":"used in 派司[pa1 si5]","流":"to flow; to disseminate","流传":"to spread; to circulate","流利":"fluent",
"流动":"to flow; to circulate","流行":"(of a contagious disease etc) to spread; to propagate","流通":"to circulate; to distribute; circulation; distribution","浅":"sound of moving water",
"测":"to survey; to measure","测试":"test; examine","测量":"survey; to measure","浓":"concentrated; dense",
"浪漫":"romantic","浪费":"to waste; to squander","海":"sea; ocean","海关":"customs (i.e. border crossing inspection)",
"海水":"seawater","海边":"coast; seaside; seashore; beach","海鲜":"seafood","消化":"to digest (food); (fig.) to absorb (information etc); to assimilate; to process",
"消失":"disappear; vanish","消息":"(piece of) news; information; message","消极":"negative; passive","消毒":"to disinfect; to sterilize",
"消费":"consume; consumption","消费者":"consumer","消防":"firefighting; fire control","消除":"to eliminate; to remove",
"涨":"to rise (of prices, rivers)","涨价":"to appreciate (in value); to increase in price","淡":"insipid; diluted","深":"(lit. and fig.) deep",
"深入":"to penetrate deeply; thorough","深刻":"profound; deep","深化":"deepen; intensify","深厚":"deep; profound",
"深处":"abyss; depths","深度":"depth; (of a speech etc) profundity","清晨":"early morning","清楚":"clear; distinct",
"清理":"to clear up; to tidy up","清醒":"clear-headed; sober","渐渐":"gradually","温和":"mild; gentle",
"温度":"temperature","温暖":"warm","渴望":"to thirst for; to long for","游":"surname You",
"游客":"traveler; tourist; (online gaming) guest player","游戏":"game (CL:場|场[chang3]); to play","游泳":"swimming; to swim","游泳池":"swimming pool",
"湖":"lake","湿":"moist; wet","滑":"surname Hua","滚":"to boil; to roll",
"满":"Manchu ethnic group","满意":"satisfied; pleased; content","满足":"satisfy; meet; be content","漂亮":"pretty; beautiful; good-looking",
"漏":"to leak; to divulge","漏洞":"leak; hole","演":"to perform (a play etc); to stage (a show); (bound form) to develop; to play out; to carry out (a task)","演出":"to act (in a play); to perform",
"演员":"actor; actress; performer","演唱":"to sing (for an audience); vocal performance","演唱会":"vocal recital or concert","演讲":"to give a lecture; to make a speech",
"漫画":"caricature; cartoon","漫长":"very long; endless","潮":"tide; damp; moist; humid","潮流":"tide; current",
"潮湿":"damp; moist","激动":"to move emotionally; to stir up (emotions)","激烈":"(of competition or fighting) intense; fierce","火":"surname Huo",
"火柴":"match (for lighting fire)","火灾":"serious fire (in a city or a forest etc)","火腿":"ham","火车":"train",
"火车站":"train station","灯":"lamp; light","灯光":"(stage) lighting; light","灰色":"gray; ash gray",
"灾":"disaster; calamity","灾区":"disaster area; stricken region","灾害":"calamity; disaster","灾难":"disaster; catastrophe",
"点名":"roll call; to mention sb by name","点头":"to nod","点燃":"to ignite; to set on fire","烂":"soft; mushy; well-cooked and soft",
"烟":"cigarette or pipe tobacco; smoke","烤肉":"to barbecue meat; to roast meat; barbecued meat; roast meat","烤鸭":"roast duck","烦":"to feel vexed; to bother",
"烧":"to burn; to cook","热":"hot","热心":"enthusiastic; ardent; zealous","热情":"enthusiastic; warm; passionate",
"热烈":"enthusiastic; ardent","热爱":"to love ardently; to adore","热量":"heat; quantity of heat","热门":"popular; hot; in vogue",
"热闹":"bustling with noise and excitement; lively","煤":"coal","煤气":"coal gas; gas (fuel)","照":"to shine; to illuminate",
"照片":"photo; picture","照相":"to take a photograph","照顾":"take care of; look after","熊":"surname Xiong",
"熊猫":"panda","熟":"ripe; mature; thoroughly cooked; done","熟人":"acquaintance; friend","熟悉":"to be familiar with; to know well",
"熟练":"practiced; proficient","燃料":"fuel","燃烧":"to ignite; to combust","爬":"to crawl; to climb",
"爬山":"to go for a hike (esp. in the hills or mountains)","爱人":"spouse (PRC); lover (non-PRC)","爱国":"to love one's country; patriotic","爱心":"compassion; kindness",
"爱情":"romance; love (romantic)","爱护":"to cherish; to treasure","爷爷":"grandfather (paternal)","爸爸":"father; dad",
"片":"disk; sheet","片面":"unilateral; one-sided","版":"a register; block of printing","牌":"signboard; plaque; plate; tablet (CL:塊|块[kuai4]); brand; trademark",
"牌子":"sign; trademark","牙":"tooth; ivory","牙刷":"toothbrush","牛":"cow; ox",
"牛仔裤":"jeans","牛奶":"milk","牛肉":"beef","物业":"property; real estate",
"物价":"(commodity) prices","物理":"physics","物质":"matter; substance","特价":"special price",
"特别":"special; particular; especially","特定":"special; specific; designated; particular","特征":"characteristic; diagnostic property","特性":"property; characteristic",
"特有":"specific (to); characteristic (of)","特殊":"special; particular","特点":"characteristic; feature; trait","特色":"a characteristic; a distinctive feature or quality",
"状况":"condition; state; situation","状态":"condition; state; state of affairs","犹豫":"to hesitate","狂":"mad; wild",
"狗":"dog","独特":"unique; distinctive","独立":"independent; independence","独自":"alone",
"狮子":"lion","猜":"to guess","猜测":"to guess; to conjecture","猪":"pig",
"猪肉":"pork","猫":"cat","献":"to offer; to present","猴":"monkey",
"率先":"to take the lead; to show initiative","率领":"to lead; to command","玉":"jade","玉米":"corn; maize",
"王":"surname Wang","玩具":"plaything; toy","环":"surname Huan","环保":"environmental protection; environmentally friendly",
"环境":"environment; surroundings","环节":"(zoology) segment (of the body of a worm, centipede etc); (fig.) a part of an integrated whole: aspect (of a project), element (of a policy), sector (of the economy), stage (of a process) etc","现代":"modern; contemporary","现在":"now",
"现场":"the scene (of a crime, accident etc); (on) the spot","现实":"reality; actuality; real; actual","现有":"currently existing; currently available","现状":"current situation",
"现象":"phenomenon; appearance","现金":"cash","玻璃":"glass; (slang) male homosexual","珍惜":"to treasure; to value",
"珍珠":"pearl (CL:顆|颗[ke1],粒[li4]); (fig.) teardrop; tear","珍贵":"precious","班级":"class (group of students); grade (in school)","班长":"class monitor; squad leader",
"球场":"stadium; sports ground","球迷":"fan (ball sports)","球队":"sports team (basketball, soccer, football etc)","球鞋":"athletic shoes",
"理发":"to get a haircut; to have one's hair done; to cut (sb's) hair; to give (sb) a haircut","理想":"an ideal; a dream","理由":"reason; grounds","理解":"understand; comprehend",
"理论":"theory; to argue","琴":"guqin 古琴[gu3 qin2] (a type of zither); musical instrument in general","瓜":"melon; gourd; squash; (slang) a piece of gossip","瓶":"bottle; vase",
"瓶子":"bottle","甚至":"even; so much so that","甜":"sweet","生":"to grow; to give birth; to produce; to be born; to arise; to occur",
"生产":"produce; production","生动":"(of descriptions, writing etc) vivid; lively","生命":"life; existence","生存":"to exist; to survive",
"生意":"life force; vitality","生成":"to generate; to produce; to form; to be formed; to come into being; to be born with; to be blessed with","生日快乐":"happy birthday","生气":"be angry; get angry",
"生活":"life; living; live","生物":"biology","生词":"new word (in textbook); word that is unfamiliar or not yet studied","生长":"grow; grow up",
"用":"use; employ","用不着":"not need; have no use for","用于":"to use in; to use on; to use for","用户":"user; consumer",
"用途":"use; application","由":"to follow; from","由于":"due to; as a result of","甲":"first of the ten Heavenly Stems 十天干[shi2 tian1 gan1]; (used for an unspecified person or thing)",
"申请":"to apply for sth; application form (CL:份[fen4])","电动车":"electric vehicle (commonly refers to e-bikes, scooters or electric cars)","电台":"transmitter-receiver; broadcasting station","电子版":"electronic edition; digital version",
"电子邮件":"email","电影":"movie; film","电梯":"elevator; escalator","电池":"battery; electric cell",
"电源":"electric power source","电灯":"electric light","电脑":"computer","电视":"television; TV",
"电视剧":"TV series; TV drama","电视台":"television station","电话":"telephone; phone","电饭锅":"electric rice cooker",
"男士":"man; gentleman","男女":"male-female; male and female","男子":"a man; a male","男性":"the male sex; a male",
"画":"painting; draw","画儿":"picture; drawing","画家":"painter; artist","画面":"scene; tableau",
"留":"to leave (a message etc); to retain","留下":"to leave behind; to stay behind","留学":"to study abroad","留学生":"student studying abroad; returned student; foreign student; international student",
"疑问":"question; interrogation","疗养":"to get well; to heal","疯":"insane; mad","疯狂":"crazy; frenzied; wild",
"疼":"(it) hurts; sore; to love dearly","病毒":"virus","痛":"ache; pain","痛快":"delighted; to one's heart's content",
"痛苦":"painful; suffering; pain","瘦":"thin; to lose weight","登":"to scale (a height); to ascend","登山":"to climb a mountain; climbing",
"登录":"to register; to log in","登记":"to register (one's name)","白色":"white","白菜":"Chinese cabbage, esp. napa cabbage (Brassica rapa subsp. pekinensis); sometimes used to refer to bok choy (Brassica rapa subsp. chinensis)",
"白酒":"baijiu, a spirit usually distilled from sorghum; (Tw) white wine (abbr. for 白葡萄酒[bai2 pu2 tao5 jiu3])","百":"hundred","百货":"general merchandise","的":"(particle)",
"的确":"really; indeed","的话":"if (coming after a conditional clause)","皮":"surname Pi","皮包":"handbag; briefcase",
"皮肤":"skin","皮鞋":"leather shoes","盆":"basin; flower pot","盐":"salt",
"盒":"small box; case","盒子":"box; case; hezi – a savory turnover-like pie in northern Chinese and Mongolian cuisines","盒饭":"meal in a partitioned box","盖":"surname Ge",
"盘":"tray; plate; dish; (finance) (bound form) market prices","盘子":"tray; plate","目光":"gaze; (fig.) attention; expression in one's eyes; look","目前":"at the present time; currently",
"目标":"goal; target; objective","目的":"purpose; aim; goal","直":"surname Zhi; Zhi (c. 2000 BC), fifth of the legendary Flame Emperors 炎帝[Yan2 di4] descended from Shennong 神農|神农[Shen2 nong2] Farmer God","直到":"until",
"直接":"direct (opposite: indirect 間接|间接[jian4 jie1]); immediate","直播":"(TV, radio) to broadcast live; live broadcast","直线":"straight line; sharply (rise or fall)","相互":"each other; mutual",
"相似":"similar; alike","相信":"believe; trust","相关":"related; relevant; associated","相反":"opposite; contrary",
"相同":"same; identical; alike","相声":"comic dialogue; sketch","相处":"to be in contact (with sb); to associate","相应":"to correspond; answering (one another)",
"相机":"camera (abbr. for 照相機|照相机[zhao4 xiang4 ji1]); at the opportune moment","相比":"to compare","相片":"image; photograph","相等":"equal; equally",
"省":"to save; to economize; to be frugal; to omit; to delete; to leave out","看":"look; see; watch","看上去":"it would appear; it seems (that)","看不起":"to look down upon; to despise",
"看出":"to make out; to see","看待":"to look upon; to regard","看成":"to regard as","看望":"to pay a visit to; to see (sb)",
"看法":"way of looking at a thing; view","真实":"true; real","真正":"real; genuine; true","真理":"truth",
"真的":"really; truly","真相":"the truth about sth; the actual facts","真诚":"sincere; genuine; true","眼光":"gaze; insight",
"眼前":"before one's eyes; now","眼泪":"tear; teardrop","眼里":"в глазах","眼镜":"spectacles; eyeglasses",
"着急":"to worry; to feel anxious; to feel a sense of urgency; to be in a hurry","着火":"to catch fire","睡眠":"sleep; to sleep","睡着":"to fall asleep",
"瞧":"to look at; to see","矛盾":"contradiction; conflicting views","知道":"know; be aware of","短":"short",
"短信":"text message; SMS","短处":"shortcoming; defect","短期":"short-term","短裤":"short pants; shorts",
"矮":"(of a person) short; (of a wall etc) low","矮小":"short and small; low and small","石头":"stone","石油":"oil; petroleum",
"矿泉水":"mineral water","码头":"wharf; dock; quay; pier","研制":"to research and manufacture; to research and to develop","研究":"research; study",
"研究所":"research institute; graduate studies","破":"broken; damaged","破产":"to go bankrupt; to become impoverished","破坏":"destruction; damage",
"硕士":"master's degree; person who has a master's degree","硬":"hard; stiff; solid; (fig.) strong; firm","硬件":"hardware","确保":"ensure; make sure",
"确定":"definite; certain","确实":"indeed; really","确立":"to establish; to institute","确认":"to confirm; to verify",
"碎":"(transitive or intransitive) to break into pieces; to shatter; to crumble; broken; fragmentary; scattered","碗":"bowl; cup","碰":"to touch; to meet with","碰到":"to come across; to run into",
"碰见":"to run into; to meet (unexpectedly)","示范":"to demonstrate; to show how to do sth","礼":"surname Li; abbr. for 禮記|礼记[Li3 ji4], Classic of Rites","礼拜":"to attend a religious service; (coll.) week",
"礼物":"gift; present","礼貌":"courtesy; politeness; manners; courteous; polite","社":"(bound form) society; organization; agency; (old) god of the land","社会":"society; social",
"社会发展":"social development","社区":"community; neighborhood","祝":"surname Zhu","祝你健康":"wish you good health",
"祝福":"blessings; to wish sb well","祝贺":"to congratulate; congratulations","神":"God","神奇":"magical; mystical",
"神情":"look; expression","神秘":"mysterious; mystery","神经":"nerve; mental state","神话":"legend; fairy tale",
"票价":"ticket price; fare; admission fee","禁止":"to prohibit; to forbid","福":"surname Fu; abbr. for Fujian province 福建省[Fu2 jian4 Sheng3]","福利":"material benefit; benefit in kind",
"离":"mythical beast (archaic)","离不开":"inseparable; inevitably linked to","离婚":"to divorce","离开":"leave; depart from",
"私人":"private; personal","秋天":"autumn","秋季":"autumn; fall","种":"seed; species",
"种子":"seed","种植":"to plant; to grow (a crop); to cultivate","种类":"kind; genus","科":"branch of study; administrative section",
"科学":"science","科技":"science and technology","秒":"second (unit of time); arc second (angular measurement unit)","秘书":"secretary",
"秘密":"secret; private; confidential; clandestine; a secret","租":"to hire; to rent","积极":"positive; active; enthusiastic","积累":"to accumulate; accumulation",
"称":"to fit; to match; to suit; (coll.) to have; to possess","称为":"to be called; to be known as; to call it \"...\"","称号":"name; term of address","称赞":"to praise; to commend; to compliment",
"移":"to move; to shift","移动":"to move; movement","移民":"to immigrate; to migrate","程序":"procedures; sequence",
"程度":"degree; extent; level","稍":"somewhat; a little","稍微":"a little bit","稳":"settled; steady; stable",
"稳定":"steady; stable","究竟":"to go to the bottom of a matter; after all","穷":"poor; destitute","穷人":"poor people; the poor",
"空":"empty; air","空中":"in the sky; in the air","空儿":"spare time; free time","空气":"air; atmosphere",
"空调":"air conditioning; air conditioner (including units that have a heating mode)","空间":"space; room; (fig.) scope; leeway","穿上":"to put on (clothes etc)","突出":"prominent; outstanding",
"突然":"sudden; abrupt; unexpected","突破":"to break through; to make a breakthrough","窗":"window","窗台":"windowsill; window ledge",
"窗子":"window","窗帘":"window curtains","窗户":"window","立":"surname Li",
"立场":"position; standpoint","站住":"to come to a stop; to halt; to keep one's footing; to stay upright","竞争":"compete; competition","竞赛":"to compete; to race; contest; competition; match; race",
"竟然":"unexpectedly; to one's surprise","童年":"childhood","童话":"children's fairy tales","竹子":"bamboo",
"笑话":"joke; jest; to laugh at; to mock","笑话儿":"erhua variant of 笑話|笑话[xiao4 hua5]","笔":"pen; pencil","笔记":"to take down (in writing); notes",
"笔记本":"notebook (stationery) (CL:本[ben3]); (computing) laptop; notebook (abbr. for 筆記本電腦|笔记本电脑[bi3 ji4 ben3 dian4 nao3])","符号":"symbol; mark; sign","符合":"in accordance with; to agree with; to conform to; to meet (a requirement); (physics) coincidence","笨":"stupid; foolish",
"等于":"to equal; to be tantamount to","等候":"to wait; to wait for","等到":"to wait until; by the time when (sth is ready etc)","等待":"to wait; to wait for",
"等级":"grade; rank","答":"bound form having the same meaning as the free word 答[da2], used in 答應|答应[da1 ying5], 答理[da1 li5] etc","答复":"to answer; to reply","答应":"to answer; to respond; to answer positively; to agree; to accept; to promise",
"答案":"answer; solution","策略":"strategy; tactics","筷子":"chopsticks","签":"to sign one's name; to write brief comments on a document",
"签名":"to sign (one's name with a pen etc); to autograph","签字":"to sign (one's name); signature","签约":"to sign a contract or agreement","签订":"to agree to and sign (a treaty etc)",
"签证":"visa; to issue a visa","简单":"simple; easy; not complex","简历":"curriculum vitae (CV); résumé","简直":"simply; really",
"算":"to regard as; to figure","管":"surname Guan","管理":"manage; management; administer","箱":"box; trunk",
"箱子":"suitcase; chest","篇":"sheet; piece of writing","篮球":"basketball","米":"surname Mi",
"米饭":"steamed rice","类":"kind; type; class; category; (classifier) kind; type","类似":"similar; alike; analogous","类型":"type; kind; category; (computer programming) type",
"粉色":"pink","粗":"(of sth long) wide; thick; (of sth granular) coarse","粗心":"careless; thoughtless","粮食":"foodstuff; cereals",
"精力":"energy","精彩":"wonderful; marvelous","精神":"spirit; mind","糖":"sugar; sweets",
"糟":"dregs; draff","糟糕":"too bad; how terrible","系":"to connect; to relate to","系列":"series; set",
"系统":"system","紧":"tight; strict","紧密":"inseparably close","紧张":"nervous; tense; intense",
"紧急":"urgent; emergency","紧紧":"closely; tightly","紫":"purple; violet","紫色":"purple",
"繁荣":"prosperous; booming","红包":"money wrapped in red as a gift; bonus payment","红色":"red","红茶":"black tea",
"红酒":"red wine","约":"to weigh in a balance or on a scale","约会":"appointment; engagement","约束":"to restrict; to limit to",
"级":"level; grade","纪录":"рекорд; записывать","纪律":"discipline","纪念":"to commemorate; to honor the memory of; memento; keepsake; souvenir",
"纯":"pure; simple","纯净水":"purified water","纷纷":"one after another; in succession","纸":"paper",
"线":"thread; string","线索":"trail; clues","练":"to practice; to train","练习":"exercise; practice",
"组":"surname Zu","组合":"to assemble; to combine; to compose; combination; association; set; compilation","组成":"to form; to make up","组织":"organize; organization",
"组长":"group leader","细":"thin or slender; finely particulate","细致":"delicate; fine","细节":"details; particulars",
"终于":"at last; in the end","终止":"to stop; to terminate","终点":"the end; end point","终身":"lifelong; all one's life",
"经典":"the classics; scriptures","经历":"experience; go through","经济":"economy; economic","经济发展":"economic development",
"经理":"manager; director","经营":"to engage in (business etc); to run; to operate","经费":"funds; expenditure","经过":"pass; go through; after; through",
"经验":"experience; knowledge from experience","结":"(of a plant) to produce (fruit or seeds); Taiwan pr. [jie2]","结合":"to combine; to link","结婚":"to marry; to get married",
"结实":"to bear fruit","结束":"end; finish; conclude","结构":"structure; composition; framework","结果":"result; outcome; consequence",
"结论":"conclusion; verdict","绕":"to wind; to coil (thread)","给":"give; for","绝对":"absolute; unconditional",
"绝望":"to despair; to give up all hope","统一":"to unify; to integrate; unified; integrated","统计":"statistics; to count","继承":"to inherit; to succeed to (the throne etc)",
"继续":"continue; go on","维修":"maintenance (of equipment); to protect and maintain","维护":"maintain; upkeep; safeguard","维持":"maintain; keep up",
"综合":"comprehensive; composite","绿色":"green","绿茶":"green tea; (slang) (of a girl) seemingly innocent and charming but actually calculating and manipulative; a girl who has these qualities","缓解":"to bring relief; to alleviate (a crisis)",
"编":"to weave; to plait","编辑":"to edit; to compile","缩小":"to reduce; to decrease; to shrink","缩短":"to shorten; to reduce; to curtail",
"缺":"deficiency; lack","缺乏":"to lack; to be short of","缺少":"lack; shortage of","缺点":"disadvantage; shortcoming; weakness",
"网":"net; web; network","网址":"website; web address","网球":"tennis; tennis ball","网站":"website",
"网络":"network; internet","罚":"to punish; to penalize; to fine","罚款":"to fine; penalty","羊":"sheep; goat",
"美丽":"beautiful","美元":"American dollar; US dollar","美女":"beautiful woman","美好":"beautiful; fine",
"美术":"fine arts","美金":"US dollar; USD","美食":"culinary delicacy; fine food","群":"group; crowd",
"群众":"mass; multitude","群体":"community; colony","羽毛球":"badminton; shuttlecock","羽绒服":"down-filled garment",
"翻":"to turn over; to flip over","翻译":"to translate; to interpret","老人":"elderly person","老公":"(coll.) husband",
"老太太":"elderly lady (respectful); esteemed mother","老头儿":"старик; пожилой мужчина (разговорное)","老婆":"(coll.) wife","老实":"honest; sincere; well-behaved",
"老家":"native place; place of origin","老师":"teacher","老年":"elderly; autumn of one's years","老是":"always",
"老朋友":"(slang) period; menstruation","老板":"Robam (brand)","老百姓":"ordinary people; the \"person in the street\"","老虎":"tiger",
"考察":"to inspect; to observe and study","考核":"to examine; to check up on","考生":"exam candidate; student whose name has been put forward for an exam","考虑":"to think over; to consider",
"考试":"exam; examination; test","考验":"to test; to put to the test","者":"(after a verb or adjective) one who (is) ...; (after a noun) person involved in ...","而":"and; as well as",
"而且":"furthermore; moreover; and","而是":"but rather; but instead","耐心":"to be patient; patience","耳机":"headphones; earphones",
"职业":"occupation; profession","职位":"position; post; job","职务":"post; position","职工":"employee; staff member; worker",
"职能":"function; role","联合":"to combine; to join","联合国":"United Nations","联想":"Lenovo",
"联系":"contact; connection; relate","联络":"to get in touch with; to contact","聚":"to assemble; to gather (transitive or intransitive); (chemistry) poly-","聚会":"party; gathering",
"聪明":"clever; smart","肌肉":"muscle; flesh","肚子":"belly; abdomen","肠":"intestines",
"肥":"fat; fertile","肩":"shoulder; to shoulder (responsibilities etc)","肯定":"to be certain; to be positive; assuredly; definitely","胃":"stomach",
"胆":"gall bladder; courage","胆小":"cowardice; timid","背":"to carry on one's back; (fig.) to bear; to shoulder (a burden, blame etc)","背包":"knapsack; rucksack",
"背后":"behind; at the back","背景":"background; backdrop; context; (fig.) powerful backer","胖":"healthy; at ease","胖子":"fat person; fatty",
"胜":"victory; success","胜利":"victory","胜负":"victory or defeat; the outcome of a battle","胡同儿":"erhua form of 胡同[hu2 tong4]",
"胡子":"beard; mustache or whiskers","胶带":"adhesive tape; magnetic tape","胶水":"glue","胸部":"chest; bosom",
"能":"can; be able to; may","能不能":"можно ли, возможно ли","能力":"ability; capability; competence","能够":"to be capable of; to be able to",
"能干":"capable; competent","能源":"energy; energy source","能量":"energy; capabilities","脆":"brittle; fragile",
"脏":"viscera; (anatomy) organ","脑子":"brains; mind","脑袋":"head; skull","脚步":"footstep; step",
"脱":"to shed; to take off","脱离":"to separate oneself from; to break away from","脸盆":"washbowl; basin for washing hands and face","脸色":"complexion; look",
"脾气":"character; temperament; disposition; bad temper","腰":"the waist and lower back; (bound form) kidney of an animal (as food)","腿":"leg","自":"(bound form) self; oneself; from; since",
"自主":"to act independently; to be autonomous; to be in control of one's own affairs","自从":"since (a time); ever since","自信":"to have confidence in oneself; self-confidence","自动":"automatic; voluntarily",
"自愿":"voluntary","自杀":"to kill oneself; to commit suicide","自然":"nature; natural","自由":"free; freedom; liberty",
"自行车":"bicycle","自觉":"to realize; to be aware of; to feel that; to be conscious of (sth relating to oneself); responsible; predisposed to do the right thing; considerate of others","自豪":"proud (of one's achievements etc)","自身":"itself; oneself",
"臭":"stench; smelly","至":"to arrive; most","至今":"so far; to this day","至少":"at least; (to say the) least",
"舍不得":"to hate to do sth; to hate to part with","舍得":"to be willing to part with sth","舒服":"comfortable; feeling well","舒适":"comfortable",
"舞":"to dance; to wield","舞台":"(lit. and fig.) stage; arena","航班":"(scheduled) flight; (scheduled) sailing","航空":"aviation",
"船":"boat; vessel","良好":"good; favorable","艰苦":"difficult; hard","艰难":"difficult; hard",
"色":"color; look","色彩":"tint; coloring; coloration; (fig.) flavor; character","艺术":"art","节":"joint; node; (bound form) section; segment",
"节日":"holiday; festival","节目":"(TV or radio) program; show; item; act; segment; number (on the program of a concert, variety show or cultural event)","节省":"saving; to save","节约":"to economize; to conserve (resources)",
"花":"flower","花园":"garden (for flowers, ornamental plants etc); (landscaped) park; yard with decorative plants","苦":"bitter; hardship","英勇":"heroic; gallant",
"英文":"English (written)","英语":"English language","苹果":"apple","范围":"scope; range; extent",
"茶":"tea","茶叶":"tea; tea leaves","草":"grass","草原":"grassland; prairie",
"草地":"lawn; meadow","药":"leaf of the iris","药店":"pharmacy; drugstore","药水":"Yaksu in North Korea, near the border with Liaoning and Jiling province",
"药片":"a (medicine) pill or tablet","药物":"medicaments; pharmaceuticals","获":"(literary) to catch; to capture; (literary) to get; to obtain; to win","获取":"to gain; to get; to acquire",
"获奖":"to win an award","获得":"to obtain; to receive; to get","菜单":"menu","营业":"to do business; to trade",
"营养":"nutrition; nourishment","落":"to leave out; to be missing","落后":"to fall behind; to lag (in technology etc)","落实":"practical; workable",
"著作":"to write; literary work","葡萄":"grape","葡萄酒":"(grape) wine","蓝色":"blue",
"蔬菜":"vegetables","薄":"surname Bo","薄弱":"weak; frail","虎":"tiger",
"虚心":"open-minded; humble","虫子":"insect; bug","虽然":"although; though; even though","蛇":"snake; serpent",
"蛋":"egg; oval-shaped thing","蛋糕":"cake","血":"blood; colloquial pr. [xie3]","行业":"trade; profession; industry; business",
"行为":"action; conduct","行人":"pedestrian; traveler on foot","行动":"operation; action","行李":"luggage",
"行驶":"to travel along a route (of vehicles etc)","街":"street","街道":"street","衣服":"clothes; clothing",
"衣架":"clothes hanger; clothes rack","补":"to repair; to patch","补偿":"to compensate; to make up","补充":"to replenish; to supplement",
"补贴":"to subsidize; subsidy","表":"exterior surface; family relationship via females","表情":"(facial) expression; to express one's feelings","表扬":"to praise; to commend",
"表明":"to make clear; to make known","表格":"form; table","表演":"play; show","表现":"to show; to show off",
"表示":"express; indicate; show","表达":"express; convey","表面":"surface; face","衬衣":"shirt",
"衬衫":"shirt; blouse","袋":"pouch; bag","袜子":"socks","被":"quilt; to cover (with)",
"被动":"passive","被子":"blanket; quilt","被迫":"to be compelled; to be forced","裁判":"(law) to judge; to adjudicate; verdict; judgement; (sports) to referee",
"装":"adornment; to adorn","装修":"to decorate; interior decoration","装置":"to install; installation","裙子":"skirt",
"裤子":"trousers; pants","西北":"Northwest China (Shaanxi, Gansu, Qinghai, Ningxia, Xinjiang)","西医":"Western medicine; a doctor trained in Western medicine","西南":"southwest",
"西方":"the West; the Occident","西瓜":"watermelon","西红柿":"tomato","西装":"suit; Western-style clothes",
"西部":"western part","西餐":"Western-style food","要是":"(coll.) if","要求":"require; demand; request",
"见到":"to see","见过":"видел раньше, встречал","观众":"spectators; audience; visitors (to an exhibition etc)","观察":"observe; observation",
"观念":"notion; thought","观点":"point of view; viewpoint","观看":"to watch; to view","规划":"to draw up a plan; to map out a program; a plan; a program",
"规则":"rule; regulation","规定":"to stipulate; to specify; to prescribe; to fix (a price); to set (a quota); regulations; rules; provisions; stipulations","规律":"rule (e.g. of science); law of behavior","规模":"scale; scope; extent",
"规范":"norm; standard","视为":"to view as; to see as","视频":"video","觉得":"feel; think",
"角":"surname Jue","角度":"angle; point of view","角色":"role; part (in a play or movie etc)","解决":"solve; settle; resolve",
"解决方案":"solution","解开":"to untie; to undo","解放":"to liberate; to emancipate","解除":"to remove; to sack",
"言语":"words; speech","警告":"to warn; to admonish","警察":"police officer","计划":"plan; intend; schedule",
"计算":"to calculate; to compute; to consider; to think over","计算机":"computer; (Tw) calculator","订":"to agree; to conclude","认":"to recognize; to know",
"认为":"think; believe; consider","认出":"recognition; to recognize","认可":"to approve; approval","认定":"to maintain (that sth is true); to determine (a fact)",
"认得":"to recognize; to remember sth (or sb) on seeing it","认真":"serious; earnest; conscientious","认识":"know; understand; recognize","讨厌":"to dislike; to loathe",
"讨论":"discuss; discussion; debate","让":"to yield; to permit","训练":"to train; to drill","议论":"to comment; to talk about",
"记录":"record; log","记得":"remember","记忆":"memory; remember","记者":"journalist",
"记载":"to write down; to record","讲座":"course of lectures; lecture series; chair (academic position)","讲究":"to pay particular attention to; carefully selected for quality","讲话":"a speech; to speak",
"许可":"to allow; to permit","论文":"paper; treatise","设备":"equipment; device","设想":"to imagine; to assume",
"设施":"facilities; installation","设立":"to set up; to establish","设置":"to set up; to install","设计":"design; plan; conceive",
"访问":"to visit; to call on (a person or place); (computing) to visit (a website); to access (a network resource etc)","证":"to admonish","证书":"credentials; certificate","证件":"certificate; papers; credentials; document; ID",
"证实":"to confirm (sth to be true); to verify","证据":"evidence; proof","证明":"prove; proof; demonstrate","评价":"evaluate; assess; comment",
"评估":"evaluate; assess","评论":"to comment on; to discuss","诊断":"to diagnose","词":"word; statement; speech; lyrics",
"词典":"dictionary","词汇":"vocabulary; list of words (e.g. for language teaching purposes)","词语":"word; term; expression","试卷":"examination paper; test paper",
"试图":"to attempt; to try","试题":"exam question; test topic","试验":"experiment; test","诗":"abbr. for Shijing 詩經|诗经[Shi1 jing1], the Book of Songs",
"诗人":"bard; poet","诗歌":"poem","诚信":"honesty; trustworthiness; good faith","诚实":"honest; truthful; sincere",
"话剧":"stage play; modern drama","话题":"subject (of a talk or conversation); topic","询问":"to inquire","该":"should; ought to",
"详细":"detailed; in detail","语文":"Chinese language (subject)","语法":"grammar","语言":"language",
"语音":"speech sounds; pronunciation","误会":"to misunderstand; to mistake","误解":"to misunderstand; misunderstanding","说":"say; speak",
"说不定":"can't say for sure; maybe","说明":"explain; description; instructions","说服":"to persuade; to convince","说法":"to expound Buddhist teachings",
"请":"please; invite; request","请客":"to give a dinner party; to entertain guests","请教":"to ask for guidance; to consult","请求":"to request; to ask; request (CL:個|个[ge4])",
"读者":"reader","读音":"pronunciation; literary (rather than colloquial) pronunciation of a Chinese character","课堂":"classroom (CL:間|间[jian1]); class session","课程":"course; academic program",
"课题":"task; problem","谁":"who","调":"to transfer; to move (troops or cadres)","调动":"to transfer; to maneuver (troops etc)",
"调整":"adjust; regulate","调查":"investigate; survey","调皮":"naughty; mischievous","调节":"to adjust; to regulate",
"调解":"to mediate; to bring parties to an agreement","谈":"surname Tan","谈判":"to negotiate; negotiation","谈话":"to talk (with sb); to have a conversation",
"谢谢":"thank you; thanks","豆制品":"legume-based product; soybean product","豆腐":"tofu; bean curd","象征":"symbol; emblem; to symbolize; to signify; to represent",
"负担":"to bear (an expense, a responsibility etc); burden","负责":"responsible; be in charge","负责人":"person in charge","财产":"property; assets",
"财富":"wealth; riches","责任":"responsibility; duty; obligation","败":"to defeat; to damage","货":"goods; money",
"质量":"quality","购买":"to purchase; to buy","购物":"shopping","贴":"to stick; to paste",
"贷款":"a loan; to provide a loan (e.g. bank)","贸易":"trade; commerce","费":"surname Fei","费用":"cost; expense; fee",
"贺卡":"greeting card; congratulation card","资料":"data; material; information","资格":"qualifications; seniority","资源":"resource",
"资金":"funds; capital","赏":"to bestow (a reward); to give (to an inferior)","赔":"to compensate for loss; to indemnify","赔偿":"to compensate",
"赞助":"to support; to assist","赞成":"to approve; to endorse","赞赏":"to admire; to praise","赠":"to give as a present; to repel",
"赠送":"to present as a gift","赢":"to beat; to win","赢得":"to win; to gain","走":"walk; go",
"走向":"walk towards; tend towards","走开":"to leave; to walk away; to beat it; to move aside","走过":"to walk past; to pass by","走进":"to enter; to step into",
"赶":"to overtake; to catch up with; to hurry; to rush","赶到":"to hurry (to some place)","起到":"(in an expression of the form 起到[qi3 dao4] + … + 作用[zuo4 yong4]) to have (a (motivating etc) effect); to play (a (stabilizing etc) role)","起码":"at the minimum; at the very least",
"起飞":"(of an aircraft or rocket) to take off; to lift off; (fig.) (of an enterprise etc) to start to develop rapidly","超市":"supermarket","超级":"super-; ultra-","超越":"to surpass; to exceed; to transcend",
"超过":"exceed; surpass","越":"generic word for peoples or states of south China or south Asia at different historical periods; abbr. for Vietnam 越南","越来越":"more and more","趋势":"trend; tendency",
"足够":"enough; sufficient","足球":"soccer; football; a soccer ball; a football","跑步":"to run; to jog","距离":"distance; to be apart from",
"跟前":"the front (of); (in) front","跟随":"to follow","路线":"itinerary; route","路边":"curb; roadside; wayside",
"跳":"to jump; to hop","跳舞":"to dance","跳远":"long jump (athletics)","跳高":"(athletics) high jump",
"身份":"identity; aspect of one's identity (e.g. mayor, father, permanent resident); role; capacity (as in \"in his capacity as ...\" 以[yi3] + ... + 的身份[de5 shen1 fen4]); status (social, legal etc); position; rank","身份证":"identity card; ID","身材":"stature; build (height and weight)","身边":"at one's side; on hand",
"身高":"(a person's) height","躲":"to hide; to dodge","躺":"to recline; to lie down","车主":"vehicle owner",
"车辆":"vehicle","转":"to turn; to change direction","转动":"to turn sth around; to swivel","转化":"to change; to turn; to convert; (genetics) to transform",
"转变":"transform; change; shift","转告":"to pass on; to communicate","转弯":"to turn; to go around a corner","转换":"to change; to switch",
"转移":"to shift; to relocate; to transfer; (fig.) to shift (attention); to change (the subject etc)","转身":"(of a person) to turn round; to face about","轮":"wheel; disk; ring; steamship","轮子":"wheel; (derog.) Falun Gong practitioner",
"轮椅":"wheelchair","轮船":"steamship; steamer; steamboat","软":"soft; flexible","软件":"(computer) software",
"轻":"light; easy","轻易":"easy; simple; rashly; offhandedly","轻松":"light; gentle","较":"(bound form) to compare; (literary) to dispute",
"辅助":"to assist; to aid; supplementary; auxiliary","辆":"classifier for vehicles","辈":"lifetime; generation","输":"to lose; to be beaten; (bound form) to transport",
"输入":"to import; to input","输出":"to output; to deliver (energy, data, signals etc); to export (goods, services, technology etc)","辛苦":"exhausting; hard","辞典":"dictionary (variant of 詞典|词典[ci2 dian3])",
"辞职":"to resign","辣":"hot (spicy); pungent","辩论":"debate; argument","边":"side; edge",
"边境":"frontier; border","达到":"reach; achieve","达成":"to reach (an agreement); to accomplish","迅速":"rapid; speedy",
"过于":"excessively; too","过分":"excessive; undue; unduly; overly","过去":"past; go past; pass","过年":"to celebrate the Chinese New Year",
"过度":"excessive; over-","过敏":"(medicine) allergic; hypersensitive; (fig.) oversensitive; prone to overreact","过来":"come over","过程":"process; course; procedure",
"迎接":"to welcome; to greet","运":"to move; to transport","运动":"to move; to exercise","运动会":"sports competition",
"运动员":"athlete; sportsman","运气":"luck (good or bad)","运用":"to use; to put to use","运行":"(of celestial bodies etc) to move along one's course; (fig.) to function; to be in operation",
"运输":"to transport; to carry","近代":"the not-very-distant past; modern times, excluding recent decades","近期":"near in time; in the near future","近来":"recently; lately",
"返回":"to return to; to come (or go) back","还":"still; also; yet","还是":"still; or; had better","这":"this",
"这个":"this; this one","这时候":"в этот момент; в это время","进一步":"to go a step further; (develop, understand, improve etc) more; further","进入":"enter; go into",
"进化":"evolution","进口":"import","进展":"to make headway; to make progress","进步":"progress; improvement",
"进行":"carry out; conduct","远处":"distant place","违反":"to violate (a law)","违法":"illegal; to break the law",
"违规":"to violate the rules","连":"surname Lian","连忙":"promptly; at once","连接":"to link; to join; to connect",
"连续":"continuous; in a row","连续剧":"serialized drama; dramatic series","迟":"surname Chi","迟到":"to arrive late",
"迫切":"urgent; pressing","迷":"to bewilder; crazy about","迷人":"fascinating; enchanting","迷信":"superstition; to have a superstitious belief (in sth)",
"追":"to sculpt; to carve","追求":"to pursue (a goal etc) stubbornly; to seek after","退":"to retreat; to withdraw; to reject; to return (sth)","退休":"to retire (from the workforce); to go into retirement",
"退出":"to withdraw; to abort","送到":"доставить (куда-либо); довезти до","送给":"to send; to give as a present","适合":"to fit; to suit",
"适应":"adapt; adjust to","适用":"to be applicable","逃":"to escape; to run away","逃走":"to escape; to flee",
"逃跑":"to flee from sth; to run away","选":"to choose; to pick","选修":"(at a school) to take as an elective; an elective","选手":"athlete; contestant",
"选择":"choose; select; choice","透":"(bound form) to penetrate; to seep through; to tell secretly; to leak","透明":"transparent; (fig.) transparent; open to scrutiny","逐步":"progressively; step by step",
"逐渐":"gradually","递":"to hand over; to pass on; to deliver; (bound form) progressively; in the proper order","递给":"to hand it (i.e. the aforementioned item) to (sb)","途中":"en route",
"通":"to go through; to know well","通信":"to correspond (by letter, email etc); to send or receive messages through telecommunications","通常":"regular; usual; normal; usually; normally","通用":"to use anywhere, anytime (card, ticket etc); to be used by everyone (language, textbook etc)",
"通知":"to notify; to inform","通知书":"written notice","通过":"pass through; by means of","逛":"to stroll; to visit",
"速度":"speed; rate","造":"to make; to build","造型":"to model; to shape; appearance; style; design; form; pose","造成":"to bring about; to create; to cause",
"逻辑":"(loanword) logic","遇":"surname Yu","遇到":"to meet; to run into; to come across","遇见":"to meet",
"遍":"everywhere; all over","道":"road; path (CL:條|条[tiao2],股[gu3]); (bound form) way; reason; principle","道德":"virtue; morality","道理":"reason; argument",
"道路":"road; path","遗产":"heritage; legacy","遗传":"heredity; to inherit (a trait)","遵守":"to comply with; to abide by; to respect (an agreement)",
"避":"to avoid; to shun","避免":"avoid; prevent","邀请":"to invite; invitation","那":"that",
"那个":"that; that one","那会儿":"at that time (in the past or the future)","那时候":"at that time","邮件":"mail; post",
"邮票":"(postage) stamp","邮箱":"mailbox; post office box","邻居":"neighbor","郊区":"Jiao District or Jiaoqu, a district of Tongling City 銅陵市|铜陵市[Tong2 ling2 Shi4], Anhui; Jiao District or Jiaoqu, a district of Jiamusi City 佳木斯市[Jia1 mu4 si1 Shi4], Heilongjiang",
"部":"ministry; department","部位":"part (esp. of the body, but also of a vegetable, e.g. the root, or a garment, e.g. the sleeve, etc)","部分":"part; portion; piece; Taiwan pr. [bu4fen4]","部长":"head of a (government etc) department; section chief",
"部门":"department; branch","都":"all; both; already","配":"to join; to fit","配合":"matching; fitting in with",
"配备":"to allocate; to provide","配套":"to form a complete set; compatible","酒":"wine (esp. rice wine); liquor","酒吧":"bar (place to buy drinks)",
"酒店":"wine shop; pub (public house)","酒鬼":"drunkard","酸":"sour; tart","酸奶":"yogurt",
"酸甜苦辣":"lit. sour, sweet, bitter and spicy (idiom); fig. all kinds of flavors; the joys and sorrows of life","醉":"intoxicated","醒":"to wake up; to be awake","采取":"to adopt or carry out (measures, policies, course of action); to take",
"采用":"to adopt; to employ","采访":"to interview; to gather news","采购":"to procure (for an enterprise etc); to purchase","里头":"inside; interior",
"重复":"to repeat; to duplicate","重大":"great; important","重点":"to recount (e.g. results of election); to re-evaluate","重要":"important; significant",
"重视":"value; attach importance to","重量":"weight","量":"to measure","金":"surname Jin; surname Kim (Korean)",
"金牌":"gold medal","针":"needle; pin","针对":"to target; to focus on; to be aimed at or against; in response to","钢琴":"piano",
"钢笔":"fountain pen","钱":"money","铁":"surname Tie","铁路":"railroad; railway",
"铃":"(small) bell","铃声":"ring; ringtone","银":"silver; silver-colored","银牌":"silver medal",
"银行":"bank","银行卡":"bank card","销售":"to sell; to market","锁":"to lock; to lock up; a lock (CL:把[ba3])",
"锅":"pot; pan; wok; cauldron; pot-shaped thing","错误":"mistake; error; wrong","键":"key (on a piano or computer keyboard); button (on a mouse or other device)","键盘":"keyboard",
"锻炼":"to toughen; to temper","镜头":"camera lens; camera shot (in a movie etc)","镜子":"mirror","长":"long",
"长处":"good aspects; strong points","长大":"to grow up","长寿":"longevity; long-lived","长度":"length",
"长期":"long-term; for a protracted period","长途":"long distance; long-distance phone call (abbr. for 長途電話|长途电话[chang2 tu2 dian4 hua4])","门":"door; gate","门诊":"outpatient service",
"闪":"surname Shan","闪电":"lightning","闭幕":"the curtain falls; lower the curtain","闭幕式":"closing ceremony",
"问候":"to give one's respects; to send a greeting","问路":"to ask for directions; to ask the way (to some place)","问题":"problem; question; issue","闯":"to rush; to charge",
"闲":"enclosure; (variant of 閒|闲[xian2]) idle","间接":"indirect","闹":"noisy; cacophonous","闹钟":"alarm clock",
"闻":"surname Wen","阅览室":"reading room","阅读":"to read; reading","队":"squadron; team",
"队员":"team member","队长":"captain; team leader","防":"to protect; to defend","防止":"prevent; avoid",
"防治":"to prevent and cure; prevention and cure","阳光":"sunshine; (of personality) upbeat; energetic","阳台":"balcony; porch","阴":"surname Yin",
"阴天":"cloudy day; overcast sky","阵":"disposition of troops; wave","阶段":"stage; section","阻止":"to prevent; to block",
"阻碍":"to obstruct; to hinder","阿姨":"maternal aunt; step-mother","附件":"appendix (in a document); enclosure (accompanying a document)","附近":"nearby; neighboring; (in the) vicinity (of); neighborhood",
"陆地":"dry land (as opposed to the sea)","陆续":"in turn; successively","降":"to drop; to fall","降价":"to cut the price; to drive down the price",
"降低":"to reduce; to lower; to bring down","降温":"to become cooler; to lower the temperature","降落":"to descend; to land","限制":"to restrict; to limit",
"院":"courtyard; institution","院子":"courtyard; garden","院长":"the head of an institution whose name ends in 院[yuan4]; chair of a board; university president; college dean; premier of the Republic of China","除了":"except; besides; apart from",
"除夕":"lunar New Year's Eve","除非":"only if (..., or otherwise, ...); only when","陪":"to accompany; to keep sb company","随":"surname Sui",
"随便":"as one wishes; as one pleases","随后":"soon after","随意":"as one wishes; according to one's wishes","随手":"conveniently; without extra trouble",
"随时":"at any time; at all times; at the right time; whenever necessary","随着":"along with; in the wake of","隔":"to separate; to partition","隔壁":"next door; neighbor",
"隔开":"to separate","难以":"hard to (predict, imagine etc)","难免":"hard to avoid; difficult to escape from","难受":"to feel unwell; to suffer pain",
"难听":"unpleasant to hear; coarse","难度":"degree of difficulty","难得":"seldom; rare","难看":"ugly; unsightly",
"难过":"sad; feel bad; sorry","难道":"don't tell me ...; could it be that...?","难题":"difficult problem","雄伟":"grand; imposing",
"集中":"to concentrate; to centralize","集体":"collective (decision); joint (effort)","集合":"to gather; to assemble; (math.) set","集团":"group; bloc",
"雨":"rain","雨水":"Yushui or Rain Water, 2nd of the 24 solar terms 二十四節氣|二十四节气 19th February-5th March","雪":"snow","零下":"below zero; sub-zero",
"零食":"snack; nibbles","需求":"requirement; to require","需要":"need; require; necessity","震惊":"to shock; to astonish",
"青":"abbr. for 青海[Qing1 hai3], Qinghai Province","青少年":"adolescent; youth","青年":"youth; youthful years","青春":"youth; youthfulness",
"静":"still; calm","非":"abbr. for 非洲[Fei1 zhou1], Africa","靠":"to lean against or on; to stand by the side of","靠近":"to be close to; to approach; to draw near",
"面":"face; side","面临":"to face sth; to be confronted with","面前":"in front of; facing","面包":"bread",
"面子":"outer surface; the outside of sth; social prestige; face","面对":"face; confront; deal with","面条":"noodles","面积":"area (of a floor, piece of land etc); surface area",
"面试":"to be interviewed (as a candidate); interview","面貌":"face; features; appearance; look","鞋":"shoe","鞋子":"shoes",
"韩语":"Korean language","音乐":"music","音乐会":"concert","音节":"syllable",
"顶":"apex; crown of the head","项":"surname Xiang","项目":"project; item","顺利":"smoothly; without a hitch",
"顺序":"sequence; order","顾客":"customer; client","顾问":"adviser; consultant","顿":"to stop; to pause",
"预习":"to prepare a lesson","预备":"to prepare; to make ready","预报":"forecast","预期":"to expect; to anticipate",
"预测":"to forecast; to predict","预计":"to forecast; to predict","预订":"to place an order; to book ahead","预防":"to prevent; to take precautions against",
"领":"neck; collar","领先":"to lead; to be in front","领导":"lead; leader; leadership","领带":"necktie",
"频繁":"frequently; often","频道":"frequency; (television) channel","颗":"classifier for small spheres, pearls, corn grains, teeth, hearts, satellites etc","题":"surname Ti",
"题材":"subject matter","题目":"subject; title; topic; exercise or exam question (CL:道[dao4])","颜色":"color","风":"wind",
"风俗":"social custom","风光":"scene; view","风度":"elegance (for men); elegant demeanor","风景":"scenery; landscape",
"风格":"style","风险":"risk; hazard","飞机":"airplane","飞行":"(of planes etc) to fly; flying",
"食品":"foodstuff; food; provisions","食堂":"cafeteria; canteen","食物":"food","餐厅":"restaurant",
"餐饮":"food and beverage; catering","饭":"cooked rice; meal","饭馆":"restaurant","饮料":"drink; beverage",
"饮食":"eating and drinking; food and drink; diet","饱":"to eat till full; satisfied","饺子":"dumpling; pot-sticker","饼":"round flat cake; cookie",
"饼干":"biscuit; cracker; cookie","首":"head; chief","首先":"first (of all); in the first place","首都":"capital (city)",
"香":"fragrant; sweet smelling","香肠":"sausage","香蕉":"banana","马":"horse",
"驾照":"driver's license (abbr. for 駕駛執照|驾驶执照[jia4 shi3 zhi2 zhao4])","驾驶":"to drive (vehicle); to pilot (ship, airplane etc); driver; pilot; captain","骂":"to scold; to abuse","骑":"(Tw) saddle horse; mounted soldier",
"骑车":"to ride a bike (motorbike or bicycle)","骗":"to cheat; to swindle","骗子":"swindler; a cheat","骨头":"bone; moral character",
"高":"tall; high","高于":"greater than; to exceed","高价":"high price","高兴":"happy; glad; pleased",
"高原":"plateau","高大":"tall; lofty; towering","高尚":"noble; lofty","高度":"height; altitude",
"高温":"high temperature","高潮":"high tide; high water; upsurge; peak of activity","高级":"high level; high grade","高跟鞋":"high-heeled shoes",
"高速":"high speed; expressway (abbr. for 高速公路[gao1 su4 gong1 lu4])","高速公路":"expressway; highway; freeway","高铁":"high speed rail","鬼":"disembodied spirit; ghost; devil; (suffix) person with a certain vice or addiction etc",
"鱼":"fish","鲜":"fresh; bright (in color)","鲜明":"(of colors) bright; fresh and clear; clear-cut; distinct","鲜艳":"bright-colored; gaily-colored",
"鲜花":"flower; fresh flowers","鸟":"bird","鸡":"chicken","鸡肉":"chicken (meat)",
"鸭子":"duck (CL:隻|只[zhi1]); (slang) male prostitute","麻烦":"trouble; troublesome","黄瓜":"cucumber","黄色":"yellow",
"黄金":"gold; golden (opportunity)","黑暗":"dark; darkly","黑色":"black","默默":"in silence; not speaking",
"鼓":"drum; to drum","鼓励":"to encourage","鼓掌":"to applaud; to clap","鼠":"(bound form) rat; mouse",
"鼠标":"(computing) mouse","鼻子":"nose","齐":"(name of states and dynasties at several different periods); surname Qi","齐全":"complete; comprehensive",
"龙":"surname Long"
};

/* ── Populate data-en on page load ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('[data-key]').forEach(function(tr){
    var key = tr.getAttribute('data-key');
    // Priority: data-en in HTML → EN_DICT → empty (never fall back to Russian)
    var en = (tr.getAttribute('data-en')||'').trim();
    if(!en) en = window.EN_DICT[key] || '';
    tr.setAttribute('data-en', en);
    var enSpan = tr.querySelector('.trans-en');
    if(enSpan) enSpan.textContent = en;
  });
});

/* ── Palette ──────────────────────────────────────────────────────────────── */
/* ── Manual EN overrides for words not in EN_DICT ───────────────── */
window.EN_DICT['现象'] = 'phenomenon; appearance';
window.EN_DICT['论文'] = 'paper; thesis; treatise';
window.EN_DICT['语音'] = 'speech sounds; pronunciation';
window.EN_DICT['院长'] = 'dean; president (of a college or institution)';
window.EN_DICT['乐趣'] = 'delight; pleasure; joy';
window.EN_DICT['即将'] = 'about to; on the point of; imminent';

var PALETTES = {
  rose:    ['#e94560','#c73652'],
  ocean:   ['#0077b6','#005f8e'],
  forest:  ['#2d6a4f','#1b4332'],
  ember:   ['#e76f51','#c45436'],
  plum:    ['#7b2d8b','#5c1f69'],
  slate:    ['#546e7a','#37474f'],
  citrus:   ['#f4a261','#d4843d'],
  coral:    ['#ff6b6b','#e85353'],
  midnight: ['#6c63ff','#4a43cc'],
  jade:     ['#00b894','#008f73'],
  sakura:   ['#e91e8c','#c01570'],
  gold:     ['#e6a817','#c48a00'],
  arctic:   ['#2196f3','#1565c0'],
  crimson:  ['#c0392b','#962d22'],
  teal:     ['#00838f','#005f6b']
};

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

/* ── Language switching (RU / EN) ────────────────────────────────────────── */
var currentLang = localStorage.getItem('hsk_lang') || 'ru';

var SECTION_NAMES_EN = {
  pos_noun: 'Nouns', pos_verb: 'Verbs', pos_adj: 'Adjectives',
  pos_adv: 'Adverbs', pos_mw: 'Measure Words', pos_particle: 'Particles',
  pos_conj: 'Conjunctions', pos_prep: 'Prepositions', pos_pron: 'Pronouns'
};
var SECTION_NAMES_RU = {
  pos_noun: 'Существительные', pos_verb: 'Глаголы', pos_adj: 'Прилагательные',
  pos_adv: 'Наречия', pos_mw: 'Счётные слова', pos_particle: 'Частицы и структурные слова',
  pos_conj: 'Союзы', pos_prep: 'Предлоги', pos_pron: 'Местоимения'
};

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
  if(sub) sub.innerHTML = isEn
    ? (_wc + ' words &nbsp;&middot;&nbsp; Grouped by part of speech')
    : (_wc + ' слов &nbsp;&middot;&nbsp; Сгруппировано по частям речи');

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
  /* HSK / Texts labels */
  var hskLbl = document.querySelector('#tb-row-hsk .tb-label');
  if(hskLbl) hskLbl.textContent = isEn ? 'HSK level:' : 'Уровень HSK:';
  var hskAll = document.querySelector('.hsk-btn[data-hsk=\"all\"]');
  if(hskAll) hskAll.textContent = isEn ? 'All' : 'Все';
  var textLbl = document.querySelector('#tb-row-texts .tb-label');
  if(textLbl) textLbl.textContent = isEn ? 'Texts:' : 'Тексты:';

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
  if(csvBtn){ csvBtn.title = isEn ? 'Export to Excel/CSV' : '\u042d\u043a\u0441\u043f\u043e\u0440\u0442 \u0432 Excel/CSV'; }/* sort buttons */
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
  if(btnPal)   btnPal.textContent   = isEn ? '🎨 Palette ▾' : '🎨 Палитра ▾';
  /* study / quiz buttons */
  var btnStudy = document.getElementById('btn-study');
  if(btnStudy){ btnStudy.textContent = isEn ? '📚 Study' : '📚 Учить'; btnStudy.title = isEn ? 'Flashcards' : 'Режим карточек'; }
  var btnQuiz = document.getElementById('btn-quiz');
  if(btnQuiz){ btnQuiz.textContent = isEn ? '🧩 Quiz' : '🧩 Тест'; btnQuiz.title = isEn ? 'Multiple choice quiz' : 'Тест с вариантами'; }


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
function updateWordCount(n){
  var el = document.getElementById('hsk-count-val');
  if(el) el.textContent = n;
}
function getVisibleRowCount(){
  var n = 0;
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
    if(tr.classList.contains('hsk-hide') || tr.classList.contains('pos-hide') ||
       tr.classList.contains('alpha-hide') || tr.classList.contains('text-hide') || tr.classList.contains('sr-hide')) return;
    n++;
  });
  return n;
}

/* ── Continuous row numbering across all visible rows ───────────── */
function renumVisible(){
  var n = 0;
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
    Array.prototype.forEach.call(tb.rows, function(tr){
      if(tr.classList.contains('hsk-hide') || tr.classList.contains('pos-hide') ||
         tr.classList.contains('alpha-hide') || tr.classList.contains('text-hide') || tr.classList.contains('sr-hide')) return;
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
var currentPOS = 'all';
var POS_LABELS_RU = {
  'all':'Все','pos_noun':'Сущ.','pos_verb':'Глаг.','pos_adj':'Прил.',
  'pos_adv':'Нар.','pos_mw':'Счётн.','pos_particle':'Частицы',
  'pos_conj':'Союзы','pos_prep':'Предл.','pos_pron':'Мест.'
};
var POS_LABELS_EN = {
  'all':'All','pos_noun':'Nouns','pos_verb':'Verbs','pos_adj':'Adj.',
  'pos_adv':'Adv.','pos_mw':'Measure','pos_particle':'Particles',
  'pos_conj':'Conj.','pos_prep':'Prep.','pos_pron':'Pron.'
};
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
function rebuildView(){
  var inp     = document.getElementById('search-input');
  var langSel = document.getElementById('search-lang');
  var rd      = document.getElementById('sort-respect-div');
  var q       = inp ? inp.value.trim() : '';
  var lang    = langSel ? langSel.value : 'ru';
  var bySection = !rd || rd.checked;
  var textFilterActive = !!window._textFilterActive;
  var forceFlat = (activeHSKLevels && activeHSKLevels.size > 0) || textFilterActive;
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
    if(!tr.classList.contains('hsk-hide') && !tr.classList.contains('pos-hide') && !tr.classList.contains('alpha-hide') && !tr.classList.contains('text-hide')) allRows.push(tr);
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

  if(textFilterActive && currentSort === 'default'){
    matched = sortRowsByHsk(matched, false);
  }

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

/* ── Flashcard study mode ──────────────────────────────────────── */
(function(){
  var deck=[], pos=0, known=0, learning=0, unknown=0;
  var overlay = document.getElementById('study-overlay');
  if(!overlay) return;
  var isEn = function(){ return document.body.classList.contains('lang-en'); };

  function rowVisible(tr){
    return !tr.classList.contains('sr-hide') &&
           !tr.classList.contains('hsk-hide') &&
           !tr.classList.contains('pos-hide') &&
           !tr.classList.contains('alpha-hide') &&
           !tr.classList.contains('text-hide');
  }

  function buildDeck(){
    deck = [];
    document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
      if(!rowVisible(tr)) return;
      deck.push(tr);
    });
    // shuffle
    for(var i=deck.length-1;i>0;i--){
      var j=Math.floor(Math.random()*(i+1));
      var tmp=deck[i];deck[i]=deck[j];deck[j]=tmp;
    }
  }

  function showCard(idx){
    if(!deck.length) return;
    var tr = deck[idx];
    var zh = tr.querySelector('.zh'); var py = tr.querySelector('.py');
    var trans = tr.querySelector(isEn()?'.trans-en':'.trans-ru');
    var ex = tr.querySelector('.ex-zh');
    document.getElementById('study-zh').textContent = zh ? zh.textContent : '';
    document.getElementById('study-py').textContent = py ? py.textContent : '';
    document.getElementById('study-trans').textContent = trans ? trans.textContent : '';
    document.getElementById('study-ex').textContent = ex ? ex.textContent : '';
    document.getElementById('study-pos').textContent = idx+1;
    document.getElementById('study-total').textContent = deck.length;
    document.getElementById('study-known').textContent = known;
    document.getElementById('study-learning').textContent = learning;
    document.getElementById('study-unknown').textContent = unknown;
    document.getElementById('study-back').style.display='none';
    document.getElementById('study-front').style.display='flex';
    document.getElementById('study-show').style.display='';
    document.getElementById('study-know').style.display='none';
    document.getElementById('study-learning').style.display='none';
    document.getElementById('study-dont').style.display='none';
    document.getElementById('study-summary').style.display='none';
    var pb = document.getElementById('study-prog-bar');
    if(pb && deck.length) pb.style.width = (idx/deck.length*100)+'%';
  }

  function showAnswer(){
    document.getElementById('study-back').style.display='flex';
    document.getElementById('study-show').style.display='none';
    document.getElementById('study-know').style.display='';
    document.getElementById('study-learning').style.display='';
    document.getElementById('study-dont').style.display='';
    speakZh(document.getElementById('study-zh').textContent);
  }

  function markRow(tr, status){
    if(!tr) return;
    var lcb = tr.querySelector('.learn-cb');
    var fcb = tr.querySelector('.fam-cb');
    if(status === 'learned' && lcb){
      lcb.checked = true;
      lcb.dispatchEvent(new Event('change', {bubbles:true}));
    } else if(status === 'fam' && fcb){
      fcb.checked = true;
      fcb.dispatchEvent(new Event('change', {bubbles:true}));
    }
  }

  function applyStatus(kind){
    var tr = deck[pos];
    if(kind === 'learned'){ known++; markRow(tr, 'learned'); }
    else if(kind === 'learning'){ learning++; markRow(tr, 'fam'); }
    else { unknown++; }
    pos++;
    if(pos >= deck.length){ showSummary(); return; }
    showCard(pos);
  }

  function showSummary(){
    document.getElementById('study-front').style.display='none';
    document.getElementById('study-back').style.display='none';
    document.getElementById('study-show').style.display='none';
    document.getElementById('study-know').style.display='none';
    document.getElementById('study-learning').style.display='none';
    document.getElementById('study-dont').style.display='none';
    document.getElementById('study-summary').style.display='flex';
    var pct = deck.length ? Math.round(known/deck.length*100) : 0;
    var isEnS = document.body.classList.contains('lang-en');
    document.getElementById('study-summary-text').innerHTML =
      (isEnS ? '<b>Known:</b> ' : '<b>Знаю:</b> ') + known + '/' + deck.length + ' (' + pct + '%)'
      + (isEnS ? '  &nbsp; <b>Learning:</b> ' : '  &nbsp; <b>Учусь:</b> ') + learning
      + (isEnS ? '  &nbsp; <b>Don\'t know:</b> ' : '  &nbsp; <b>Не знаю:</b> ') + unknown;
  }

  function openStudy(){
    buildDeck();
    pos=0; known=0; learning=0; unknown=0;
    if(!deck.length){ alert(isEn() ? 'No cards to study!' : 'Нет карточек для изучения!'); return; }
    overlay.style.display='flex';
    showCard(0);
  }

  function closeStudy(){
    overlay.style.display='none';
    stopAllAudio();
  }

  document.getElementById('btn-study').addEventListener('click', openStudy);
  document.getElementById('study-close').addEventListener('click', closeStudy);
  document.getElementById('study-close2').addEventListener('click', closeStudy);
  document.getElementById('study-show').addEventListener('click', showAnswer);
  document.getElementById('study-know').addEventListener('click', function(){ applyStatus('learned'); });
  document.getElementById('study-learning').addEventListener('click', function(){ applyStatus('learning'); });
  document.getElementById('study-dont').addEventListener('click', function(){ applyStatus('dont'); });
  document.getElementById('study-again').addEventListener('click', function(){
    pos=0; known=0; learning=0; unknown=0;
    for(var i=deck.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=deck[i];deck[i]=deck[j];deck[j]=tmp; }
    showCard(0);
  });
  document.getElementById('study-zh').addEventListener('click', function(){
    speakZh(this.textContent);
  });
  document.addEventListener('keydown', function(e){
    if(overlay.style.display==='none') return;
    if(e.key==='Escape'){ closeStudy(); return; }
    var back = document.getElementById('study-back');
    if(e.key===' '||e.key==='Enter'){
      if(back.style.display==='none') showAnswer(); else applyStatus('learned');
      e.preventDefault();
    }
    if(e.key==='ArrowRight' && back.style.display!=='none') applyStatus('learned');
    if(e.key==='ArrowDown' && back.style.display!=='none') applyStatus('learning');
    if(e.key==='ArrowLeft' && back.style.display!=='none') applyStatus('dont');
  });
})();
/* ── Multiple-choice quiz ──────────────────────────────────────── */
(function(){
  var deck=[], qPos=0, score=0, answered=false, statusChosen=false;
  var overlay = document.getElementById('quiz-overlay');
  if(!overlay) return;
  var setup = document.getElementById('quiz-setup');
  var main = document.getElementById('quiz-main');
  var quizLevels = new Set();
  var hidePy = false;

  function rowVisible(tr){
    return !tr.classList.contains('sr-hide') &&
           !tr.classList.contains('hsk-hide') &&
           !tr.classList.contains('pos-hide') &&
           !tr.classList.contains('alpha-hide') &&
           !tr.classList.contains('text-hide');
  }

  function getRows(){
    var rows=[];
    document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
      if(!rowVisible(tr)) return;
      if(quizLevels.size){
        var h = tr.getAttribute('data-hsk') || '';
        if(!quizLevels.has(h)) return;
      }
      rows.push(tr);
    });
    return rows;
  }

  function shuffle(arr){
    for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=arr[i];arr[i]=arr[j];arr[j]=t;}
    return arr;
  }

  function getText(tr, type){
    var isEn=document.body.classList.contains('lang-en');
    if(type==='zh') return (tr.querySelector('.zh')||{}).textContent||'';
    if(type==='py') return (tr.querySelector('.py')||{}).textContent||'';
    if(type==='trans') return (tr.querySelector(isEn?'.trans-en':'.trans-ru')||{}).textContent||'';
    return '';
  }

  function updatePinyinVisibility(){
    var py = document.getElementById('quiz-py');
    if(py) py.style.display = hidePy ? 'none' : '';
    var card = document.getElementById('quiz-card');
    if(card) card.classList.toggle('quiz-hide-py', hidePy);
    var btn = document.getElementById('quiz-toggle-py');
    if(btn) btn.textContent = hidePy ? 'Пиньинь: показать' : 'Пиньинь: скрыть';
  }

  function buildQuiz(){
    var all=shuffle(getRows().slice());
    var qs = parseInt((document.getElementById('quiz-size')||{value:'50'}).value)||50;
    deck=all.slice(0,Math.min(qs,all.length));
    qPos=0; score=0;
  }

  function showQuestion(idx){
    if(idx>=deck.length){showSummary();return;}
    answered=false; statusChosen=false;
    var tr=deck[idx];
    document.getElementById('quiz-pos').textContent=idx+1;
    document.getElementById('quiz-total').textContent=deck.length;
    document.getElementById('quiz-score').textContent=score;
    document.getElementById('quiz-zh').textContent=getText(tr,'zh');
    document.getElementById('quiz-py').textContent=getText(tr,'py');
    updatePinyinVisibility();
    document.getElementById('quiz-feedback').style.display='none';
    document.getElementById('quiz-feedback').className='';
    document.getElementById('quiz-summary').style.display='none';
    var qa = document.getElementById('quiz-actions');
    if(qa) qa.style.display='none';
    var nextBtn = document.getElementById('quiz-next');
    if(nextBtn) nextBtn.disabled = true;

    var all=getRows();
    var wrong=shuffle(all.filter(function(r){return r!==tr;})).slice(0,3);
    var choices=shuffle([tr].concat(wrong));
    var qc=document.getElementById('quiz-choices');
    qc.innerHTML='';
    choices.forEach(function(c){
      var btn=document.createElement('button');
      btn.className='quiz-choice';
      btn.textContent=getText(c,'trans');
      btn.addEventListener('click',function(){
        if(answered) return;
        answered=true;
        var isCorrect=c===tr;
        btn.classList.add(isCorrect?'correct':'wrong');
        if(!isCorrect){
          qc.querySelectorAll('.quiz-choice').forEach(function(b){
            if(b.textContent===getText(tr,'trans')) b.classList.add('reveal');
          });
        }
        var fb=document.getElementById('quiz-feedback');
        fb.style.display='block';
        if(isCorrect){
          score++;
          document.getElementById('quiz-score').textContent=score;
          fb.textContent='✓ Верно!';fb.className='ok';
        } else {
          fb.textContent='✗ Неверно';fb.className='err';
        }
                if(qa){ qa.style.display='flex'; qa.style.visibility='visible'; }
        try{ speakZh(getText(tr,'zh')); }catch(e){}
      });
      qc.appendChild(btn);
    });
  }

  function markRow(tr, status){
    if(!tr) return;
    var lcb = tr.querySelector('.learn-cb');
    var fcb = tr.querySelector('.fam-cb');
    if(status === 'learned' && lcb){
      lcb.checked = true;
      lcb.dispatchEvent(new Event('change', {bubbles:true}));
    } else if(status === 'fam' && fcb){
      fcb.checked = true;
      fcb.dispatchEvent(new Event('change', {bubbles:true}));
    }
  }

  function applyStatus(kind){
    if(statusChosen) return;
    statusChosen = true;
    var tr = deck[qPos];
    if(kind === 'learned') markRow(tr, 'learned');
    else if(kind === 'learning') markRow(tr, 'fam');
    var nextBtn = document.getElementById('quiz-next');
    if(nextBtn) nextBtn.disabled = false;
  }

  function showSummary(){
    document.getElementById('quiz-choices').innerHTML='';
    document.getElementById('quiz-feedback').style.display='none';
    var qa = document.getElementById('quiz-actions');
    if(qa) qa.style.display='none';
    var pct=deck.length?Math.round(score/deck.length*100):0;
    var emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪';
    document.getElementById('quiz-summary-text').innerHTML =
      emoji + ' Счёт: <b>' + score + '/' + deck.length + '</b><br>Оценка: <b>' + pct + '/100</b>';
    document.getElementById('quiz-summary').style.display='block';
  }

  function openSetup(){
    if(setup) setup.style.display='flex';
    if(main) main.style.display='none';
    document.getElementById('quiz-summary').style.display='none';
  }

  function open(){
    overlay.style.display='flex';
    openSetup();
  }

  function startQuiz(){
    hidePy = !!(document.getElementById('quiz-hide-py')||{}).checked;
    updatePinyinVisibility();
    buildQuiz();
    if(!deck.length){ alert('Нет слов для теста!'); return; }
    if(setup) setup.style.display='none';
    if(main) main.style.display='flex';
    showQuestion(0);
  }

  function close(){
    overlay.style.display='none';
    stopAllAudio();
  }

  function nextQuestion(){
    if(!answered || !statusChosen) return;
    qPos++; showQuestion(qPos);
  }

  var levelWrap = document.getElementById('quiz-levels');
  if(levelWrap){
    levelWrap.querySelectorAll('.quiz-level-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var lvl = this.getAttribute('data-level');
        if(lvl === 'all'){
          quizLevels.clear();
        } else {
          if(quizLevels.has(lvl)) quizLevels.delete(lvl); else quizLevels.add(lvl);
        }
        var hasSel = quizLevels.size > 0;
        levelWrap.querySelectorAll('.quiz-level-btn').forEach(function(b){
          var l = b.getAttribute('data-level');
          b.classList.toggle('active', l === 'all' ? !hasSel : quizLevels.has(l));
        });
      });
    });
  }

  document.getElementById('btn-quiz').addEventListener('click', open);
  document.getElementById('quiz-start').addEventListener('click', startQuiz);
  document.getElementById('quiz-exit').addEventListener('click', close);
  document.getElementById('quiz-setup-close').addEventListener('click', close);
  document.getElementById('quiz-close').addEventListener('click', close);
  document.getElementById('quiz-close2').addEventListener('click', close);
  document.getElementById('quiz-again').addEventListener('click', startQuiz);
  document.getElementById('quiz-next').addEventListener('click', nextQuestion);
  document.getElementById('quiz-know').addEventListener('click', function(){ applyStatus('learned'); });
  document.getElementById('quiz-learning').addEventListener('click', function(){ applyStatus('learning'); });
  document.getElementById('quiz-dont').addEventListener('click', function(){ applyStatus('dont'); });
  document.getElementById('quiz-toggle-py').addEventListener('click', function(){ hidePy = !hidePy; updatePinyinVisibility(); });
  document.getElementById('quiz-zh').addEventListener('click', function(){
    var tr=deck[qPos];
    if(tr) speakZh(getText(tr,'zh'));
  });
  document.addEventListener('keydown',function(e){
    if(overlay.style.display==='none') return;
    if(e.key==='Escape') close();
    if(e.key>='1'&&e.key<='4'){
      var btns=document.querySelectorAll('.quiz-choice');
      var idx=parseInt(e.key)-1;
      if(btns[idx]&&!answered) btns[idx].click();
    }
    if((e.key==='Enter' || e.key===' ') && answered && statusChosen){
      e.preventDefault();
      nextQuestion();
    }
  });
})();
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
// Override the existing SortableJS init to store references and use new options
document.addEventListener('DOMContentLoaded', function(){
  window._cdxSortables = [];
  // Existing code already created Sortable instances; we create new ones tracking state
  // We patch by listening for sortable events
});

/* ── Snapshots ────────────────────────────────────────────────────────────── */
var SNAP_KEY = 'hsk_snapshots';

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

  // learned
  var lT = document.getElementById('learned-tbody');
  var fT = document.getElementById('fam-tbody');
  var learned = [], fam = [];
  if(lT) for(var i=0;i<lT.rows.length;i++){ var z=lT.rows[i].querySelector('.zh'); if(z) learned.push(z.textContent.trim()); }
  if(fT) for(var i=0;i<fT.rows.length;i++){ var z=fT.rows[i].querySelector('.zh'); if(z) fam.push(z.textContent.trim()); }
  snap.learned = learned;
  snap.fam = fam;
  snap.total = _wc;

  // row orders
  var order = {};
  document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody)').forEach(function(tb){
    var ids=[];
    for(var i=0;i<tb.rows.length;i++){ var z=tb.rows[i].querySelector('.zh'); if(z) ids.push(z.textContent.trim()); }
    if(ids.length) order[tb.id]=ids;
  });
  snap.order = order;

  // hidden cols
  snap.hiddenCols = ['num','word','trans','ex'].filter(function(c){ return document.body.classList.contains('hide-'+c); });
  snap.mode = localStorage.getItem('hsk_mode') || 'light';

  return snap;
}

function renderSnapshotDropdown(){
  var dd = document.getElementById('snap-dropdown');
  if(!dd) return;
  var snaps = getSnapshots();
  if(!snaps.length){
    dd.innerHTML = '<div class="cdx-dropdown-item" style="color:#999">'+(currentLang==='en'?'No snapshots':'Нет снимков')+'</div>';
    return;
  }
  dd.innerHTML = '';
  snaps.slice().reverse().forEach(function(snap, ri){
    var i = snaps.length - 1 - ri;
    var item = document.createElement('div');
    item.className = 'cdx-dropdown-item';
    var lCount = (snap.learned||[]).length;
    var fCount = (snap.fam||[]).length;
    var toLearn = snap.total - lCount;
    var _sL=(currentLang==='en');
    item.innerHTML = '<b>' + snap.isoDate + '</b><br><small>'+(_sL?'Total: ':'Всего: ') + snap.total + ' | '+(_sL?'Learned: ':'Выучено: ') + lCount + ' | '+(_sL?'Left: ':'Осталось: ') + toLearn + '</small>';
    item.addEventListener('click', (function(idx){ return function(){
      dd.classList.remove('open');
      cdxConfirm(
        document.body.classList.contains('lang-en')
          ? 'Restore snapshot from ' + snaps[idx].isoDate + '?\nAll current changes will be replaced.'
          : 'Восстановить снимок от ' + snaps[idx].isoDate + '?\nВсе текущие изменения будут заменены.',
        function(){ restoreSnapshot(snaps[idx]); },
        document.body.classList.contains('lang-en') ? 'Restore' : 'Восстановить',
        document.body.classList.contains('lang-en') ? 'Cancel' : 'Отмена'
      );
    }; })(i));
    // Delete button
    var del = document.createElement('span');
    del.textContent = ' ✕';
    del.style.cssText = 'color:#e94560;cursor:pointer;float:right;font-size:.9em';
    del.addEventListener('click', (function(idx){ return function(e){
      e.stopPropagation();
      var s = getSnapshots(); s.splice(idx,1); saveSnapshots(s); renderSnapshotDropdown();
    }; })(i));
    item.appendChild(del);
    dd.appendChild(item);
  });
}

function restoreSnapshot(snap){
  // restore order first
  if(snap.order){
    Object.keys(snap.order).forEach(function(tbId){
      var tb = document.getElementById(tbId); if(!tb) return;
      var map={};
      for(var i=0;i<tb.rows.length;i++){ var z=tb.rows[i].querySelector('.zh'); if(z) map[z.textContent.trim()]=tb.rows[i]; }
      snap.order[tbId].forEach(function(w){ var tr=map[w]; if(tr) tb.appendChild(tr); });
    });
    localStorage.setItem('hsk_row_order', JSON.stringify(snap.order));
  }
  // restore learned / fam checkboxes
  var lT = document.getElementById('learned-tbody');
  var fT = document.getElementById('fam-tbody');
  // Uncheck all first (move back to original tbody)
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
  // Build word map
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
  // save LS
  localStorage.setItem('hsk_learned', JSON.stringify(snap.learned||[]));
  localStorage.setItem('hsk_fam', JSON.stringify(snap.fam||[]));
  // renum
  document.querySelectorAll('tbody[id]').forEach(function(tb){ renum(tb); });
  // update vis
  var lS=document.getElementById('learned-section'), fS=document.getElementById('fam-section');
  if(lS) lS.style.display=lT&&lT.rows.length?'block':'none';
  if(fS) fS.style.display=fT&&fT.rows.length?'block':'none';
  var stl=document.getElementById('st-lrn'), stf=document.getElementById('st-fam');
  if(stl) stl.textContent=lT?lT.rows.length:0;
  if(stf) stf.textContent=fT?fT.rows.length:0;
  // hidden cols
  ['num','word','trans','ex'].forEach(function(c){ document.body.classList.remove('hide-'+c); });
  (snap.hiddenCols||[]).forEach(function(c){ document.body.classList.add('hide-'+c); });
  // persist hidden col state + update toolbar button visuals (Bug 5)
  ['num','word','trans','ex'].forEach(function(c){
    var h = document.body.classList.contains('hide-'+c);
    localStorage.setItem('hsk-hide-'+c, h ? '1' : '');
    var btn = document.querySelector('.col-btn[data-col="'+c+'"]');
    if(btn) btn.classList.toggle('hidden', h);
  });
  // restore display mode (Bug 6)
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
    // Visual feedback
    var orig = btnSave.textContent;
    btnSave.textContent = currentLang==='en' ? '✓ Saved' : '✓ Сохранено';
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

document.addEventListener('DOMContentLoaded', function(){
  var toolsBtn = document.getElementById('btn-tools-toggle');
  var tools = document.getElementById('tb-tools');
  if(toolsBtn && tools){
    toolsBtn.addEventListener('click', function(){
      tools.classList.toggle('open');
      toolsBtn.classList.toggle('active', tools.classList.contains('open'));
    });
  }
});

/* ── Reset Everything ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  var btnReset = document.getElementById('btn-reset-all');
  if(btnReset) btnReset.addEventListener('click', function(){
    cdxConfirm(
      document.body.classList.contains('lang-en')
        ? 'Reset everything and return to original downloaded state?\nAll progress, snapshots and settings will be removed.'
        : 'Сбросить всё и вернуться к исходному состоянию?\nВсе прогресс, снимки и настройки будут удалены.',
      function(){
        var keys = [];
        for(var i=0;i<localStorage.length;i++){
          var k=localStorage.key(i);
          if(k && k.startsWith('hsk')) keys.push(k);
        }
        keys.push('hsk_snapshots','hsk_palette','hsk_lang');
        keys.forEach(function(k){ localStorage.removeItem(k); });
        location.reload();
      }
    );
  });
});

/* ── Confirmation popup helper ────────────────────────────────────────────── */
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

})();


/* ── Back to top ──────────────────────────────────────────────── */
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
      // CSV fallback
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
      // Front: Chinese + pinyin; Back: translation + example
      var front = zh + '<br>' + py;
      var back  = ru + (en ? '<br>' + en : '');
      if(exZh) back += '<br><br>' + exZh + '<br>' + exPy;
      var tags  = 'HSK' + hsk + ' ' + pos;
      // Escape tabs/newlines in content
      function esc(s){ return s.replace(/\t/g,' ').replace(/\r?\n/g,' '); }
      lines.push(esc(front) + '\t' + esc(back) + '\t' + tags);
    });
    // UTF-8 BOM + tab-separated
    var bom = '\ufeff';
    var blob = new Blob([bom + lines.join('\n')], {type:'text/plain;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'HSK_Anki_' + today + '.txt'; a.click();
    URL.revokeObjectURL(url);
  });
})();

/* ── Channels Player ─────────────────────────────────────────── */
(function(){
  var ALL_CHANNELS = window.ALL_CHANNELS || [];

  function buildChannelMap(list){
    var map = Object.create(null);
    var seen = Object.create(null);
    for(var i=0;i<list.length;i++){
      var row = list[i];
      if(!row || row.length < 2) continue;
      var name = String(row[0] || '').trim();
      var url = String(row[1] || '').trim();
      var label = String(row[2] || 'auto').trim();
      if(!name || !url) continue;
      var key = name + '||' + url;
      if(seen[key]) continue;
      seen[key] = true;
      if(!map[name]) map[name] = [];
      map[name].push({ label: label || 'auto', url: url });
    }
    var names = Object.keys(map);
    names.sort(function(a,b){ return a.localeCompare(b); });
    names.forEach(function(n){
      map[n].sort(function(a,b){ return a.label.localeCompare(b.label); });
    });
    return { map: map, names: names };
  }

  function initNews(){
    var chanSel = document.getElementById('news-channel');
    var qualSel = document.getElementById('news-quality');
    var openBtn = document.getElementById('btn-news-open');
    var overlay = document.getElementById('news-overlay');
    var closeBtn = document.getElementById('news-close');
    var player = document.getElementById('news-player');
    if(!chanSel || !qualSel || !openBtn || !overlay || !player) return;

    var built = buildChannelMap(ALL_CHANNELS);
    var map = built.map;
    var names = built.names;
    if(!names.length){
      chanSel.innerHTML = '';
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'No channels';
      chanSel.appendChild(empty);
      chanSel.disabled = true;
      qualSel.disabled = true;
      openBtn.disabled = true;
      return;
    }

    var frag = document.createDocumentFragment();
    for(var i=0;i<names.length;i++){
      var opt = document.createElement('option');
      opt.value = names[i];
      opt.textContent = names[i];
      frag.appendChild(opt);
    }
    chanSel.appendChild(frag);

    function syncQuality(){
      var name = chanSel.value || names[0];
      var list = map[name] || [];
      if(!list.length){
        qualSel.innerHTML = '';
        var o = document.createElement('option');
        o.value = '';
        o.textContent = '—';
        qualSel.appendChild(o);
        qualSel.disabled = true;
        return;
      }
      qualSel.innerHTML = '';
      list.forEach(function(q){
        var o = document.createElement('option');
        o.value = q.url;
        o.textContent = q.label;
        qualSel.appendChild(o);
      });
      qualSel.disabled = list.length <= 1;
    }

    function openPlayer(){
      var url = qualSel.value;
      if(!url) return;
      overlay.style.display = 'flex';
      player.src = url;
      player.load();
      var p = player.play();
      if(p && typeof p.catch === 'function'){ p.catch(function(){}); }
    }

    function closePlayer(){
      overlay.style.display = 'none';
      player.pause();
      player.removeAttribute('src');
      player.load();
    }

    chanSel.addEventListener('change', syncQuality);
    openBtn.addEventListener('click', function(){
      if(!chanSel.value) chanSel.value = names[0];
      syncQuality();
      openPlayer();
    });
    if(closeBtn) closeBtn.addEventListener('click', closePlayer);
    overlay.addEventListener('click', function(e){
      if(e.target === overlay) closePlayer();
    });

    syncQuality();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initNews);
  } else {
    initNews();
  }
})();
