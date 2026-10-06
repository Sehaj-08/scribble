let strokeIdCounter = 0;

export function getNextStrokeId() {
  strokeIdCounter += 1;
  return strokeIdCounter;
}

export function resetStrokeId() {
  strokeIdCounter = 0;
}

export function createStrokePointMessage(x, y, isNewStroke = false) {
  return {
    type: "stroke_point",
    strokeId: getNextStrokeId(),
    // Keep reasonable precision to save bandwidth
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    newStroke: isNewStroke
  };
}

// ---------------------------------------------------------
// PHASE 3.5: LATE-JOIN SYNC BUFFERING
// ---------------------------------------------------------
let strokeBuffer = [];
let isCanvasReady = false;

export function bufferIncomingStroke(msg) {
  console.log(
  "🔥🔥BUFFER:",
  "canvasReady =", isCanvasReady,
  "strokeId =", msg.strokeId
)
  if (isCanvasReady) {
    // If canvas is ready, dispatch immediately
    window.dispatchEvent(new CustomEvent('remote_stroke_point', { detail: msg }));
  } else {
    // If canvas hasn't mounted yet, queue the strokes
    strokeBuffer.push(msg);
  }
}

export function setCanvasReady(ready) {
  isCanvasReady = ready;
  console.log(
  "🔥🔥FLUSH CHECK:",
  "ready =", ready,
  "buffer length =", strokeBuffer.length
);
  if (ready && strokeBuffer.length > 0) {
    // Canvas just mounted. Flush the historical buffer to it instantly!
    strokeBuffer.forEach(msg => {
      window.dispatchEvent(new CustomEvent('remote_stroke_point', { detail: msg }));
    });
    strokeBuffer = []; // Clear after flushing
  }
}

export function clearStrokeBuffer() {
  strokeBuffer = [];
}

