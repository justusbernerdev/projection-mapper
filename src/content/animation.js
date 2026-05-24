// Generative animation presets — BPM-synced VJ visuals
// Theme: "Showtime — There's a little bit magic in the air"

let bpm = 120;
let lastBeatTime = performance.now();

export function setBPM(newBpm) { bpm = newBpm; lastBeatTime = performance.now(); }
export function getBPM() { return bpm; }

function beat() {
  const ms = 60000 / bpm;
  return ((performance.now() - lastBeatTime) % ms) / ms;
}

function hue(t, offset = 0, alpha = 1) {
  const h = ((t / 1000) * 30 + offset) % 360;
  return `hsla(${h}, 90%, 60%, ${alpha})`;
}

// ── Color palette: event theme (gold, deep purple, midnight blue, warm white) ──
const GOLD = [255, 200, 50];
const PURPLE = [100, 30, 160];
const MIDNIGHT = [15, 15, 50];
const WARM = [255, 240, 220];
const MAGIC_TEAL = [0, 200, 180];

function themeColor(t, i = 0, alpha = 1) {
  const palette = [GOLD, PURPLE, MAGIC_TEAL, WARM];
  const idx = Math.floor(((t / 1000) * 0.3 + i * 0.25) % palette.length);
  const c = palette[idx];
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

function themeHSL(t, offset = 0, alpha = 1) {
  // Gold-purple range
  const h = (40 + Math.sin((t / 1000) * 0.5 + offset) * 30 + offset * 20) % 360;
  return `hsla(${h}, 80%, 60%, ${alpha})`;
}

const presets = {

  // ══════════════════════════════════════
  // SHOWTIME THEME — Ysien Tanssit 2026
  // ══════════════════════════════════════

  magicReveal(ctx, w, h, t) {
    // Taikasauvan pyyhkäisy — glitter-partikkelit paljastuvat
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cx = w / 2, cy = h / 2;

    // Wand trail — arc from left to right
    const wandProgress = (time * 0.12) % 1;
    const wandX = w * 0.1 + wandProgress * w * 0.8;
    const wandY = cy + Math.sin(wandProgress * Math.PI) * h * -0.2;

    // Glitter trail behind wand
    for (let i = 0; i < 60; i++) {
      const age = (i / 60);
      if (age > wandProgress) continue;
      const px = w * 0.1 + age * w * 0.8;
      const py = cy + Math.sin(age * Math.PI) * h * -0.2;
      const drift = Math.sin(time * 3 + i * 7) * 15;
      const fall = (wandProgress - age) * 80;
      const sparkle = Math.sin(time * 10 + i * 13) * 0.5 + 0.5;
      const size = (1 - (wandProgress - age) * 2) * 3 * sparkle;
      if (size <= 0) continue;

      ctx.beginPath();
      ctx.arc(px + drift, py + fall, size, 0, Math.PI * 2);
      const colors = [GOLD, WARM, MAGIC_TEAL];
      const c = colors[i % 3];
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${sparkle * 0.8})`;
      ctx.fill();
    }

    // Wand tip glow
    if (wandProgress < 0.95) {
      const grad = ctx.createRadialGradient(wandX, wandY, 0, wandX, wandY, w * 0.06);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.3, 'rgba(255,200,50,0.5)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(wandX - w * 0.06, wandY - w * 0.06, w * 0.12, w * 0.12);

      // Star burst at tip
      ctx.save();
      ctx.translate(wandX, wandY);
      ctx.rotate(time * 3);
      for (let r = 0; r < 4; r++) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = `rgba(255,220,100,${0.6})`;
        ctx.fillRect(-1, -12, 2, 24);
      }
      ctx.restore();
    }
  },

  glitterRain(ctx, w, h, t) {
    // Kultainen glitter-sade ylhäältä
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const b = beat();

    for (let i = 0; i < 120; i++) {
      const seed = i * 73.7;
      const x = (seed * 3.1) % w;
      const speed = 60 + (seed % 100);
      const y = (time * speed + seed * 5) % (h + 20) - 10;
      const shimmer = Math.sin(time * 8 + seed) * 0.5 + 0.5;
      const size = 1 + shimmer * 2;

      ctx.beginPath();
      ctx.arc(x + Math.sin(time + i) * 3, y, size, 0, Math.PI * 2);
      // Alternate gold and silver
      if (i % 3 === 0) ctx.fillStyle = `rgba(255,200,50,${shimmer * 0.9})`;
      else if (i % 3 === 1) ctx.fillStyle = `rgba(255,255,255,${shimmer * 0.6})`;
      else ctx.fillStyle = `rgba(200,180,255,${shimmer * 0.5})`;
      ctx.fill();
    }
  },

  washUp(ctx, w, h, t) {
    // Alhaalta ylös wash-valo — kuin pylväsvalot seinällä
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const b = beat();
    const numLights = 5;

    for (let i = 0; i < numLights; i++) {
      const x = (i + 0.5) / numLights * w;
      const spread = w / numLights * 0.8;
      const intensity = 0.7 + (1 - b) * 0.3;

      // Upward gradient — light source at bottom
      const grad = ctx.createLinearGradient(x, h, x, h * 0.1);
      const hueVal = (time * 15 + i * 40) % 360;
      grad.addColorStop(0, `hsla(${hueVal}, 70%, 50%, ${intensity * 0.8})`);
      grad.addColorStop(0.3, `hsla(${hueVal}, 70%, 40%, ${intensity * 0.4})`);
      grad.addColorStop(0.7, `hsla(${hueVal}, 70%, 30%, ${intensity * 0.1})`);
      grad.addColorStop(1, 'transparent');

      // Cone shape
      ctx.beginPath();
      ctx.moveTo(x - spread * 0.15, h);
      ctx.lineTo(x - spread * 0.6, h * 0.05);
      ctx.lineTo(x + spread * 0.6, h * 0.05);
      ctx.lineTo(x + spread * 0.15, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Haze/fog at bottom
    const fogGrad = ctx.createLinearGradient(0, h, 0, h * 0.6);
    fogGrad.addColorStop(0, `rgba(200,200,220,${0.08 + (1 - b) * 0.04})`);
    fogGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, w, h);
  },

  shadowWall(ctx, w, h, t) {
    // Varjoja ja valon leikkiä — kuin usva ja valonsäteet
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;

    // Light rays from top
    for (let i = 0; i < 6; i++) {
      const angle = Math.sin(time * 0.3 + i * 1.5) * 0.3;
      const x = (i / 5) * w;
      const intensity = Math.sin(time * 0.5 + i * 0.8) * 0.5 + 0.5;

      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(angle);
      const grad = ctx.createLinearGradient(0, 0, 0, h * 1.2);
      const hueVal = (30 + i * 10 + time * 8) % 60; // warm tones
      grad.addColorStop(0, `hsla(${hueVal}, 60%, 70%, ${intensity * 0.2})`);
      grad.addColorStop(0.5, `hsla(${hueVal}, 60%, 50%, ${intensity * 0.08})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(-w * 0.08, 0, w * 0.16, h * 1.2);
      ctx.restore();
    }

    // Floating dust/haze particles
    for (let i = 0; i < 30; i++) {
      const seed = i * 137;
      const x = (seed * 2.3 + time * 10) % w;
      const y = (seed * 1.7 + Math.sin(time + i) * 30) % h;
      const size = 1 + Math.sin(time * 2 + i) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,240,200,${0.15 + Math.sin(time * 3 + seed) * 0.1})`;
      ctx.fill();
    }
  },

  dancerIntro(ctx, w, h, t) {
    // Tanssija-esittely — nimi ilmestyy spotissa
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cx = w / 2, cy = h / 2;

    // Central spotlight
    const spotSize = w * 0.3 + Math.sin(time * 2) * w * 0.03;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, spotSize);
    grad.addColorStop(0, 'rgba(255,240,200,0.25)');
    grad.addColorStop(0.5, 'rgba(255,220,150,0.08)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Star/sparkle accents around spot
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time * 0.5;
      const dist = spotSize * 0.8 + Math.sin(time * 3 + i) * 20;
      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + Math.sin(angle) * dist;
      const sparkle = Math.sin(time * 6 + i * 3) * 0.5 + 0.5;

      if (sparkle > 0.3) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(time * 2 + i);
        ctx.fillStyle = `rgba(255,220,100,${sparkle * 0.6})`;
        ctx.fillRect(-1, -6, 2, 12);
        ctx.fillRect(-6, -1, 12, 2);
        ctx.restore();
      }
    }
  },

  blinderFlash(ctx, w, h, t) {
    // Blinder — voimakas valkoinen flash BPM:n tahtiin, sitten hidas fade
    const b = beat();
    const flash = Math.pow(1 - b, 12); // Erittäin terävä flash

    // Warm white flash
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(255,245,230,${flash})`;
      ctx.fillRect(0, 0, w, h);
    }
  },

  hazeBeams(ctx, w, h, t) {
    // Usva + valonsäteet — volumetric light look
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const b = beat();

    // Volumetric beams
    const numBeams = 4;
    for (let i = 0; i < numBeams; i++) {
      const baseAngle = (i / numBeams) * Math.PI * 0.6 - Math.PI * 0.3;
      const sway = Math.sin(time * 0.7 + i * 2) * 0.15;
      const angle = baseAngle + sway;

      const sourceX = w * 0.5 + (i - numBeams / 2) * w * 0.15;
      const sourceY = -h * 0.1;

      ctx.save();
      ctx.translate(sourceX, sourceY);
      ctx.rotate(angle);

      const beamW = w * 0.06 + (1 - b) * w * 0.02;
      const grad = ctx.createLinearGradient(0, 0, 0, h * 1.5);
      const hueVal = (40 + i * 30 + time * 10) % 360;
      grad.addColorStop(0, `hsla(${hueVal}, 50%, 80%, ${0.15 + (1 - b) * 0.1})`);
      grad.addColorStop(0.5, `hsla(${hueVal}, 50%, 60%, 0.05)`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(-beamW / 2, 0, beamW, h * 1.5);
      ctx.restore();
    }

    // Haze overlay
    ctx.fillStyle = `rgba(180,180,200,${0.02 + Math.sin(time) * 0.01})`;
    ctx.fillRect(0, 0, w, h);
  },

  nameReveal(ctx, w, h, t) {
    // Tyhjä pinta jossa voi näyttää nimiä — spotlight + kehys
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cx = w / 2, cy = h / 2;

    // Elegant frame
    const pad = w * 0.08;
    ctx.strokeStyle = `rgba(255,200,50,${0.15 + Math.sin(time * 2) * 0.05})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, h * 0.3, w - pad * 2, h * 0.4);

    // Corner accents
    const cornerSize = w * 0.04;
    const corners = [[pad, h * 0.3], [w - pad, h * 0.3], [pad, h * 0.7], [w - pad, h * 0.7]];
    corners.forEach(([x, y], i) => {
      ctx.strokeStyle = `rgba(255,200,50,${0.3 + Math.sin(time * 3 + i) * 0.1})`;
      ctx.lineWidth = 2;
      const dx = i % 2 === 0 ? 1 : -1;
      const dy = i < 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x, y + dy * cornerSize);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * cornerSize, y);
      ctx.stroke();
    });

    // Subtle glow at center
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.3);
    grad.addColorStop(0, 'rgba(255,220,150,0.06)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  },

  // ══════════════════════════════════════
  // CLASSIC VJ
  // ══════════════════════════════════════

  circles(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
    const b = beat();
    const pulse = 1 - b * b;
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 8; i++) {
      const r = (w * 0.06 + i * w * 0.08) + pulse * w * 0.04;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = hue(t, i * 30, 0.6 + pulse * 0.4);
      ctx.lineWidth = 2 + pulse * 4;
      ctx.stroke();
    }
  },

  particles(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    for (let i = 0; i < 60; i++) {
      const seed = i * 137.508;
      const x = ((seed * 7.3 + time * 50 * (1 + i * 0.1)) % (w * 1.2)) - w * 0.1;
      const y = ((seed * 3.1 + time * 30 * (1 + i * 0.05)) % (h * 1.2)) - h * 0.1;
      const r = 1 + Math.sin(time + i) * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r + 1, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${(i * 12 + time * 20) % 360}, 80%, 60%)`;
      ctx.fill();
    }
  },

  tunnel(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 20; i++) {
      const depth = (i - (time * 4) % 1) / 20;
      const size = Math.pow(depth, 1.5) * Math.max(w, h) * 0.8;
      const rot = time * 0.5 + depth * Math.PI * 2;
      ctx.beginPath();
      for (let s = 0; s <= 6; s++) {
        const a = (s / 6) * Math.PI * 2 + rot;
        const x = cx + Math.cos(a) * size;
        const y = cy + Math.sin(a) * size;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hue(t, depth * 360, 0.4 + (1 - depth) * 0.5);
      ctx.lineWidth = 1 + (1 - depth) * 5;
      ctx.stroke();
    }
  },

  kaleidoscope(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cx = w / 2, cy = h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    for (let s = 0; s < 12; s++) {
      ctx.save();
      ctx.rotate((s / 12) * Math.PI * 2 + time * 0.3);
      if (s % 2 === 0) ctx.scale(1, -1);
      for (let i = 0; i < 4; i++) {
        const r = w * 0.1 + i * w * 0.08 + Math.sin(time + i) * w * 0.04;
        ctx.beginPath();
        ctx.arc(r, 0, w * 0.02 + i * w * 0.01, 0, Math.PI * 2);
        ctx.fillStyle = hue(t, s * 30 + i * 60, 0.6);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  },

  waves(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const amp = h * 0.08;
    for (let layer = 0; layer < 5; layer++) {
      ctx.beginPath();
      const oy = (layer / 5) * h + h * 0.1;
      const freq = 0.01 + layer * 0.003;
      const speed = time * (1 + layer * 0.3);
      for (let x = 0; x <= w; x += 2) {
        const y = oy + Math.sin(x * freq + speed) * amp + Math.sin(x * freq * 2 + speed * 1.5) * amp * 0.5;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hue(t, layer * 60, 0.7);
      ctx.lineWidth = 2 + layer;
      ctx.stroke();
    }
  },

  gridMorph(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cols = 12, rows = Math.round(cols * h / w);
    const cellW = w / cols, cellH = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = c - cols / 2, dy = r - rows / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wave = Math.sin(dist * 0.6 - time * 3) * 0.5 + 0.5;
        const size = wave * Math.min(cellW, cellH) * 0.9;
        ctx.fillStyle = hue(t, dist * 40, wave * 0.9);
        ctx.fillRect(c * cellW + cellW / 2 - size / 2, r * cellH + cellH / 2 - size / 2, size, size);
      }
    }
  },

  starfield(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 150; i++) {
      const seed = i * 137.508;
      const z = ((seed * 0.001 + t * 0.004) % 1);
      const angle = seed * 2.399;
      const r = z * Math.max(w, h) * 0.7;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, z * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${z})`;
      ctx.fill();
    }
  },

  wash(ctx, w, h, t) {
    const time = t / 2000;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `hsl(${(time * 60) % 360}, 80%, 50%)`);
    grad.addColorStop(0.5, `hsl(${(time * 60 + 120) % 360}, 80%, 50%)`);
    grad.addColorStop(1, `hsl(${(time * 60 + 240) % 360}, 80%, 50%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  },

  strobe(ctx, w, h, t) {
    const time = t / 1000;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 15; i++) {
      const phase = (i / 15 + time * 0.3) % 1;
      ctx.fillStyle = `hsla(${(i * 30 + time * 50) % 360}, 90%, 60%, 0.6)`;
      ctx.fillRect(phase * w, 0, w / 15 * 0.6, h);
    }
  },

  fire(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    for (let i = 0; i < 40; i++) {
      const seed = i * 73.13;
      const x = w * 0.2 + (seed * 3.7 % (w * 0.6));
      const life = (time * 0.5 + seed * 0.01) % 1;
      const y = h - life * h;
      const size = (1 - life) * w * 0.04;
      ctx.beginPath();
      ctx.arc(x + Math.sin(time * 3 + i) * 10, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${20 + life * 30}, 100%, ${50 + (1 - life) * 40}%, ${(1 - life) * 0.8})`;
      ctx.fill();
    }
  },

  matrix(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cols = 20;
    const colW = w / cols;
    ctx.font = `${Math.round(colW * 0.8)}px monospace`;
    ctx.textAlign = 'center';
    for (let c = 0; c < cols; c++) {
      const speed = 0.5 + (c * 7.3 % 1) * 2;
      const y = ((time * speed * h * 0.1 + c * 137) % (h * 1.3)) - h * 0.15;
      const char = String.fromCharCode(0x30A0 + Math.floor((time * 10 + c * 7) % 96));
      ctx.fillStyle = 'rgba(0, 255, 70, 0.9)';
      ctx.fillText(char, c * colW + colW / 2, y);
      for (let tr = 1; tr < 6; tr++) {
        ctx.fillStyle = `rgba(0, 255, 70, ${0.6 - tr * 0.1})`;
        ctx.fillText(String.fromCharCode(0x30A0 + Math.floor((time * 10 + c * 7 + tr * 3) % 96)), c * colW + colW / 2, y - tr * colW);
      }
    }
  },

  plasma(ctx, w, h, t) {
    const time = t / 1000;
    const step = 4;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const v1 = Math.sin(x * 0.03 + time);
        const v2 = Math.sin(y * 0.03 + time * 0.7);
        const v3 = Math.sin((x + y) * 0.02 + time * 0.5);
        const v = (v1 + v2 + v3) / 3;
        const r = Math.sin(v * Math.PI) * 127 + 128;
        const g = Math.sin(v * Math.PI + 2) * 127 + 128;
        const b = Math.sin(v * Math.PI + 4) * 127 + 128;
        ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
        ctx.fillRect(x, y, step, step);
      }
    }
  },

  // ══════════════════════════════════════
  // 3D EFFECTS
  // ══════════════════════════════════════

  sphere3d(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) * 0.3;
    for (let lat = 0; lat <= 12; lat++) {
      for (let lon = 0; lon < 16; lon++) {
        const phi = (lat / 12) * Math.PI;
        const theta = (lon / 16) * Math.PI * 2;
        let x = Math.sin(phi) * Math.cos(theta) * radius;
        let y = Math.cos(phi) * radius;
        let z = Math.sin(phi) * Math.sin(theta) * radius;
        const cosA = Math.cos(time * 0.5), sinA = Math.sin(time * 0.5);
        const rx = x * cosA - z * sinA;
        const rz = x * sinA + z * cosA;
        const scale = w / (w + rz + radius * 1.5);
        const px = cx + rx * scale;
        const py = cy + y * scale;
        const brightness = Math.max(0.1, (rz + radius) / (radius * 2));
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, 4 * scale), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(time * 20 + lat * 15 + lon * 10) % 360}, 90%, ${40 + brightness * 30}%, ${brightness * 0.8})`;
        ctx.fill();
      }
    }
  },

  terrain3d(ctx, w, h, t) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cx = w / 2;
    const horizon = h * 0.35;
    for (let row = 20; row >= 1; row--) {
      const z = row * 40;
      const ps = (w * 0.8) / (w * 0.8 + z);
      ctx.beginPath();
      for (let col = 0; col <= 30; col++) {
        const x = (col / 30 - 0.5) * w * 2;
        const ht = Math.sin(col * 0.4 + time + row * 0.3) * 40 + Math.sin(col * 0.8 + time * 1.5 + row * 0.2) * 20;
        const sx = cx + x * ps;
        const sy = horizon + z * ps * 0.5 - ht * ps;
        col === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = `hsla(${(time * 30 + row * 8) % 360}, 80%, ${30 + (1 - row / 20) * 30}%, ${0.3 + (1 - row / 20) * 0.5})`;
      ctx.lineWidth = 1 + (1 - row / 20) * 2;
      ctx.stroke();
    }
  },

  vortex3d(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 200; i++) {
      const seed = i * 137.508;
      const baseAngle = seed * 2.399 + time * 0.3;
      const spiralR = (i / 200) * Math.min(w, h) * 0.45;
      const z = Math.sin(baseAngle * 2 + time) * 0.5 + 0.5;
      const depth = 0.5 + z * 0.5;
      const angle = baseAngle + spiralR * 0.005 + time;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * spiralR * depth, cy + Math.sin(angle) * spiralR * depth, (1 + z * 3) * depth, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${(seed * 0.5 + time * 40) % 360}, 90%, ${50 + z * 30}%, ${0.3 + z * 0.5})`;
      ctx.fill();
    }
  },

  wall3d(ctx, w, h, t) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cols = 8, rows = 5;
    const bw = w / cols, bh = h / rows;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * bw * 0.5;
      for (let c = 0; c < cols + 1; c++) {
        const bx = c * bw + offset - bw * 0.25;
        const by = r * bh;
        const dist = Math.sqrt(Math.pow(c - cols / 2, 2) + Math.pow(r - rows / 2, 2));
        const push = Math.sin(dist * 0.8 - time * 3) * 0.5 + 0.5;
        const hueVal = (time * 20 + dist * 40) % 360;
        const lt = 30 + push * 35;
        const mg = 2, sh = push * 6;
        ctx.fillStyle = `hsla(${hueVal}, 60%, ${lt * 0.3}%, 0.8)`;
        ctx.fillRect(bx + mg + sh, by + mg + sh, bw - mg * 2, bh - mg * 2);
        ctx.fillStyle = `hsla(${hueVal}, 70%, ${lt}%, 0.9)`;
        ctx.fillRect(bx + mg, by + mg, bw - mg * 2 - sh * 0.5, bh - mg * 2 - sh * 0.5);
      }
    }
  },

  wallCrumble(ctx, w, h, t) {
    // Wall crumbles — bricks fall from top with gravity
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cols = 10, rows = 6;
    const bw = w / cols, bh = h / rows;
    const cycle = 6;
    const phase = (time % cycle) / cycle;

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * bw * 0.5;
      for (let c = 0; c < cols + 1; c++) {
        const bx = c * bw + offset - bw * 0.25;
        const by = r * bh;

        // Each brick falls at different time
        const fallDelay = (r * 0.08 + Math.sin(c * 2.3) * 0.05);
        const fallProgress = Math.max(0, Math.min(1, (phase - fallDelay) * 3));
        const isFalling = fallProgress > 0 && fallProgress < 1;

        // Gravity curve
        const gravity = fallProgress * fallProgress;
        const fallY = isFalling ? gravity * h * 1.2 : (fallProgress >= 1 ? h * 2 : 0);
        const rotation = isFalling ? fallProgress * (c % 2 === 0 ? 1 : -1) * 0.5 : 0;
        const shake = isFalling ? Math.sin(time * 30 + c * 7) * (1 - fallProgress) * 3 : 0;

        if (fallProgress >= 1) continue; // fallen off screen

        const finalY = by + fallY;
        const alpha = isFalling ? 1 - fallProgress * 0.5 : 1;

        // 3D brick with lighting
        const hueVal = 25 + Math.sin(c + r) * 10;
        const lightness = 35 + (1 - r / rows) * 15;

        ctx.save();
        ctx.translate(bx + bw / 2 + shake, finalY + bh / 2);
        ctx.rotate(rotation);

        // Shadow
        ctx.fillStyle = `hsla(${hueVal}, 40%, ${lightness * 0.3}%, ${alpha * 0.6})`;
        ctx.fillRect(-bw / 2 + 4, -bh / 2 + 4, bw - 4, bh - 4);
        // Face
        ctx.fillStyle = `hsla(${hueVal}, 50%, ${lightness}%, ${alpha * 0.9})`;
        ctx.fillRect(-bw / 2 + 2, -bh / 2 + 2, bw - 6, bh - 6);
        // Top highlight
        ctx.fillStyle = `hsla(${hueVal}, 30%, ${lightness + 15}%, ${alpha * 0.4})`;
        ctx.fillRect(-bw / 2 + 2, -bh / 2 + 2, bw - 6, 3);

        ctx.restore();

        // Dust particles when falling
        if (isFalling && fallProgress < 0.5) {
          for (let d = 0; d < 3; d++) {
            const dx = bx + bw / 2 + (Math.random() - 0.5) * bw;
            const dy = by + bh + Math.random() * 20;
            ctx.fillStyle = `rgba(180,160,140,${(1 - fallProgress * 2) * 0.3})`;
            ctx.beginPath();
            ctx.arc(dx, dy, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  },

  wallGrow(ctx, w, h, t) {
    // Organic growth on wall — vines, moss, cracks spreading
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;

    // Growing vines from bottom and sides
    const vines = 6;
    for (let v = 0; v < vines; v++) {
      const startX = (v / vines) * w + w * 0.08;
      const startY = h;
      const maxLen = h * 0.8 * Math.min(1, (time * 0.05 + v * 0.2) % 2);

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      let px = startX, py = startY;
      const segments = 40;
      for (let s = 0; s < segments; s++) {
        if (s / segments > maxLen / (h * 0.8)) break;
        const seg = s / segments;
        const sway = Math.sin(time * 0.5 + s * 0.3 + v * 2) * 15 * seg;
        px = startX + sway + Math.sin(s * 0.7 + v) * 10;
        py = startY - (s / segments) * h * 0.8;
        ctx.lineTo(px, py);

        // Leaves
        if (s % 4 === 0 && s > 4) {
          const leafSize = 5 + Math.sin(time + s + v) * 2;
          const side = s % 8 < 4 ? 1 : -1;
          const lx = px + side * leafSize * 1.5;
          const ly = py;

          ctx.save();
          ctx.fillStyle = `hsla(${100 + Math.sin(time * 0.3 + v + s) * 30}, 65%, ${30 + seg * 20}%, 0.7)`;
          ctx.beginPath();
          ctx.ellipse(lx, ly, leafSize, leafSize * 0.4, side * 0.5 + Math.sin(time + s) * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.strokeStyle = `hsla(90, 35%, 25%, 0.5)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Flowers at top of vines
      if (maxLen > h * 0.5) {
        const flowerHue = (v * 60 + time * 15) % 360;
        const petals = 5;
        for (let p = 0; p < petals; p++) {
          const angle = (p / petals) * Math.PI * 2 + time * 0.3;
          const fx = px + Math.cos(angle) * 8;
          const fy = py + Math.sin(angle) * 8;
          ctx.beginPath();
          ctx.ellipse(fx, fy, 6, 3, angle, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${flowerHue}, 70%, 60%, 0.6)`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${flowerHue + 40}, 80%, 70%, 0.8)`;
        ctx.fill();
      }
    }
  },

  wallShatter(ctx, w, h, t) {
    // Wall shatters outward from center — glass break effect
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cx = w / 2, cy = h / 2;
    const cycle = 5;
    const phase = (time % cycle) / cycle;

    // Impact point pulse
    if (phase < 0.1) {
      const flash = 1 - phase / 0.1;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.1);
      grad.addColorStop(0, `rgba(255,255,255,${flash})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Shards flying outward
    const numShards = 30;
    for (let i = 0; i < numShards; i++) {
      const seed = i * 137.508;
      const angle = (i / numShards) * Math.PI * 2 + seed * 0.1;
      const speed = 0.3 + (seed % 100) / 100 * 0.7;
      const shardPhase = Math.max(0, phase - 0.05);
      const dist = shardPhase * speed * Math.max(w, h) * 0.8;

      if (dist < 1) continue;

      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist + shardPhase * shardPhase * 50;
      const size = w * 0.02 + (seed % 30) * 0.5;
      const rotation = time * 5 + seed;
      const alpha = Math.max(0, 1 - shardPhase * 1.5);

      if (alpha < 0.05) continue;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rotation);

      // Shard shape — irregular polygon
      ctx.beginPath();
      const pts = 3 + (i % 3);
      for (let p = 0; p < pts; p++) {
        const a = (p / pts) * Math.PI * 2;
        const r = size * (0.5 + (((seed + p * 7) % 10) / 10) * 0.5);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        p === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Glass-like fill with reflection
      const hueVal = (200 + seed * 0.5) % 360;
      ctx.fillStyle = `hsla(${hueVal}, 20%, ${40 + (seed % 30)}%, ${alpha * 0.7})`;
      ctx.fill();
      ctx.strokeStyle = `hsla(${hueVal}, 30%, 70%, ${alpha * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.restore();
    }

    // Crack lines from center
    if (phase < 0.3) {
      const crackProgress = phase / 0.3;
      ctx.strokeStyle = `rgba(200,220,255,${(1 - crackProgress) * 0.4})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + i * 0.3;
        const len = crackProgress * Math.max(w, h) * 0.4 * (0.5 + (i % 3) * 0.25);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        let lx = cx, ly = cy;
        const segs = 8;
        for (let s = 0; s < segs; s++) {
          lx += Math.cos(angle + Math.sin(s * 3 + i) * 0.3) * len / segs;
          ly += Math.sin(angle + Math.cos(s * 2 + i) * 0.3) * len / segs;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
    }
  },

  wallDepth(ctx, w, h, t) {
    // Wall with 3D depth illusion — bricks push in/out creating a wave
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cols = 12, rows = 7;
    const bw = w / cols, bh = h / rows;
    const b = beat();

    // Sort bricks by depth for proper overlap
    const bricks = [];
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * bw * 0.4;
      for (let c = 0; c < cols + 1; c++) {
        const bx = c * bw + offset - bw * 0.2;
        const by = r * bh;
        const dist = Math.sqrt(Math.pow((bx + bw / 2) / w - 0.5, 2) + Math.pow((by + bh / 2) / h - 0.5, 2));
        const depth = Math.sin(dist * 8 - time * 2) * 0.5 + 0.5;
        bricks.push({ bx, by, depth, r, c });
      }
    }
    bricks.sort((a, b) => a.depth - b.depth);

    for (const brick of bricks) {
      const { bx, by, depth } = brick;
      const push = depth * 12;
      const scale = 1 + depth * 0.1;
      const hueVal = (30 + depth * 20 + time * 10) % 60;
      const lightFront = 25 + depth * 40;
      const lightTop = lightFront + 15;
      const lightSide = lightFront - 10;
      const mg = 1;

      const cxb = bx + bw / 2;
      const cyb = by + bh / 2;
      const sw = (bw - mg * 2) * scale;
      const sh = (bh - mg * 2) * scale;

      // Right side (3D depth)
      if (push > 1) {
        ctx.fillStyle = `hsla(${hueVal}, 45%, ${lightSide}%, 0.9)`;
        ctx.beginPath();
        ctx.moveTo(cxb + sw / 2, cyb - sh / 2);
        ctx.lineTo(cxb + sw / 2 + push * 0.7, cyb - sh / 2 - push * 0.3);
        ctx.lineTo(cxb + sw / 2 + push * 0.7, cyb + sh / 2 - push * 0.3);
        ctx.lineTo(cxb + sw / 2, cyb + sh / 2);
        ctx.fill();

        // Top side
        ctx.fillStyle = `hsla(${hueVal}, 35%, ${lightTop}%, 0.8)`;
        ctx.beginPath();
        ctx.moveTo(cxb - sw / 2, cyb - sh / 2);
        ctx.lineTo(cxb - sw / 2 + push * 0.7, cyb - sh / 2 - push * 0.3);
        ctx.lineTo(cxb + sw / 2 + push * 0.7, cyb - sh / 2 - push * 0.3);
        ctx.lineTo(cxb + sw / 2, cyb - sh / 2);
        ctx.fill();
      }

      // Front face
      ctx.fillStyle = `hsla(${hueVal}, 50%, ${lightFront}%, 0.95)`;
      ctx.fillRect(cxb - sw / 2, cyb - sh / 2, sw, sh);

      // Mortar lines
      ctx.strokeStyle = `hsla(${hueVal}, 30%, ${lightFront - 15}%, 0.3)`;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cxb - sw / 2, cyb - sh / 2, sw, sh);
    }
  },

  // ══════════════════════════════════════
  // LASER TEXT
  // ══════════════════════════════════════

  laserText(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const text = 'YSIEN TANSSIT';
    const subText = '2026';
    const fontSize = Math.min(w * 0.09, h * 0.22);
    const subSize = fontSize * 0.7;
    const cx = w / 2, cy = h / 2;
    const cycle = 9;
    const phase = time % cycle;
    const drawDuration = 3;

    ctx.font = `bold ${fontSize}px 'Inter','Arial',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(text).width;
    const textLeft = cx - textW / 2;
    const drawProgress = Math.min(1, phase / drawDuration);

    // Laser beams from corners
    if (phase < drawDuration + 1) {
      const focusX = textLeft + textW * drawProgress;
      const focusY = cy;
      const sources = [[0, 0], [w, 0], [0, h], [w, h]];
      const beamAlpha = Math.min(1, drawProgress * 3) * (phase < drawDuration ? 1 : Math.max(0, 1 - (phase - drawDuration)));

      for (const [sx, sy] of sources) {
        ctx.save();
        ctx.globalAlpha = beamAlpha;
        ctx.strokeStyle = 'rgba(0,255,120,0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(focusX, focusY);
        ctx.stroke();
        ctx.restore();
      }

      if (phase < drawDuration) {
        const grad = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, w * 0.04);
        grad.addColorStop(0, 'rgba(255,255,255,0.95)');
        grad.addColorStop(0.2, 'rgba(150,255,150,0.5)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(focusX - w * 0.04, focusY - w * 0.04, w * 0.08, w * 0.08);
      }
    }

    // Text reveal
    const holdAlpha = phase >= drawDuration ? 1 : drawProgress;
    const fadeOut = phase > cycle - 1.5 ? Math.max(0, (cycle - phase) / 1.5) : 1;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, textLeft + textW * drawProgress + 5, h);
    ctx.clip();

    ctx.font = `bold ${fontSize}px 'Inter','Arial',sans-serif`;
    ctx.shadowBlur = 30;
    ctx.shadowColor = `rgba(0,255,120,${0.4 * holdAlpha * fadeOut})`;
    ctx.strokeStyle = `rgba(0,255,120,${0.2 * holdAlpha * fadeOut})`;
    ctx.lineWidth = 4;
    ctx.strokeText(text, cx, cy - subSize * 0.3);

    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgba(200,255,220,${0.8 * holdAlpha * fadeOut})`;
    ctx.strokeStyle = `rgba(220,255,230,${0.9 * holdAlpha * fadeOut})`;
    ctx.lineWidth = 1.5;
    ctx.strokeText(text, cx, cy - subSize * 0.3);

    ctx.font = `bold ${subSize}px 'Inter','Arial',sans-serif`;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `rgba(0,255,120,${0.3 * holdAlpha * fadeOut})`;
    ctx.strokeStyle = `rgba(150,255,180,${0.6 * holdAlpha * fadeOut})`;
    ctx.lineWidth = 1.5;
    ctx.strokeText(subText, cx, cy + fontSize * 0.5);
    ctx.restore();
  },

  // ══════════════════════════════════════
  // SPECIAL
  // ══════════════════════════════════════

  spotlight(ctx, w, h, t) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const b = beat();
    for (let i = 0; i < 3; i++) {
      const angle = time * (0.5 + i * 0.3) + i * Math.PI * 2 / 3;
      const cx = w / 2 + Math.cos(angle) * w * 0.25;
      const cy = h / 2 + Math.sin(angle * 0.7) * h * 0.2;
      const radius = w * 0.15 + (1 - b) * w * 0.05;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const hueVal = (time * 30 + i * 120) % 360;
      grad.addColorStop(0, `hsla(${hueVal}, 80%, 80%, 0.8)`);
      grad.addColorStop(0.3, `hsla(${hueVal}, 80%, 50%, 0.4)`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  },

  ledPixels(ctx, w, h, t) {
    const time = t / 1000;
    const cols = 16, rows = Math.round(cols * h / w) || 8;
    const cellW = w / cols, cellH = h / rows;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const b = beat();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wave = Math.sin(c * 0.5 + time * 3) * Math.sin(r * 0.5 + time * 2);
        const brightness = (wave * 0.5 + 0.5) * (0.7 + (1 - b) * 0.3);
        const hueVal = (time * 40 + c * 15 + r * 10) % 360;
        const cx = c * cellW + cellW / 2;
        const cy = r * cellH + cellH / 2;
        const radius = Math.min(cellW, cellH) * 0.35;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hueVal}, 90%, ${30 + brightness * 50}%, ${brightness})`;
        ctx.fill();
      }
    }
  },

  strobeBlobs(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const b = beat();
    const flash = Math.pow(1 - b, 6);

    for (let i = 0; i < 12; i++) {
      const seed = i * 97.3;
      // Each blob appears at a random position, flashes on beat
      const bx = (Math.sin(seed * 3.1 + Math.floor(time * 2) * seed) * 0.5 + 0.5) * w;
      const by = (Math.cos(seed * 2.3 + Math.floor(time * 2) * seed * 0.7) * 0.5 + 0.5) * h;
      const size = w * 0.03 + w * 0.06 * flash;
      const visible = ((Math.floor(time * 3 + seed) % 3) === 0) ? flash : 0;

      if (visible > 0.05) {
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, size);
        grad.addColorStop(0, `rgba(255,255,255,${visible})`);
        grad.addColorStop(0.4, `rgba(255,240,200,${visible * 0.5})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  explosion(ctx, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, w, h);
    const time = t / 1000;
    const cx = w / 2, cy = h / 2;

    // Explosion cycle: 0-0.3 = flash, 0.3-2 = expand, 2-3 = fade, 3+ = pause
    const cycle = 4;
    const phase = time % cycle;

    if (phase < 0.3) {
      // Initial flash
      const flash = 1 - phase / 0.3;
      ctx.fillStyle = `rgba(255,200,50,${flash * 0.8})`;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = `rgba(255,255,255,${flash})`;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.05 * (1 - flash), 0, Math.PI * 2);
      ctx.fill();
    }

    if (phase > 0.1 && phase < 2.5) {
      const expand = Math.min(1, (phase - 0.1) / 1.5);
      const fade = phase > 2 ? Math.max(0, 1 - (phase - 2) / 0.5) : 1;

      // Shockwave ring
      const ringR = expand * Math.max(w, h) * 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,200,100,${(1 - expand) * fade * 0.6})`;
      ctx.lineWidth = 3 + (1 - expand) * 10;
      ctx.stroke();

      // Debris particles
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2 + i * 0.3;
        const speed = 0.5 + (i * 7.3 % 1) * 0.8;
        const dist = expand * speed * Math.max(w, h) * 0.5;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist + expand * expand * 30; // gravity
        const size = (1 - expand) * 4 * fade;

        if (size > 0.2) {
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          const hueVal = (i * 15) % 60 + 20; // warm orange-red
          ctx.fillStyle = `hsla(${hueVal}, 100%, ${50 + (1 - expand) * 30}%, ${fade * 0.8})`;
          ctx.fill();
        }
      }

      // Smoke clouds
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = expand * 0.4 * Math.max(w, h) * 0.3;
        const px = cx + Math.cos(angle + time * 0.2) * dist;
        const py = cy + Math.sin(angle) * dist - expand * 20;
        const size = expand * w * 0.08;

        const grad = ctx.createRadialGradient(px, py, 0, px, py, size);
        grad.addColorStop(0, `rgba(100,80,60,${0.15 * fade * (1 - expand * 0.5)})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(px - size, py - size, size * 2, size * 2);
      }
    }
  },

  wipeReveal(ctx, w, h, t) {
    // Horizontal wipe transition
    const time = t / 1000;
    const cycle = 4;
    const phase = (time % cycle) / cycle;
    const wipePos = phase * w * 1.3 - w * 0.15;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Bright edge
    const edgeW = w * 0.05;
    const grad = ctx.createLinearGradient(wipePos - edgeW, 0, wipePos + edgeW, 0);
    const hueVal = (time * 30) % 360;
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.4, `hsla(${hueVal}, 90%, 60%, 0.8)`);
    grad.addColorStop(0.5, 'rgba(255,255,255,1)');
    grad.addColorStop(0.6, `hsla(${hueVal}, 90%, 60%, 0.8)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Light behind wipe
    if (wipePos > 0) {
      ctx.fillStyle = `hsla(${hueVal}, 60%, 50%, 0.15)`;
      ctx.fillRect(0, 0, Math.min(wipePos, w), h);
    }
  },
};

export const animationPresetNames = Object.keys(presets);

export function renderAnimation(surface, ctx, time) {
  const preset = presets[surface.animationPreset] ?? presets.circles;
  preset(ctx, surface.w, surface.h, time);
}
