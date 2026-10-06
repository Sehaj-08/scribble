import { useRef, useState, useEffect } from 'react';
import * as websocketService from '../websocket/websocketService.js';
import { createStrokePointMessage, setCanvasReady } from '../websocket/strokeProtocol.js';

export default function Canvas({ isDrawer }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set a fixed internal coordinate system (e.g. 800x600).
    // CSS handles making the actual element responsive.
    // Only assign and wipe if it isn't already 800x600
if (canvas.width !== 800) canvas.width = 800;
if (canvas.height !== 600) canvas.height = 600;

    
    const ctx = canvas.getContext('2d');
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
        console.log("🧼 CANVAS INITIALIZED / RESET");

  }, []);

  const lastRemoteStrokeIdRef = useRef(-1);

  useEffect(() => {
    const handleRemoteStroke = (e) => {
      console.log("🔥🔥CANVAS RECEIVED:", e.detail);
      // If we are the local drawer, we ignore incoming strokes to avoid echo loops
      if (isDrawer) return;

      const { x, y, strokeId, newStroke } = e.detail;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      // Check if the drawer explicitly marked this as a new stroke,
      // or if we dropped a packet and the strokeId isn't perfectly continuous.
      if (newStroke || lastRemoteStrokeIdRef.current === -1 || strokeId !== lastRemoteStrokeIdRef.current + 1) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      lastRemoteStrokeIdRef.current = strokeId;
    };

    window.addEventListener('remote_stroke_point', handleRemoteStroke);
    
    // Phase 3.5: Tell the protocol module we are ready to receive historical/buffered strokes
    setCanvasReady(true);
    
    return () => {
      setCanvasReady(false);
      window.removeEventListener('remote_stroke_point', handleRemoteStroke);
    };
  }, [isDrawer]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    
    // onPointer* events provide clientX/clientY
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    // Calculate scaling to map CSS pixel coordinates to internal canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (!isDrawer) return;
    setIsDrawing(true);
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    
    // Draw a single dot immediately in case the user just clicks without dragging
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    // Send with isNewStroke = true
    const msg = createStrokePointMessage(coords.x, coords.y, true);
    websocketService.send(msg);
  };

  const draw = (e) => {
    if (!isDrawer || !isDrawing) return;
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    // Send with isNewStroke = false (default)
    const msg = createStrokePointMessage(coords.x, coords.y, false);
    websocketService.send(msg);
  };

  const stopDrawing = () => {
    if (!isDrawer || !isDrawing) return;
    setIsDrawing(false);
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.closePath();
  };

  return (
    <div 
      ref={containerRef}
      className="canvas-container"
      style={{
        width: '100%',
        maxWidth: '800px',
        aspectRatio: '4/3', // Keeps it proportional to 800x600 internal resolution
        margin: '0 auto',
        border: '2px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        // Prevent scrolling, pull-to-refresh, and text selection during drawing
        touchAction: 'none',
        userSelect: 'none',
        cursor: isDrawer ? 'crosshair' : 'default'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none'
        }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerOut={stopDrawing}
        onPointerCancel={stopDrawing}
      />
    </div>
  );
}
