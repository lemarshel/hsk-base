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

  function resolveSubsUrl(room, translate){
    var base = window.NEWS_SUB_WS;
    if(!base){
      var proto = (location.protocol === "https:") ? "wss://" : "ws://";
      var host = location.hostname || "localhost";
      if(host && host !== "localhost" && host !== "127.0.0.1"){
        host = "localhost";
      }
      base = proto + host + ":8000/ws/subs";
    }
    var qs = "?room=" + encodeURIComponent(room || "") + "&translate=" + (translate ? "1" : "0");
    return base + qs;
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
    if(!data) return;
    if(data.type === "status"){
      setStatus(data.text || "");
      return;
    }
    if(data.type !== "subtitle") return;
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
    var wsUrl = resolveSubsUrl(state.currentUrl, isTranslateEnabled());
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
      setStatus("Listening...");
    };
    state.ws.onmessage = function(ev){
      try{
        var payload = JSON.parse(ev.data);
        handleMessage(payload);
      }catch(e){}
    };
    state.ws.onclose = function(){
      if(state.running) setStatus("Disconnected from server.");
    };
    state.ws.onerror = function(){
      if(state.running) setStatus("Connection error.");
    };
  }

  function getStreamUrl(){
    return video.currentSrc || video.src || "";
  }

  function makeRoomId(){
    return "room_" + Date.now() + "_" + Math.random().toString(36).slice(2,8);
  }

  function startTranscription(){
    if(state.running) return;
    if(!isOverlayOpen()) return;
    if(!state.currentUrl){
      state.currentUrl = makeRoomId();
    }
    var card = document.getElementById("news-card");
    if(card) card.dataset.room = state.currentUrl;
    window.NEWS_SUB_ROOM = state.currentUrl;
    setStatus("Connecting to transcription server...");
    connectWs();
    state.running = true;
    updateVisibility();
  }

  function stopTranscription(){
    if(!state.running) return;
    state.running = false;
    if(state.ws){
      try{ state.ws.close(); }catch(e){}
    }
    state.ws = null;
    setStatus("");
    var card = document.getElementById("news-card");
    if(card) card.dataset.room = "";
    window.NEWS_SUB_ROOM = "";
  }

  function onOverlayChange(){
    updateVisibility();
    if(isOverlayOpen()){
      clearLive();
      if(!state.currentUrl){
        state.currentUrl = makeRoomId();
      }
      var card = document.getElementById("news-card");
      if(card) card.dataset.room = state.currentUrl;
      window.NEWS_SUB_ROOM = state.currentUrl;
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
      // room stays the same; no need to restart for URL changes
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
      // reconnect subtitle socket with new translate flag
      if(state.ws) try{ state.ws.close(); }catch(e){}
      state.ws = null;
      connectWs();
    }
    renderHistory();
  });

  // Initial state
  updateVisibility();
})();
