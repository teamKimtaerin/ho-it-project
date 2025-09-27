# MotionText V2 초기 시나리오 파이프라인 설계서

목표: 에디터 최초 로드 시(영상 + 음성분석 파일 로딩 직후), 애니메이션 없이 clipword(단어) 단위로 구성된 MotionText v2 시나리오를 생성한다. 이후 애니메이션이 적용될 때는 해당 word 노드를 id로 찾아 pluginChain을 갱신하는 증분 업데이트 방식을 사용한다.

## 입력/출력 정의

- 입력(편집기 상태)
  - Clips: `src/app/(route)/editor/types`의 `ClipItem[]`
    - 각 clip은 `words: { id, text, start, end }[]` (초 단위) 포함
    - clip(문장)의 발화 시간 = `[clipStart, clipEnd]`
      - 현재는 `timeline: MM:SS`, `duration: "N초"`에서 파싱 가능
  - 삭제 정보: `deletedClipIds: Set<string>` (시작 시 보통 비어있음)
  - 비디오 길이: `videoDuration` (초)
- 출력(MotionText v2)
  - RendererConfigV2
    - track: `editor`
    - cue: clip(문장) 단위 1개씩
    - root group: 문장 그룹, displayTime = 문장 발화 시간(조정 후)
    - children: word 단위 text 노드, displayTime = 해당 word 발화 시간(조정 후)
    - pluginChain: 초기엔 비어 있음(또는 생략)

## ID 스키마(불변, 업데이트 키)

- cue id: `cue-<clipId>`
- group id: `clip-<clipId>`
- word node id: `word-<wordId>`
  - 이후 애니메이션 적용/수정 시, 이 id로 노드를 탐색하여 pluginChain을 증분 갱신한다.

## 시간 매핑(조정/삭제 고려)

- 조정(Adjusted) 시간 = 삭제된 구간을 제거한 가상 타임라인 시간
- 변환 규칙
  - group displayTime = `[mapToAdjustedTime(clipStart), mapToAdjustedTime(clipEnd)]`
  - word displayTime = `[mapToAdjustedTime(word.start), mapToAdjustedTime(word.end)]`
- 사용 유틸: `src/utils/video/segmentManager.ts`
  - 초기엔 삭제가 없으므로 adjusted ≈ original, 이후 삭제 발생 시 재계산 가능

## 시나리오 생성 단계

1. 클립/단어 시간 파싱
   - `timeline: MM:SS` → `clipStartSec`
   - `duration: "N초"` → `clipEndSec = clipStartSec + N`
2. 조정 시간으로 매핑
   - `videoSegmentManager.initialize(clips, videoDuration)` 후 `mapToAdjustedTime()` 사용
3. v2 구조화
   - track: `{ id: 'editor', type: 'subtitle', layer: 1 }`
   - clip마다 cue 생성
     - cue.domLifetime = group.displayTime 와 동일(권장)
     - group(children: word nodes)
     - word 노드에 pluginChain은 넣지 않음(빈 상태)
4. 노드 인덱스 생성(빠른 업데이트를 위해)
   - `{ [nodeId: string]: { cueIndex: number, path: number[] } }` 등으로 트리 내 위치 캐싱
   - 저장 위치: 시나리오 상태 슬라이스(예: `scenarioSlice`) 또는 Overlay 내부 ref

## pluginChain과 baseTime/timeOffset 규칙(후속 적용)

- 초기 시나리오에는 애니메이션이 없으므로 pluginChain을 생성하지 않는다.
- word 노드에 애니메이션을 적용할 때:
  - baseTime = word 노드의 발화 구간(초) — node 수준 필드
  - timeOffset = 절대 초(권장)로 저장: `computeTimeOffsetSeconds(baseTime, absStartSec, absEndSec)`
    - 퍼센트로 스케일이 필요한 경우에만 `computeBaseTimeAndOffset` 사용

## 증분 업데이트 API(초안)

