import { state, getGroupSurfaces } from '../state.js';
import { cueList, gotoCue, goNextCue } from '../cueList.js';
import { getBPM, setBPM } from '../content/animation.js';
import { renderSidebar } from './sidebar.js';
import { scenePresets, scenePresetNames, sceneCategories, activateScene, deactivateScene, activeScene } from '../scenes.js';
import { overlayPresets, overlayPresetNames, overlayCategories, triggerOverlay, activeOverlays } from '../overlays.js';

let panelEl = null;
let tapTimes = [];
let selectedTarget = null; // { type: 'group', id } or { type: 'surface', id } or null (= all)
let flashScene = null;

const sceneKeyMap = ['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t','y','u','i','o','p','a','s','d','f','g'];

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
  if (state.mode !== 'program') return false;
  if (e.key === ' ') { e.preventDefault(); tapBPM(); return true; }
  if (e.key === 'Escape') { deactivateScene(); renderProgramPanel(); renderSidebar(); return true; }

  const keyIdx = sceneKeyMap.indexOf(e.key.toLowerCase());
  if (keyIdx >= 0 && keyIdx < scenePresetNames.length) {
    e.preventDefault();
    applySceneToTarget(scenePresetNames[keyIdx]);
    flashScene = scenePresetNames[keyIdx];
    renderProgramPanel();
    return true;
  }
  return false;
}

let lastKeyUpTime = 0, lastKeyUpScene = null;
export function handleProgramKeyUp(e) {
  if (state.mode !== 'program' || !flashScene) return false;
  const keyIdx = sceneKeyMap.indexOf(e.key.toLowerCase());
  if (keyIdx >= 0 && scenePresetNames[keyIdx] === flashScene) {
    const now = performance.now();
    if (lastKeyUpScene === flashScene && now - lastKeyUpTime < 400) {
      flashScene = null; lastKeyUpScene = null; return true;
    }
    stopTargetContent();
    lastKeyUpTime = now; lastKeyUpScene = flashScene; flashScene = null;
    renderProgramPanel(); return true;
  }
  return false;
}

