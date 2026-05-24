// Overlay effects — render ON TOP of existing content
// These don't replace the base animation, they layer over it
// Used for transitions, flashes, wipes, sparkles etc.

import { state } from './state.js';
import { getBPM } from './content/animation.js';

function beat() {
  const ms = 60000 / getBPM();
  return ((performance.now()) % ms) / ms;
}

export const overlayPresets = {
  // ── TRANSITIONS ──
  wipeRight: {
    name: 'Wipe Right',
    category: 'transition',
    duration: 2000,
    render(ctx, w, h, progress) {
      const pos = progress * w * 1.2 - w * 0.1;
      const edgeW = w * 0.06;
      const grad = ctx.createLinearGradient(pos - edgeW, 0, pos + edgeW, 0);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      grad.addColorStop(0.5, 'rgba(255,255,255,1)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.6)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
  },
  wipeLeft: {
    name: 'Wipe Left',
    category: 'transition',
    duration: 2000,
    render(ctx, w, h, progress) {
      const pos = w - progress * w * 1.2 + w * 0.1;
      const edgeW = w * 0.06;
      const grad = ctx.createLinearGradient(pos - edgeW, 0, pos + edgeW, 0);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      grad.addColorStop(0.5, 'rgba(255,255,255,1)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.6)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
  },
  wipeDown: {
    name: 'Wipe Down',
    category: 'transition',
    duration: 2000,
    render(ctx, w, h, progress) {
      const pos = progress * h * 1.2 - h * 0.1;
      const edgeW = h * 0.06;
      const grad = ctx.createLinearGradient(0, pos - edgeW, 0, pos + edgeW);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      grad.addColorStop(0.5, 'rgba(255,255,255,1)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.6)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
  },
  circleOpen: {
    name: 'Circle Open',
    category: 'transition',
    duration: 2000,
    render(ctx, w, h, progress) {
      const cx = w / 2, cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      const r = progress * maxR;
      const ringW = maxR * 0.08;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${(1 - progress) * 0.8})`;
      ctx.lineWidth = ringW;
      ctx.stroke();
    },
  },
  diagonalWipe: {
    name: 'Diagonal',
    category: 'transition',
    duration: 2000,
    render(ctx, w, h, progress) {
      const pos = progress * (w + h) * 1.1 - (w + h) * 0.05;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos + w * 0.05, 0);
      ctx.lineTo(pos - h + w * 0.05, h);
      ctx.lineTo(pos - h, h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
      ctx.restore();
    },
  },

  // ── FLASHES ──
  flashWhite: {
    name: 'Flash White',
    category: 'flash',
    duration: 500,
    render(ctx, w, h, progress) {
      const alpha = Math.pow(1 - progress, 3);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, 0, w, h);
    },
  },
  flashGold: {
    name: 'Flash Gold',
    category: 'flash',
    duration: 600,
    render(ctx, w, h, progress) {
      const alpha = Math.pow(1 - progress, 3);
      ctx.fillStyle = `rgba(255,200,50,${alpha})`;
      ctx.fillRect(0, 0, w, h);
    },
  },
  flashBoom: {
    name: 'Boom',
    category: 'flash',
    duration: 1500,
    render(ctx, w, h, progress) {
      const cx = w / 2, cy = h / 2;
      const maxR = Math.max(w, h) * 0.8;

      // Flash
      if (progress < 0.15) {
        const flash = 1 - progress / 0.15;
        ctx.fillStyle = `rgba(255,200,50,${flash * 0.9})`;
        ctx.fillRect(0, 0, w, h);
      }

      // Shockwave ring
      const ringProgress = Math.min(1, progress * 1.5);
      const r = ringProgress * maxR;
      const fade = Math.max(0, 1 - progress);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,180,50,${(1 - ringProgress) * fade * 0.7})`;
      ctx.lineWidth = 4 + (1 - ringProgress) * 15;
      ctx.stroke();

      // Debris
      for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 2 + i * 0.3;
        const speed = 0.4 + (i * 7.3 % 1) * 0.8;
        const dist = progress * speed * maxR * 0.6;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist + progress * progress * 40;
        const size = (1 - progress) * 3;
        if (size > 0.3) {
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(i * 15) % 50 + 20}, 100%, 60%, ${fade * 0.8})`;
          ctx.fill();
        }
      }
    },
  },

  // ── SPARKLES ──
  sparkleOverlay: {
    name: 'Sparkle',
    category: 'sparkle',
    duration: 0, // continuous
    render(ctx, w, h, progress, time) {
      for (let i = 0; i < 20; i++) {
        const seed = i * 97.3;
        const sparkle = Math.sin(time * 8 + seed) * 0.5 + 0.5;
        if (sparkle < 0.6) continue;
        const x = (seed * 3.1 + time * 20) % w;
        const y = (seed * 2.7 + Math.sin(time * 2 + i) * 30) % h;
        const size = sparkle * 3;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * 3 + i);
        ctx.fillStyle = `rgba(255,255,255,${(sparkle - 0.6) * 2})`;
        ctx.fillRect(-1, -size, 2, size * 2);
        ctx.fillRect(-size, -1, size * 2, 2);
        ctx.restore();
      }
    },
  },
  glitterOverlay: {
    name: 'Glitter',
    category: 'sparkle',
    duration: 0,
    render(ctx, w, h, progress, time) {
      for (let i = 0; i < 40; i++) {
        const seed = i * 73.7;
        const x = (seed * 3.1 + time * 15) % w;
        const y = (seed * 2.3 + time * 40 + seed * 5) % h;
        const shimmer = Math.sin(time * 10 + seed) * 0.5 + 0.5;
        if (shimmer < 0.4) continue;
        const size = shimmer * 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        const colors = ['rgba(255,200,50,', 'rgba(255,255,255,', 'rgba(200,180,255,'];
        ctx.fillStyle = colors[i % 3] + (shimmer * 0.7) + ')';
        ctx.fill();
      }
    },
  },

  // ── CONTINUOUS ──
  beatPulse: {
    name: 'Beat Pulse',
    category: 'continuous',
    duration: 0,
    render(ctx, w, h, progress, time) {
      const b = beat();
      const pulse = Math.pow(1 - b, 4);
      ctx.fillStyle = `rgba(255,255,255,${pulse * 0.15})`;
      ctx.fillRect(0, 0, w, h);
    },
  },
  scanLine: {
    name: 'Scan Line',
    category: 'continuous',
    duration: 0,
    render(ctx, w, h, progress, time) {
      const y = (time * 150) % h;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, y - 1, w, 3);
    },
  },
  vignette: {
    name: 'Vignette',
    category: 'continuous',
    duration: 0,
    render(ctx, w, h) {
      const cx = w / 2, cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      const grad = ctx.createRadialGradient(cx, cy, maxR * 0.4, cx, cy, maxR);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
  },
};

export const overlayPresetNames = Object.keys(overlayPresets);
export const overlayCategories = {
  transition: 'Siirtyma',
  flash: 'Flash',
  sparkle: 'Kimalte',
  continuous: 'Jatkuva',
};

// Active overlays — multiple can be active
export const activeOverlays = [];

export function triggerOverlay(presetName) {
  const preset = overlayPresets[presetName];
  if (!preset) return;

  // If continuous (duration=0) — toggle
  if (preset.duration === 0) {
    const idx = activeOverlays.findIndex(o => o.preset === presetName);
    if (idx >= 0) {
      activeOverlays.splice(idx, 1);
      return;
    }
  }

  // Remove any existing of same type
  const idx = activeOverlays.findIndex(o => o.preset === presetName);
  if (idx >= 0) activeOverlays.splice(idx, 1);

  activeOverlays.push({
    preset: presetName,
    startTime: performance.now(),
    duration: preset.duration,
  });
}

// Render all active overlays on top of content
export function renderOverlays(ctx, w, h, time) {
  const now = performance.now();

  for (let i = activeOverlays.length - 1; i >= 0; i--) {
    const overlay = activeOverlays[i];
    const preset = overlayPresets[overlay.preset];
    if (!preset) { activeOverlays.splice(i, 1); continue; }

    const elapsed = now - overlay.startTime;

    if (preset.duration > 0 && elapsed > preset.duration) {
      activeOverlays.splice(i, 1);
      continue;
    }

    const progress = preset.duration > 0 ? elapsed / preset.duration : 0;
    const timeSec = time / 1000;

    ctx.save();
    preset.render(ctx, w, h, progress, timeSec);
    ctx.restore();
  }
}

// Serialize for broadcast
export function getOverlayState() {
  return activeOverlays.map(o => ({
    preset: o.preset,
    startTime: o.startTime,
    duration: o.duration,
  }));
}
