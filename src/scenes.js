// Scene presets — Ysien Tanssit 2026
import { state } from './state.js';

export const scenePresets = {
  // ── SHOWTIME ──
  magicReveal:  { name: 'Magic Reveal',  animation: 'magicReveal',  color: '#ffcc33', category: 'show' },
  glitterRain:  { name: 'Glitter Rain',  animation: 'glitterRain',  color: '#ffd700', category: 'show' },
  washUp:       { name: 'Wash Up',       animation: 'washUp',       color: '#6644cc', category: 'show' },
  shadowWall:   { name: 'Shadow Wall',   animation: 'shadowWall',   color: '#554433', category: 'show' },
  dancerIntro:  { name: 'Dancer Spot',   animation: 'dancerIntro',  color: '#ffdd88', category: 'show' },
  blinderFlash: { name: 'Blinder',       animation: 'blinderFlash', color: '#ffffcc', category: 'show' },
  laserText:    { name: 'Laser Text',    animation: 'laserText',    color: '#00ff88', category: 'show' },
  wipeReveal:   { name: 'Wipe',         animation: 'wipeReveal',   color: '#00ddff', category: 'show' },

  // ── VJ ──
  waves:        { name: 'Waves',         animation: 'waves',        color: '#00ccff', category: 'vj' },
  circles:      { name: 'Circles',       animation: 'circles',      color: '#ff0066', category: 'vj' },
  tunnel:       { name: 'Tunnel',        animation: 'tunnel',       color: '#8800ff', category: 'vj' },
  kaleidoscope: { name: 'Kaleido',       animation: 'kaleidoscope', color: '#ff6600', category: 'vj' },
  particles:    { name: 'Particles',     animation: 'particles',    color: '#00ffaa', category: 'vj' },
  gridMorph:    { name: 'Grid',          animation: 'gridMorph',    color: '#ffdd00', category: 'vj' },
  starfield:    { name: 'Stars',         animation: 'starfield',    color: '#aaaaff', category: 'vj' },

  // ── 3D WALL ──
  wall3d:       { name: '3D Wall',       animation: 'wall3d',       color: '#ffaa44', category: '3d' },
  wallCrumble:  { name: 'Wall Crumble',  animation: 'wallCrumble',  color: '#aa6633', category: '3d' },
  wallGrow:     { name: 'Wall Grow',     animation: 'wallGrow',     color: '#44cc88', category: '3d' },
  wallShatter:  { name: 'Wall Shatter',  animation: 'wallShatter',  color: '#ff4444', category: '3d' },
  wallDepth:    { name: 'Wall Depth',    animation: 'wallDepth',    color: '#4488ff', category: '3d' },
  sphere3d:     { name: '3D Sphere',     animation: 'sphere3d',     color: '#8866ff', category: '3d' },

  // ── LIGHTS ──
  spotlight:    { name: 'Spotlight',     animation: 'spotlight',    color: '#ffeeaa', category: 'light' },
  wash:         { name: 'Color Wash',    animation: 'wash',         color: '#ff8800', category: 'light' },
  strobe:       { name: 'Strobe',        animation: 'strobe',       color: '#ffffff', category: 'light' },
  ledPixels:    { name: 'LED Pixels',    animation: 'ledPixels',    color: '#ff00ff', category: 'light' },
  strobeBlobs:  { name: 'Strobe Blobs',  animation: 'strobeBlobs',  color: '#ffffaa', category: 'light' },

  // ── UTILITY ──
  blackout:     { name: 'Blackout',      animation: null, color: '#333', isBlackout: true, category: 'util' },
  full:         { name: 'White',         animation: null, color: '#fff', isSolid: true, solidColor: '#ffffff', category: 'util' },
  red:          { name: 'Red',           animation: null, color: '#f00', isSolid: true, solidColor: '#ff0000', category: 'util' },
  blue:         { name: 'Blue',          animation: null, color: '#00f', isSolid: true, solidColor: '#0044ff', category: 'util' },
  gold:         { name: 'Gold',          animation: null, color: '#fc0', isSolid: true, solidColor: '#ffcc00', category: 'util' },
  purple:       { name: 'Purple',        animation: null, color: '#80f', isSolid: true, solidColor: '#8800ff', category: 'util' },
};

export const scenePresetNames = Object.keys(scenePresets);
export const sceneCategories = { show: 'Showtime', vj: 'VJ', '3d': '3D Wall', light: 'Valot', util: 'Utility' };

export const activeScene = { preset: null };

export function activateScene(presetName, targetGroupId = null) {
  const preset = scenePresets[presetName];
  if (!preset) return;
  activeScene.preset = presetName;

  if (preset.isBlackout) { state.blackout = true; return; }
  state.blackout = false;

  const groups = targetGroupId
    ? state.groups.filter(g => g.id === targetGroupId)
    : state.groups;

  for (const group of groups) {
    if (!group.content) group.content = { enabled: false, contentType: 'animation', animationPreset: 'waves', color: '#0066ff', opacity: 1, brightness: 1 };
    group.content.enabled = true;
    if (preset.animation) { group.content.contentType = 'animation'; group.content.animationPreset = preset.animation; }
    else if (preset.isSolid) { group.content.contentType = 'solid'; group.content.color = preset.solidColor; }
  }

  if (!targetGroupId) {
    state.globalContent.enabled = true;
    if (preset.animation) { state.globalContent.contentType = 'animation'; state.globalContent.animationPreset = preset.animation; }
    else if (preset.isSolid) { state.globalContent.contentType = 'solid'; state.globalContent.color = preset.solidColor; }
  }
}

export function deactivateScene() {
  activeScene.preset = null;
  state.blackout = false;
  for (const group of state.groups) { if (group.content) group.content.enabled = false; }
  state.globalContent.enabled = false;
}

export function toggleScene(presetName) {
  if (activeScene.preset === presetName) deactivateScene();
  else activateScene(presetName);
}
