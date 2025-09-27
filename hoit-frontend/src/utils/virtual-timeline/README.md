# ECG Virtual Timeline System

RVFC 기반 비파괴 편집을 위한 완전한 Virtual Timeline 시스템입니다. 기존 ECG Editor의 cut edit 시스템을 프레임 단위 정밀도로 업그레이드하고, 최종 export를 위한 frame-by-frame capture를 지원합니다.

## 📋 시스템 개요

### 아키텍처

```
React Components ──▶ VirtualTimelineSlice (Zustand)
                              │
                              ▼
                    VirtualPlayerController
                    ├─ RVFC Engine
                    ├─ Virtual/Real time mapping
                    └─ Frame-precise synchronization
                              │
                              ▼
                    ┌─ VirtualSubtitleRenderer ─┐
                    │  ├─ Frame-based subtitle   │
                    │  ├─ Word-level timing     │
                    │  └─ Animation integration │
                    └─────────────────────────────┘
                              │
                              ▼
                    VirtualTimelineExporter
                    ├─ timeline.json generation
                    ├─ Frame-by-frame capture
                    └─ WebCodecs encoding
```

### 핵심 특징

- **RVFC 기반**: `requestVideoFrameCallback`을 사용한 프레임 단위 정밀 동기화
- **비파괴 편집**: 원본 비디오는 변경하지 않고 편집 정보만 JSON으로 관리
- **Cut Edit 통합**: 기존 split, delete, move 작업을 Virtual Timeline으로 통합
- **Frame-by-Frame Export**: WebCodecs API를 활용한 픽셀 단위 정확한 export
- **Plugin 호환**: 기존 animation plugin 시스템과 완전 호환

## 🚀 기본 사용법

### 1. 시스템 초기화

```typescript
import { createVirtualTimelineSystem } from '@/utils/virtual-timeline'

// 전체 시스템 생성
const virtualTimelineSystem = createVirtualTimelineSystem({
  enableFramePrecision: true,
  frameRate: 30,
  debugMode: process.env.NODE_ENV === 'development',
})

// 클립 데이터로 초기화
virtualTimelineSystem.initialize(clips)

// Video element 연결
virtualTimelineSystem.attachVideo(videoElement)
```

### 2. Zustand Store와 통합

```typescript
// editorStore.ts에 VirtualTimelineSlice 추가
import {
  createVirtualTimelineSlice,
  VirtualTimelineSlice,
} from '@/utils/virtual-timeline'

export interface EditorStore
  extends ClipSlice,
    SelectionSlice,
    UISlice,
    SaveSlice,
    VirtualTimelineSlice, // 새로 추가
    WordSlice {}

export const useEditorStore = create<EditorStore>()(
  immer((...a) => ({
    ...createClipSlice(...a),
    ...createSelectionSlice(...a),
    ...createUISlice(...a),
    ...createSaveSlice(...a),
    ...createVirtualTimelineSlice(...a), // 새로 추가
    ...createWordSlice(...a),
  }))
)
```

### 3. React Component에서 사용

```typescript
// VideoPlayer Component
import { useEditorStore } from '@/app/(route)/editor/store/editorStore'

export function VideoPlayer({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement> }) {
  const {
    attachVideoElement,
    play,
    pause,
    seek,
    currentVirtualTime,
    isPlaying
  } = useEditorStore()

  useEffect(() => {
    if (videoRef.current) {
      attachVideoElement(videoRef.current)
    }

    return () => {
      detachVideoElement()
    }
  }, [videoRef.current])

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        className="w-full h-full"
      />
      <div className="controls">
        <button onClick={isPlaying ? pause : play}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <span>Virtual Time: {currentVirtualTime.toFixed(3)}s</span>
      </div>
    </div>
  )
}
```

### 4. 자막 렌더링

