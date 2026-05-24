import { state, toggleMode, getSelectedSurface } from '../state.js';
import { saveConfig } from './storage.js';
import { renderSidebar } from '../ui/sidebar.js';
import { goNextCue, goPrevCue } from '../cueList.js';
import { zoomIn, zoomOut, resetView } from '../stageScale.js';
import { enterProgramMode, exitProgramMode, renderProgramPanel, handleProgramKey, handleProgramKeyUp } from '../ui/programMode.js';

export function initKeyboard() {
  window.addEventListener('keydown', (e) => {
    // Don't capture when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Tab') {
        e.preventDefault();
        toggle();
      }
      return;
    }

    // Program mode handles its own keys first
    if (state.mode === 'program' && handleProgramKey(e)) return;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        toggle();
        break;
      case 'f':
      case 'F':
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        }
        break;
      case 'Escape':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        break;
      case 'b':
      case 'B':
        state.blackout = true;
        renderSidebar();
        break;
      case 'r':
      case 'R':
        state.blackout = false;
        state.surfaces.forEach(s => s.visible = true);
        renderSidebar();
        break;
      case ' ':
        e.preventDefault();
        const sel = getSelectedSurface();
        if (sel) sel.visible = !sel.visible;
        renderSidebar();
        break;
      case 's':
      case 'S':
        saveConfig();
        break;
      case 'h':
      case 'H':
        if (state.mode === 'edit') {
          const left = document.getElementById('left-panel');
          const right = document.getElementById('right-panel');
          left?.classList.toggle('hidden');
          right?.classList.toggle('hidden');
        }
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        goNextCue();
        renderProgramPanel();
        renderSidebar();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        goPrevCue();
        renderProgramPanel();
        renderSidebar();
        break;
      case '+':
      case '=':
        zoomIn();
        break;
      case '-':
      case '_':
        zoomOut();
        break;
      case '0':
        resetView();
        break;
      default:
        // 1-9 select surface
        if (e.key >= '1' && e.key <= '9') {
          const idx = parseInt(e.key) - 1;
          if (state.surfaces[idx]) {
            state.selectedSurfaceId = state.surfaces[idx].id;
            renderSidebar();
          }
        }
    }
  });

  // Key up — for flash release in program mode
  window.addEventListener('keyup', (e) => {
    handleProgramKeyUp(e);
  });
}

export function toggle() {
  const prevMode = state.mode;
  toggleMode();
  const indicator = document.getElementById('mode-indicator');

  // Exit previous mode
  if (prevMode === 'program') {
    exitProgramMode();
  }

  if (state.mode === 'edit') {
    document.body.classList.remove('performance-mode');
    document.getElementById('left-panel')?.classList.remove('hidden');
    document.getElementById('right-panel')?.classList.remove('hidden');
    if (indicator) {
      indicator.className = 'tb-mode edit';
      indicator.textContent = 'EDIT';
    }
    state.uiVisible = true;
  } else if (state.mode === 'program') {
    document.body.classList.remove('performance-mode');
    if (indicator) {
      indicator.className = 'tb-mode program';
      indicator.textContent = 'PROGRAM';
    }
    state.uiVisible = true;
    enterProgramMode();
  } else {
    document.body.classList.add('performance-mode');
    if (indicator) {
      indicator.className = 'tb-mode performance';
      indicator.textContent = 'LIVE';
    }
  }
  renderSidebar();
}