- 위치: 시나리오 전용 유틸/슬라이스 (예: `src/app/(route)/editor/utils/scenarioState.ts` or `store/slices/scenarioSlice.ts`)
- 인터페이스
  - `buildInitialScenarioFromClips(clips, videoDuration): { config, index }`
  - `applyAnimationToWord(wordId, pluginKey, params, timingAbsSec)`
    - index로 `word-<wordId>` 노드 조회 → pluginChain push
    - timingAbsSec(절대 초) → adjusted 초 → timeOffset 계산
    - `loadPluginManifest(pluginKey)` → `validateAndNormalizeParams()`로 params 보정
  - `updateWordTiming(wordId, startSec, endSec)`
    - word.displayTime 갱신
    - word.pluginChain 존재 시 baseTime/ timeOffset 재계산
  - `updateTrackTiming(wordId, trackIndex, startSec, endSec)`
  - `updateTrackParams(wordId, trackIndex, partialParams)`
  - `removeTrack(wordId, trackIndex)` / `clearTracks(wordId)`
- 모든 API는 불변 업데이트로 `config`를 갱신하고, Overlay는 구독하여 `loadScenario(config, { silent: true })` 수행

## Editor 통합 포인트

- 초기화
  - `transcriptionService.loadTranscriptionClips()` 완료 후
  - `videoSegmentManager.initialize(clips, videoDuration)`
  - `buildInitialScenarioFromClips()` 호출 → `config` 저장 → `EditorMotionTextOverlay`에 주입(`scenarioOverride` 경로 또는 전용 slice 구독)
- 이후
  - 애니메이션 선택/파형 편집/상세 패널 변경 시 → 상기 증분 API 호출 → 즉시 미리보기 반영

## 예시 구조 스니펫

```jsonc
{
  "version": "2.0",
  "pluginApiVersion": "3.0",
  "timebase": { "unit": "seconds" },
  "stage": { "baseAspect": "16:9" },
  "tracks": [ { "id": "editor", "type": "subtitle", "layer": 1 } ],
  "cues": [
    {
      "id": "cue-<clipId>",
      "track": "editor",
      "domLifetime": [clipStartAdj, clipEndAdj],
      "root": {
        "id": "clip-<clipId>",
        "eType": "group",
        "displayTime": [clipStartAdj, clipEndAdj],
        "layout": { "anchor": "bc", "position": { "x": 0.5, "y": 0.85 } },
        "children": [
          {
            "id": "word-<wordId>",
            "eType": "text",
            "text": "<token>",
            "displayTime": [wordStartAdj, wordEndAdj],
            "layout": { "anchor": "bc" }
            // pluginChain: []  // 애니메이션 적용 전이므로 생략/빈 배열
          }
        ]
      }
    }
  ]
}
```

## 수용 기준

- 초기 로드에서:
  - 시나리오가 clip(문장) 단위 group + word 단위 child 노드로 구성된다.
  - 모든 시간값은 adjusted 타임라인 기준으로 설정된다.
  - pluginChain은 비어 있다(애니메이션 없음).
- 애니메이션 적용/수정 시:
  - word 노드를 id(`word-<wordId>`)로 찾아 pluginChain을 증분 갱신한다.
  - baseTime은 word 노드의 발화 구간, timeOffset은 기본적으로 절대 초(필요 시 퍼센트 사용)
  - 파라미터는 manifest 기본값에서 시작하며 변경 시 즉시 반영된다.

## 오픈 이슈

- 대량 단어 성능: 초기 구성에서 child 노드가 많아질 수 있으므로, 가시 범위 기반 부분 생성/부분 갱신 전략 고려
- 텍스트 스타일/폰트 크기: 현재는 상위 group 또는 tracks.defaultStyle에 일괄 지정, 단어별 오버라이드 정책 확정 필요
- 단어 경계 화면 배치: 멀티라인 문장/자동 줄바꿈 요구 시 레이아웃 전략(줄바꿈 기준) 별도 정의 필요
