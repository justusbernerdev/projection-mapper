import { state, selectSurface, getSelectedSurface, getSelectedSurfaces, createGroup, deleteGroup, getGroupForSurface } from '../state.js';
import { createSurface, removeSurface } from '../surface.js';
import { animationPresetNames } from '../content/animation.js';
import { loadVideo } from '../content/video.js';
import { clearDrawing } from '../content/drawing.js';
import { saveConfig } from '../utils/storage.js';
import { cueList, captureCue, gotoCue, goNextCue, goPrevCue, deleteCue, updateCueName } from '../cueList.js';
import { openOutputWindow, createOutput, removeOutput, renameOutput } from '../outputWindow.js';
import { zoomIn, zoomOut, resetView, getViewport } from '../stageScale.js';
import { setBPM, getBPM } from '../content/animation.js';
import { toggle as toggleModeUI } from '../utils/keyboard.js';

const surfaceListEl = document.getElementById('surface-list');
const outputListEl = document.getElementById('output-list');
const cueItemsEl = document.getElementById('cue-items');
const propsEl = document.getElementById('props-content');
const bottomBar = document.getElementById('bottom-bar');

export function initSidebar() {
  // Toolbar buttons
  // Mode indicator click → toggle mode
  document.getElementById('mode-indicator')?.addEventListener('click', toggleModeUI);

  document.getElementById('btn-add-surface')?.addEventListener('click', () => {
    const s = createSurface();
    state.surfaces.push(s);
    state.selectedSurfaceId = s.id;
    renderSidebar();
  });

  document.getElementById('btn-group-selected')?.addEventListener('click', () => {
    const selected = getSelectedSurfaces();
    if (selected.length < 2) return;
    createGroup(null, selected.map(s => s.id));
    state.selectedSurfaceIds = [];
    renderSidebar();
  });

  document.getElementById('tb-output')?.addEventListener('click', () => {
    openOutputWindow();
    renderSidebar();
  });
  document.getElementById('btn-add-output')?.addEventListener('click', () => {
    createOutput();
    renderSidebar();
  });
  document.getElementById('tb-remote')?.addEventListener('click', () => {
    window.open('/remote.html', 'projection-remote', 'width=400,height=700');
  });
  document.getElementById('tb-executor')?.addEventListener('click', () => {
    window.open('/executor.html', 'projection-executor', 'width=900,height=600');
  });
  document.getElementById('tb-blackout')?.addEventListener('click', () => {
    state.blackout = !state.blackout;
    renderSidebar();
  });
  document.getElementById('tb-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });
  document.getElementById('tb-grid')?.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    renderSidebar();
  });

  // Play/Stop global content
  document.getElementById('tb-play')?.addEventListener('click', () => {
    state.globalContent.enabled = !state.globalContent.enabled;
    renderSidebar();
  });

  // Zoom controls
  document.getElementById('tb-zoom-in')?.addEventListener('click', () => { zoomIn(); updateZoomDisplay(); });
  document.getElementById('tb-zoom-out')?.addEventListener('click', () => { zoomOut(); updateZoomDisplay(); });
  document.getElementById('tb-zoom-reset')?.addEventListener('click', () => { resetView(); updateZoomDisplay(); });

  // Update zoom display on scroll
  document.getElementById('canvas-area')?.addEventListener('wheel', () => {
    requestAnimationFrame(updateZoomDisplay);
  }, { passive: true });

  // Test pattern dropdown
  const testBtn = document.getElementById('tb-test');
  const testMenu = document.getElementById('test-pattern-menu');
  if (testBtn && testMenu) {
    testBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      testMenu.style.display = testMenu.style.display === 'none' ? 'block' : 'none';
    });
    for (const item of testMenu.querySelectorAll('.tp-item')) {
      item.addEventListener('click', () => {
        state.activeTestPattern = item.dataset.pattern;
        testMenu.style.display = 'none';
        renderSidebar();
      });
    }
    document.addEventListener('click', () => { testMenu.style.display = 'none'; });
  }
  document.getElementById('tb-clear-test')?.addEventListener('click', () => {
    state.activeTestPattern = null;
    renderSidebar();
  });

  // Cue buttons
  document.getElementById('btn-capture-cue')?.addEventListener('click', () => {
    captureCue();
    renderSidebar();
  });
  document.getElementById('btn-prev-cue')?.addEventListener('click', () => {
    goPrevCue();
    renderSidebar();
  });
  document.getElementById('btn-next-cue')?.addEventListener('click', () => {
    goNextCue();
    renderSidebar();
  });

  renderSidebar();
}

