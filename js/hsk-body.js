/* ==========================================================================
   Body preloader
   - Applies language + column visibility before content paint
   ========================================================================== */
/* Body preloader: language + column visibility */
(function(){
  try{
    var body=document.body;
    var mode=localStorage.getItem('hsk_mode')||'light';
    if(mode&&mode!=='light')body.classList.add(mode);
    var lang=localStorage.getItem('hsk_lang')||'ru';
    if(lang==='en')body.classList.add('lang-en');
    ['num','word','trans','ex'].forEach(function(key){
      if(localStorage.getItem('hsk-hide-'+key))body.classList.add('hide-'+key);
    });
    if(localStorage.getItem('ph_hidden')!=='0')body.classList.add('ph-hidden');
  }catch(e){}
})();
