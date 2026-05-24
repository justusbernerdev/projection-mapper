// PROGRAM MODE — GrandMA-style executor console
// Layout: Top = preview + target list, Bottom = executor grid (pages of buttons)

import { state, getGroupSurfaces } from '../state.js';
import { cueList, gotoCue, goNextCue, goPrevCue, captureCue } from '../cueList.js';
import { getBPM, setBPM } from '../content/animation.js';
import { renderSidebar } from './sidebar.js';
import { scenePresets, scenePresetNames, sceneCategories, activateScene, deactivateScene, activeScene } from '../scenes.js';
import { overlayPresets, overlayPresetNames, overlayCategories, triggerOverlay, activeOverlays } from '../overlays.js';

let panelEl = null;
let tapTimes = [];
let selectedTarget = null;
let flashScene = null;
let executorPage = 0; // current page
const EXECUTOR_PAGES = 3;

// Executor buttons — user can assign actions to these
// Stored in state for persistence
function getExecutors() {
  if (!state.executors) {
    state.executors = [];
    // Auto-populate page 0 with scenes
    scenePresetNames.forEach((key, i) => {
      state.executors.push({
        id: i + 1,
        page: 0,
        label: scenePresets[key].name,
        action: 'scene',
        value: key,
        color: scenePresets[key].color,
      });
    });
    // Page 1 = overlays
    overlayPresetNames.forEach((key, i) => {
      state.executors.push({
        id: 100 + i,
        page: 1,
        label: overlayPresets[key].name,
        action: 'overlay',
        value: key,
        color: overlayPresets[key].category === 'flash' ? '#ff8800' :
               overlayPresets[key].category === 'transition' ? '#0088ff' :
               overlayPresets[key].category === 'sparkle' ? '#ffcc00' : '#6688aa',
      });
    });
    // Page 2 = cues (auto-fill later)
  }
  return state.executors;
}

const sceneKeyMap = ['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l'];

export function enterProgramMode() {
  document.getElementById('left-panel')?.classList.add('hidden');
  document.getElementById('right-panel')?.classList.add('hidden');
  panelEl = panelEl || document.getElementById('program-panel');
  if (panelEl) {
    panelEl.style.display = 'flex';
    renderProgramPanel();
  }
}

export function exitProgramMode() {
  if (panelEl) panelEl.style.display = 'none';
  if (state.mode === 'edit') {
    document.getElementById('left-panel')?.classList.remove('hidden');
    document.getElementById('right-panel')?.classList.remove('hidden');
  }
}

export function handleProgramKey(e) {
  if (state.mode !== 'go') return false;
  if (e.key === ' ') { e.preventDefault(); tapBPM(); return true; }
  if (e.key === 'Escape') { deactivateScene(); renderProgramPanel(); renderSidebar(); return true; }

  // Page switch: PageUp/PageDown
  if (e.key === 'PageDown') { executorPage = Math.min(EXECUTOR_PAGES - 1, executorPage + 1); renderProgramPanel(); return true; }
  if (e.key === 'PageUp') { executorPage = Math.max(0, executorPage - 1); renderProgramPanel(); return true; }

  // Scene hotkeys on current page
  const keyIdx = sceneKeyMap.indexOf(e.key.toLowerCase());
  if (keyIdx >= 0) {
    const pageExecs = getExecutors().filter(ex => ex.page === executorPage);
    const exec = pageExecs[keyIdx];
    if (exec) {
      e.preventDefault();
      fireExecutor(exec);
      flashScene = exec.value;
      renderProgramPanel();
      return true;
    }
  }
  return false;
}

let lastKeyUpTime = 0, lastKeyUpScene = null;
export function handleProgramKeyUp(e) {
  if (state.mode !== 'go' || !flashScene) return false;
  const keyIdx = sceneKeyMap.indexOf(e.key.toLowerCase());
  if (keyIdx >= 0) {
    const now = performance.now();
    if (lastKeyUpScene === flashScene && now - lastKeyUpTime < 400) {
      flashScene = null; lastKeyUpScene = null; return true;
    }
    releaseExecutor();
    lastKeyUpTime = now; lastKeyUpScene = flashScene; flashScene = null;
    renderProgramPanel(); return true;
  }
  return false;
}

function fireExecutor(exec) {
  if (exec.action === 'scene') applySceneToTarget(exec.value);
  else if (exec.action === 'overlay') triggerOverlay(exec.value);
  else if (exec.action === 'cue') gotoCue(exec.value);
  else if (exec.action === 'go') goNextCue();
  else if (exec.action === 'blackout') { state.blackout = !state.blackout; }
}

