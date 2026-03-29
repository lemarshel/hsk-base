/* ==========================================================================
   js/lang.js — RU / EN language switching

   OWNS (registers to window._hsk):
     getLang

   CONSUMES (reads from window._hsk):
     getCurrentAlpha, applyAlphaFilter  ← filter.js
     (both guarded; called only from DOMContentLoaded, after filter.js loads)

   INPUT:  localStorage hsk_lang; #btn-lang-toggle; window.HSK_SECTION_NAMES_EN/RU; window.HSK_POS_LABELS_EN/RU
   ACTION: setLang() swaps body.lang-en and translates ~30 UI strings; DOMContentLoaded applies saved language and wires toggle button
   OUTPUT: body.lang-en class; DOM text of toolbar/TOC/headings; localStorage hsk_lang
   ========================================================================== */
(function(){
"use strict";

/* ── Language switching (RU / EN) ─────────────────────────────────────────────
   INPUT:  localStorage hsk_lang; click on lang toggle buttons
   ACTION: setLang() swaps body.lang-en class; translates all toolbar text,
           section headings, stat labels, button labels via string maps
   OUTPUT: body.lang-en class; DOM text of ~30 UI elements; localStorage hsk_lang
   ────────────────────────────────────────────────────────────────────────────── */
/* ── Language switching (RU / EN) ────────────────────────────────────────── */
var currentLang = localStorage.getItem(window.HSK_LS.LG) || 'ru';

var SECTION_NAMES_EN = window.HSK_SECTION_NAMES_EN;
var SECTION_NAMES_RU = window.HSK_SECTION_NAMES_RU;

function setLang(lang){
  currentLang = lang;
  localStorage.setItem(window.HSK_LS.LG, lang);
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
  var posLabels = isEn ? window.HSK_POS_LABELS_EN : window.HSK_POS_LABELS_RU;
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
  if(window._hsk && window._hsk.getCurrentAlpha && window._hsk.getCurrentAlpha() !== 'all'){
    if(window._hsk.applyAlphaFilter) window._hsk.applyAlphaFilter('all');
  }

  /* show-all + export buttons */
  var showAll = document.getElementById('btn-show-all-cols');
  if(showAll){ showAll.textContent = isEn ? '\u21ba All' : '\u21ba \u0412\u0441\u0435'; showAll.title = isEn ? 'Show all columns' : '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435 \u043a\u043e\u043b\u043e\u043d\u043a\u0438'; }
  var csvBtn = document.getElementById('btn-export-csv');
  if(csvBtn){ csvBtn.title = isEn ? 'Export to Excel/CSV' : '\u042d\u043a\u0441\u043f\u043e\u0440\u0442 \u0432 Excel/CSV'; }

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

/* ── Register language internals via shared API ── */
window._hsk._register('lang', {
  getLang: function() { return currentLang; }
});
})();