function applySceneToTarget(presetName) {
  const preset = scenePresets[presetName];
  if (!preset) return;

  if (preset.isBlackout) { state.blackout = true; return; }
  state.blackout = false;

  if (selectedTarget?.type === 'group') {
    // Apply to specific group only
    const group = state.groups.find(g => g.id === selectedTarget.id);
    if (!group) return;
    if (!group.content) group.content = { enabled: false, contentType: 'animation', animationPreset: 'waves', color: '#0066ff', opacity: 1, brightness: 1 };
    group.content.enabled = true;
    if (preset.animation) { group.content.contentType = 'animation'; group.content.animationPreset = preset.animation; }
    else if (preset.isSolid) { group.content.contentType = 'solid'; group.content.color = preset.solidColor; }
  } else if (selectedTarget?.type === 'surface') {
    // Apply to specific solo surface
    const surface = state.surfaces.find(s => s.id === selectedTarget.id);
    if (!surface) return;
    if (preset.animation) { surface.contentType = 'animation'; surface.animationPreset = preset.animation; surface.solo = true; }
    else if (preset.isSolid) { surface.contentType = 'solid'; surface.color = preset.solidColor; surface.solo = true; }
  } else {
    // Apply to ALL
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
  if (!selectedTarget) return 'Kaikki';
  if (selectedTarget.type === 'group') {
    const g = state.groups.find(x => x.id === selectedTarget.id);
    return g?.name || 'Group';
  }
  if (selectedTarget.type === 'surface') {
    const s = state.surfaces.find(x => x.id === selectedTarget.id);
    return s?.label || 'Surface';
  }
  return 'Kaikki';
}

function getTargetCurrentPreset() {
  if (selectedTarget?.type === 'group') {
    const g = state.groups.find(x => x.id === selectedTarget.id);
    return g?.content?.enabled ? g.content.animationPreset : null;
  }
  if (selectedTarget?.type === 'surface') {
    const s = state.surfaces.find(x => x.id === selectedTarget.id);
    return s?.contentType === 'animation' ? s.animationPreset : null;
  }
  return activeScene.preset ? scenePresets[activeScene.preset]?.animation : null;
}

export function renderProgramPanel() {
  if (!panelEl || state.mode !== 'program') return;

  const cues = cueList.cues;
  const activeIdx = cueList.activeCueIndex;
  const bpm = getBPM();
  const currentPreset = getTargetCurrentPreset();

  panelEl.innerHTML = `
    <div class="prog-header">
      <span class="prog-title">KOHDE: <strong style="color:var(--accent)">${getTargetLabel()}</strong></span>
      <span class="prog-bpm">${bpm} BPM</span>
      <button class="prog-go-btn" id="prog-tap" style="background:rgba(0,200,80,0.15);border-color:rgba(0,200,80,0.3);">TAP</button>
      <div class="tb-sep" style="height:16px"></div>
      <button class="prog-go-btn" id="prog-go">GO</button>
      <span class="prog-counter">${activeIdx >= 0 ? activeIdx + 1 : '-'}/${cues.length}</span>
      <div style="flex:1"></div>
      <button class="prog-back-btn" id="prog-back-edit">EDIT</button>
    </div>

    <div style="display:flex;flex:1;overflow:hidden;">
      <!-- LEFT: Target selector -->
      <div style="width:180px;min-width:180px;border-right:1px solid var(--border);overflow-y:auto;padding:6px;">
        <div class="prog-target ${!selectedTarget ? 'active' : ''}" data-target="all">
          Kaikki
        </div>
        ${state.groups.map(g => {
          const isActive = selectedTarget?.type === 'group' && selectedTarget.id === g.id;
          const hasContent = g.content?.enabled;
          const preset = g.content?.animationPreset;
          return `
            <div class="prog-target ${isActive ? 'active' : ''}" data-target="group" data-target-id="${g.id}" style="border-left:3px solid ${g.color};">
              <span>${g.name}</span>
              ${hasContent ? `<span style="font-size:9px;color:var(--green);">${preset}</span>` : ''}
            </div>
            ${getGroupSurfaces(g.id).map(s => `
              <div class="prog-target sub ${selectedTarget?.type === 'surface' && selectedTarget.id === s.id ? 'active' : ''}" data-target="surface" data-target-id="${s.id}">
                ${s.label || 'Surface'}
              </div>
            `).join('')}
          `;
        }).join('')}
        ${state.surfaces.filter(s => !s.groupId).map(s => {
          const isActive = selectedTarget?.type === 'surface' && selectedTarget.id === s.id;
          return `
            <div class="prog-target ${isActive ? 'active' : ''}" data-target="surface" data-target-id="${s.id}">
              ${s.label || 'Surface'} ${s.solo ? '<span style="color:#fc0;font-size:9px;">S</span>' : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- CENTER: Scene tiles by category -->
      <div style="flex:1;overflow-y:auto;padding:8px;">
        ${Object.entries(sceneCategories).map(([catKey, catName]) => {
          const catScenes = scenePresetNames.filter(k => scenePresets[k].category === catKey);
          if (catScenes.length === 0) return '';
          return `
            <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px 2px;">${catName}</div>
            <div class="prog-grid" style="grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:4px;margin-bottom:4px;">
              ${catScenes.map(key => {
                const preset = scenePresets[key];
                const isActive = currentPreset === preset.animation;
                const globalIdx = scenePresetNames.indexOf(key);
                const hotkey = sceneKeyMap[globalIdx] || '';
                return `<button class="prog-tile${isActive ? ' active' : ''}" data-scene="${key}"
                  style="background:${preset.color}15;border-color:${preset.color}44;padding:5px 3px;min-height:42px;">
                  <span class="prog-tile-name" style="font-size:10px;">${preset.name}</span>
                  ${hotkey ? `<span class="prog-tile-fade">${hotkey.toUpperCase()}</span>` : ''}
                </button>`;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>

      <!-- RIGHT: Overlays + Cues -->
      <div style="width:200px;min-width:200px;overflow-y:auto;border-left:1px solid var(--border);padding:6px;">
        ${Object.entries(overlayCategories).map(([catKey, catName]) => {
          const catOverlays = overlayPresetNames.filter(k => overlayPresets[k].category === catKey);
          if (catOverlays.length === 0) return '';
          return `
            <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:6px 0 3px 2px;">${catName}</div>
            <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px;">
              ${catOverlays.map(key => {
                const preset = overlayPresets[key];
                const isActive = activeOverlays.some(o => o.preset === key);
                const isOneShot = preset.duration > 0;
                return `<button class="prog-tile${isActive ? ' active' : ''}" data-overlay="${key}"
                  style="padding:4px 6px;min-height:32px;font-size:10px;flex:1;min-width:55px;
                  background:${isOneShot ? 'rgba(255,150,50,0.1)' : 'rgba(100,150,255,0.1)'};
                  border-color:${isOneShot ? 'rgba(255,150,50,0.3)' : 'rgba(100,150,255,0.3)'};">
                  <span class="prog-tile-name" style="font-size:10px;">${preset.name}</span>
                </button>`;
              }).join('')}
            </div>
          `;
        }).join('')}

        <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:10px 0 3px 2px;">Cues</div>
        ${cues.map((cue, i) => {
          const hueVal = (i * 47) % 360;
          const isActive = i === activeIdx;
          return `<button class="prog-tile${isActive ? ' active' : ''}" data-cue-index="${i}"
            style="background:hsl(${hueVal},55%,20%);border-color:hsl(${hueVal},60%,35%);min-height:36px;width:100%;margin-bottom:3px;">
            <span class="prog-tile-num" style="font-size:9px;">${i + 1}</span>
            <span class="prog-tile-name" style="font-size:10px;">${cue.name}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `;

  // Target selector clicks
  panelEl.querySelectorAll('.prog-target').forEach(el => {
    el.addEventListener('click', () => {
      const type = el.dataset.target;
      if (type === 'all') { selectedTarget = null; }
      else { selectedTarget = { type, id: parseInt(el.dataset.targetId) }; }
      renderProgramPanel();
    });
  });

  // Scene tiles: short press = flash, long press (>300ms) = lock
  panelEl.querySelectorAll('[data-scene]').forEach(tile => {
    let pressTimer = null, isLong = false;
    tile.addEventListener('pointerdown', () => {
      isLong = false;
      applySceneToTarget(tile.dataset.scene);
      renderProgramPanel(); renderSidebar();
      pressTimer = setTimeout(() => { isLong = true; }, 300);
    });
    tile.addEventListener('pointerup', () => {
      clearTimeout(pressTimer);
      if (!isLong) { stopTargetContent(); renderProgramPanel(); renderSidebar(); }
    });
    tile.addEventListener('pointerleave', () => clearTimeout(pressTimer));
    tile.addEventListener('dblclick', () => {
      applySceneToTarget(tile.dataset.scene);
      renderProgramPanel(); renderSidebar();
    });
  });

  // Overlay clicks
  panelEl.querySelectorAll('[data-overlay]').forEach(tile => {
    tile.addEventListener('click', () => {
      triggerOverlay(tile.dataset.overlay);
      renderProgramPanel();
    });
  });

  // Cue clicks
  panelEl.querySelectorAll('[data-cue-index]').forEach(tile => {
    tile.addEventListener('click', () => { gotoCue(parseInt(tile.dataset.cueIndex)); renderProgramPanel(); renderSidebar(); });
  });

  panelEl.querySelector('#prog-go')?.addEventListener('click', () => { goNextCue(); renderProgramPanel(); renderSidebar(); });
  panelEl.querySelector('#prog-tap')?.addEventListener('click', tapBPM);
  panelEl.querySelector('#prog-back-edit')?.addEventListener('click', () => {
    state.mode = 'edit'; exitProgramMode(); document.body.classList.remove('performance-mode');
    const ind = document.getElementById('mode-indicator');
    if (ind) { ind.className = 'tb-mode edit'; ind.textContent = 'EDIT'; }
    renderSidebar();
  });
}
