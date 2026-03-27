/* ==========================================================================
   Head preloader
   - Applies theme/palette before first paint
   - Preloads font sizing to avoid flashes
   ========================================================================== */
/* Head preloader: theme + palette + font pre-apply */
(function(){
  try{
    var root=document.documentElement;
    root.classList.add('preload');
    var mode=localStorage.getItem('hsk_mode')||'light';
    var bg=(mode==='dark')?'#0f111a':(mode==='sepia')?'#f7f2e8':'#ffffff';
    root.style.backgroundColor=bg;
    var palName=localStorage.getItem('hsk_palette')||'rose';
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
    var prefs={};
    try{prefs=JSON.parse(localStorage.getItem('hsk_prefs')||'{}');}catch(e){}
    var css='';
    if(prefs.fz)css+='.zh{font-family:'+prefs.fz+',sans-serif!important}';
    if(prefs.sz)css+='.zh{font-size:'+prefs.sz+'px!important}';
    if(prefs.fp)css+='.py,.ex-py{font-family:'+prefs.fp+',sans-serif!important}';
    if(prefs.sp)css+='.py,.ex-py{font-size:'+prefs.sp+'px!important}';
    if(prefs.fr)css+='td.trans-cell{font-family:'+prefs.fr+',sans-serif!important}';
    if(prefs.sr)css+='td.trans-cell{font-size:'+prefs.sr+'px!important}';
    if(css){
      var st=document.createElement('style');
      st.id='preload-font';
      st.textContent=css;
      document.head.appendChild(st);
    }
  }catch(e){}
})();
