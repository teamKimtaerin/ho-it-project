# Non-Destructive Cut Editor Architecture and Export Strategy

## Overview

- Designed as a **non-destructive** cut editor centered around a `timeline.json` file.
- The video player loads the original video unchanged, while edit information is only recorded in JSON.
- For final export, rendering is performed using a **frame-by-frame capture + encoding** strategy.

---

## System Architecture

### 1. Data Structure (timeline.json)

```json
{
  "clips": [
    { "src": "video1.mp4", "in": 10, "out": 20 },
    { "src": "video2.mp4", "in": 5, "out": 15 }
  ]
}
```

- `src`: source video path
- `in`: clip start time (seconds)
- `out`: clip end time (seconds)

### 2. Main Modules

- **Timeline Manager**: manages cut edit information (JSON)
- **Renderer**: synchronizes video and timeline using RVFC (requestVideoFrameCallback)
- **Export Engine**: performs frame-by-frame capture + encoding
- **Audio Processor**: synchronizes audio tracks to `in/out` ranges

---

## Workflow

### 1. Editing Process (Non-Destructive)

1. User trims or rearranges clips
2. Changes are reflected in `timeline.json`
3. Video Player references `timeline.json` only to control playback

### 2. Final Export (Frame-by-Frame)

1. **Load Timeline** → calculate `src`, `in/out` for each clip
2. **Prepare Renderer** → create VideoElement and register RVFC
3. **Frame Capture**
   ```ts
   video.requestVideoFrameCallback((now, metadata) => {
     ctx.drawImage(video, 0, 0, width, height)
     canvas.toBlob((blob) => encoder.encode(blob))
   })
   ```
4. **Encoding Pipeline**
   - Use WebCodecs API (`VideoEncoder`) or ffmpeg piping
   - Configure fps/codec/bitrate
5. **Audio Synchronization**
   - Cut each clip’s audio to `in/out` and merge
6. **Finalize Export** → flush encoder and save file

---

## Conclusion

- Editing stage is lightweight and JSON-based → **fast interaction**
