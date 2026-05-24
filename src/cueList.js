// Cue list — GrandMA3/Resolve-style cue system
// Each cue stores a snapshot of all surfaces' state

import { state } from './state.js';
import { activeScene } from './scenes.js';
import { getOverlayState } from './overlays.js';

export const cueList = {
  cues: [],
  activeCueIndex: -1,
  nextCueId: 1,
  fadeDuration: 500, // ms
};

/**
 * Capture current state as a new cue
 */
export function captureCue(name = '') {
  const snapshot = state.surfaces.map(s => ({
    id: s.id,
    visible: s.visible,
    opacity: s.opacity,
    brightness: s.brightness,
    contentType: s.contentType,
    color: s.color,
    animationPreset: s.animationPreset,
    textContent: s.textContent,
    textFont: s.textFont,
    textSize: s.textSize,
    textColor: s.textColor,
    textBgColor: s.textBgColor,
    textBgOpacity: s.textBgOpacity,
    textBold: s.textBold,
    textItalic: s.textItalic,
    textAlign: s.textAlign,
    corners: s.corners.map(c => ({ ...c })),
  }));

  const cue = {
    id: cueList.nextCueId++,
    name: name || `Cue ${cueList.cues.length + 1}`,
    snapshot,
    fadeDuration: cueList.fadeDuration,
  };

  cueList.cues.push(cue);
  return cue;
}

/**
 * Go to cue by index with optional fade
 */
export function gotoCue(index) {
  if (index < 0 || index >= cueList.cues.length) return;

  const cue = cueList.cues[index];
  cueList.activeCueIndex = index;

  // Apply snapshot to surfaces
  for (const snap of cue.snapshot) {
    const surface = state.surfaces.find(s => s.id === snap.id);
    if (!surface) continue;

    // If fade, animate opacity
    if (cue.fadeDuration > 0) {
      const startOpacity = surface.opacity;
      const targetOpacity = snap.visible ? snap.opacity : 0;
      const startTime = performance.now();

      function fade(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / cue.fadeDuration, 1);
        const eased = t * t * (3 - 2 * t); // smoothstep
        surface.opacity = startOpacity + (targetOpacity - startOpacity) * eased;

        if (t < 1) {
          requestAnimationFrame(fade);
        } else {
          // Apply final state
          applySnap(surface, snap);
        }
      }
      requestAnimationFrame(fade);
    } else {
      applySnap(surface, snap);
    }
  }

  // Broadcast cue change to remote
  broadcastCueChange(index);
}

function applySnap(surface, snap) {
  surface.visible = snap.visible;
  surface.opacity = snap.opacity;
  surface.brightness = snap.brightness;
  surface.contentType = snap.contentType;
  surface.color = snap.color;
  surface.animationPreset = snap.animationPreset;
  surface.textContent = snap.textContent;
  surface.textFont = snap.textFont;
  surface.textSize = snap.textSize;
  surface.textColor = snap.textColor;
  surface.textBgColor = snap.textBgColor;
  surface.textBgOpacity = snap.textBgOpacity;
  surface.textBold = snap.textBold;
  surface.textItalic = snap.textItalic;
  surface.textAlign = snap.textAlign;
  if (snap.corners) {
    surface.corners = snap.corners.map(c => ({ ...c }));
  }
}

export function goNextCue() {
  gotoCue(cueList.activeCueIndex + 1);
}

export function goPrevCue() {
  gotoCue(cueList.activeCueIndex - 1);
}

export function deleteCue(index) {
  cueList.cues.splice(index, 1);
  if (cueList.activeCueIndex >= cueList.cues.length) {
    cueList.activeCueIndex = cueList.cues.length - 1;
  }
}

export function updateCueName(index, name) {
  if (cueList.cues[index]) {
    cueList.cues[index].name = name;
  }
}

export function reorderCue(fromIndex, toIndex) {
  const [cue] = cueList.cues.splice(fromIndex, 1);
  cueList.cues.splice(toIndex, 0, cue);
  // Adjust active index
  if (cueList.activeCueIndex === fromIndex) {
    cueList.activeCueIndex = toIndex;
  }
}

// Serialize/deserialize for save/load
export function serializeCueList() {
  return {
    cues: cueList.cues,
    activeCueIndex: cueList.activeCueIndex,
    fadeDuration: cueList.fadeDuration,
  };
}

export function deserializeCueList(data) {
  cueList.cues = data.cues || [];
  cueList.activeCueIndex = data.activeCueIndex ?? -1;
  cueList.fadeDuration = data.fadeDuration ?? 500;
  cueList.nextCueId = Math.max(...cueList.cues.map(c => c.id), 0) + 1;
}

// Remote broadcast stub — will be implemented with BroadcastChannel
const channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('projection-mapper')
  : null;

function broadcastCueChange(index) {
  channel?.postMessage({ type: 'cue-change', index });
}

export function broadcastFullState() {
  channel?.postMessage({
    type: 'full-state',
    surfaces: state.surfaces.map(s => ({
      id: s.id,
      visible: s.visible,
      opacity: s.opacity,
      brightness: s.brightness,
      corners: s.corners,
      contentType: s.contentType,
      color: s.color,
      w: s.w,
      h: s.h,
      animationPreset: s.animationPreset,
      textContent: s.textContent,
      textFont: s.textFont,
      textSize: s.textSize,
      textColor: s.textColor,
      textBgColor: s.textBgColor,
      textBgOpacity: s.textBgOpacity,
      textBold: s.textBold,
      textItalic: s.textItalic,
      textAlign: s.textAlign,
      solo: s.solo,
      groupId: s.groupId,
    })),
    groups: state.groups.map(g => ({
      id: g.id,
      surfaceIds: g.surfaceIds,
      content: g.content,
    })),
    globalContent: state.globalContent,
    blackout: state.blackout,
    activeTestPattern: state.activeTestPattern,
    overlays: getOverlayState(),
    activeScene: activeScene.preset ? {
      preset: activeScene.preset,
      color1: activeScene.color1,
      speed: activeScene.speed,
      intensity: activeScene.intensity,
      startTime: activeScene.startTime,
    } : null,
  });
}
