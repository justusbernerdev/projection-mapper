import { state, selectSurface, getGroupForSurface, getGroupSurfaces } from '../state.js';
import { renderSidebar } from './sidebar.js';

const stage = document.getElementById('stage');
let handles = [];
let dragging = null;

function screenToStage(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  const scaleX = 1920 / rect.width;
  const scaleY = 1080 / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function initCornerHandles() {
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function isInsideQuad(px, py, corners) {
  const pts = [...corners];
  let sign = null;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const cross = (pts[j].x - pts[i].x) * (py - pts[i].y) -
                  (pts[j].y - pts[i].y) * (px - pts[i].x);
    const s = Math.sign(cross);
    if (s === 0) continue;
    if (sign === null) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

function onPointerDown(e) {
  if (state.mode !== 'edit') return;

  const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;

  // Corner handle drag
  if (e.target.classList.contains('corner-handle')) {
    const surfaceId = parseInt(e.target.dataset.surfaceId);
    const surface = state.surfaces.find(s => s.id === surfaceId);
    if (surface?.locked) return;
    const cornerIdx = parseInt(e.target.dataset.cornerIdx);
    selectSurface(surfaceId);
    dragging = { surfaceId, cornerIdx };
    e.target.classList.add('dragging');
    e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
    renderSidebar();
    return;
  }

  // Surface body drag
  const pt = screenToStage(e.clientX, e.clientY);
  for (const surface of [...state.surfaces].reverse()) {
    if (!surface.visible) continue;
    if (isInsideQuad(pt.x, pt.y, surface.corners)) {
      selectSurface(surface.id, isMultiSelect);

      if (!surface.locked) {
        // Collect all surfaces to move (group members + multi-selected)
        const moveSurfaces = getSurfacesToMove(surface.id);
        dragging = {
          type: 'move',
          surfaceId: surface.id,
          startPt: pt,
          moveTargets: moveSurfaces.map(s => ({
            id: s.id,
            startCorners: s.corners.map(c => ({ ...c })),
          })),
        };
      }
      e.preventDefault();
      renderSidebar();
      return;
    }
  }

  // Empty space
  state.selectedSurfaceId = null;
  state.selectedSurfaceIds = [];
  renderSidebar();
}

// Get all surfaces that should move together
function getSurfacesToMove(surfaceId) {
  const ids = new Set();

  // The surface itself
  ids.add(surfaceId);

  // All multi-selected surfaces
  for (const id of state.selectedSurfaceIds) ids.add(id);
  if (state.selectedSurfaceId) ids.add(state.selectedSurfaceId);

  // All group members
  const group = getGroupForSurface(surfaceId);
  if (group) {
    for (const id of group.surfaceIds) ids.add(id);
  }

  return state.surfaces.filter(s => ids.has(s.id) && !s.locked);
}

function onPointerMove(e) {
  if (!dragging) return;

  const pt = screenToStage(e.clientX, e.clientY);

  if (dragging.type === 'move') {
    const dx = pt.x - dragging.startPt.x;
    const dy = pt.y - dragging.startPt.y;
    for (const target of dragging.moveTargets) {
      const surface = state.surfaces.find(s => s.id === target.id);
      if (!surface) continue;
      for (let i = 0; i < 4; i++) {
        surface.corners[i] = {
          x: target.startCorners[i].x + dx,
          y: target.startCorners[i].y + dy,
        };
      }
    }
  } else {
    // Single corner drag
    const surface = state.surfaces.find(s => s.id === dragging.surfaceId);
    if (surface) surface.corners[dragging.cornerIdx] = pt;
  }
}

function onPointerUp() {
  if (!dragging) return;
  const handle = stage.querySelector(`.corner-handle.dragging`);
  handle?.classList.remove('dragging');
  dragging = null;
}

export function updateCornerHandles() {
  for (const h of handles) h.remove();
  handles = [];

  if (state.mode !== 'edit') return;

  const selectedIds = new Set(state.selectedSurfaceIds);
  if (state.selectedSurfaceId) selectedIds.add(state.selectedSurfaceId);

  for (const surface of state.surfaces) {
    if (!surface.visible) continue;
    const isSelected = selectedIds.has(surface.id);
    const group = getGroupForSurface(surface.id);

    // Corner handles (only for selected)
    for (let i = 0; i < 4; i++) {
      const corner = surface.corners[i];
      const handle = document.createElement('div');
      handle.className = 'corner-handle';
      handle.dataset.surfaceId = surface.id;
      handle.dataset.cornerIdx = i;
      handle.style.left = `${corner.x}px`;
      handle.style.top = `${corner.y}px`;
      handle.style.display = isSelected ? '' : 'none';
      if (surface.locked) {
        handle.style.background = '#666';
        handle.style.cursor = 'not-allowed';
      }
      stage.appendChild(handle);
      handles.push(handle);
    }

    // Surface label at center
    const center = getCenterOfCorners(surface.corners);
    const label = document.createElement('div');
    label.className = 'surface-label';
    label.style.left = `${center.x}px`;
    label.style.top = `${center.y - 15}px`;
    let labelText = surface.label || '';
    if (group) labelText += ` [${group.name}]`;
    if (surface.locked) labelText += ' 🔒';
    label.textContent = labelText;
    stage.appendChild(label);
    handles.push(label);
  }

  // Draw group outlines
  for (const group of state.groups) {
    drawGroupOutline(group);
  }
}

function drawGroupOutline(group) {
  const surfaces = getGroupSurfaces(group.id);
  if (surfaces.length < 2) return;

  // Draw lines connecting surface centers
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;top:0;left:0;width:1920px;height:1080px;pointer-events:none;z-index:998;';

  const centers = surfaces.map(s => getCenterOfCorners(s.corners));
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', centers[i].x);
      line.setAttribute('y1', centers[i].y);
      line.setAttribute('x2', centers[j].x);
      line.setAttribute('y2', centers[j].y);
      line.setAttribute('stroke', group.color);
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '6,4');
      line.setAttribute('opacity', '0.4');
      svg.appendChild(line);
    }
  }

  stage.appendChild(svg);
  handles.push(svg);
}

function getCenterOfCorners(corners) {
  return {
    x: corners.reduce((s, c) => s + c.x, 0) / 4,
    y: corners.reduce((s, c) => s + c.y, 0) / 4,
  };
}
