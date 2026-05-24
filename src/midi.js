// MIDI controller support via Web MIDI API
// Maps MIDI notes/CC to scenes, overlays, cues, and faders

import { state } from './state.js';
import { activateScene, deactivateScene, scenePresetNames } from './scenes.js';
import { triggerOverlay, overlayPresetNames } from './overlays.js';
import { goNextCue, goPrevCue, gotoCue } from './cueList.js';
import { setBPM } from './content/animation.js';

// Default MIDI mapping — can be customized via UI or JSON
const STORAGE_KEY = 'pm-midi-mapping';

let midiAccess = null;
let listeners = [];

// Default mapping: note numbers → actions
const defaultMapping = {
  // Notes 36-59 (pads on most controllers) → scenes
  notes: {
    36: { action: 'scene', scene: 'magicReveal' },
    37: { action: 'scene', scene: 'glitterRain' },
    38: { action: 'scene', scene: 'washUp' },
    39: { action: 'scene', scene: 'shadowWall' },
    40: { action: 'scene', scene: 'dancerIntro' },
    41: { action: 'scene', scene: 'blinderFlash' },
    42: { action: 'scene', scene: 'laserText' },
    43: { action: 'scene', scene: 'wipeReveal' },
    44: { action: 'scene', scene: 'waves' },
    45: { action: 'scene', scene: 'circles' },
    46: { action: 'scene', scene: 'tunnel' },
    47: { action: 'scene', scene: 'particles' },
    48: { action: 'scene', scene: 'wall3d' },
    49: { action: 'scene', scene: 'sphere3d' },
    50: { action: 'scene', scene: 'starfield' },
    51: { action: 'scene', scene: 'gridMorph' },
    // 52-55 overlays
    52: { action: 'overlay', overlay: 'flashWhite' },
    53: { action: 'overlay', overlay: 'flashGold' },
    54: { action: 'overlay', overlay: 'flashBoom' },
    55: { action: 'overlay', overlay: 'wipeRight' },
    // 56-59 utility
    56: { action: 'blackout' },
    57: { action: 'restore' },
    58: { action: 'cue-next' },
    59: { action: 'cue-prev' },
  },
  // CC → faders
  cc: {
    1: { action: 'bpm', min: 40, max: 200 },       // mod wheel → BPM
    7: { action: 'master-opacity' },                  // volume → master opacity
    11: { action: 'master-brightness' },              // expression → brightness
  },
};

let mapping = loadMapping();

function loadMapping() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { ...defaultMapping };
}

export function saveMapping() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
}

export function getMapping() {
  return mapping;
}

export function setMapping(newMapping) {
  mapping = newMapping;
  saveMapping();
}

export function resetMapping() {
  mapping = { ...defaultMapping };
  saveMapping();
}

// Init Web MIDI
export async function initMIDI() {
  if (!navigator.requestMIDIAccess) {
    console.log('Web MIDI not supported in this browser');
    return false;
  }

  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });

    // Listen to all inputs
    for (const input of midiAccess.inputs.values()) {
      connectInput(input);
    }

    // Watch for new devices
    midiAccess.onstatechange = (e) => {
      if (e.port.type === 'input') {
        if (e.port.state === 'connected') {
          connectInput(e.port);
          notifyListeners({ type: 'device-connected', name: e.port.name });
        } else {
          notifyListeners({ type: 'device-disconnected', name: e.port.name });
        }
      }
    };

    console.log('MIDI initialized, inputs:', [...midiAccess.inputs.values()].map(i => i.name));
    return true;
  } catch (err) {
    console.error('MIDI access denied:', err);
    return false;
  }
}

function connectInput(input) {
  input.onmidimessage = handleMIDIMessage;
}

function handleMIDIMessage(e) {
  const [status, data1, data2] = e.data;
  const channel = status & 0x0F;
  const type = status & 0xF0;

  // Note On
  if (type === 0x90 && data2 > 0) {
    const noteAction = mapping.notes?.[data1];
    if (noteAction) executeAction(noteAction, data2 / 127);
    notifyListeners({ type: 'note-on', note: data1, velocity: data2, channel });
  }

  // Note Off
  if (type === 0x80 || (type === 0x90 && data2 === 0)) {
    const noteAction = mapping.notes?.[data1];
    if (noteAction?.action === 'scene' && noteAction.flash) {
      deactivateScene();
    }
    notifyListeners({ type: 'note-off', note: data1, channel });
  }

  // CC (Control Change)
  if (type === 0xB0) {
    const ccAction = mapping.cc?.[data1];
    if (ccAction) executeCCAction(ccAction, data2 / 127);
    notifyListeners({ type: 'cc', cc: data1, value: data2, channel });
  }
}

function executeAction(action, velocity) {
  switch (action.action) {
    case 'scene':
      activateScene(action.scene, action.targetGroupId || null);
      break;
    case 'overlay':
      triggerOverlay(action.overlay);
      break;
    case 'blackout':
      state.blackout = true;
      break;
    case 'restore':
      state.blackout = false;
      state.surfaces.forEach(s => s.visible = true);
      break;
    case 'cue-next':
      goNextCue();
      break;
    case 'cue-prev':
      goPrevCue();
      break;
    case 'cue-goto':
      gotoCue(action.index);
      break;
    case 'deactivate':
      deactivateScene();
      break;
  }
}

function executeCCAction(action, value) {
  switch (action.action) {
    case 'bpm': {
      const min = action.min || 40;
      const max = action.max || 200;
      setBPM(Math.round(min + value * (max - min)));
      break;
    }
    case 'master-opacity':
      state.surfaces.forEach(s => s.opacity = value);
      break;
    case 'master-brightness':
      state.surfaces.forEach(s => s.brightness = value * 2);
      break;
  }
}

// Event listeners for UI feedback
export function onMIDIEvent(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notifyListeners(event) {
  for (const fn of listeners) fn(event);
}

// Get connected device names
export function getMIDIDevices() {
  if (!midiAccess) return [];
  return [...midiAccess.inputs.values()].map(i => ({
    id: i.id,
    name: i.name,
    manufacturer: i.manufacturer,
    state: i.state,
  }));
}
