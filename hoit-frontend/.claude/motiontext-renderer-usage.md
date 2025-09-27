# MotionText Renderer Integration Guide (ECG Frontend)

This document describes how motiontext-renderer is integrated and used in this project, tailored to ECG Frontend’s architecture and editing UX.

## Overview

- Package: `motiontext-renderer` (renderer/runtime)
- Local plugins: served from `public/plugin/<name@version>/`
- Preview workflow: modal with live editing (drag/resize/rotate) + plugin parameter controls
- Key files:
  - `src/app/(route)/asset-store/utils/scenarioGenerator.ts`
  - `src/app/(route)/asset-store/utils/pluginLoader.ts`
  - `src/app/(route)/asset-store/hooks/useMotionTextRenderer.ts`
  - `src/app/(route)/asset-store/components/MotionTextPreview.tsx`
  - `src/app/(route)/asset-store/components/AssetModal.tsx`

## Plugins

### Folder structure (public)

- Place plugins under: `public/plugin/<name@version>/`
- Required files: `index.mjs`, `manifest.json`, and optional `assets/` subfolder
- Example: `public/plugin/elastic@1.0.0/index.mjs`

### Loader behavior (utils/pluginLoader.ts)

- `configurePluginLoader()`: sets renderer dev mode to local, with `localBase: '/plugin/'`
- `preloadAllPlugins()`: registers all known local plugins from a static list
- `preloadPluginsForScenario(scenario)`: scans `pluginChain` and registers only those required
- `loadLocalPlugin(name)`: dynamic import via URL and `registerExternalPlugin`
  - Name normalization: if `name` has no `@`, it is normalized to `name@1.0.0`
  - Manifest is fetched from `/plugin/<name@version>/manifest.json`

## Scenario generation

Location: `utils/scenarioGenerator.ts`

### Loading manifests and defaults

- `loadPluginManifest(name, { mode, serverBase, localBase })`
  - For ECG, pass `{ mode: 'local', localBase: '/plugin/' }` or `'auto'` with both
- `getDefaultParameters(manifest)`: builds param object from `schema` defaults
- `validateAndNormalizeParams(params, manifest)`: clamps/normalizes values per schema

### Preview scenarios (root=group)

We use a root group with a single text child. This is required by the current renderer to mount text elements. Editing transforms (position/size/rotation) apply to the root group; plugin effects apply to the text child.

- `generatePreviewScenario(pluginName, settings, duration)`
  - Root: `e_type: 'group'`
  - Child: `e_type: 'text'`
  - Settings map:
    - `position` (px of 640×360) → normalized `{ x, y }`
    - `size` (px) → normalized `{ width, height }`
    - `rotationDeg?` → `root.layout.transform.rotate.deg`
    - `pluginParams` → `pluginChain[0].params`

- `generateLoopedScenario(pluginName, settings, duration)`
  - Same structure as above, with `relStartPct: 0`, `relEndPct: 1`

## Renderer hook and component

### useMotionTextRenderer (hook)

- File: `hooks/useMotionTextRenderer.ts`
- Responsibilities:
  - Load GSAP and attach to `window.gsap`
  - Configure plugin loader, preload plugins
  - Create `MotionTextRenderer` and attach a hidden `<video>` (stabilizes sizing/ticking)
  - Provide `initializeRenderer`, `loadScenario`, `play`, `pause`, `dispose`
  - Render loop uses rAF + `renderer.seek(time)`
  - Autoplay race fix: ensure `isPlayingRef.current = true` before starting rAF loop

### MotionTextPreview (component)

- File: `components/MotionTextPreview.tsx`
- Renders a 640×360 preview area:
  - Hidden `<video ref={videoRef} muted playsInline style={{ opacity: 0 }}>` (attached to renderer)
  - Overlay container `<div ref={containerRef}>` (renderer mounts into this)
  - Drag/resize box for interactive editing; optional rotation slider (when controls visible)
- Public imperative method (via `ref`): `updateParameters(params)`
  - The modal calls this after parent state commits, not during render
- Debounces scenario updates (120ms) on text/position/size/rotation/params changes

## Modal data flow

### AssetModal → MotionTextPreview

- File: `components/AssetModal.tsx`
- State in modal:
  - `text`, `parameters` (plugin params), `manifest`
- Update pattern (to avoid React warning):
  - On parameter UI change: only update modal state (`setParameters`)
  - In `useEffect([parameters])`: call `previewRef.current.updateParameters(parameters)`
  - Reason: invoking child’s setState (imperative ref) is deferred to commit phase

## Editing UX mapping

- Dragging: updates position (px), then normalized to `{ x, y }` relative to 640×360
- Resizing: updates size (px), normalized to `{ width, height }`
- Rotation: slider updates `rotationDeg`; mapped to `root.layout.transform.rotate.deg`
- Anchor: we use `'tl'` or `'cc'` depending on UX; for drag-by-top-left workflows, `'tl'` is intuitive

## Autoplay-on-first-visit fix

Symptom: After hard refresh, first modal open doesn’t start playback until any edit.

Root cause: rAF loop saw `isPlayingRef` still `false` on first tick due to state sync timing, and stopped itself.

Fix: In `play()`, set `isPlayingRef.current = true` before scheduling rAF; in `pause()`, set it to `false` immediately.

## Troubleshooting

- 404 loading plugin entry
  - Ensure folder name is `<name@version>`, e.g., `rotation@1.0.0`
  - Loader normalizes `name` → `name@1.0.0` for URLs

- Nothing appears; container shows one empty child
  - Ensure scenario uses `root: { e_type: 'group', children: [ { e_type: 'text', ... } ] }`
  - The renderer only mounts text elements from `root.children`

- Plugins not animating
  - Verify `preloadPluginsForScenario(scenario)` is called before `loadScenario`
  - Confirm plugin chain uses `pluginChain: [{ name, params, relStartPct: 0, relEndPct: 1 }]`

- GSAP errors (e.g., TextPlugin)
  - The provided sample plugins avoid TextPlugin; if needed, load/register additional GSAP plugins explicitly

- Layout sizing off
  - The hidden video must be attached to renderer to stabilize stage bounds (`attachMedia(video)`) and ResizeObserver behavior

## Performance notes

- Debounce scenario updates (~120ms) while typing/changing sliders
- Preload only required plugins per scenario when possible
- Keep `cue.id` and structure stable to reduce remount churn

## Checklist (new integration)

1. Place plugin under `public/plugin/<name@version>/`
2. Call `configurePluginLoader()` once
3. Load manifest → defaults → validated params
4. Generate scenario with root group + text child; map position/size/rotation
5. `initializeRenderer()`; ensure hidden video is attached (`attachMedia`)
6. `preloadPluginsForScenario(scenario)` then `loadScenario(scenario)`
7. Use `play()` to start; verify console logs for mounting
8. Update parameters via parent state + `useEffect`-driven `previewRef.updateParameters`
