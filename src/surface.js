import { state } from './state.js';

let nextId = 1;

export function createSurface(overrides = {}) {
  const id = overrides.id ?? nextId++;
  if (id >= nextId) nextId = id + 1;

  // Use output resolution as coordinate system, not window size
  const cx = 1920 / 2;
  const cy = 1080 / 2;
  const w = overrides.w || 300;
  const h = overrides.h || 200;

  const surface = {
    id,
    label: `Surface ${state.surfaces.length + 1}`,
    w,
    h,
    corners: [
      { x: cx - w / 2, y: cy - h / 2 }, // top-left
      { x: cx + w / 2, y: cy - h / 2 }, // top-right
      { x: cx + w / 2, y: cy + h / 2 }, // bottom-right
      { x: cx - w / 2, y: cy + h / 2 }, // bottom-left
    ],
    contentType: 'solid', // solid | image | video | drawing | animation
    color: '#ff0066',
    opacity: 1,
    brightness: 1,
    visible: true,
    locked: false,
    solo: false, // true = uses own content, ignores global
    groupId: null,
    // Content-specific
    imageUrl: null,
    videoUrl: null,
    videoElement: null,
    animationPreset: 'circles',
    // Internal canvas for content rendering
    canvas: null,
    ctx: null,
    // Drawing state
    drawingPaths: [],
    drawingColor: '#ffffff',
    drawingWidth: 3,
    ...overrides,
  };

  // Create offscreen canvas for content
  surface.canvas = document.createElement('canvas');
  surface.canvas.width = w;
  surface.canvas.height = h;
  surface.ctx = surface.canvas.getContext('2d');

  return surface;
}

export function removeSurface(id) {
  const idx = state.surfaces.findIndex(s => s.id === id);
  if (idx >= 0) {
    const s = state.surfaces[idx];
    if (s.videoElement) {
      s.videoElement.pause();
      s.videoElement.src = '';
    }
    state.surfaces.splice(idx, 1);
    if (state.selectedSurfaceId === id) {
      state.selectedSurfaceId = state.surfaces[0]?.id ?? null;
    }
  }
}
