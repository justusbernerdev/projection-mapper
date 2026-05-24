// Test pattern generators for projection mapping setup
// Each pattern: (ctx, w, h, options) => void

export const testPatterns = {
  checkerboard(ctx, w, h, { gridSize = 8 } = {}) {
    const cellW = w / gridSize;
    const cellH = h / gridSize;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
      }
    }
  },

  grid(ctx, w, h, { gridSize = 10, color = '#00ff00' } = {}) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.font = '12px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cellW = w / gridSize;
    const cellH = h / gridSize;
    for (let i = 0; i <= gridSize; i++) {
      const x = i * cellW;
      const y = i * cellH;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Number cells
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        ctx.fillText(`${col},${row}`, col * cellW + cellW / 2, row * cellH + cellH / 2);
      }
    }
  },

  colorBars(ctx, w, h) {
    const colors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    const barW = w / colors.length;
    for (let i = 0; i < colors.length; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(i * barW, 0, barW, h * 0.67);
    }
    // Bottom section — darker bars
    const bottomColors = ['#0000c0', '#000000', '#c000c0', '#000000', '#00c0c0', '#000000', '#c0c0c0'];
    for (let i = 0; i < bottomColors.length; i++) {
      ctx.fillStyle = bottomColors[i];
      ctx.fillRect(i * barW, h * 0.67, barW, h * 0.08);
    }
    // Grayscale ramp at bottom
    const rampColors = ['#0d0d59', '#ffffff', '#32006a', '#000000'];
    const rampW = w / rampColors.length;
    for (let i = 0; i < rampColors.length; i++) {
      ctx.fillStyle = rampColors[i];
      ctx.fillRect(i * rampW, h * 0.75, rampW, h * 0.25);
    }
  },

  gradient(ctx, w, h, { direction = 'horizontal', startColor = '#000000', endColor = '#ffffff' } = {}) {
    const grad = direction === 'horizontal'
      ? ctx.createLinearGradient(0, 0, w, 0)
      : ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, startColor);
    grad.addColorStop(1, endColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  },

  white(ctx, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  },

  numbering(ctx, w, h, { number = 1 } = {}) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(w, h) * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), w / 2, h / 2);
    // Smaller label
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText(`Surface ${number}`, w / 2, h * 0.85);
  },

  crosshatch(ctx, w, h, { spacing = 30, color = '#ffffff' } = {}) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const diag = Math.sqrt(w * w + h * h);
    // Diagonal lines (top-left to bottom-right)
    for (let offset = -diag; offset < diag; offset += spacing) {
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset + h, h);
      ctx.stroke();
    }
    // Diagonal lines (top-right to bottom-left)
    for (let offset = -diag; offset < diag; offset += spacing) {
      ctx.beginPath();
      ctx.moveTo(w - offset, 0);
      ctx.lineTo(w - offset - h, h);
      ctx.stroke();
    }
  },

  circle(ctx, w, h, { rings = 6, color = '#ffffff' } = {}) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) / 2;
    for (let i = 1; i <= rings; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (maxR / rings) * i, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Crosshair
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
  },
};

export const testPatternNames = Object.keys(testPatterns);

export function renderTestPattern(ctx, w, h, patternName, options = {}) {
  const fn = testPatterns[patternName];
  if (fn) fn(ctx, w, h, options);
}
