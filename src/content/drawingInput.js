import { state, getSelectedSurface } from '../state.js';
import { inverseMap } from '../homography.js';

let isDrawing = false;
let currentPath = null;

function screenToStage(clientX, clientY) {
  const stage = document.getElementById('stage');
  const rect = stage.getBoundingClientRect();
  const scaleX = 1920 / rect.width;
  const scaleY = 1080 / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function initDrawingInput() {
  const stage = document.getElementById('stage');

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('corner-handle')) return;
    const surface = getDrawingSurface();
    if (!surface) return;

    isDrawing = true;
    const pt = screenToStage(e.clientX, e.clientY);
    const local = inverseMap(surface.w, surface.h, surface.corners, pt.x, pt.y);
    currentPath = {
      surfaceId: surface.id,
      color: surface.drawingColor,
      width: surface.drawingWidth,
      points: [local],
    };
    surface.drawingPaths.push(currentPath);
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDrawing || !currentPath) return;
    const surface = state.surfaces.find(s => s.id === currentPath.surfaceId);
    if (!surface) return;

    const pt = screenToStage(e.clientX, e.clientY);
    const local = inverseMap(surface.w, surface.h, surface.corners, pt.x, pt.y);
    currentPath.points.push(local);
  });

  window.addEventListener('pointerup', () => {
    isDrawing = false;
    currentPath = null;
  });
}

function getDrawingSurface() {
  const sel = getSelectedSurface();
  if (sel?.contentType === 'drawing' && sel.visible) return sel;
  return null;
}
