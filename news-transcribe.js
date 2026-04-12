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
    running: false,
    history: [],
    lastZh: "",
    currentUrl: ""
  };

  function $(sel){ return document.querySelector(sel); }

  var overlay = $(CONFIG.OVERLAY_SELECTOR);
  var video = $(CONFIG.VIDEO_SELECTOR);
  var subBox = $(CONFIG.SUBTITLE_CONTAINER);
  var ccBtn = $(CONFIG.CC_BUTTON);
  var trBtn = $(CONFIG.TR_BUTTON);
  if(!overlay || !video || !subBox) return;

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
    if(!data || data.type !== "subtitle") return;
    var zh = (data.text || "").trim();
    var en = (data.translation || "").trim();
    if(!zh || zh === state.lastZh) return;
    state.lastZh = zh;
    if(liveZh) liveZh.textContent = zh;
    if(liveEn){
      liveEn.textContent = (isTranslateEnabled() ? en : "");
    }
    if(data.is_final) pushHistory(zh, en);
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
    state.ws.onopen = function(){
      setStatus("Connecting...");
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

  function getStreamUrl(){
    return video.currentSrc || video.src || "";
  }

  function sendStart(url){
    if(!state.ws || state.ws.readyState !== 1) return;
    try{
      state.ws.send(JSON.stringify({
        type: "start",
        url: url,
        translate: isTranslateEnabled()
      }));
      setStatus("Listening...");
    }catch(e){}
  }

  function startTranscription(){
    if(state.running) return;
    if(!isOverlayOpen()) return;
    var url = getStreamUrl();
    if(!url){
      setStatus("Waiting for stream URL...");
      setTimeout(startTranscription, 500);
      return;
    }
    state.currentUrl = url;
    connectWs();
    if(state.ws && state.ws.readyState === 1){
      sendStart(url);
    }else if(state.ws){
      state.ws.addEventListener("open", function(){
        sendStart(url);
      }, { once: true });
    }
    state.running = true;
    updateVisibility();
  }

  function stopTranscription(){
    if(!state.running) return;
    state.running = false;
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
  video.addEventListener("loadedmetadata", function(){ if(isOverlayOpen()) startTranscription(); });
  video.addEventListener("loadstart", function(){
    if(isOverlayOpen()){
      var url = getStreamUrl();
      if(url && url !== state.currentUrl){
        stopTranscription();
        state.currentUrl = url;
        startTranscription();
      }
    }
  });
  video.addEventListener("pause", stopTranscription);
  video.addEventListener("ended", stopTranscription);
  video.addEventListener("emptied", stopTranscription);

  // Toggle visibility based on CC/TR buttons
  if(ccBtn) ccBtn.addEventListener("click", updateVisibility);
  if(trBtn) trBtn.addEventListener("click", function(){
    updateVisibility();
    if(state.running){
      stopTranscription();
      startTranscription();
    }
    renderHistory();
  });

  // Initial state
  updateVisibility();
})();