function releaseExecutor() {
  stopTargetContent();
}

function applySceneToTarget(presetName) {
  const preset = scenePresets[presetName];
  if (!preset) return;
  if (preset.isBlackout) { state.blackout = true; return; }
  state.blackout = false;

  if (selectedTarget?.type === 'group') {
    const group = state.groups.find(g => g.id === selectedTarget.id);
    if (!group) return;
    if (!group.content) group.content = { enabled: false, contentType: 'animation', animationPreset: 'waves', color: '#0066ff', opacity: 1, brightness: 1 };
    group.content.enabled = true;
    if (preset.animation) { group.content.contentType = 'animation'; group.content.animationPreset = preset.animation; }
    else if (preset.isSolid) { group.content.contentType = 'solid'; group.content.color = preset.solidColor; }
  } else if (selectedTarget?.type === 'surface') {
    const surface = state.surfaces.find(s => s.id === selectedTarget.id);
    if (!surface) return;
    if (preset.animation) { surface.contentType = 'animation'; surface.animationPreset = preset.animation; surface.solo = true; }
    else if (preset.isSolid) { surface.contentType = 'solid'; surface.color = preset.solidColor; surface.solo = true; }
  } else {
    activateScene(presetName);
  }
}

function stopTargetContent() {
  if (selectedTarget?.type === 'group') {
    const group = state.groups.find(g => g.id === selectedTarget.id);
    if (group?.content) group.content.enabled = false;
  } else if (selectedTarget?.type === 'surface') {
    const surface = state.surfaces.find(s => s.id === selectedTarget.id);
    if (surface) { surface.contentType = 'solid'; surface.color = '#000000'; }
  } else {
    deactivateScene();
  }
}

function tapBPM() {
  const now = performance.now();
  tapTimes.push(now);
  if (tapTimes.length > 6) tapTimes.shift();
  if (tapTimes.length >= 2) {
    const diffs = [];
    for (let i = 1; i < tapTimes.length; i++) diffs.push(tapTimes[i] - tapTimes[i - 1]);
    setBPM(Math.round(Math.max(40, Math.min(220, 60000 / (diffs.reduce((a, b) => a + b, 0) / diffs.length)))));
  }
  setTimeout(() => { if (tapTimes.length && performance.now() - tapTimes[tapTimes.length - 1] > 2000) tapTimes = []; }, 2100);
  renderProgramPanel();
}

function getTargetLabel() {
  if (!selectedTarget) return 'ALL';
  if (selectedTarget.type === 'group') return state.groups.find(x => x.id === selectedTarget.id)?.name || 'Group';
  if (selectedTarget.type === 'surface') return state.surfaces.find(x => x.id === selectedTarget.id)?.label || 'Surface';
  return 'ALL';
}

