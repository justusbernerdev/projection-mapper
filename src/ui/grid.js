// Grid overlay for the canvas editing area

import { state } from '../state.js';

const gridCanvas = document.getElementById('canvas-grid');
let ctx;

export function initGrid() {
  if (!gridCanvas) return;
  ctx = gridCanvas.getContext('2d');
  resizeGrid();
  window.addEventListener('resize', resizeGrid);
}

function resizeGrid() {
  if (!gridCanvas) return;
  const parent = gridCanvas.parentElement;
  gridCanvas.width = parent.clientWidth;
  gridCanvas.height = parent.clientHeight;
  drawGrid();
}

export function drawGrid() {
  if (!ctx || !gridCanvas) return;
  const w = gridCanvas.width;
  const h = gridCanvas.height;

  ctx.clearRect(0, 0, w, h);

  if (!state.showGrid || state.mode === 'performance') return;

  const gridSize = 80;

  // Minor grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
  }

  // Center crosshair
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  const cx = Math.round(w / 2) + 0.5;
  const cy = Math.round(h / 2) + 0.5;
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

  // Output area indicator (1920x1080 scaled to fit)
  const scale = Math.min(w / 1920, h / 1080) * 0.85;
  const ow = 1920 * scale;
  const oh = 1080 * scale;
  const ox = (w - ow) / 2;
  const oy = (h - oh) / 2;

  ctx.strokeStyle = 'rgba(0, 180, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(ox + 0.5, oy + 0.5, ow, oh);
  ctx.setLineDash([]);

  // Label
  ctx.fillStyle = 'rgba(0, 180, 255, 0.2)';
  ctx.font = '10px sans-serif';
  ctx.fillText('1920×1080 OUTPUT', ox + 4, oy + 12);
}
