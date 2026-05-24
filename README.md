# Projection Mapper

A browser-based projection mapping tool for live events. Map content onto arbitrary surfaces, control cues in real time, and drive multiple output windows — all from a single browser tab.

Built with vanilla JavaScript and Vite. No frameworks, no build dependencies beyond Vite.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Surface mapping** — create surfaces and drag corners to fit any projection target. Uses CSS `matrix3d` homography to warp content in real time.
- **40+ animation presets** — waves, particles, fire, plasma, 3D terrain, laser text, matrix rain, and more. All generated on canvas, no external assets.
- **Content types** — solid color, image, video, text (with Google Fonts), freehand drawing, and generative animations.
- **Groups** — combine surfaces into groups that share a single content source, automatically sliced per surface.
- **Global content** — broadcast one animation or color to all ungrouped surfaces at once.
- **Cue list** — GrandMA3-style cue system. Capture snapshots, navigate with fade transitions, control from a separate device.
- **Scenes** — one-click scene presets organized by category: show, VJ, lighting, 3D, and utility.
- **Overlays** — stack effects on top of content: wipes, flashes, sparkles, scan lines, vignette, boom shockwave.
- **Test patterns** — checkerboard, grid, color bars, numbering, gradients for calibration.
- **Multi-window output** — open dedicated output windows, drag them to projectors, go fullscreen.
- **Remote control** — open a remote panel on your phone to navigate cues and trigger blackout.
- **BPM sync** — tap tempo or set BPM manually; animations sync to the beat.
- **Auto-save** — all settings persist to IndexedDB automatically. Export/import as JSON.
- **Zoom & pan** — scroll to zoom, middle-click to pan, grid overlay for alignment.

## Quick start

```bash
git clone git@github.com:justusbernerdev/projection-mapper.git
cd projection-mapper
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Usage

### Editor (main window)

1. Click **+ New Surface** to create a projection surface.
2. Drag the blue corner handles to match your physical projection target.
3. Choose a content type in the sidebar (animation, text, image, video, etc.).
4. Adjust opacity, brightness, and other properties.

### Output (projector)

1. Click **Open Output Window** in the sidebar.
2. Drag the output window to your projector/extended display.
3. Press **F** for fullscreen.
4. Press **Tab** to switch to performance mode (hides all UI).

### Remote control

1. Click **Open Remote Control** in the sidebar.
2. A small window opens — navigate cues, trigger blackout, and go live from your phone or second screen.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Toggle Edit / Performance mode |
| `F` | Fullscreen |
| `Esc` | Exit fullscreen |
| `B` | Blackout |
| `R` | Restore all |
| `Space` | Toggle selected surface visibility |
| `S` | Save config |
| `H` | Hide/show UI (edit mode) |
| `G` | Toggle grid |
| `1`-`9` | Select surface by number |
| `Arrow keys` | Previous/next cue |

### Modes

- **Edit** — design surfaces, adjust geometry and content.
- **Program** — control scenes, BPM, overlays, and cues with a dedicated panel.
- **Performance** — clean output, no UI. Ready for showtime.

## Architecture

```
src/
  state.js            # Central state (surfaces, groups, mode, global content)
  surface.js          # Surface creation and defaults
  renderer.js         # Render loop — content, groups, overlays, test patterns
  homography.js       # 3x3 homography → CSS matrix3d
  cueList.js          # Cue capture, navigation, fade transitions
  scenes.js           # Scene presets (show, VJ, lighting, 3D, utility)
  overlays.js         # Overlay effects (wipes, flashes, sparkles)
  stageScale.js       # Viewport zoom, pan, fit-to-container
  outputWindow.js     # Output window management

  content/
    animation.js      # 40+ generative animation presets
    solid.js          # Solid color fill
    image.js          # Image rendering
    video.js          # Video playback
    text.js           # Text with fonts, wrapping, styling
    drawing.js        # Freehand drawing renderer
    drawingInput.js   # Drawing input with inverse homography
    testPatterns.js   # Calibration test patterns

  ui/
    sidebar.js        # Main sidebar UI
    cornerHandles.js  # Draggable corner handles
    grid.js           # Grid overlay
    programMode.js    # Program mode panel

  utils/
    keyboard.js       # Keyboard shortcuts
    storage.js        # Auto-save, export/import, project management
    db.js             # IndexedDB wrapper
```

### Rendering pipeline

1. Pre-render group canvases (one offscreen canvas per group).
2. For each surface, determine content source: **test pattern > group > global > solo > black**.
3. Render content to the surface's internal canvas.
4. Apply overlays on top.
5. Apply CSS `matrix3d` homography transform to the DOM element.
6. Broadcast state to output windows via `BroadcastChannel` at ~30fps.

### Coordinate system

All surfaces live in a **1920 x 1080** coordinate space regardless of window size. The editor viewport scales and pans to show this space. Output windows render at native resolution.

### Storage

- **IndexedDB** for persistent project data (supports multiple projects).
- **Auto-save** — checks for changes every second, saves with 500ms debounce.
- **JSON export/import** for backup and sharing.

## Configuration

The output resolution is 1920x1080 by default. To change it, update the constants in `src/stageScale.js` and `src/surface.js`.

## Browser support

Requires a modern browser with support for:
- `BroadcastChannel` (Chrome, Firefox, Edge)
- `CSS matrix3d` transforms
- `Canvas 2D` context
- `IndexedDB`
- `Fullscreen API`

Safari has limited `BroadcastChannel` support — output windows and remote control may not work.

## License

[MIT](LICENSE)
