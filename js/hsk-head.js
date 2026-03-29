/* ==========================================================================
   hsk-head.js — Inline head preloader
   INPUT:  localStorage keys window.HSK_LS.M/PA/P (hsk_mode, hsk_palette, hsk_prefs — read on script eval,
           before the DOM is parsed).
   ACTION: Sets background-color and CSS custom properties --pal-accent / --pal-dark
           on <html> immediately, then injects a <style> tag with font overrides so
           the first paint already matches the user's saved theme and font preferences.
   OUTPUT: Mutates document.documentElement styles and appends #preload-font <style>
           to document.head. No return value.
   ========================================================================== */
(function(){
  try{
    var root=document.documentElement;

    /* INPUT: localStorage hsk_mode — sets background before any element renders */
    root.classList.add('preload');
    var mode=localStorage.getItem(window.HSK_LS.M)||'light';
    var bg=(mode==='dark')?'#0f111a':(mode==='sepia')?'#f7f2e8':'#ffffff';
    root.style.backgroundColor=bg;

    /* INPUT: localStorage hsk_palette — sets --pal-accent and --pal-dark CSS vars */
    var palName=localStorage.getItem(window.HSK_LS.PA)||'rose';
    var PALS={
      rose:['#e94560','#c73652'],
      ocean:['#0077b6','#005f8e'],
      forest:['#2d6a4f','#1b4332'],
      ember:['#e76f51','#c45436'],
      plum:['#7b2d8b','#5c1f69'],
      slate:['#546e7a','#37474f'],
      citrus:['#f4a261','#d4843d'],
      coral:['#ff6b6b','#e85353'],
      midnight:['#6c63ff','#4a43cc'],
      jade:['#00b894','#008f73'],
      sakura:['#e91e8c','#c01570'],
      gold:['#e6a817','#c48a00'],
      arctic:['#2196f3','#1565c0'],
      crimson:['#c0392b','#962d22'],
      teal:['#00838f','#005f6b']
    };
    var pal=PALS[palName]||PALS.rose;
    root.style.setProperty('--pal-accent',pal[0]);
    root.style.setProperty('--pal-dark',pal[1]);
    /* INPUT: localStorage hsk_prefs (JSON) — builds CSS string for font/size overrides */
    var prefs={};
    try{prefs=JSON.parse(localStorage.getItem(window.HSK_LS.P)||'{}');}catch(e){}
    var css='';
    if(prefs.fz)css+='.zh{font-family:'+prefs.fz+',sans-serif!important}';
    if(prefs.sz)css+='.zh{font-size:'+prefs.sz+'px!important}';
    if(prefs.fp)css+='.py,.ex-py{font-family:'+prefs.fp+',sans-serif!important}';
    if(prefs.sp)css+='.py,.ex-py{font-size:'+prefs.sp+'px!important}';
    if(prefs.fr)css+='td.trans-cell{font-family:'+prefs.fr+',sans-serif!important}';
    if(prefs.sr)css+='td.trans-cell{font-size:'+prefs.sr+'px!important}';
    /* OUTPUT: appends <style id="preload-font"> to <head> with font overrides */
    if(css){
      var st=document.createElement('style');
      st.id='preload-font';
      st.textContent=css;
      document.head.appendChild(st);
    }
  }catch(e){}
})();
