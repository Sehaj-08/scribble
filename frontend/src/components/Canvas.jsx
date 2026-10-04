import { useRef, useState, useEffect } from 'react';

export default function Canvas({ isDrawer }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set a fixed internal coordinate system (e.g. 800x600).
    // CSS handles making the actual element responsive.
    canvas.width = 800;
    canvas.height = 600;
    
    const ctx = canvas.getContext('2d');
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
  }, []);

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
  };

  const draw = (e) => {
    if (!isDrawer || !isDrawing) return;
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
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
