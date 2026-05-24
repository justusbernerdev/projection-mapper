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
import { activateScene, deactivateScene } from './scenes.js';
import { triggerOverlay } from './overlays.js';
import { Transport } from './transport.js';
import { initMIDI } from './midi.js';

// Scale stage to fit canvas-area
initStageScale(
  document.getElementById('stage'),
  document.getElementById('canvas-area')
);

// Clear old data on first run with new coordinate system
if (!localStorage.getItem('pm-migrated-v3')) {
  indexedDB.deleteDatabase('projection-mapper');
  localStorage.clear();
  localStorage.setItem('pm-migrated-v3', '1');
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
initMIDI();

// Start render loop
startRenderLoop();

// Transport — BroadcastChannel (local) + WebSocket (network)
const transport = new Transport('control', 'Main Control');

function handleCommand(msg) {
  switch (msg.type) {
    case 'request-state':
      broadcastFullState();
      break;
    case 'remote-request-cues':
      transport.send({
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
    case 'exec-blackout':
      state.blackout = true;
      break;
    case 'remote-restore':
    case 'exec-restore':
      state.blackout = false;
      state.surfaces.forEach(s => s.visible = true);
      break;
    // Executor commands
    case 'exec-activate-scene':
      activateScene(msg.scene, msg.targetGroupId || null);
      renderSidebar();
      break;
    case 'exec-deactivate-scene':
      deactivateScene();
      renderSidebar();
      break;
    case 'exec-trigger-overlay':
      triggerOverlay(msg.overlay);
      break;
    case 'exec-fire-cue':
      gotoCue(msg.index);
      renderSidebar();
      break;
    case 'exec-set-test-pattern':
      state.activeTestPattern = msg.pattern || null;
      renderSidebar();
      break;
  }
}

transport.onMessage((msg) => handleCommand(msg));

// Also keep BroadcastChannel listener for backwards compat with existing output.js
const channel = new BroadcastChannel('projection-mapper');
channel.onmessage = (e) => handleCommand(e.data);

// Broadcast state periodically (30fps) to all clients
setInterval(() => {
  broadcastFullState();
  // Also send via WebSocket to remote machines
  transport.sendWS({
    type: 'full-state',
    surfaces: state.surfaces.map(s => ({
      id: s.id, visible: s.visible, opacity: s.opacity, brightness: s.brightness,
      corners: s.corners, contentType: s.contentType, color: s.color, w: s.w, h: s.h,
      animationPreset: s.animationPreset, textContent: s.textContent, textFont: s.textFont,
      textSize: s.textSize, textColor: s.textColor, textBgColor: s.textBgColor,
      textBgOpacity: s.textBgOpacity, textBold: s.textBold, textItalic: s.textItalic,
      textAlign: s.textAlign, solo: s.solo, groupId: s.groupId,
    })),
    groups: state.groups.map(g => ({ id: g.id, surfaceIds: g.surfaceIds, content: g.content })),
    globalContent: state.globalContent,
    blackout: state.blackout,
    activeTestPattern: state.activeTestPattern,
  });
}, 33);

// Update UI each frame
function updateUI() {
  updateCornerHandles();
  drawGrid();
  requestAnimationFrame(updateUI);
}
updateUI();
