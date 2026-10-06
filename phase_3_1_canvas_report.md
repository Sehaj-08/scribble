# Implementation Report: Phase 3.1 - Local Canvas

This report details the implementation of **Phase 3.1: Build the Canvas** for the multiplayer Scribble game. It outlines exactly what was built, where the changes were made, and the architectural reasoning behind them.

---

## 1. What was done
We successfully implemented a fully functional, localized drawing surface for the active drawer. This phase explicitly focused on local rendering capabilities without transmitting strokes to the backend or other players.

**Key achievements:**
- Created a standalone HTML5 Canvas component.
- Implemented drawing mechanics (pointer down, move, up) using the Canvas 2D context (`beginPath`, `moveTo`, `lineTo`, `stroke`).
- Ensured drawing actions are strictly locked to the currently active drawer.
- Built a highly responsive scaling coordinate system that works fluidly across different screen sizes.
- Blocked native browser touch-scrolling and text selection on the canvas surface.

---

## 2. Where the changes were made

The implementation was cleanly modularized across two files:

### A. Created `frontend/src/components/Canvas.jsx`
This entirely new file handles all raw drawing logic and coordinate scaling.
* **Why this location:** Separating the canvas into its own component prevents `Game.jsx` from becoming bloated with imperative `useRef` and Context 2D logic. It adheres to React's compositional best practices.

### B. Modified `frontend/src/pages/Game.jsx`
* **What changed:** 
  1. Imported the `Canvas` component.
  2. Replaced the static `<div className="canvas-placeholder">` with `<Canvas isDrawer={isDrawer} />` inside the `DRAWING` phase block.
* **Why this change:** To seamlessly integrate the new canvas into the existing game lifecycle. Passing `isDrawer` as a prop allows the `Canvas` to self-regulate permissions without pushing canvas-specific state into the global `gameReducer`.

---

## 3. Why specific implementation choices were made

### 1. Canvas Resolution vs. CSS Scaling
* **Implementation:** The internal canvas resolution was hardcoded to `800x600` when mounted, but styled with `width: 100%`, `maxWidth: 800px`, and `aspectRatio: 4/3`. 
* **Why:** If the internal pixel resolution changes on window resize, the canvas clears itself. By keeping the internal resolution fixed and using a math formula (`scaleX` / `scaleY`) to translate real-world physical pointer coordinates onto the `800x600` virtual grid, the canvas smoothly scales visually without ever losing drawing data.

### 2. Local Pointer Event Guarding
* **Implementation:** `startDrawing` and `draw` immediately run `if (!isDrawer) return;`.
* **Why:** This strictly blocks non-drawers from executing local drawing logic on their browser, enforcing game rules entirely through existing state logic without adding complex global reducers.

### 3. Touch-Action and User-Select CSS
* **Implementation:** Added `touchAction: 'none'` and `userSelect: 'none'` to the inline styles of the canvas container.
* **Why:** Modern browsers try to assist users by pulling-to-refresh or scrolling when they swipe. By disabling `touchAction` exclusively on the canvas, mobile and touch-screen users can draw comfortably without accidentally dragging the entire webpage. `userSelect` prevents the mouse from mistakenly highlighting nearby text while drawing rapidly.

---

*Note: As per Phase 3.1 requirements, no WebSocket broadcasting or backend handlers for strokes were implemented yet. The foundation is perfectly primed for Phase 3.2.*
