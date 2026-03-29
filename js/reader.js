/* ========================================================================== */
/* js/reader.js - Story reader renderer                                       */
/* ========================================================================== */
(function () {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function getStoryIndex(stories) {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('story');
    if (!id) return 0;
    for (var i = 0; i < stories.length; i += 1) {
      if (stories[i].id === id) return i;
    }
    return 0;
  }

  function setActive(btn, active) {
    if (!btn) return;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  function buildWord(word) {
    var wrap = document.createElement('span');
    wrap.className = 'word-block';

    var zh = document.createElement('span');
    zh.className = 'zh';
    zh.textContent = word.zh || '';
    wrap.appendChild(zh);

    if (word.py) {
      var py = document.createElement('span');
      py.className = 'py';
      py.textContent = word.py;
      wrap.appendChild(py);
    }

    if (word.tr) {
      var tr = document.createElement('span');
      tr.className = 'tr';
      tr.textContent = word.tr;
      wrap.appendChild(tr);
    }

    return wrap;
  }

  function renderStory(story, index, total) {
    var meta = byId('story-meta');
    var title = byId('story-title');
    var subtitle = byId('story-subtitle');
    var content = byId('story-content');
    var barStory = byId('bar-story');
    var count = byId('reader-count');

    var metaParts = [];
    if (story.level) metaParts.push(story.level);
    if (story.source) metaParts.push(story.source);
    meta.textContent = metaParts.join(' - ');
    meta.style.display = metaParts.length ? '' : 'none';

    title.textContent = story.title || 'Untitled story';
    barStory.textContent = story.title || 'Reader';

    if (story.subtitle) {
      subtitle.textContent = story.subtitle;
      subtitle.style.display = '';
    } else {
      subtitle.textContent = '';
      subtitle.style.display = 'none';
    }

    count.textContent = (index + 1) + ' / ' + total;

    content.innerHTML = '';
    var paragraphs = story.paragraphs || [];
    for (var p = 0; p < paragraphs.length; p += 1) {
      var paragraph = document.createElement('div');
      paragraph.className = 'paragraph';
      var sentences = paragraphs[p] || [];
      for (var s = 0; s < sentences.length; s += 1) {
        var sentence = document.createElement('div');
        sentence.className = 'sentence';
        var words = sentences[s] || [];
        for (var w = 0; w < words.length; w += 1) {
          sentence.appendChild(buildWord(words[w]));
        }
        paragraph.appendChild(sentence);
      }
      content.appendChild(paragraph);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var stories = window.HSK_STORIES || [];
    if (!stories.length) {
      byId('story-title').textContent = 'No stories found';
      byId('story-subtitle').textContent = 'Add data/stories-data.js to load content.';
      return;
    }

    var index = getStoryIndex(stories);
    var prevBtn = byId('reader-prev');
    var nextBtn = byId('reader-next');

    function updateNav() {
      prevBtn.disabled = index <= 0;
      nextBtn.disabled = index >= stories.length - 1;
    }

    function showStory(i) {
      index = Math.max(0, Math.min(stories.length - 1, i));
      renderStory(stories[index], index, stories.length);
      updateNav();
      if (stories[index].id) {
        var qs = '?story=' + encodeURIComponent(stories[index].id);
        window.history.replaceState(null, '', qs);
      }
      window.scrollTo(0, 0);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        showStory(index - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        showStory(index + 1);
      });
    }

    var pyBtn = byId('toggle-py');
    var trBtn = byId('toggle-tr');
    if (pyBtn) {
      pyBtn.addEventListener('click', function () {
        document.body.classList.toggle('reader-hide-py');
        setActive(pyBtn, !document.body.classList.contains('reader-hide-py'));
      });
      setActive(pyBtn, !document.body.classList.contains('reader-hide-py'));
    }

    if (trBtn) {
      trBtn.addEventListener('click', function () {
        document.body.classList.toggle('reader-hide-tr');
        setActive(trBtn, !document.body.classList.contains('reader-hide-tr'));
      });
      setActive(trBtn, !document.body.classList.contains('reader-hide-tr'));
    }

    showStory(index);
  });
}());
