/* ==========================================================================
   js/palette.js — Color palette

   INPUT:  localStorage hsk_palette; window.HSK_PALETTES; .pal-btn and #palette-dropdown
   ACTION: applyPalette() sets CSS custom properties --pal-accent/--pal-dark; initPalette restores saved palette and wires dropdown clicks
   OUTPUT: CSS vars on :root; #dyn-palette style; localStorage hsk_palette
   ========================================================================== */
(function(){
"use strict";

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
  localStorage.setItem(window.HSK_LS.PA, name);
  // Also fix dark mode thead (it overrides)
  var dynPal = document.getElementById('dyn-palette');
  if(!dynPal){ dynPal=document.createElement('style'); dynPal.id='dyn-palette'; document.head.appendChild(dynPal); }
  dynPal.textContent = 'body.dark thead tr{background:'+pal[1]+'!important}';
}

(function initPalette(){
  var saved = localStorage.getItem(window.HSK_LS.PA) || 'rose';
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
})();
