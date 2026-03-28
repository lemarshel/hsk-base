/* ==========================================================================
   hsk-body.js — Inline body preloader
   INPUT:  localStorage keys hsk_mode, hsk_lang, hsk-hide-{num|word|trans|ex},
           ph_hidden — all read at the opening <body> tag before child elements
           are parsed.
   ACTION: Adds CSS class tokens to document.body so that dark/sepia theme,
           language, column-hide, and pinyin-hide states all take effect via
           existing CSS rules before the first paint.
   OUTPUT: Mutates document.body.classList. No DOM creation; no return value.
   ========================================================================== */
(function(){
  try{
    var body=document.body;

    /* INPUT: hsk_mode — applies dark/sepia class so themed CSS rules fire instantly */
    var mode=localStorage.getItem('hsk_mode')||'light';
    if(mode&&mode!=='light')body.classList.add(mode);

    /* INPUT: hsk_lang — adds lang-en class to switch displayed translation column */
    var lang=localStorage.getItem('hsk_lang')||'ru';
    if(lang==='en')body.classList.add('lang-en');

    /* INPUT: hsk-hide-* keys — pre-hides columns; CSS body.hide-X rules do the rest */
    ['num','word','trans','ex'].forEach(function(key){
      if(localStorage.getItem('hsk-hide-'+key))body.classList.add('hide-'+key);
    });

    /* INPUT: ph_hidden — hides pinyin row via .ph-hidden CSS unless explicitly '0' */
    if(localStorage.getItem('ph_hidden')!=='0')body.classList.add('ph-hidden');
  }catch(e){}
})();
