let audioCtx = null;
let sourceNode = null;
let processor = null;
let stream = null;
let ws = null;
let roomId = "";

const TARGET_RATE = 16000;
const CHUNK_SAMPLES = 16000; // 1 sec
let pcmBuffer = [];

function downsampleBuffer(buffer, sampleRate, outRate) {
  if (outRate === sampleRate) return buffer;
  const ratio = sampleRate / outRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      sum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? sum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function floatTo16BitPCM(floatBuffer) {
  const out = new Int16Array(floatBuffer.length);
  for (let i = 0; i < floatBuffer.length; i++) {
    let s = Math.max(-1, Math.min(1, floatBuffer[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function connectWs(wsUrl, room) {
  if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
  ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer";
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "start", room }));
  };
  ws.onclose = () => {};
}

function startCapture(streamId, room, wsUrl) {
  stopCapture();
  roomId = room;
  connectWs(wsUrl, roomId);

  navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    },
    video: false
  }).then((s) => {
    stream = s;
    audioCtx = new AudioContext();
    sourceNode = audioCtx.createMediaStreamSource(stream);
    processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const down = downsampleBuffer(input, audioCtx.sampleRate, TARGET_RATE);
      const pcm = floatTo16BitPCM(down);
      for (let i = 0; i < pcm.length; i++) pcmBuffer.push(pcm[i]);
      while (pcmBuffer.length >= CHUNK_SAMPLES) {
        const chunk = pcmBuffer.slice(0, CHUNK_SAMPLES);
        pcmBuffer = pcmBuffer.slice(CHUNK_SAMPLES);
        if (ws && ws.readyState === 1) {
          ws.send(new Int16Array(chunk).buffer);
        }
      }
    };
    sourceNode.connect(processor);
    processor.connect(audioCtx.destination);
  }).catch(() => {});
}

function stopCapture() {
  pcmBuffer = [];
  if (processor) {
    try { processor.disconnect(); } catch (e) {}
  }
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch (e) {}
  }
  if (audioCtx) {
    try { audioCtx.close(); } catch (e) {}
  }
  if (stream) {
    try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
  }
  if (ws) {
    try { ws.send(JSON.stringify({ type: "stop" })); } catch (e) {}
    try { ws.close(); } catch (e) {}
  }
  audioCtx = null;
  sourceNode = null;
  processor = null;
  stream = null;
  ws = null;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.to !== "offscreen") return;
  if (msg.type === "start_capture") {
    startCapture(msg.streamId, msg.room, msg.wsUrl);
  }
  if (msg.type === "stop_capture") {
    stopCapture();
  }
});
