(function(){
"use strict";
/* ==========================================================================
   js/quiz.js — Flashcard study mode and multiple-choice quiz.

   DEPENDS ON
     window._hsk (exposed by hsk.js):
       .getTtsVolume() → current TTS volume (0–1)

   MUST BE LOADED AFTER hsk.js.
   ========================================================================== */

/* ── Flashcard study mode ──────────────────────────────────────── */
(function(){
  var deck = [], pos = 0, known = 0, unknown = 0;
  var overlay = document.getElementById('study-overlay');
  var isEn = function(){ return document.body.classList.contains('lang-en'); };

  function buildDeck(){
    deck = [];
    document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
      if(tr.classList.contains('sr-hide') || tr.classList.contains('hsk-hide') || tr.classList.contains('pos-hide') || tr.classList.contains('alpha-hide')) return;
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
    document.getElementById('study-unknown').textContent = unknown;
    document.getElementById('study-back').style.display='none';
    document.getElementById('study-front').style.display='flex';
    document.getElementById('study-show').style.display='';
    document.getElementById('study-hard').style.display='none';
    document.getElementById('study-good').style.display='none';
    document.getElementById('study-summary').style.display='none';
    var pb = document.getElementById('study-prog-bar');
    if(pb && deck.length) pb.style.width = (idx/deck.length*100)+'%';
  }

  function showAnswer(){
    document.getElementById('study-back').style.display='flex';
    document.getElementById('study-show').style.display='none';
    document.getElementById('study-hard').style.display='';
    document.getElementById('study-good').style.display='';
    // TTS
    if(window.speechSynthesis){
      var u=new SpeechSynthesisUtterance(document.getElementById('study-zh').textContent);
      u.lang='zh-CN'; u.rate=0.9; u.volume=window._hsk.getTtsVolume();
      speechSynthesis.speak(u);
    }
  }

  function grade(didKnow){
    if(didKnow) known++; else unknown++;
    pos++;
    if(pos >= deck.length){ showSummary(); return; }
    showCard(pos);
  }

  function showSummary(){
    document.getElementById('study-front').style.display='none';
    document.getElementById('study-back').style.display='none';
    document.getElementById('study-show').style.display='none';
    document.getElementById('study-hard').style.display='none';
    document.getElementById('study-good').style.display='none';
    document.getElementById('study-summary').style.display='flex';
    var pct = deck.length ? Math.round(known/deck.length*100) : 0;
    var isEnS = document.body.classList.contains('lang-en');
    document.getElementById('study-summary-text').innerHTML =
      (isEnS ? '<b>Known:</b> ' : '<b>\u0417\u043d\u0430\u043b:</b> ') + known + '/' + deck.length + ' (' + pct + '%)'
      + (isEnS ? '  &nbsp; <b>Unknown:</b> ' : '  &nbsp; <b>\u041d\u0435 \u0437\u043d\u0430\u043b:</b> ') + unknown;
  }

  function openStudy(){
    buildDeck();
    pos=0; known=0; unknown=0;
    if(!deck.length){ alert('No cards to study!'); return; }
    overlay.style.display='flex';
    showCard(0);
  }

  function closeStudy(){
    overlay.style.display='none';
    if(window.speechSynthesis) speechSynthesis.cancel();
  }

  document.getElementById('btn-study').addEventListener('click', openStudy);
  document.getElementById('study-close').addEventListener('click', closeStudy);
  document.getElementById('study-close2').addEventListener('click', closeStudy);
  document.getElementById('study-show').addEventListener('click', showAnswer);
  document.getElementById('study-hard').addEventListener('click', function(){ grade(false); });
  document.getElementById('study-good').addEventListener('click', function(){ grade(true); });
  var skipBtn = document.getElementById('study-skip');
  if(skipBtn) skipBtn.addEventListener('click', function(){ grade(false); });
  document.getElementById('study-again').addEventListener('click', function(){
    pos=0; known=0; unknown=0;
    for(var i=deck.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=deck[i];deck[i]=deck[j];deck[j]=tmp; }
    showCard(0);
  });
  document.getElementById('study-zh').addEventListener('click', function(){
    if(window.speechSynthesis){
      var u=new SpeechSynthesisUtterance(this.textContent);
      u.lang='zh-CN'; u.rate=0.9; u.volume=window._hsk.getTtsVolume(); speechSynthesis.speak(u);
    }
  });
  // Keyboard: space=show/next, right=know, left=hard, esc=close
  document.addEventListener('keydown', function(e){
    if(overlay.style.display==='none') return;
    if(e.key==='Escape'){ closeStudy(); return; }
    var back = document.getElementById('study-back');
    if(e.key===' '||e.key==='Enter'){
      if(back.style.display==='none') showAnswer(); else grade(true);
      e.preventDefault();
    }
    if(e.key==='ArrowRight' && back.style.display!=='none') grade(true);
    if(e.key==='ArrowLeft' && back.style.display!=='none') grade(false);
  });
})();

/* ── Multiple-choice quiz ──────────────────────────────────────── */
(function(){
  var deck=[], qPos=0, score=0, answered=false;
  var overlay = document.getElementById('quiz-overlay');

  function getRows(){
    var rows=[];
    document.querySelectorAll('tbody[id]:not(#learned-tbody):not(#fam-tbody) tr').forEach(function(tr){
      if(!tr.classList.contains('sr-hide')&&!tr.classList.contains('hsk-hide')&&!tr.classList.contains('pos-hide')&&!tr.classList.contains('alpha-hide')) rows.push(tr);
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

  function buildQuiz(){
    var all=shuffle(getRows().slice());
    var qs = parseInt((document.getElementById('quiz-size')||{value:'20'}).value)||20;
    deck=all.slice(0,Math.min(qs,all.length));
    qPos=0; score=0;
  }

  function showQuestion(idx){
    if(idx>=deck.length){showSummary();return;}
    answered=false;
    var tr=deck[idx];
    document.getElementById('quiz-pos').textContent=idx+1;
    document.getElementById('quiz-total').textContent=deck.length;
    document.getElementById('quiz-score').textContent=score;
    document.getElementById('quiz-zh').textContent=getText(tr,'zh');
    document.getElementById('quiz-py').textContent=getText(tr,'py');
    document.getElementById('quiz-feedback').style.display='none';
    document.getElementById('quiz-feedback').className='';
    document.getElementById('quiz-summary').style.display='none';

    // 4 choices: 1 correct + 3 random wrong
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
          fb.textContent='\u2713 Correct!';fb.className='ok';
        } else {
          fb.textContent='\u2717 '+getText(tr,'trans');fb.className='err';
        }
        // TTS
        if(window.speechSynthesis){
          var u=new SpeechSynthesisUtterance(getText(tr,'zh'));
          u.lang='zh-CN';u.rate=0.9;u.volume=window._hsk.getTtsVolume();speechSynthesis.speak(u);
        }
        // Auto-advance after 1.5s
        setTimeout(function(){ qPos++; showQuestion(qPos); }, 1500);
      });
      qc.appendChild(btn);
    });
  }

  function showSummary(){
    document.getElementById('quiz-choices').innerHTML='';
    document.getElementById('quiz-feedback').style.display='none';
    var pct=deck.length?Math.round(score/deck.length*100):0;
    var emoji = pct >= 80 ? '\uD83C\uDF89' : pct >= 60 ? '\uD83D\uDC4D' : '\uD83D\uDCAA';
    document.getElementById('quiz-summary-text').innerHTML =
      emoji + ' Score: <b>' + score + '/' + deck.length + '</b> (' + pct + '%)<br>'
      + (pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good job!' : 'Keep practicing!');
    document.getElementById('quiz-summary').style.display='block';
  }

  function open(){
    buildQuiz();
    if(!deck.length){alert('No words to quiz!');return;}
    overlay.style.display='flex';
    showQuestion(0);
  }

  function openWithList(wordList){
    var rows = getRows();
    if(Array.isArray(wordList) && wordList.length){
      var set = {};
      wordList.forEach(function(w){
        if(w == null) return;
        if(w && typeof w.getAttribute === 'function'){
          var k = w.getAttribute('data-key') || '';
          if(k) set[k] = true;
        } else {
          set[String(w)] = true;
        }
      });
      rows = rows.filter(function(tr){
        var key = tr.getAttribute('data-key') || '';
        return !!set[key];
      });
    }
    deck = shuffle(rows.slice());
    qPos = 0; score = 0;
    if(!deck.length){ alert('No words to quiz!'); return; }
    overlay.style.display='flex';
    showQuestion(0);
  }

  function close(){
    overlay.style.display='none';
    if(window.speechSynthesis) speechSynthesis.cancel();
  }

  document.getElementById('btn-quiz').addEventListener('click',open);
  document.getElementById('quiz-close').addEventListener('click',close);
  document.getElementById('quiz-close2').addEventListener('click',close);
  document.getElementById('quiz-again').addEventListener('click',function(){buildQuiz();showQuestion(0);});
  document.getElementById('quiz-zh').addEventListener('click',function(){
    var tr=deck[qPos];
    if(tr&&window.speechSynthesis){
      var u=new SpeechSynthesisUtterance(getText(tr,'zh'));
      u.lang='zh-CN';u.rate=0.9;u.volume=window._hsk.getTtsVolume();speechSynthesis.speak(u);
    }
  });
  document.addEventListener('keydown',function(e){
    if(overlay.style.display==='none') return;
    if(e.key==='Escape') close();
    if(e.key>='1'&&e.key<='4'){
      var btns=document.querySelectorAll('.quiz-choice');
      var idx=parseInt(e.key)-1;
      if(btns[idx]&&!answered) btns[idx].click();
    }
  });

  /* ── Register quiz launcher via shared API ── */
  if(window._hsk && window._hsk._register){
    window._hsk._register('quiz', {
      startQuiz: openWithList
    });
  }
})();
})();
