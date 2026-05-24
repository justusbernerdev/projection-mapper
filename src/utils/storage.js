import { state } from '../state.js';
import { createSurface } from '../surface.js';
import { serializeCueList, deserializeCueList } from '../cueList.js';
import { serializeOutputs, deserializeOutputs } from '../outputWindow.js';
import { saveProject, loadProject, listProjects, deleteProject } from './db.js';

const DEFAULT_PROJECT = 'default';

function serializeSurface(s) {
  return {
    id: s.id,
    label: s.label,
    w: s.w,
    h: s.h,
    corners: s.corners,
    contentType: s.contentType,
    color: s.color,
    opacity: s.opacity,
    brightness: s.brightness,
    visible: s.visible,
    locked: s.locked,
    solo: s.solo,
    groupId: s.groupId,
    animationPreset: s.animationPreset,
    drawingColor: s.drawingColor,
    drawingWidth: s.drawingWidth,
    textContent: s.textContent,
    textFont: s.textFont,
    textCustomFont: s.textCustomFont,
    textSize: s.textSize,
    textColor: s.textColor,
    textBgColor: s.textBgColor,
    textBgOpacity: s.textBgOpacity,
    textAlign: s.textAlign,
    textBold: s.textBold,
    textItalic: s.textItalic,
    textStroke: s.textStroke,
  };
}

function buildStateData() {
  return {
    surfaces: state.surfaces.map(serializeSurface),
    cueList: serializeCueList(),
    outputs: serializeOutputs(),
    groups: state.groups.map(g => ({ id: g.id, name: g.name, surfaceIds: g.surfaceIds, locked: g.locked, color: g.color })),
    globalContent: { ...state.globalContent },
  };
}

function applyStateData(data) {
  state.surfaces = [];
  for (const sd of (data.surfaces || [])) {
    const s = createSurface(sd);
    state.surfaces.push(s);
  }
  if (state.surfaces.length > 0) {
    state.selectedSurfaceId = state.surfaces[0].id;
  }
  if (data.cueList) {
    deserializeCueList(data.cueList);
  }
  if (data.outputs) {
    deserializeOutputs(data.outputs);
  }
  if (data.globalContent) {
    Object.assign(state.globalContent, data.globalContent);
  }
  if (data.groups) {
    state.groups = data.groups;
    state.nextGroupId = Math.max(...data.groups.map(g => g.id), 0) + 1;
  }
}

// ── Public API ──

export async function saveConfig(projectId = DEFAULT_PROJECT) {
  await saveProject(projectId, buildStateData());
}

export async function loadConfig(projectId = DEFAULT_PROJECT) {
  const data = await loadProject(projectId);
  if (data) {
    applyStateData(data);
  }
}

export async function saveProjectAs(name) {
  const id = name.toLowerCase().replace(/\s+/g, '-');
  await saveProject(id, { ...buildStateData(), name });
  return id;
}

export async function getProjectList() {
  return listProjects();
}

export async function deleteProjectById(id) {
  return deleteProject(id);
}

// Auto-save — debounced, saves to IndexedDB
let autoSaveTimer = null;
let lastSnapshot = '';

export function initAutoSave() {
  setInterval(() => {
    const current = JSON.stringify(buildStateData());
    if (current !== lastSnapshot) {
      lastSnapshot = current;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        saveConfig().catch(console.error);
      }, 500);
    }
  }, 1000);
}

// Export/Import JSON files
export function exportConfig() {
  const blob = new Blob([JSON.stringify(buildStateData(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'projection-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function importConfig(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  applyStateData(data);
}
