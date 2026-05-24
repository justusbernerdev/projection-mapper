import { state } from './state.js';
import { createSurface } from './surface.js';
import { startRenderLoop } from './renderer.js';
import { initCornerHandles, updateCornerHandles } from './ui/cornerHandles.js';
import { initSidebar, renderSidebar } from './ui/sidebar.js';
import { initKeyboard } from './utils/keyboard.js';
import { initDrawingInput } from './content/drawingInput.js';
import { broadcastFullState, cueList, goNextCue, goPrevCue, gotoCue } from './cueList.js';
import { loadConfig, initAutoSave } from './utils/storage.js';
import { initGrid, drawGrid } from './ui/grid.js';
import { initStageScale } from './stageScale.js';

// Scale stage to fit canvas-area
initStageScale(
  document.getElementById('stage'),
  document.getElementById('canvas-area')
);

// Clear old data on first run with new coordinate system
if (!localStorage.getItem('pm-migrated-v2')) {
  indexedDB.deleteDatabase('projection-mapper');
  localStorage.clear();
  localStorage.setItem('pm-migrated-v2', '1');
}

// Load saved config (no default surface — user creates via + button)
await loadConfig();

// Init modules
initCornerHandles();
initSidebar();
initKeyboard();
initDrawingInput();
initAutoSave();
initGrid();

// Start render loop
startRenderLoop();

// BroadcastChannel — send state to output windows & receive remote commands
const channel = new BroadcastChannel('projection-mapper');
channel.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case 'request-state':
      broadcastFullState();
      break;
    case 'remote-request-cues':
      channel.postMessage({
        type: 'cue-list-update',
        cues: cueList.cues.map(c => ({ name: c.name, id: c.id })),
        activeCueIndex: cueList.activeCueIndex,
      });
      break;
    case 'remote-go-next':
      goNextCue();
      renderSidebar();
      break;
    case 'remote-go-prev':
      goPrevCue();
      renderSidebar();
      break;
    case 'remote-goto-cue':
      gotoCue(msg.index);
      renderSidebar();
      break;
    case 'remote-blackout':
      state.blackout = true;
      break;
    case 'remote-restore':
      state.blackout = false;
      state.surfaces.forEach(s => s.visible = true);
      break;
  }
};

// Broadcast state periodically (30fps) to output windows
setInterval(() => {
  broadcastFullState();
}, 33);

// Update UI each frame
function updateUI() {
  updateCornerHandles();
  drawGrid();
  requestAnimationFrame(updateUI);
}
updateUI();
