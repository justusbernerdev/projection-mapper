// App state — single source of truth

export const state = {
  mode: 'edit', // 'edit' (SETUP) | 'program' (PROGRAM) | 'performance' (GO/LIVE)
  surfaces: [],
  selectedSurfaceId: null,
  selectedSurfaceIds: [], // multi-select
  uiVisible: true,
  blackout: false,
  showGrid: true,
  activeTestPattern: null,
  // Global content — plays on all non-solo surfaces
  globalContent: {
    enabled: false,
    contentType: 'animation', // solid | animation | text
    color: '#0066ff',
    animationPreset: 'waves',
    textContent: '',
    textFont: 'Arial',
    textSize: 48,
    textColor: '#ffffff',
    textBgColor: '#000000',
    textBgOpacity: 1,
    textBold: false,
    opacity: 1,
    brightness: 1,
  },
  outputs: [],
  nextOutputId: 1,
  groups: [], // { id, name, surfaceIds[], locked, color, content }
  selectedGroupId: null,
  nextGroupId: 1,
  nextId: 1,
};

export function getSelectedSurface() {
  return state.surfaces.find(s => s.id === state.selectedSurfaceId) ?? null;
}

export function getSelectedSurfaces() {
  if (state.selectedSurfaceIds.length > 0) {
    return state.surfaces.filter(s => state.selectedSurfaceIds.includes(s.id));
  }
  const s = getSelectedSurface();
  return s ? [s] : [];
}

export function selectSurface(id, addToSelection = false) {
  if (addToSelection) {
    // Shift/Ctrl+click multi-select
    const idx = state.selectedSurfaceIds.indexOf(id);
    if (idx >= 0) {
      state.selectedSurfaceIds.splice(idx, 1);
    } else {
      if (!state.selectedSurfaceIds.includes(state.selectedSurfaceId) && state.selectedSurfaceId) {
        state.selectedSurfaceIds.push(state.selectedSurfaceId);
      }
      state.selectedSurfaceIds.push(id);
    }
    state.selectedSurfaceId = id;
  } else {
    state.selectedSurfaceId = id;
    state.selectedSurfaceIds = [];
  }
}

export function toggleMode() {
  const modes = ['edit', 'program', 'performance'];
  const idx = modes.indexOf(state.mode);
  state.mode = modes[(idx + 1) % modes.length];
}

// ── Groups ──

export function createGroup(name, surfaceIds) {
  const group = {
    id: state.nextGroupId++,
    name: name || `Group ${state.groups.length + 1}`,
    surfaceIds: [...surfaceIds],
    locked: false,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    // Group-level content — renders as one unified surface
    content: {
      enabled: false,
      contentType: 'animation',
      animationPreset: 'waves',
      color: '#0066ff',
      opacity: 1,
      brightness: 1,
    },
    // Offscreen canvas for unified render
    _canvas: null,
  };
  // Tag surfaces with group
  for (const sid of surfaceIds) {
    const s = state.surfaces.find(x => x.id === sid);
    if (s) s.groupId = group.id;
  }
  state.groups.push(group);
  return group;
}

export function deleteGroup(groupId) {
  const idx = state.groups.findIndex(g => g.id === groupId);
  if (idx < 0) return;
  const group = state.groups[idx];
  // Untag surfaces
  for (const sid of group.surfaceIds) {
    const s = state.surfaces.find(x => x.id === sid);
    if (s) s.groupId = null;
  }
  state.groups.splice(idx, 1);
}

export function addSurfaceToGroup(groupId, surfaceId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  if (!group.surfaceIds.includes(surfaceId)) {
    group.surfaceIds.push(surfaceId);
  }
  const s = state.surfaces.find(x => x.id === surfaceId);
  if (s) s.groupId = groupId;
}

export function removeSurfaceFromGroup(groupId, surfaceId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  group.surfaceIds = group.surfaceIds.filter(id => id !== surfaceId);
  const s = state.surfaces.find(x => x.id === surfaceId);
  if (s) s.groupId = null;
}

export function getGroupForSurface(surfaceId) {
  return state.groups.find(g => g.surfaceIds.includes(surfaceId)) ?? null;
}

export function getGroupSurfaces(groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return [];
  return state.surfaces.filter(s => group.surfaceIds.includes(s.id));
}

// Bounding box of all corners in a group
export function getGroupBounds(groupId) {
  const surfaces = getGroupSurfaces(groupId);
  if (surfaces.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of surfaces) {
    for (const c of s.corners) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x > maxX) maxX = c.x;
      if (c.y > maxY) maxY = c.y;
    }
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
