/* ==========================================================================
   js/reader.js — Reader page logic for stories.html
   Handles: story rendering, TTS (sentence + full text), word highlighting,
            progress bar, prev/next navigation, toggle prefs.
   Depends on: window.STORIES (stories-data.js), window.HSK_LS (app-config.js)
   ========================================================================== */

/* ── localStorage keys ────────────────────────────────────────────────────── */
const LS_PY    = 'reader-py-visible';
const LS_TR    = 'reader-tr-visible';
const LS_STORY = 'reader-story-idx';

/* ── State ────────────────────────────────────────────────────────────────── */
let storyIdx    = 0;
let pyVisible   = true;
let trVisible   = true;
let isFullRead  = false;
let sentQueue   = [];   // [{words, sentEl}] — flat list for playback
let queueIdx    = 0;

/* ── Init ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  loadPrefs();
  applyPrefs();
  renderStory();
  bindControls();
});

/* ── Prefs ────────────────────────────────────────────────────────────────── */
function loadPrefs() {
  pyVisible = localStorage.getItem(LS_PY) !== '0';
  trVisible = localStorage.getItem(LS_TR) !== '0';

  const saved = parseInt(localStorage.getItem(LS_STORY) || '0', 10);
  storyIdx = (isNaN(saved) || saved >= window.STORIES.length) ? 0 : saved;

  const speed = localStorage.getItem(window.HSK_LS.S) || '1';
  const sel = document.getElementById('tts-speed');
  if (sel) sel.value = speed;
}

function applyPrefs() {
  document.body.classList.toggle('py-hidden', !pyVisible);
  document.body.classList.toggle('tr-hidden', !trVisible);
  setActive('btn-toggle-py', pyVisible);
  setActive('btn-toggle-tr', trVisible);
}

/* ── Render ───────────────────────────────────────────────────────────────── */
function renderStory() {
  const story = window.STORIES[storyIdx];

  document.getElementById('story-title').textContent = story.title;
  document.getElementById('story-counter').textContent =
    (storyIdx + 1) + ' / ' + window.STORIES.length;
  document.getElementById('btn-prev').disabled = (storyIdx === 0);
  document.getElementById('btn-next').disabled = (storyIdx >= window.STORIES.length - 1);

  const area = document.getElementById('reading-area');
  area.innerHTML = '';

  const hasParagraphs = story.paragraphs && story.paragraphs.length > 0;
  if (!hasParagraphs) {
    const msg = document.createElement('p');
    msg.className = 'empty-msg';
    msg.textContent = '即将推出…  (Coming soon)';
    area.appendChild(msg);
    resetProgress();
    return;
  }

  /* Global sentence index — used to identify sentEl for the TTS queue */
  let globalSentIdx = 0;

  story.paragraphs.forEach(function (paragraph) {
    const paraEl = document.createElement('div');
    paraEl.className = 'paragraph';

    paragraph.forEach(function (words) {
      const sentEl = buildSentenceEl(words, globalSentIdx);
      paraEl.appendChild(sentEl);
      globalSentIdx++;
    });

    area.appendChild(paraEl);
  });

  resetProgress();
}

function buildSentenceEl(words, globalIdx) {
  const sentEl = document.createElement('div');
  sentEl.className = 'sentence';
  sentEl.dataset.sentIdx = globalIdx;

  words.forEach(function (word, wIdx) {
    const block = document.createElement('div');
    block.className = 'word-block';
    block.dataset.wordIdx = wIdx;

    const zh = document.createElement('div');
    zh.className = 'zh';
    zh.textContent = word.zh;

    const py = document.createElement('div');
    py.className = 'py';
    py.textContent = word.py;

    const tr = document.createElement('div');
    tr.className = 'tr';
    tr.textContent = word.en;

    block.appendChild(zh);
    block.appendChild(py);
    block.appendChild(tr);
    sentEl.appendChild(block);
  });

  /* Speaker icon — shown on hover as affordance */
  const ttsBtn = document.createElement('button');
  ttsBtn.className = 'sent-tts';
  ttsBtn.title = 'Read this sentence';
  ttsBtn.textContent = '🔊';
  ttsBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    stopReading();
    speakSentence(words, sentEl, false);
  });
  sentEl.appendChild(ttsBtn);

  /* Click anywhere on the sentence to read it */
  sentEl.addEventListener('click', function () {
    if (isFullRead) return;
    stopReading();
    speakSentence(words, sentEl, false);
  });

  return sentEl;
}

