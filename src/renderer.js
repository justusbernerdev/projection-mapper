import { state } from './state.js';
import { getGroupForSurface, getGroupBounds, getGroupSurfaces } from './state.js';
import { computeMatrix3d } from './homography.js';
import { renderSolid } from './content/solid.js';
import { renderImage } from './content/image.js';
import { renderVideo } from './content/video.js';
import { renderDrawing } from './content/drawing.js';
import { renderAnimation } from './content/animation.js';
import { renderText } from './content/text.js';
import { renderTestPattern } from './content/testPatterns.js';
import { renderOverlays } from './overlays.js';

const stage = document.getElementById('stage');

const contentRenderers = {
  solid: renderSolid,
  image: renderImage,
  video: renderVideo,
  drawing: renderDrawing,
  animation: renderAnimation,
  text: renderText,
};

// Cache for group offscreen canvases
const groupCanvasCache = new Map();

function getGroupCanvas(group, bounds) {
  const w = Math.max(1, Math.round(bounds.w));
  const h = Math.max(1, Math.round(bounds.h));
  let entry = groupCanvasCache.get(group.id);
  if (!entry || entry.canvas.width !== w || entry.canvas.height !== h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    entry = { canvas, ctx: canvas.getContext('2d') };
    groupCanvasCache.set(group.id, entry);
  }
  return entry;
}

// Render group content to one big canvas, then slice per surface
function renderGroupContent(group, time) {
  if (!group.content?.enabled) return null;

  const bounds = getGroupBounds(group.id);
  if (!bounds || bounds.w < 1 || bounds.h < 1) return null;

  const { canvas, ctx } = getGroupCanvas(group, bounds);
  const gc = group.content;

  // Render animation/content to full group canvas
  const fakeSurface = {
    w: canvas.width,
    h: canvas.height,
    contentType: gc.contentType,
    color: gc.color,
    animationPreset: gc.animationPreset,
    opacity: gc.opacity,
    brightness: gc.brightness,
    textContent: gc.textContent || '',
    textFont: gc.textFont || 'Arial',
    textSize: gc.textSize || 48,
    textColor: gc.textColor || '#fff',
    textBgColor: gc.textBgColor || '#000',
    textBgOpacity: gc.textBgOpacity ?? 1,
    textBold: gc.textBold || false,
  };

  const renderer = contentRenderers[gc.contentType];
  if (renderer) renderer(fakeSurface, ctx, time);

  return { canvas, bounds };
}

export function startRenderLoop() {
  requestAnimationFrame(render);
}

function render(time) {
  // Pre-render all group canvases
  const groupRenders = new Map();
  for (const group of state.groups) {
    const result = renderGroupContent(group, time);
    if (result) groupRenders.set(group.id, result);
  }

  // Render each surface
  for (const surface of state.surfaces) {
    let el = stage.querySelector(`[data-surface-id="${surface.id}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'surface-container';
      el.dataset.surfaceId = surface.id;
      const contentEl = document.createElement('canvas');
      contentEl.className = 'surface-content';
      contentEl.width = surface.w;
      contentEl.height = surface.h;
      el.appendChild(contentEl);
      stage.appendChild(el);
    }

    if (!surface.visible || state.blackout) {
      el.style.display = 'none';
      continue;
    }
    el.style.display = '';

    const matrix = computeMatrix3d(surface.w, surface.h, surface.corners);
    el.style.transform = matrix;
    el.style.opacity = surface.opacity;
    el.style.filter = surface.brightness !== 1 ? `brightness(${surface.brightness})` : '';
    el.style.width = `${surface.w}px`;
    el.style.height = `${surface.h}px`;

    const contentCanvas = el.querySelector('.surface-content');
    if (!contentCanvas) continue;
    const ctx = contentCanvas.getContext('2d');

    // Priority: test > group > global > solo > black

    if (state.activeTestPattern) {
      const surfaceIndex = state.surfaces.indexOf(surface) + 1;
      renderTestPattern(ctx, surface.w, surface.h, state.activeTestPattern, { number: surfaceIndex });
    } else {
      const group = getGroupForSurface(surface.id);
      const groupRender = group ? groupRenders.get(group.id) : null;

      if (groupRender) {
        // GROUP CONTENT — slice from unified group canvas
        // Use actual corner positions to determine slice, not surface.w/h
        const { canvas: gc, bounds } = groupRender;
        const tl = surface.corners[0];
        const tr = surface.corners[1];
        const bl = surface.corners[3];
        // Visual size in 1920x1080 space
        const visW = Math.abs(tr.x - tl.x) || surface.w;
        const visH = Math.abs(bl.y - tl.y) || surface.h;

        const srcX = (tl.x - bounds.x) / bounds.w * gc.width;
        const srcY = (tl.y - bounds.y) / bounds.h * gc.height;
        const srcW = visW / bounds.w * gc.width;
        const srcH = visH / bounds.h * gc.height;

        ctx.clearRect(0, 0, surface.w, surface.h);
        ctx.drawImage(gc, srcX, srcY, srcW, srcH, 0, 0, surface.w, surface.h);
      } else if (surface.solo) {
        // SOLO — own content always
        const renderer = contentRenderers[surface.contentType];
        if (renderer) renderer(surface, ctx, time);
      } else if (state.globalContent.enabled) {
        // GLOBAL — plays on ungrouped non-solo surfaces
        const gc = state.globalContent;
        const fakeSurface = { ...surface, contentType: gc.contentType, color: gc.color, animationPreset: gc.animationPreset, textContent: gc.textContent, textFont: gc.textFont, textSize: gc.textSize, textColor: gc.textColor, textBgColor: gc.textBgColor, textBgOpacity: gc.textBgOpacity, textBold: gc.textBold };
        const renderer = contentRenderers[gc.contentType];
        if (renderer) renderer(fakeSurface, ctx, time);
      } else {
        // DEFAULT — black, surface is just an area
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, surface.w, surface.h);
        // In edit mode show a subtle outline to see the area
        if (state.mode === 'edit') {
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, surface.w, surface.h);
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(0, 0, surface.w, surface.h);
        }
      }
    }

    // Render overlays on top of content
    renderOverlays(ctx, surface.w, surface.h, time);

    // Edit mode: outline
    const selectedIds = new Set(state.selectedSurfaceIds);
    if (state.selectedSurfaceId) selectedIds.add(state.selectedSurfaceId);
    if (state.mode === 'edit' || state.mode === 'program') {
      const selected = selectedIds.has(surface.id);
      const group = getGroupForSurface(surface.id);
      const isGroupSelected = group && state.selectedGroupId === group.id;
      el.style.outline = selected || isGroupSelected
        ? '2px solid rgba(0,180,255,0.6)'
        : surface.solo
        ? '1px solid rgba(255,200,0,0.3)'
        : '1px solid rgba(255,255,255,0.1)';
    } else {
      el.style.outline = 'none';
    }
  }

  // Cleanup orphans
  for (const el of stage.querySelectorAll('[data-surface-id]')) {
    const id = parseInt(el.dataset.surfaceId);
    if (!state.surfaces.find(s => s.id === id)) el.remove();
  }

  requestAnimationFrame(render);
}