export function renderSidebar() {
  renderSurfaceList();
  renderGroupList();
  renderOutputList();
  renderCueList();
  renderProps();
  updateStatusBar();
  updateToolbar();
}

function updateZoomDisplay() {
  const el = document.getElementById('zoom-level');
  if (el) el.textContent = `${Math.round(getViewport().zoom * 100)}%`;
}

function updateToolbar() {
  const gridBtn = document.getElementById('tb-grid');
  if (gridBtn) gridBtn.classList.toggle('active', state.showGrid !== false);

  const blackoutBtn = document.getElementById('tb-blackout');
  if (blackoutBtn) blackoutBtn.classList.toggle('active', state.blackout);

  const playBtn = document.getElementById('tb-play');
  if (playBtn) {
    const playing = state.globalContent.enabled;
    playBtn.classList.toggle('active', playing);
    playBtn.innerHTML = playing ? '&#9724; Stop' : '&#9654; Play';
    playBtn.style.color = playing ? 'var(--green)' : '';
  }

  const testBtn = document.getElementById('tb-test');
  if (testBtn) testBtn.classList.toggle('active', !!state.activeTestPattern);
  const clearTestBtn = document.getElementById('tb-clear-test');
  if (clearTestBtn) clearTestBtn.style.display = state.activeTestPattern ? '' : 'none';

  // Highlight active pattern in menu
  const menuItems = document.querySelectorAll('.tp-item');
  for (const item of menuItems) {
    item.classList.toggle('active', item.dataset.pattern === state.activeTestPattern);
  }
}

function updateStatusBar() {
  if (!bottomBar) return;
  const modeEl = document.getElementById('status-mode');
  const surfEl = document.getElementById('status-surfaces');
  const cueEl = document.getElementById('status-cue');
  if (modeEl) modeEl.textContent = state.mode === 'edit' ? 'Edit Mode' : 'LIVE';
  if (surfEl) surfEl.textContent = `${state.surfaces.length} surfaces`;
  if (cueEl) {
    const ci = cueList.activeCueIndex;
    cueEl.textContent = ci >= 0 ? `Cue ${ci + 1}: ${cueList.cues[ci]?.name}` : 'No cue';
  }
}

function renderSurfaceItem(s, indented) {
  const selected = s.id === state.selectedSurfaceId || state.selectedSurfaceIds.includes(s.id);
  return `
    <div class="sf-item ${selected ? 'selected' : ''}" data-id="${s.id}" style="${indented ? 'padding-left:24px;' : ''}">
      <div class="sf-vis ${s.visible ? 'on' : ''}" data-vis-id="${s.id}" title="Toggle visibility"></div>
      <div class="sf-color" style="background:${s.contentType === 'solid' ? s.color : '#555'};"></div>
      <input class="sf-name-input" type="text" value="${s.label || ''}" data-name-id="${s.id}"
        style="flex:1;background:transparent;border:none;color:var(--text);font-size:12px;padding:1px 2px;outline:none;overflow:hidden;text-overflow:ellipsis;cursor:pointer;"
        onfocus="this.style.background='rgba(255,255,255,0.06)'" onblur="this.style.background='transparent'">
      ${s.locked ? '<span style="font-size:9px;color:var(--accent);">L</span>' : ''}
      ${s.solo ? '<span style="font-size:9px;color:#fc0;padding:1px 3px;border:1px solid rgba(255,200,0,0.3);border-radius:2px;">S</span>' : ''}
      <span class="sf-type" style="font-size:10px;color:var(--text-dim);">${s.contentType}</span>
      <button class="sf-del" data-del-id="${s.id}">&times;</button>
    </div>
  `;
}

