/* ==========================================================================
   js/ui.js — UI interactions

   INPUT:  DOM elements: .py/.ex-py cells, .mode-btn, font inputs, h3.phonetic-group, .col-btn, h2.pos-group, #btn-phoneme-toggle
   ACTION: colorPinyin tone spans; keyboard shortcuts; theme mode; font controls; phonetic group collapse; column toggle; mark first POS table; merge small phoneme groups; phoneme header toggle
   OUTPUT: DOM mutations; body class; localStorage hsk_mode/hsk_prefs/hsk-hide-*
   ========================================================================== */
(function(){
"use strict";

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
    if(window._hsk && window._hsk.renumVisible) window._hsk.renumVisible();
  });
})();
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
