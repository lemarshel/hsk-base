(function(){
"use strict";
/* ==========================================================================
   js/hanzi.js — HanziWriter character popup and stroke-practice mode.

   Wraps CJK characters in .wc-inner .zh in clickable spans that open an
   animated stroke-order popup. Includes a practice (quiz) sub-mode.

   MUST BE LOADED AFTER hsk.js (DOM must be ready — load at bottom of body).
   ========================================================================== */

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
  if(hzPop&&hzPop.style.display!=='none'&&!hzPop.contains(e.target)){
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
  }catch(err){svgWrap.innerHTML='<div style="padding:12px;color:#999;font-size:.8em">'+(document.body.classList.contains('lang-en')?'No data: ':'\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445: ')+ch+'</div>';}
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
  practiceDiv.innerHTML = '<div id="hz-practice-canvas" style="display:inline-block;border:2px solid #e94560;border-radius:4px"></div><div id="hz-practice-msg" style="margin-top:8px;font-size:.9em;color:#666">Write the character stroke by stroke</div><button id="hz-practice-retry" style="margin-top:8px;padding:4px 12px;cursor:pointer">&#8635; Retry</button>';

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
      if(msg) msg.textContent = 'Stroke '+(strokeData.strokeNum+1)+': try again (' + strokeData.mistakesOnStroke + ' mistake' + (strokeData.mistakesOnStroke!==1?'s':'') + ')';
    },
    onCorrectStroke: function(strokeData){
      var msg = document.getElementById('hz-practice-msg');
      if(msg) msg.textContent = 'Stroke '+(strokeData.strokeNum+1)+' correct! (' + strokeData.strokesRemaining + ' remaining)';
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
        if(msg) msg.textContent = 'Stroke '+(strokeData.strokeNum+1)+': try again (' + strokeData.mistakesOnStroke + ' mistake' + (strokeData.mistakesOnStroke!==1?'s':'') + ')';
      },
      onCorrectStroke: function(strokeData){
        var msg = document.getElementById('hz-practice-msg');
        if(msg) msg.textContent = 'Stroke '+(strokeData.strokeNum+1)+' correct! (' + strokeData.strokesRemaining + ' remaining)';
      },
      onComplete: function(summaryData){
        var msg = document.getElementById('hz-practice-msg');
        if(msg) msg.textContent = '\u2713 Complete! Mistakes: ' + summaryData.totalMistakes;
      }
    });
  });
});
})();
