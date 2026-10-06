let strokeIdCounter = 0;

export function getNextStrokeId() {
  strokeIdCounter += 1;
  return strokeIdCounter;
}

export function resetStrokeId() {
  strokeIdCounter = 0;
}

export function createStrokePointMessage(x, y) {
  return {
    type: "stroke_point",
    strokeId: getNextStrokeId(),
    // Keep reasonable precision to save bandwidth
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10
  };
}
