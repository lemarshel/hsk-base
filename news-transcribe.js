// Live transcription for existing News modal (Chinese + optional English)
(function(){
  "use strict";

  // === Adapt these constants if your selectors differ ===
  var CONFIG = {
    OVERLAY_SELECTOR: "#news-overlay",
    VIDEO_SELECTOR: "#news-player",
    SUBTITLE_CONTAINER: "#news-subtitles",
    CC_BUTTON: "#news-cc",
    TR_BUTTON: "#news-tr",
    CHUNK_MS: 1500,
    HISTORY_LIMIT: 6
  };

  var state = {
    ws: null,
    recorder: null,
    mediaStream: null,
    audioCtx: null,
    audioSrc: null,
    audioDest: null,
    running: false,
    history: [],
    lastZh: "",
    retryCount: 0
  };

  function $(sel){ return document.querySelector(sel); }

  var overlay = $(CONFIG.OVERLAY_SELECTOR);
  var video = $(CONFIG.VIDEO_SELECTOR);
  var subBox = $(CONFIG.SUBTITLE_CONTAINER);
  var ccBtn = $(CONFIG.CC_BUTTON);
  var trBtn = $(CONFIG.TR_BUTTON);
  if(!overlay || !video || !subBox) return;
  try{ video.crossOrigin = "anonymous"; }catch(e){}

  // Build UI under the video (within existing subtitles box)
  var liveWrap = document.createElement("div");
  liveWrap.className = "live-transcript";
  liveWrap.innerHTML = ""
    + "<div class=\"live-zh\"></div>"
    + "<div class=\"live-en\"></div>"
    + "<div class=\"live-history\"></div>"
    + "<div class=\"live-status\"></div>";
  subBox.appendChild(liveWrap);

  var liveZh = liveWrap.querySelector(".live-zh");
  var liveEn = liveWrap.querySelector(".live-en");
  var liveHist = liveWrap.querySelector(".live-history");
  var liveStatus = liveWrap.querySelector(".live-status");

  function isOverlayOpen(){
    return overlay.style.display && overlay.style.display !== "none";
  }

  function isTranslateEnabled(){
    return !!(trBtn && trBtn.classList.contains("active"));
  }

  function isCcEnabled(){
    return !ccBtn || ccBtn.classList.contains("active");
  }

  function updateVisibility(){
    liveWrap.style.display = isCcEnabled() ? "" : "none";
    liveEn.style.display = isTranslateEnabled() ? "" : "none";
  }

  function setStatus(msg){
    if(liveStatus) liveStatus.textContent = msg || "";
  }

  function resolveWsUrl(){
    if(window.NEWS_TRANSCRIBE_WS) return window.NEWS_TRANSCRIBE_WS;
    var proto = (location.protocol === "https:") ? "wss://" : "ws://";
    var host = location.hostname || "localhost";
    if(host && host !== "localhost" && host !== "127.0.0.1"){
      host = "localhost";
    }
    return proto + host + ":8000/ws/transcribe";
  }

  function pickMime(){
    var prefs = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus"
    ];
    for(var i=0;i<prefs.length;i++){
      if(window.MediaRecorder && MediaRecorder.isTypeSupported(prefs[i])) return prefs[i];
    }
    return "";
  }

  function clearLive(){
    if(liveZh) liveZh.textContent = "";
    if(liveEn) liveEn.textContent = "";
    if(liveHist) liveHist.innerHTML = "";
    state.history = [];
    state.lastZh = "";
  }

  function pushHistory(zh, en){
    if(!zh) return;
    state.history.unshift({ zh: zh, en: en || "" });
    if(state.history.length > CONFIG.HISTORY_LIMIT) state.history.pop();
    renderHistory();
  }

  function renderHistory(){
    if(!liveHist) return;
    liveHist.innerHTML = "";
    for(var i=0;i<state.history.length;i++){
      var item = document.createElement("div");
      item.className = "hist-item";
      var zh = document.createElement("div");
      zh.textContent = state.history[i].zh;
      item.appendChild(zh);
      if(isTranslateEnabled() && state.history[i].en){
        var en = document.createElement("div");
        en.style.color = "#cde7ff";
        en.style.fontSize = ".85em";
        en.textContent = state.history[i].en;
        item.appendChild(en);
      }
      liveHist.appendChild(item);
    }
  }

  function handleMessage(data){
    if(!data || data.type !== "transcript") return;
    var zh = (data.zh || "").trim();
    var en = (data.en || "").trim();
    if(!zh || zh === state.lastZh) return;
    state.lastZh = zh;
    if(liveZh) liveZh.textContent = zh;
    if(liveEn){
      liveEn.textContent = (isTranslateEnabled() ? en : "");
    }
    pushHistory(zh, en);
  }

  function connectWs(){
    if(state.ws && (state.ws.readyState === 0 || state.ws.readyState === 1)) return;
    var wsUrl = resolveWsUrl();
    if(location.protocol === "https:" && wsUrl.indexOf("ws://") === 0){
      setStatus("HTTPS page blocks ws://. Use wss:// or open locally (http/file).");
      return;
    }
    try{
      state.ws = new WebSocket(wsUrl);
    }catch(e){
      setStatus("Live transcription unavailable (WebSocket failed).");
      return;
    }
    state.ws.binaryType = "arraybuffer";
    state.ws.onopen = function(){
      try{
        state.ws.send(JSON.stringify({
          type: "start",
          lang: "zh",
          translate: isTranslateEnabled()
        }));
      }catch(e){}
      setStatus("Listening...");
    };
    state.ws.onmessage = function(ev){
      try{
        var payload = JSON.parse(ev.data);
        handleMessage(payload);
      }catch(e){}
    };
    state.ws.onclose = function(){
      if(state.running) setStatus("Disconnected.");
    };
    state.ws.onerror = function(){
      if(state.running) setStatus("Connection error.");
    };
  }

  function cleanupAudioContext(){
    if(state.audioSrc){
      try{ state.audioSrc.disconnect(); }catch(e){}
    }
    if(state.audioDest){
      try{ state.audioDest.disconnect(); }catch(e){}
    }
    if(state.audioCtx){
      try{ state.audioCtx.close(); }catch(e){}
    }
    state.audioCtx = null;
    state.audioSrc = null;
    state.audioDest = null;
  }

  function getAudioStream(){
    var capture = video.captureStream || video.mozCaptureStream;
    if(capture){
      try{
        var fullStream = capture.call(video);
        var audioTracks = fullStream.getAudioTracks();
        if(audioTracks && audioTracks.length){
          return new MediaStream(audioTracks);
        }
      }catch(e){}
    }
    // Fallback: Web Audio capture
    if(window.AudioContext || window.webkitAudioContext){
      try{
        var Ctx = window.AudioContext || window.webkitAudioContext;
        state.audioCtx = state.audioCtx || new Ctx();
        state.audioSrc = state.audioSrc || state.audioCtx.createMediaElementSource(video);
        state.audioDest = state.audioDest || state.audioCtx.createMediaStreamDestination();
        // Ensure audio still plays
        state.audioSrc.connect(state.audioCtx.destination);
        state.audioSrc.connect(state.audioDest);
        var dstTracks = state.audioDest.stream.getAudioTracks();
        if(dstTracks && dstTracks.length){
          return state.audioDest.stream;
        }
      }catch(e){}
    }
    return null;
  }

  function startTranscription(){
    if(state.running) return;
    if(!isOverlayOpen()) return;
    if(!video) return;
    var audioStream = getAudioStream();
    if(!audioStream){
      state.retryCount += 1;
      if(state.retryCount <= 3){
        setStatus("Waiting for audio...");
        setTimeout(startTranscription, 900);
      }else{
        setStatus("Audio capture blocked (CORS or no audio track).");
      }
      return;
    }
    state.retryCount = 0;
    state.mediaStream = audioStream;
    var mime = pickMime();
    try{
      state.recorder = new MediaRecorder(state.mediaStream, mime ? { mimeType: mime } : undefined);
    }catch(e){
      setStatus("Recording not supported.");
      return;
    }

    connectWs();

    state.recorder.ondataavailable = function(ev){
      if(!ev.data || !ev.data.size) return;
      if(!state.ws || state.ws.readyState !== 1) return;
      ev.data.arrayBuffer().then(function(buf){
        if(state.ws && state.ws.readyState === 1) state.ws.send(buf);
      }).catch(function(){});
    };
    state.recorder.onerror = function(){ setStatus("Recorder error."); };
    state.recorder.start(CONFIG.CHUNK_MS);
    state.running = true;
    updateVisibility();
  }

  function stopTranscription(){
    if(!state.running) return;
    state.running = false;
    try{
      if(state.recorder && state.recorder.state !== "inactive") state.recorder.stop();
    }catch(e){}
    state.recorder = null;
    if(state.mediaStream){
      try{
        state.mediaStream.getTracks().forEach(function(t){ t.stop(); });
      }catch(e){}
    }
    state.mediaStream = null;
    cleanupAudioContext();
    if(state.ws){
      try{ state.ws.send(JSON.stringify({ type: "stop" })); }catch(e){}
      try{ state.ws.close(); }catch(e){}
    }
    state.ws = null;
    setStatus("");
  }

  function onOverlayChange(){
    updateVisibility();
    if(isOverlayOpen()){
      clearLive();
      state.retryCount = 0;
      if(!video.paused) startTranscription();
    } else {
      stopTranscription();
    }
  }

  // Observe modal visibility
  var obs = new MutationObserver(onOverlayChange);
  obs.observe(overlay, { attributes: true, attributeFilter: ["style", "class"] });

  // Video events
  video.addEventListener("play", function(){ if(isOverlayOpen()) startTranscription(); });
  video.addEventListener("playing", function(){ if(isOverlayOpen()) startTranscription(); });
  video.addEventListener("pause", stopTranscription);
  video.addEventListener("ended", stopTranscription);
  video.addEventListener("emptied", stopTranscription);

  // Toggle visibility based on CC/TR buttons
  if(ccBtn) ccBtn.addEventListener("click", updateVisibility);
  if(trBtn) trBtn.addEventListener("click", function(){
    updateVisibility();
    if(state.running && state.ws && state.ws.readyState === 1){
      try{
        state.ws.send(JSON.stringify({
          type: "config",
          translate: isTranslateEnabled()
        }));
      }catch(e){}
    }
    renderHistory();
  });

  // Initial state
  updateVisibility();
})();
