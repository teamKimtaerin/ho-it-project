# MotionText Migration Plan (Editor)

Goal: Replace the editor’s video/subtitle rendering path with motiontext-renderer while preserving UX and timeline semantics.

## Scope & Non‑Goals

- In scope: subtitle/text rendering, plugin effects, timeline sync, skip logic integration, preview UI.
- Out of scope: backend APIs, transcription pipeline, storage formats (SRT/VTT/ASS export remain).

## Milestones

1. Audit & Baseline (M0)

- Inventory current paths: `components/VideoSection` (hosts overlay), `components/VideoPlayer/index.tsx` (publishes `window.videoPlayer`), `components/SubtitleOverlay.tsx` (HTML overlay), `videoSegmentManager`, `src/utils/editor/*` clip ops, `editor/store` slices.
- Capture baseline behavior (play/pause, skip deleted, subtitle changes, size/position from store).
- Deliverable: short audit notes + screenshots, list of public APIs touched.

2. Share MotionText Infra (M1) — DONE

- Moved shared code to `src/app/shared/motiontext/` (hook + utils) with barrel `index.ts`.
- Re-exported from Asset Store paths for backward compatibility.
- Updated Editor overlay imports to consume shared module.

3. Editor Overlay Skeleton (M2) — DONE

- Replace `SubtitleOverlay` in `VideoSection` with `EditorMotionTextOverlay` behind `NEXT_PUBLIC_EDITOR_MOTIONTEXT` flag.
- Expose the HTMLVideoElement via `window.videoPlayer.getElement()` (added to `components/VideoPlayer.tsx`).
- Overlay attaches video via hook `videoRef` + `initializeRenderer()`; stage uses player container (16:9).
- Deliverable met: renderer mounts; scenario loading deferred.

4. Scenario Mapping v1 (M3) — DONE

- Generate scenario inline in overlay (stage 640×360), single text child + pluginChain (`elastic@1.0.0` defaults).
- Store mapping: `subtitleSize` → fontSizeRel, `subtitlePosition` → group position, `showSubtitles` respected.
- Active clip detection by timeline parsing; deleted clips ignored.
- Debounced scenario reload (120ms) on active text changes.
- Deliverable met: subtitles render via MotionText under flag.

5. Timeline Sync & Skip (M4) — DONE

- Renderer syncs to real video time via rAF on `play` and stops on `pause` (+ `seeked`/`ratechange` force-seek).
- `VideoPlayer.tsx` initializes `videoSegmentManager` and skips deleted ranges during playback.
- Active clip detection in overlay ignores deleted clips.

6. Scenario Mapping v2 (M5) — DONE

- Built a multi-cue scenario spanning all non-deleted clips with adjusted times via `videoSegmentManager`.
- Overlay now loads once per clips/UI change and seeks on every video tick; no per-clip reloads.
- Result: smoother transitions across clip boundaries.

7. Settings & Feature Flag (M6) — DONE

- `NEXT_PUBLIC_EDITOR_MOTIONTEXT` toggles new overlay; default ON in dev (unless explicitly set to `0`/`false`), OFF in prod.

8. Tests & QA (M7) — DONE (unit); E2E pending

- Unit: Added tests for scenario generator and `videoSegmentManager` (HH:MM:SS, playable ranges, mappings).
- CI signals: `yarn type-check`, `yarn test` green. E2E to be added later.

9. Rollout & Cleanup (M8) — DONE

- Removed legacy `SubtitleOverlay` and conditional flag path; Editor always uses MotionText overlay.
- Kept shared MotionText infra under `src/app/shared/motiontext/`; asset-store re-exports intact.
- Verified `yarn type-check` and unit tests pass.

## Risks & Mitigations

- Multiple VideoPlayer variants exist (`components/VideoPlayer.tsx` and `components/VideoPlayer/index.tsx`): target the folder `index.tsx` used by `VideoSection`.
- Resize/timing jitter: always `attachMedia`, debounce updates.
- Plugin registration order: call `configurePluginLoader()` before first render.
- Performance: preload only needed plugins; keep scenario structure stable.

## Notes & Debugging Log

- Exposed `getElement()` on `window.videoPlayer` and fixed TS types.
- Extended `useMotionTextRenderer` to expose `seek(time)` for video sync.
- Verified `yarn type-check` passes after changes.

## Acceptance Checklist

- Subtitles render via MotionText with chosen plugin.
- Sync with video time including scrubbing and rate changes; respects `showSubtitles`, `subtitleSize`, `subtitlePosition`.
- Deleted ranges skipped; no flicker at boundaries.
- Tests pass; no regressions in editor controls.