function renderSurfaceList() {
  if (!surfaceListEl) return;

  // Build tree: ungrouped surfaces + groups with their surfaces
  const grouped = new Set();
  for (const g of state.groups) {
    for (const sid of g.surfaceIds) grouped.add(sid);
  }
  const ungrouped = state.surfaces.filter(s => !grouped.has(s.id));

  let html = '';

  // Groups first — each group shows as a collapsible header with surfaces inside
  for (const g of state.groups) {
    const isGroupSel = state.selectedGroupId === g.id;
    const groupSurfaces = state.surfaces.filter(s => g.surfaceIds.includes(s.id));
    html += `
      <div class="sf-item ${isGroupSel ? 'selected' : ''}" data-group-click="${g.id}" style="border-left-color:${g.color};font-weight:600;">
        <div style="width:12px;height:12px;border-radius:2px;background:${g.color};flex-shrink:0;"></div>
        <span style="flex:1;font-size:12px;">${g.name}</span>
        <span style="font-size:10px;color:var(--text-dim);">${groupSurfaces.length}</span>
        ${g.content?.enabled ? '<span style="font-size:9px;color:var(--green);padding:1px 3px;border:1px solid rgba(0,200,80,0.3);border-radius:2px;">ON</span>' : ''}
        <button class="sf-del" data-grp-del="${g.id}" title="Ungroup">&times;</button>
      </div>
    `;
    // Child surfaces indented
    for (const s of groupSurfaces) {
      html += renderSurfaceItem(s, true);
    }
  }

  // Ungrouped surfaces
  for (const s of ungrouped) {
    html += renderSurfaceItem(s, false);
  }

  surfaceListEl.innerHTML = html;

  // Group header click → select group, show group props
  for (const item of surfaceListEl.querySelectorAll('[data-group-click]')) {
    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const gid = parseInt(item.dataset.groupClick);
      state.selectedGroupId = gid;
      state.selectedSurfaceId = null;
      state.selectedSurfaceIds = [];
      renderSidebar();
    });
  }
  for (const btn of surfaceListEl.querySelectorAll('[data-grp-del]')) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGroup(parseInt(btn.dataset.grpDel));
      state.selectedGroupId = null;
      renderSidebar();
    });
  }

  // Event listeners
  for (const item of surfaceListEl.querySelectorAll('.sf-item[data-id]')) {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.sf-vis') || e.target.closest('.sf-del') || e.target.tagName === 'INPUT') return;
      state.selectedGroupId = null;
      selectSurface(parseInt(item.dataset.id), e.shiftKey || e.ctrlKey || e.metaKey);
      renderSidebar();
    });
  }
  for (const vis of surfaceListEl.querySelectorAll('.sf-vis')) {
    vis.addEventListener('click', (e) => {
      e.stopPropagation();
      const s = state.surfaces.find(s => s.id === parseInt(vis.dataset.visId));
      if (s) s.visible = !s.visible;
      renderSidebar();
    });
  }
  for (const input of surfaceListEl.querySelectorAll('.sf-name-input')) {
    input.addEventListener('change', (e) => {
      const s = state.surfaces.find(s => s.id === parseInt(input.dataset.nameId));
      if (s) s.label = e.target.value;
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  }
  for (const lock of surfaceListEl.querySelectorAll('.sf-lock')) {
    lock.addEventListener('click', (e) => {
      e.stopPropagation();
      const s = state.surfaces.find(s => s.id === parseInt(lock.dataset.lockId));
      if (s) s.locked = !s.locked;
      renderSidebar();
    });
  }
  for (const del of surfaceListEl.querySelectorAll('.sf-del')) {
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      removeSurface(parseInt(del.dataset.delId));
      renderSidebar();
    });
  }
}

