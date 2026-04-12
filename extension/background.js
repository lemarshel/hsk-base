const OFFSCREEN_PATH = "offscreen.html";
const DEFAULT_WS = "ws://localhost:8000/ws/audio";

let offscreenReady = false;

async function ensureOffscreen() {
  if (offscreenReady) return;
  const exists = await chrome.offscreen.hasDocument?.();
  if (!exists) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ["USER_MEDIA"],
      justification: "Capture tab audio for transcription"
    });
  }
  offscreenReady = true;
}

async function startCapture(tabId, room, wsUrl) {
  if (!tabId || !room) return;
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  await ensureOffscreen();
  chrome.runtime.sendMessage({
    to: "offscreen",
    type: "start_capture",
    streamId,
    room,
    wsUrl: wsUrl || DEFAULT_WS
  });
}

async function stopCapture() {
  if (!offscreenReady) return;
  chrome.runtime.sendMessage({ to: "offscreen", type: "stop_capture" });
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.to === "offscreen") return;
  if (msg.type === "news_open") {
    const tabId = sender?.tab?.id;
    startCapture(tabId, msg.room, msg.wsUrl);
  }
  if (msg.type === "news_close") {
    stopCapture();
  }
});