```typescript
// VirtualSubtitleOverlay Component
import { useEditorStore } from '@/app/(route)/editor/store/editorStore'

export function VirtualSubtitleOverlay() {
  const [currentSubtitle, setCurrentSubtitle] = useState<VirtualSubtitleData | null>(null)
  const { virtualPlayer } = useEditorStore()

  useEffect(() => {
    if (!virtualPlayer?.subtitleRenderer) return

    const cleanup = virtualPlayer.subtitleRenderer.onSubtitleUpdate(setCurrentSubtitle)
    return cleanup
  }, [virtualPlayer])

  if (!currentSubtitle) return null

  return (
    <div className="subtitle-overlay">
      <div
        className="subtitle-text"
        style={{ opacity: currentSubtitle.opacity }}
      >
        {currentSubtitle.words.map(word => (
          <span
            key={word.id}
            className={`subtitle-word ${word.isActive ? 'active' : ''}`}
          >
            {word.text}
          </span>
        ))}
      </div>
    </div>
  )
}
```

## 🔧 기존 시스템과의 통합

### 1. Cut Edit 작업 마이그레이션

기존 cut edit 작업들을 Virtual Timeline 시스템으로 마이그레이션:

```typescript
// 기존 clipSlice의 splitClip -> Virtual Timeline
const { splitClip: virtualSplitClip } = useEditorStore()

// 클립 분할
const [firstClipId, secondClipId] = virtualSplitClip(clipId, virtualTime)

// 클립 삭제
const { deleteClip: virtualDeleteClip } = useEditorStore()
virtualDeleteClip(clipId)

// 클립 순서 변경
const { reorderClips: virtualReorderClips } = useEditorStore()
virtualReorderClips(newOrder)
```

### 2. Word-level 편집 통합

```typescript
// 기존 word drag & drop과 통합
const { moveWordBetweenClips } = useEditorStore()

function handleWordDrop(
  wordId: string,
  sourceClipId: string,
  targetClipId: string,
  position: number
) {
  // Virtual Timeline에서 자동으로 timing 재계산됨
  moveWordBetweenClips(wordId, sourceClipId, targetClipId, position)
}
```

### 3. Animation Plugin 통합

```typescript
// 기존 plugin system과 연동
const { virtualPlayer } = useEditorStore()

function applyAnimation(
  clipId: string,
  pluginName: string,
  parameters: object
) {
  if (virtualPlayer?.subtitleRenderer) {
    virtualPlayer.subtitleRenderer.setAnimation(clipId, pluginName, parameters)
  }
}
```

## 📤 Export 시스템

### Timeline JSON Export

```typescript
import { VirtualTimelineExporter } from '@/utils/virtual-timeline'

const exporter = new VirtualTimelineExporter(
  timelineManager,
  timelineMapper,
  config
)

// timeline.json 생성
const timelineJSON = exporter.exportTimelineJSON()
console.log('Timeline JSON:', timelineJSON)
```

### Frame-by-Frame Video Export

```typescript
// 진행 상태 모니터링
exporter.onProgress((progress) => {
  console.log(`Export progress: ${progress.progress}% - ${progress.message}`)
})

// 비디오 export 실행
const exportConfig = {
  frameRate: 30,
  videoCodec: 'avc1.42E01E',
  audioCodec: 'mp4a.40.2',
  videoBitrate: 2000000,
  audioBitrate: 128000,
  resolution: { width: 1920, height: 1080 },
  includeSubtitles: true,
  includeEffects: true,
  outputFormat: 'mp4' as const,
}

await exporter.exportVideo(exportConfig, 'output.mp4', videoElement)
```

## 🎨 Animation Plugin 시스템 업데이트

기존 plugin들을 Virtual Timeline과 연동하려면:

### Plugin Manifest 업데이트

```json
{
  "name": "elastic",
  "version": "1.0.0",
  "pluginApi": "2.1",
  "virtualTimelineSupport": true, // 새로 추가
  "frameCallback": true, // RVFC 콜백 지원
  "schema": {
    // 기존 parameters...
  }
}
```

### Plugin Implementation 업데이트

```javascript
// public/plugin/elastic@1.0.0/index.mjs
export default function createElasticPlugin(parameters) {
  return {
    // 기존 implementation...

    // Virtual Timeline 지원을 위한 frame callback
    onVirtualFrame(frameData) {
      const { virtualTime, activeSegments } = frameData
      // Virtual time 기반 애니메이션 로직
    },

    // Frame-by-frame export 지원
    renderToCanvas(ctx, frameData, parameters) {
      // Canvas에 직접 렌더링하는 로직
    },
  }
}
```

## 🔍 디버깅 및 모니터링