function renderGroupList() {
  const el = document.getElementById('group-list');
  const btn = document.getElementById('btn-group-selected');
  if (!el) return;

  // Show/hide group button based on multi-selection
  const selCount = getSelectedSurfaces().length;
  if (btn) btn.style.display = selCount >= 2 ? '' : 'none';

  if (state.groups.length === 0) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <div class="panel-header" style="font-size:10px;">Groups</div>
    ${state.groups.map(g => `
      <div class="sf-item" data-group-id="${g.id}" style="border-left-color:${g.color};">
        <div style="width:10px;height:10px;border-radius:2px;background:${g.color};flex-shrink:0;"></div>
        <input class="grp-name" type="text" value="${g.name}" data-grp-name="${g.id}"
          style="flex:1;background:transparent;border:none;color:var(--text);font-size:12px;padding:1px 2px;outline:none;">
        <span style="font-size:10px;color:var(--text-dim);">${g.surfaceIds.length}</span>
        <button class="sf-del" data-grp-del="${g.id}" title="Ungroup">&times;</button>
      </div>
    `).join('')}
  `;

  for (const input of el.querySelectorAll('.grp-name')) {
    input.addEventListener('change', (e) => {
      const g = state.groups.find(g => g.id === parseInt(input.dataset.grpName));
      if (g) g.name = e.target.value;
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  }
  for (const btn of el.querySelectorAll('[data-grp-del]')) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGroup(parseInt(btn.dataset.grpDel));
      renderSidebar();
    });
  }
  // Click group to select all its surfaces
  for (const item of el.querySelectorAll('[data-group-id]')) {
    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      const g = state.groups.find(g => g.id === parseInt(item.dataset.groupId));
      if (g) {
        state.selectedSurfaceIds = [...g.surfaceIds];
        state.selectedSurfaceId = g.surfaceIds[0];
        renderSidebar();
      }
    });
  }
}

function renderOutputList() {
  if (!outputListEl) return;
  outputListEl.innerHTML = state.outputs.map(o => `
    <div class="out-item" data-out-id="${o.id}">
      <div class="out-status ${o.isOpen ? 'open' : 'closed'}"></div>
      <input class="out-name" type="text" value="${o.name}" data-out-name="${o.id}">
      <span class="out-res">${o.resolution.w}x${o.resolution.h}</span>
      <button class="out-open" data-out-open="${o.id}">${o.isOpen ? 'Focus' : 'Open'}</button>
      <button class="out-del" data-out-del="${o.id}">&times;</button>
    </div>
  `).join('');

  for (const input of outputListEl.querySelectorAll('.out-name')) {
    input.addEventListener('change', (e) => {
      renameOutput(parseInt(input.dataset.outName), e.target.value);
    });
  }
  for (const btn of outputListEl.querySelectorAll('.out-open')) {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.outOpen);
      const o = state.outputs.find(x => x.id === id);
      if (o?.isOpen && o.windowRef && !o.windowRef.closed) {
        o.windowRef.focus();
      } else {
        openOutputWindow(id);
      }
      renderSidebar();
    });
  }
  for (const btn of outputListEl.querySelectorAll('.out-del')) {
    btn.addEventListener('click', () => {
      removeOutput(parseInt(btn.dataset.outDel));
      renderSidebar();
    });
  }
}

function renderCueList() {
  if (!cueItemsEl) return;
  cueItemsEl.innerHTML = cueList.cues.map((cue, i) => `
    <div class="cue-item ${i === cueList.activeCueIndex ? 'active' : ''}" data-cue-idx="${i}">
      <span class="cue-num">${i + 1}</span>
      <input class="cue-name-input" type="text" value="${cue.name}" data-cue-name="${i}">
      <button class="cue-del" data-cue-del="${i}">&times;</button>
    </div>
  `).join('');

  for (const item of cueItemsEl.querySelectorAll('.cue-item')) {
    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      gotoCue(parseInt(item.dataset.cueIdx));
      renderSidebar();
    });
  }
  for (const input of cueItemsEl.querySelectorAll('.cue-name-input')) {
    input.addEventListener('change', (e) => {
      updateCueName(parseInt(input.dataset.cueName), e.target.value);
    });
  }
  for (const btn of cueItemsEl.querySelectorAll('.cue-del')) {
    btn.addEventListener('click', () => {
      deleteCue(parseInt(btn.dataset.cueDel));
      renderSidebar();
    });
  }
}

function renderProps() {
  if (!propsEl) return;

  // Group selected → show group props
  if (state.selectedGroupId) {
    const g = state.groups.find(x => x.id === state.selectedGroupId);
    if (g) {
      renderGroupProps(g);
      return;
    }
  }

  const s = getSelectedSurface();
  if (!s) {
    propsEl.innerHTML = `
      <div class="prop-section" style="color:var(--text-dim);text-align:center;padding:40px 12px;">
        Select a surface or group
      </div>
    `;
    return;
  }

  propsEl.innerHTML = `
    <div class="prop-section">
      <h3>Surface</h3>
      <div class="prop-row">
        <label>Label</label>
        <input type="text" id="prop-label" value="${s.label || ''}">
      </div>
      <div class="prop-row">
        <label>Type</label>
        <select id="prop-content-type">
          <option value="solid" ${s.contentType === 'solid' ? 'selected' : ''}>Solid Color</option>
          <option value="image" ${s.contentType === 'image' ? 'selected' : ''}>Image</option>
          <option value="video" ${s.contentType === 'video' ? 'selected' : ''}>Video</option>
          <option value="drawing" ${s.contentType === 'drawing' ? 'selected' : ''}>Drawing</option>
          <option value="animation" ${s.contentType === 'animation' ? 'selected' : ''}>Animation</option>
          <option value="text" ${s.contentType === 'text' ? 'selected' : ''}>Text</option>
        </select>
      </div>
    </div>

    <div class="prop-section">
      <h3>Content</h3>
      ${renderContentProps(s)}
    </div>

    <div class="prop-section">
      <h3>Display</h3>
      <div class="prop-row">
        <label>Opacity</label>
        <input type="range" id="prop-opacity" min="0" max="1" step="0.05" value="${s.opacity}">
        <span class="val">${Math.round(s.opacity * 100)}%</span>
      </div>
      <div class="prop-row">
        <label>Brightness</label>
        <input type="range" id="prop-brightness" min="0" max="2" step="0.05" value="${s.brightness}">
        <span class="val">${Math.round(s.brightness * 100)}%</span>
      </div>
    </div>

    <div class="prop-section">
      <h3>Size</h3>
      <div class="prop-row">
        <label>Width</label>
        <input type="number" id="prop-w" value="${s.w}" min="50" max="3840" style="width:80px">
        <label style="width:auto;margin-left:8px">Height</label>
        <input type="number" id="prop-h" value="${s.h}" min="50" max="2160" style="width:80px">
      </div>
      <button class="prop-btn" id="btn-reset-corners">Reset Corners</button>
    </div>

    <div class="prop-section">
      <h3>Mode</h3>
      <div class="prop-row">
        <label>Solo</label>
        <input type="checkbox" id="prop-solo" ${s.solo ? 'checked' : ''}>
        <span style="font-size:11px;color:var(--text-dim);flex:1;">Own content, ignores global</span>
      </div>
    </div>

    ${renderGlobalContentPanel()}
  `;

  bindPropsEvents(s);
}

function renderGlobalContentPanel() {
  const gc = state.globalContent;
  return `
    <div class="prop-section" style="border-top:2px solid rgba(0,180,255,0.2);">
      <h3 style="color:var(--accent);">Global Content</h3>
      <div class="prop-row">
        <label>Enabled</label>
        <input type="checkbox" id="gc-enabled" ${gc.enabled ? 'checked' : ''}>
        <span style="font-size:11px;color:var(--text-dim);flex:1;">Plays on all non-solo surfaces</span>
      </div>
      <div class="prop-row">
        <label>Type</label>
        <select id="gc-type">
          <option value="solid" ${gc.contentType === 'solid' ? 'selected' : ''}>Solid Color</option>
          <option value="animation" ${gc.contentType === 'animation' ? 'selected' : ''}>Animation</option>
          <option value="text" ${gc.contentType === 'text' ? 'selected' : ''}>Text</option>
        </select>
      </div>
      ${gc.contentType === 'solid' ? `
        <div class="prop-row">
          <label>Color</label>
          <input type="color" id="gc-color" value="${gc.color}">
        </div>
      ` : ''}
      ${gc.contentType === 'animation' ? `
        <div class="prop-row">
          <label>Preset</label>
          <select id="gc-animation">
            ${animationPresetNames.map(p => `<option value="${p}" ${gc.animationPreset === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      ` : ''}
      ${gc.contentType === 'text' ? `
        <div class="prop-row" style="align-items:start;">
          <label style="margin-top:6px">Text</label>
          <textarea id="gc-text" rows="2" style="resize:vertical">${gc.textContent || ''}</textarea>
        </div>
        <div class="prop-row">
          <label>Size</label>
          <input type="range" id="gc-text-size" min="10" max="200" value="${gc.textSize || 48}">
          <span class="val">${gc.textSize || 48}px</span>
        </div>
        <div class="prop-row">
          <label>Color</label>
          <input type="color" id="gc-text-color" value="${gc.textColor || '#ffffff'}">
        </div>
      ` : ''}
      <div class="prop-row">
        <label>Opacity</label>
        <input type="range" id="gc-opacity" min="0" max="1" step="0.05" value="${gc.opacity}">
        <span class="val">${Math.round(gc.opacity * 100)}%</span>
      </div>
      <div class="prop-row">
        <label>BPM</label>
        <input type="number" id="gc-bpm" value="${getBPM()}" min="40" max="220" style="width:60px">
        <button class="prop-btn" id="gc-tap-bpm" style="flex:1;">TAP</button>
      </div>
    </div>
  `;
}

function renderGroupProps(g) {
  const gc = g.content || {};
  propsEl.innerHTML = `
    <div class="prop-section">
      <h3 style="color:${g.color};">Group: ${g.name}</h3>
      <div class="prop-row">
        <label>Name</label>
        <input type="text" id="gp-name" value="${g.name}">
      </div>
      <div class="prop-row">
        <label>Surfaces</label>
        <span style="color:var(--text-dim)">${g.surfaceIds.length} surfaces</span>
      </div>
    </div>
    <div class="prop-section" style="border-top:2px solid ${g.color}40;">
      <h3>Unified Content</h3>
      <p style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">Animation spans across all surfaces as one</p>
      <div class="prop-row">
        <label>Enabled</label>
        <input type="checkbox" id="gp-content-enabled" ${gc.enabled ? 'checked' : ''}>
      </div>
      <div class="prop-row">
        <label>Type</label>
        <select id="gp-content-type">
          <option value="solid" ${gc.contentType === 'solid' ? 'selected' : ''}>Solid</option>
          <option value="animation" ${gc.contentType === 'animation' ? 'selected' : ''}>Animation</option>
        </select>
      </div>
      ${gc.contentType === 'solid' ? `
        <div class="prop-row">
          <label>Color</label>
          <input type="color" id="gp-color" value="${gc.color || '#0066ff'}">
        </div>
      ` : ''}
      ${gc.contentType === 'animation' ? `
        <div class="prop-row">
          <label>Preset</label>
          <select id="gp-animation">
            ${animationPresetNames.map(p => `<option value="${p}" ${gc.animationPreset === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      ` : ''}
      <div class="prop-row">
        <label>Opacity</label>
        <input type="range" id="gp-opacity" min="0" max="1" step="0.05" value="${gc.opacity ?? 1}">
        <span class="val">${Math.round((gc.opacity ?? 1) * 100)}%</span>
      </div>
    </div>
  `;

  const on = (id, evt, fn) => propsEl.querySelector(id)?.addEventListener(evt, fn);
  on('#gp-name', 'input', (e) => { g.name = e.target.value; renderSurfaceList(); });
  on('#gp-content-enabled', 'change', (e) => { g.content.enabled = e.target.checked; });
  on('#gp-content-type', 'change', (e) => { g.content.contentType = e.target.value; renderProps(); });
  on('#gp-color', 'input', (e) => { g.content.color = e.target.value; });
  on('#gp-animation', 'change', (e) => { g.content.animationPreset = e.target.value; });
  on('#gp-opacity', 'input', (e) => { g.content.opacity = parseFloat(e.target.value); });
}

function renderContentProps(s) {
  switch (s.contentType) {
    case 'solid':
      return `
        <div class="prop-row">
          <label>Color</label>
          <input type="color" id="prop-color" value="${s.color}">
        </div>
      `;
    case 'image':
      return `
        <div class="prop-row">
          <label>File</label>
          <input type="file" id="prop-image" accept="image/*">
        </div>
      `;
    case 'video':
      return `
        <div class="prop-row">
          <label>File</label>
          <input type="file" id="prop-video" accept="video/*">
        </div>
      `;
    case 'drawing':
      return `
        <div class="prop-row">
          <label>Color</label>
          <input type="color" id="prop-draw-color" value="${s.drawingColor}">
        </div>
        <div class="prop-row">
          <label>Width</label>
          <input type="range" id="prop-draw-width" min="1" max="20" value="${s.drawingWidth}">
          <span class="val">${s.drawingWidth}px</span>
        </div>
        <button class="prop-btn" id="btn-clear-drawing">Clear Drawing</button>
      `;
    case 'animation':
      return `
        <div class="prop-row">
          <label>Preset</label>
          <select id="prop-animation-preset">
            ${animationPresetNames.map(p => `
              <option value="${p}" ${s.animationPreset === p ? 'selected' : ''}>${p}</option>
            `).join('')}
          </select>
        </div>
      `;
    case 'text':
      return `
        <div class="prop-row" style="align-items:start;">
          <label style="margin-top:6px">Text</label>
          <textarea id="prop-text-content" rows="3" style="resize:vertical">${s.textContent || ''}</textarea>
        </div>
        <div class="prop-row">
          <label>Font</label>
          <select id="prop-text-font">
            ${['Arial', 'Georgia', 'Courier New', 'Impact', 'Verdana', 'Trebuchet MS', 'Palatino'].map(f => `
              <option value="${f}" ${s.textFont === f ? 'selected' : ''}>${f}</option>
            `).join('')}
          </select>
        </div>
        <div class="prop-row">
          <label>Google Font</label>
          <input type="text" id="prop-text-custom-font" placeholder="Montserrat" value="${s.textCustomFont || ''}">
        </div>
        <div class="prop-row">
          <label>Size</label>
          <input type="range" id="prop-text-size" min="10" max="200" value="${s.textSize || 48}">
          <span class="val">${s.textSize || 48}px</span>
        </div>
        <div class="prop-row">
          <label>Color</label>
          <input type="color" id="prop-text-color" value="${s.textColor || '#ffffff'}">
        </div>
        <div class="prop-row">
          <label>BG Color</label>
          <input type="color" id="prop-text-bg-color" value="${s.textBgColor || '#000000'}">
        </div>
        <div class="prop-row">
          <label>BG Opacity</label>
          <input type="range" id="prop-text-bg-opacity" min="0" max="1" step="0.05" value="${s.textBgOpacity ?? 1}">
          <span class="val">${Math.round((s.textBgOpacity ?? 1) * 100)}%</span>
        </div>
        <div class="prop-row">
          <label>Align</label>
          <select id="prop-text-align">
            <option value="left" ${s.textAlign === 'left' ? 'selected' : ''}>Left</option>
            <option value="center" ${(s.textAlign || 'center') === 'center' ? 'selected' : ''}>Center</option>
            <option value="right" ${s.textAlign === 'right' ? 'selected' : ''}>Right</option>
          </select>
        </div>
        <div class="prop-row">
          <label>Style</label>
          <label style="width:auto;display:flex;align-items:center;gap:3px;"><input type="checkbox" id="prop-text-bold" ${s.textBold ? 'checked' : ''}> B</label>
          <label style="width:auto;display:flex;align-items:center;gap:3px;"><input type="checkbox" id="prop-text-italic" ${s.textItalic ? 'checked' : ''}> I</label>
          <label style="width:auto;display:flex;align-items:center;gap:3px;"><input type="checkbox" id="prop-text-stroke" ${s.textStroke ? 'checked' : ''}> Stroke</label>
        </div>
      `;
    default:
      return '';
  }
}

function bindPropsEvents(s) {
  const on = (id, evt, fn) => propsEl.querySelector(id)?.addEventListener(evt, fn);

  on('#prop-label', 'input', (e) => { s.label = e.target.value; renderSurfaceList(); });
  on('#prop-content-type', 'change', (e) => { s.contentType = e.target.value; renderSidebar(); });
  on('#prop-color', 'input', (e) => { s.color = e.target.value; });
  on('#prop-opacity', 'input', (e) => { s.opacity = parseFloat(e.target.value); renderProps(); });
  on('#prop-brightness', 'input', (e) => { s.brightness = parseFloat(e.target.value); renderProps(); });
  on('#prop-w', 'change', (e) => { s.w = parseInt(e.target.value); });
  on('#prop-h', 'change', (e) => { s.h = parseInt(e.target.value); });
  on('#btn-reset-corners', 'click', () => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    s.corners = [
      { x: cx - s.w / 2, y: cy - s.h / 2 },
      { x: cx + s.w / 2, y: cy - s.h / 2 },
      { x: cx + s.w / 2, y: cy + s.h / 2 },
      { x: cx - s.w / 2, y: cy + s.h / 2 },
    ];
  });

  // Image/video
  on('#prop-image', 'change', (e) => {
    const file = e.target.files[0];
    if (file) s.imageUrl = URL.createObjectURL(file);
  });
  on('#prop-video', 'change', (e) => {
    const file = e.target.files[0];
    if (file) loadVideo(s, file);
  });

  // Drawing
  on('#prop-draw-color', 'input', (e) => { s.drawingColor = e.target.value; });
  on('#prop-draw-width', 'input', (e) => { s.drawingWidth = parseInt(e.target.value); });
  on('#btn-clear-drawing', 'click', () => clearDrawing(s));

  // Animation
  on('#prop-animation-preset', 'change', (e) => { s.animationPreset = e.target.value; });

  // Text
  on('#prop-text-content', 'input', (e) => { s.textContent = e.target.value; });
  on('#prop-text-font', 'change', (e) => { s.textFont = e.target.value; });
  on('#prop-text-custom-font', 'change', (e) => {
    const font = e.target.value.trim();
    if (font) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}&display=swap`;
      document.head.appendChild(link);
      s.textFont = font;
      s.textCustomFont = font;
    }
  });
  on('#prop-text-size', 'input', (e) => { s.textSize = parseInt(e.target.value); });
  on('#prop-text-color', 'input', (e) => { s.textColor = e.target.value; });
  on('#prop-text-bg-color', 'input', (e) => { s.textBgColor = e.target.value; });
  on('#prop-text-bg-opacity', 'input', (e) => { s.textBgOpacity = parseFloat(e.target.value); });
  on('#prop-text-align', 'change', (e) => { s.textAlign = e.target.value; });
  on('#prop-text-bold', 'change', (e) => { s.textBold = e.target.checked; });
  on('#prop-text-italic', 'change', (e) => { s.textItalic = e.target.checked; });
  on('#prop-text-stroke', 'change', (e) => { s.textStroke = e.target.checked; });

  // Solo
  on('#prop-solo', 'change', (e) => { s.solo = e.target.checked; renderSurfaceList(); });

  // Global content controls
  const gc = state.globalContent;
  on('#gc-enabled', 'change', (e) => { gc.enabled = e.target.checked; });
  on('#gc-type', 'change', (e) => { gc.contentType = e.target.value; renderProps(); });
  on('#gc-color', 'input', (e) => { gc.color = e.target.value; });
  on('#gc-animation', 'change', (e) => { gc.animationPreset = e.target.value; });
  on('#gc-text', 'input', (e) => { gc.textContent = e.target.value; });
  on('#gc-text-size', 'input', (e) => { gc.textSize = parseInt(e.target.value); });
  on('#gc-text-color', 'input', (e) => { gc.textColor = e.target.value; });
  on('#gc-opacity', 'input', (e) => { gc.opacity = parseFloat(e.target.value); });
  on('#gc-bpm', 'change', (e) => { setBPM(parseInt(e.target.value)); });

  // TAP BPM
  const tapBtn = propsEl.querySelector('#gc-tap-bpm');
  if (tapBtn) {
    const tapTimes = [];
    tapBtn.addEventListener('click', () => {
      const now = performance.now();
      tapTimes.push(now);
      if (tapTimes.length > 6) tapTimes.shift();
      if (tapTimes.length >= 2) {
        const diffs = [];
        for (let i = 1; i < tapTimes.length; i++) diffs.push(tapTimes[i] - tapTimes[i - 1]);
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const newBpm = Math.round(Math.max(40, Math.min(220, 60000 / avg)));
        setBPM(newBpm);
        const bpmInput = propsEl.querySelector('#gc-bpm');
        if (bpmInput) bpmInput.value = newBpm;
      }
      // Reset after 2s idle
      setTimeout(() => {
        if (tapTimes.length && performance.now() - tapTimes[tapTimes.length - 1] > 2000) {
          tapTimes.length = 0;
        }
      }, 2100);
    });
  }
}
