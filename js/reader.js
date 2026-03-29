(function(){
  'use strict';

  var stories = window.HSK_STORIES || [];
  var idx = 0;

  var container = document.getElementById('story-container');
  var titleEl = document.getElementById('story-title');
  var countEl = document.getElementById('story-count');

  function renderStory(story){
    if(!story || !container) return;
    if(titleEl) titleEl.textContent = story.title || 'Story';
    if(countEl) countEl.textContent = (idx + 1) + ' / ' + stories.length;

    var html = '';
    (story.sentences || []).forEach(function(sentence){
      html += '<div class="sentence">';
      sentence.forEach(function(word){
        html += '<div class="word-block">' +
          '<div class="zh">' + (word.zh || '') + '</div>' +
          '<div class="py">' + (word.py || '') + '</div>' +
          '<div class="tr">' + (word.en || '') + '</div>' +
          '</div>';
      });
      html += '</div>';
    });
    container.innerHTML = html;
  }

  function show(i){
    if(!stories.length) return;
    idx = (i + stories.length) % stories.length;
    renderStory(stories[idx]);
  }

  // Toggles
  var btnPy = document.getElementById('toggle-py');
  var btnTr = document.getElementById('toggle-tr');
  btnPy && btnPy.addEventListener('click', function(){
    document.body.classList.toggle('hide-py');
    btnPy.classList.toggle('active');
  });
  btnTr && btnTr.addEventListener('click', function(){
    document.body.classList.toggle('hide-tr');
    btnTr.classList.toggle('active');
  });

  var prev = document.getElementById('prev-story');
  var next = document.getElementById('next-story');
  prev && prev.addEventListener('click', function(){ show(idx-1); });
  next && next.addEventListener('click', function(){ show(idx+1); });

  show(0);
})();