### Debug Mode 활성화

```typescript
const { updateConfig, getDebugInfo } = useEditorStore()

// 디버그 모드 활성화
updateConfig({ debugMode: true })

// 디버그 정보 확인
console.log('Virtual Timeline Debug Info:', getDebugInfo())
```

### Performance 모니터링

```typescript
// RVFC 프레임 레이트 모니터링
let frameCount = 0
let lastTime = Date.now()

virtualPlayer.onFrame((frameData) => {
  frameCount++
  const now = Date.now()

  if (now - lastTime >= 1000) {
    console.log(`RVFC Frame Rate: ${frameCount} fps`)
    frameCount = 0
    lastTime = now
  }
})
```

## ⚠️ 마이그레이션 주의사항

### 1. 기존 timelineSlice 대체

기존 `timelineSlice.ts`와 `mediaSlice.ts`를 `virtualTimelineSlice.ts`로 완전 대체:

```typescript
// 기존 코드 (제거 예정)
const { timeline, currentTime, isPlaying } = useEditorStore()

// 새 코드
const {
  timeline: virtualTimeline,
  currentVirtualTime,
  isPlaying,
} = useEditorStore()
```

### 2. Time 기준 변경

모든 시간 계산을 Virtual Time 기준으로 변경:

```typescript
// 기존: Real time 기준
const activeClip = clips.find(
  (clip) => realTime >= clip.startTime && realTime <= clip.endTime
)

// 새: Virtual time 기준 + mapping
const mapping = virtualToReal(virtualTime)
if (mapping.isValid) {
  const activeSegments = getActiveSegments(virtualTime)
}
```

### 3. Export 시스템 교체

기존 export 로직을 Virtual Timeline Exporter로 교체:

```typescript
// 기존 export (제거 예정)
function exportVideo() {
  // 기존 export 로직
}

// 새 export
function exportVideo() {
  const exporter = new VirtualTimelineExporter(
    timelineManager,
    timelineMapper,
    config
  )
  return exporter.exportVideo(exportConfig, outputPath, videoElement)
}
```

## 🧪 테스트 가이드

### Unit Tests

```typescript
// VirtualTimelineManager.test.ts
import { VirtualTimelineManager } from '@/utils/virtual-timeline'

describe('VirtualTimelineManager', () => {
  it('should initialize timeline from clips', () => {
    const manager = new VirtualTimelineManager()
    manager.initializeFromClips(mockClips)

    const timeline = manager.getTimeline()
    expect(timeline.segments).toHaveLength(mockClips.length)
  })

  it('should handle virtual to real time mapping', () => {
    const mapping = manager.virtualToReal(30.5)
    expect(mapping.isValid).toBe(true)
    expect(mapping.realTime).toBeGreaterThan(0)
  })
})
```

### Integration Tests

```typescript
// VirtualTimeline.integration.test.ts
describe('Virtual Timeline Integration', () => {
  it('should sync video playback with virtual timeline', async () => {
    const system = createVirtualTimelineSystem()
    system.initialize(mockClips)

    const mockVideo = createMockVideoElement()
    system.attachVideo(mockVideo)

    await system.virtualPlayer.play()

    // RVFC 콜백이 정상 작동하는지 확인
    expect(mockVideo.currentTime).toBeGreaterThan(0)
  })
})
```

## 📈 성능 최적화

### 1. Frame Rate 최적화

```typescript
// 높은 프레임률에서 성능 최적화
const config = {
  enableFramePrecision: true,
  frameRate: 60,
  bufferSize: 5, // 작은 버퍼로 메모리 절약
  syncThreshold: 8.33, // 120fps 임계값
}
```

### 2. Memory Management

```typescript
// 컴포넌트 언마운트 시 리소스 정리
useEffect(() => {
  return () => {
    virtualTimelineSystem.cleanup()
  }
}, [])
```

이 Virtual Timeline 시스템은 ECG Editor의 편집 정밀도를 프레임 단위로 향상시키고, 완전한 비파괴 편집 워크플로우를 제공합니다. 기존 시스템과의 호환성을 유지하면서도 최신 웹 기술(RVFC, WebCodecs)을 활용하여 전문적인 비디오 편집 경험을 제공합니다.
