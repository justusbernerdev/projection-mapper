// Stage viewport — zoom, pan, fit
// The stage is always 1920x1080. This module controls how it's displayed in the canvas-area.

const OUTPUT_W = 1920;
const OUTPUT_H = 1080;

// Viewport state
const viewport = {
  zoom: 1,       // 1 = fit to container
  panX: 0,       // pan offset in screen pixels
  panY: 0,
  minZoom: 0.2,
  maxZoom: 5,
  baseScale: 1,  // computed fit-to-container scale
  baseOffsetX: 0,
  baseOffsetY: 0,
};

let stageEl = null;
let containerEl = null;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panStartOffset = { x: 0, y: 0 };

export function initStageScale(_stageEl, _containerEl) {
  stageEl = _stageEl;
  containerEl = _containerEl;
  if (!stageEl || !containerEl) return;

  stageEl.style.width = `${OUTPUT_W}px`;
  stageEl.style.height = `${OUTPUT_H}px`;
  stageEl.style.transformOrigin = '0 0';
  stageEl.style.position = 'absolute';
  stageEl.style.top = '0';
  stageEl.style.left = '0';

  // Zoom with scroll wheel
  containerEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(viewport.minZoom, Math.min(viewport.maxZoom, viewport.zoom * delta));

    // Zoom toward cursor position
    const rect = containerEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Before zoom: point under cursor in stage coords
    const oldScale = viewport.baseScale * viewport.zoom;
    const oldX = (mx - viewport.baseOffsetX - viewport.panX) / oldScale;
    const oldY = (my - viewport.baseOffsetY - viewport.panY) / oldScale;

    viewport.zoom = newZoom;

    // After zoom: adjust pan so same stage point stays under cursor
    const newScale = viewport.baseScale * viewport.zoom;
    viewport.panX = mx - viewport.baseOffsetX - oldX * newScale;
    viewport.panY = my - viewport.baseOffsetY - oldY * newScale;

    applyTransform();
  }, { passive: false });

  // Pan with middle mouse button or Alt+left click
  containerEl.addEventListener('pointerdown', (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      panStartOffset = { x: viewport.panX, y: viewport.panY };
      containerEl.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!isPanning) return;
    viewport.panX = panStartOffset.x + (e.clientX - panStart.x);
    viewport.panY = panStartOffset.y + (e.clientY - panStart.y);
    applyTransform();
  });

  window.addEventListener('pointerup', (e) => {
    if (isPanning) {
      isPanning = false;
    }
  });

  // Double-click to reset view
  containerEl.addEventListener('dblclick', (e) => {
    if (e.altKey) {
      resetView();
    }
  });

  computeBase();
  applyTransform();
  window.addEventListener('resize', () => {
    computeBase();
    applyTransform();
  });

  return applyTransform;
}

function computeBase() {
  if (!containerEl) return;
  const cw = containerEl.clientWidth;
  const ch = containerEl.clientHeight;
  viewport.baseScale = Math.min(cw / OUTPUT_W, ch / OUTPUT_H);
  viewport.baseOffsetX = (cw - OUTPUT_W * viewport.baseScale) / 2;
  viewport.baseOffsetY = (ch - OUTPUT_H * viewport.baseScale) / 2;
}

function applyTransform() {
  if (!stageEl) return;
  const scale = viewport.baseScale * viewport.zoom;
  const tx = viewport.baseOffsetX + viewport.panX;
  const ty = viewport.baseOffsetY + viewport.panY;
  stageEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
}

export function resetView() {
  viewport.zoom = 1;
  viewport.panX = 0;
  viewport.panY = 0;
  computeBase();
  applyTransform();
}

export function zoomIn() {
  viewport.zoom = Math.min(viewport.maxZoom, viewport.zoom * 1.3);
  applyTransform();
}

export function zoomOut() {
  viewport.zoom = Math.max(viewport.minZoom, viewport.zoom / 1.3);
  applyTransform();
}

export function getViewport() {
  return viewport;
}

export { OUTPUT_W, OUTPUT_H };