export function renderProgramPanel() {
  if (!panelEl || state.mode !== 'go') return;

  const executors = getExecutors();
  const pageExecs = executors.filter(ex => ex.page === executorPage);
  const cues = cueList.cues;
  const activeIdx = cueList.activeCueIndex;
  const bpm = getBPM();
  const pageNames = ['Scenes', 'FX / Overlays', 'Cues'];

  panelEl.innerHTML = `
    <div class="prog-header">
      <!-- Target -->
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:10px;color:var(--text-dim);">TARGET</span>
        <select id="prog-target-select" style="background:var(--bg-darker);border:1px solid var(--border-light);color:var(--text);padding:3px 8px;border-radius:3px;font-size:12px;">
          <option value="all" ${!selectedTarget ? 'selected' : ''}>Kaikki</option>
          ${state.groups.map(g => `<option value="group:${g.id}" ${selectedTarget?.type==='group'&&selectedTarget.id===g.id?'selected':''}>${g.name}</option>`).join('')}
          ${state.surfaces.filter(s => !s.groupId).map(s => `<option value="surface:${s.id}" ${selectedTarget?.type==='surface'&&selectedTarget.id===s.id?'selected':''}>${s.label || 'Surface'}</option>`).join('')}
        </select>
      </div>

      <div class="tb-sep" style="height:16px"></div>

      <!-- BPM -->
      <span class="prog-bpm">${bpm}</span>
      <button class="prog-go-btn" id="prog-tap" style="background:rgba(0,200,80,0.12);border-color:rgba(0,200,80,0.3);font-size:11px;padding:3px 10px;">TAP</button>

      <div class="tb-sep" style="height:16px"></div>

      <!-- Cue nav -->
      <button class="prog-go-btn" id="prog-prev" style="padding:3px 8px;font-size:11px;">PREV</button>
      <button class="prog-go-btn" id="prog-go" style="padding:3px 12px;">GO</button>
      <button class="prog-go-btn" id="prog-next" style="padding:3px 8px;font-size:11px;">NEXT</button>
      <span style="font-size:12px;color:var(--text-dim);">${activeIdx >= 0 ? `${activeIdx+1}/${cues.length}` : '-'}</span>
      <button class="prog-go-btn" id="prog-capture" style="padding:3px 8px;font-size:10px;background:rgba(255,100,50,0.1);border-color:rgba(255,100,50,0.3);">STORE</button>

      <div style="flex:1"></div>

      <!-- Page tabs -->
      <div style="display:flex;gap:2px;">
        ${pageNames.map((name, i) => `
          <button class="prog-page-tab ${executorPage === i ? 'active' : ''}" data-page="${i}">${name}</button>
        `).join('')}
      </div>

      <div class="tb-sep" style="height:16px"></div>
      <button class="prog-back-btn" id="prog-back-edit">SETUP</button>
    </div>

    <!-- Executor grid -->
    <div class="prog-executor-grid">
      ${pageExecs.map((exec, i) => {
        const hotkey = sceneKeyMap[i] || '';
        const isActive = isExecutorActive(exec);
        return `<button class="prog-exec-btn${isActive ? ' active' : ''}" data-exec-idx="${i}"
          style="--exec-color:${exec.color || '#555'};">
          <span class="prog-exec-key">${hotkey.toUpperCase()}</span>
          <span class="prog-exec-label">${exec.label}</span>
        </button>`;
      }).join('')}
    </div>
  `;

  // Events
  panelEl.querySelector('#prog-target-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'all') selectedTarget = null;
    else {
      const [type, id] = val.split(':');
      selectedTarget = { type, id: parseInt(id) };
    }
    renderProgramPanel();
  });

  panelEl.querySelector('#prog-tap')?.addEventListener('click', tapBPM);
  panelEl.querySelector('#prog-go')?.addEventListener('click', () => { goNextCue(); renderProgramPanel(); renderSidebar(); });
  panelEl.querySelector('#prog-prev')?.addEventListener('click', () => { goPrevCue(); renderProgramPanel(); renderSidebar(); });
  panelEl.querySelector('#prog-next')?.addEventListener('click', () => { goNextCue(); renderProgramPanel(); renderSidebar(); });
  panelEl.querySelector('#prog-capture')?.addEventListener('click', () => { captureCue(); renderProgramPanel(); });

  panelEl.querySelector('#prog-back-edit')?.addEventListener('click', () => {
    state.mode = 'edit'; exitProgramMode(); document.body.classList.remove('performance-mode');
    const ind = document.getElementById('mode-indicator');
    if (ind) { ind.className = 'tb-mode edit'; ind.textContent = 'SETUP'; }
    renderSidebar();
  });

  // Page tabs
  panelEl.querySelectorAll('.prog-page-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      executorPage = parseInt(tab.dataset.page);
      renderProgramPanel();
    });
  });

  // Executor buttons: short press = flash, long = lock
  panelEl.querySelectorAll('.prog-exec-btn').forEach(btn => {
    const idx = parseInt(btn.dataset.execIdx);
    const exec = pageExecs[idx];
    if (!exec) return;

    let pressTimer = null, isLong = false;

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      isLong = false;
      fireExecutor(exec);
      renderProgramPanel(); renderSidebar();
      pressTimer = setTimeout(() => { isLong = true; }, 300);
    });
    btn.addEventListener('pointerup', () => {
      clearTimeout(pressTimer);
      if (!isLong && exec.action === 'scene') { releaseExecutor(); renderProgramPanel(); renderSidebar(); }
    });
    btn.addEventListener('pointerleave', () => clearTimeout(pressTimer));
  });
}

function isExecutorActive(exec) {
  if (exec.action === 'scene') {
    if (selectedTarget?.type === 'group') {
      const g = state.groups.find(x => x.id === selectedTarget.id);
      return g?.content?.enabled && g.content.animationPreset === scenePresets[exec.value]?.animation;
    }
    return activeScene.preset === exec.value;
  }
  if (exec.action === 'overlay') return activeOverlays.some(o => o.preset === exec.value);
  if (exec.action === 'cue') return cueList.activeCueIndex === exec.value;
  return false;
}