/* ── TTS core ─────────────────────────────────────────────────────────────── */
function speakSentence(words, sentEl, queued) {
  if (!window.speechSynthesis) return;

  /*
   * Build the utterance as a single natural Chinese string — NO spaces
   * between words. Spaces cause unnatural pauses and break the rhythm.
   * The TTS engine segments Chinese internally; onboundary charIndex
   * still maps correctly to our recorded character positions.
   */
  let text = '';
  const positions = [];
  words.forEach(function (w) {
    const start = text.length;
    text += w.zh;
    positions.push({ start: start, end: text.length });
  });

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-CN';
  utt.rate = parseFloat(document.getElementById('tts-speed').value) || 1;

  sentEl.classList.add('playing');
  sentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  /* Per-word highlight: map boundary charIndex back to our word position */
  utt.onboundary = function (e) {
    if (e.name !== 'word') return;
    clearWordHighlights(sentEl);
    const ci = e.charIndex;
    /* Find the word whose range contains this charIndex */
    for (let i = positions.length - 1; i >= 0; i--) {
      if (ci >= positions[i].start) {
        const block = sentEl.querySelector('.word-block[data-word-idx="' + i + '"]');
        if (block) block.classList.add('reading');
        break;
      }
    }
  };

  utt.onend = function () {
    clearWordHighlights(sentEl);
    sentEl.classList.remove('playing');
    if (queued && isFullRead) {
      queueIdx++;
      updateProgress();
      playNextInQueue();
    }
  };

  utt.onerror = function () {
    clearWordHighlights(sentEl);
    sentEl.classList.remove('playing');
    if (queued && isFullRead) {
      queueIdx++;
      updateProgress();
      playNextInQueue();
    }
  };

  window.speechSynthesis.speak(utt);
}

/* ── Full-text queue ──────────────────────────────────────────────────────── */
function buildQueue() {
  const story = window.STORIES[storyIdx];
  sentQueue = [];
  if (!story.paragraphs) return;

  story.paragraphs.forEach(function (paragraph) {
    paragraph.forEach(function (words) {
      const idx = sentQueue.length;
      sentQueue.push({
        words:  words,
        sentEl: document.querySelector('.sentence[data-sent-idx="' + idx + '"]')
      });
    });
  });
}

function startFullRead(fromIdx) {
  stopReading();
  buildQueue();
  if (!sentQueue.length) return;

  isFullRead = true;
  queueIdx   = (fromIdx >= 0 && fromIdx < sentQueue.length) ? fromIdx : 0;
  updateReadBtn(true);
  updateProgress();
  playNextInQueue();
}

function playNextInQueue() {
  if (queueIdx >= sentQueue.length) {
    stopReading();
    return;
  }
  const item = sentQueue[queueIdx];
  speakSentence(item.words, item.sentEl, true);
}

function stopReading() {
  isFullRead = false;
  window.speechSynthesis && window.speechSynthesis.cancel();
  document.querySelectorAll('.word-block.reading').forEach(function (el) {
    el.classList.remove('reading');
  });
  document.querySelectorAll('.sentence.playing').forEach(function (el) {
    el.classList.remove('playing');
  });
  updateReadBtn(false);
}

/* ── Progress bar ─────────────────────────────────────────────────────────── */
function updateProgress() {
  if (!sentQueue.length) return;
  const pct = Math.min(100, Math.round((queueIdx / sentQueue.length) * 100));
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-pct').textContent  = pct + '%';
}

function resetProgress() {
  queueIdx = 0;
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('progress-pct').textContent  = '0%';
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function clearWordHighlights(sentEl) {
  sentEl.querySelectorAll('.word-block.reading').forEach(function (el) {
    el.classList.remove('reading');
  });
}

function updateReadBtn(playing) {
  const btn = document.getElementById('btn-read-all');
  btn.textContent = playing ? '⏹' : '▶';
  btn.classList.toggle('playing', playing);
}

function setActive(id, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('active', on);
}

/* ── Controls ─────────────────────────────────────────────────────────────── */
function bindControls() {
  /* Play / stop full text */
  document.getElementById('btn-read-all').addEventListener('click', function () {
    if (isFullRead) {
      stopReading();
    } else {
      startFullRead(0);
    }
  });

  /* Progress bar — click to seek to sentence */
  document.getElementById('progress-track').addEventListener('click', function (e) {
    buildQueue();
    if (!sentQueue.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx  = Math.floor(pct * sentQueue.length);
    startFullRead(idx);
  });

  /* Pinyin toggle */
  document.getElementById('btn-toggle-py').addEventListener('click', function () {
    pyVisible = !pyVisible;
    document.body.classList.toggle('py-hidden', !pyVisible);
    setActive('btn-toggle-py', pyVisible);
    localStorage.setItem(LS_PY, pyVisible ? '1' : '0');
  });

  /* Translation toggle */
  document.getElementById('btn-toggle-tr').addEventListener('click', function () {
    trVisible = !trVisible;
    document.body.classList.toggle('tr-hidden', !trVisible);
    setActive('btn-toggle-tr', trVisible);
    localStorage.setItem(LS_TR, trVisible ? '1' : '0');
  });

  /* Speed — save to shared key, stop active full read */
  document.getElementById('tts-speed').addEventListener('change', function (e) {
    localStorage.setItem(window.HSK_LS.S, e.target.value);
    if (isFullRead) stopReading();
  });

  /* Prev story */
  document.getElementById('btn-prev').addEventListener('click', function () {
    if (storyIdx > 0) {
      stopReading();
      storyIdx--;
      localStorage.setItem(LS_STORY, storyIdx);
      renderStory();
    }
  });

  /* Next story */
  document.getElementById('btn-next').addEventListener('click', function () {
    if (storyIdx < window.STORIES.length - 1) {
      stopReading();
      storyIdx++;
      localStorage.setItem(LS_STORY, storyIdx);
      renderStory();
    }
  });
}
