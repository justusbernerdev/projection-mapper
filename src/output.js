// Output window — receives state from main window via BroadcastChannel
// This is the "projector" view — no UI, just surfaces

import { computeMatrix3d } from './homography.js';
import { renderSolid } from './content/solid.js';
import { renderImage } from './content/image.js';
import { renderVideo } from './content/video.js';
import { renderDrawing } from './content/drawing.js';
import { renderAnimation } from './content/animation.js';
import { renderText } from './content/text.js';
import { initStageScale } from './stageScale.js';

const stage = document.getElementById('stage');
const channel = new BroadcastChannel('projection-mapper');

// Scale stage (1920x1080) to fit window
initStageScale(stage, document.body);

const contentRenderers = {
  solid: renderSolid,
  image: renderImage,
  video: renderVideo,
  drawing: renderDrawing,
  animation: renderAnimation,
  text: renderText,
};

let surfaces = [];
let blackout = false;
let connected = false;

// Test pattern — drawn once, hidden when surfaces arrive
const testCanvas = document.createElement('canvas');
testCanvas.id = 'test-pattern';
testCanvas.width = 1920;
testCanvas.height = 1080;
testCanvas.style.cssText = 'position:absolute;top:0;left:0;width:1920px;height:1080px;';
stage.appendChild(testCanvas);
drawTestPattern();

function drawTestPattern() {
  const ctx = testCanvas.getContext('2d');
  const w = 1920, h = 1080;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  const gridSize = 120;
  for (let x = 0; x <= w; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Center crosshair
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 100, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 180, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Corner markers
  const cornerSize = 60;
  const colors = ['#f00', '#0f0', '#00f', '#ff0'];
  const cornerPositions = [[0, 0], [w - cornerSize, 0], [w - cornerSize, h - cornerSize], [0, h - cornerSize]];
  cornerPositions.forEach(([cx, cy], i) => {
    ctx.fillStyle = colors[i];
    ctx.fillRect(cx, cy, cornerSize, cornerSize);
  });

  // Resolution text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1920 x 1080 — OUTPUT', w / 2, h / 2 - 30);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('Click to fullscreen — Waiting for surfaces...', w / 2, h / 2 + 10);

  // Color bars at bottom
  const barColors = ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f', '#000'];
  const barW = w / barColors.length;
  barColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * barW, h - 40, barW, 40);
  });
}

// Listen for state updates from main window
channel.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'full-state') {
    surfaces = msg.surfaces;
    blackout = msg.blackout;
    connected = true;
    // Hide test pattern once surfaces exist
    testCanvas.style.display = surfaces.length > 0 ? 'none' : '';
  }
};

// Request initial state
channel.postMessage({ type: 'request-state' });

// Render loop
function render(time) {
  for (const surface of surfaces) {
    let el = stage.querySelector(`[data-surface-id="${surface.id}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'surface-container';
      el.dataset.surfaceId = surface.id;

      const canvas = document.createElement('canvas');
      canvas.className = 'surface-content';
      canvas.width = surface.w;
      canvas.height = surface.h;
      el.appendChild(canvas);

      stage.appendChild(el);
    }

    if (!surface.visible || blackout) {
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

    const canvas = el.querySelector('.surface-content');
    const ctx = canvas.getContext('2d');

    const renderer = contentRenderers[surface.contentType];
    if (renderer) {
      renderer(surface, ctx, time);
    }
  }

  // Cleanup orphans
  for (const el of stage.querySelectorAll('[data-surface-id]')) {
    if (el.id === 'test-pattern') continue;
    const id = parseInt(el.dataset.surfaceId);
    if (!surfaces.find(s => s.id === id)) el.remove();
  }

  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// Auto-fullscreen on click
document.body.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  }
});
