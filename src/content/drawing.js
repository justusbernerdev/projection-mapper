// Drawing canvas: renders accumulated paths
// Paths are stored on the surface so they survive re-renders

export function renderDrawing(surface, ctx) {
  // Don't clear — accumulate drawings
  // But we need to redraw from paths each frame since canvas gets overwritten
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, surface.w, surface.h);

  for (const path of surface.drawingPaths) {
    if (path.points.length < 2) continue;
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
  }
}

export function clearDrawing(surface) {
  surface.drawingPaths = [];
}
