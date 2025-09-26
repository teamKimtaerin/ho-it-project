# 진행 현황: Editor ClipWord ↔ MotionText v2 동기화

작성일: 2025-09-15

## 개요

- 초기 로드 파이프라인: 영상/전사 로드 직후, 애니메이션 없는 v2 시나리오를 단어(clipword) 단위로 생성하고 렌더러에 로드
- 증분 갱신: 단어/트랙 편집(사운드 웨이브·애셋 사이드바) → 시나리오의 해당 word 노드를 id로 찾아 pluginChain을 갱신 → 렌더러 즉시 반영
- 시간 체계: group.displayTime = 문장(clip) 발화 구간, word 노드 baseTime = 단어 발화 구간, timeOffset은 “절대 초”로 기록

## 핵심 결정

- baseTime의 위치: node-level 필드 (displayTime, pluginChain과 같은 계층)
  - 참고 스펙: motiontext-renderer v2 시나리오 스펙 (예: `context/scenario-json-spec-v-2-0.md`)
- displayTime 상속: 단어 노드는 displayTime을 지정하지 않고 group.displayTime을 상속하여 문장 구간 내내 텍스트 흰색 노출
- timeOffset 단위: “숫자(초)” 사용(권장). 퍼센트는 옵션.
  - 사유: 사운드 웨이브가 절대시간을 반환하며, 향후 단어 이동/컷/발화시간 변경 시 의도 보존이 용이

## 구현 요약

1. 초기 시나리오 생성

- 파일: `src/app/(route)/editor/utils/initialScenario.ts`
- 기능:
  - 각 clip → 1 cue, cue.root(eType=group). displayTime = 문장(clip) 발화 구간(삭제 반영 adjusted time)
  - children: 단어별 text 노드 생성. 각 단어 노드에 `baseTime: [start, end]` 저장. pluginChain 없음.
  - ID 스키마: cue-<clipId>, clip-<clipId>, word-<wordId>
  - 노드 인덱스 반환: `{ [nodeId]: { cueIndex, path } }` (증분 갱신용)

2. 시나리오 상태 슬라이스

- 파일: `src/app/(route)/editor/store/slices/scenarioSlice.ts`
- 상태: `currentScenario`, `nodeIndex`, `scenarioVersion`
- 액션:
  - `buildInitialScenario(clips, opts)` → 초기 시나리오 + 인덱스 생성/저장
  - `updateWordBaseTime(wordId, startAbsSec, endAbsSec)` → 해당 word 노드 `baseTime` 갱신(절대초→adjusted 변환 포함) 후 pluginChain 재계산
  - `refreshWordPluginChain(wordId)` → `wordAnimationTracks` 읽어 pluginChain 재구성(name, params, baseTime, timeOffset[초])

3. 렌더러(오버레이) 연동

- 파일: `src/app/(route)/editor/components/EditorMotionTextOverlay.tsx`
- 초기 로드 시:
  - `scenarioSlice.currentScenario`가 있으면 사용, 없으면 `buildInitialScenarioFromClips()`로 생성 후 저장
  - 외부 시나리오 옵션(`?scenario=1`, `?scenario=real`)은 기존 로직 유지
- 구독: `scenarioVersion` 변화 시 debounced로 `loadScenario(config, { silent: true })`

4. 사운드 웨이브 UI ↔ 시나리오 동기화

- 파일: `src/app/(route)/editor/components/ClipComponent/ExpandedClipWaveform.tsx`
- 동작:
  - 단어 바(start/end) 드래그: `updateWordTiming` + `updateWordBaseTime` + `refreshWordPluginChain`
  - 트랙 바(start/end/move) 조정: `updateAnimationTrackTiming` + `refreshWordPluginChain`
  - Undo/Redo 시에도 `updateWordBaseTime` + `refreshWordPluginChain`

5. 애셋 사이드바 ↔ 시나리오 동기화

- 파일: `src/app/(route)/editor/components/AnimationAssetSidebar/{AssetGrid,UsedAssetsStrip,index}.tsx`
- 변경:
  - `AssetItem`에 `pluginKey` 추가(assets JSON의 `pluginKey` 전달)
  - 애니메이션 추가/제거: `addAnimationTrack(..., pluginKey?)`/`removeAnimationTrack` 호출 후 `refreshWordPluginChain`
  - 상세 설정 패널: `onSettingsChange` → `updateAnimationTrackParams` → `refreshWordPluginChain`

6. 타입/유틸 보강

- 파일: `src/app/shared/motiontext/utils/scenarioGenerator.ts`
  - `V2NodeBase`에 `baseTime?: [number, number]` 추가
  - `computeTimeOffsetSeconds(baseTime, absStartSec, absEndSec)` 추가(초 단위 timeOffset 반환)

## 주요 경로(테스트 동선)

1. 에디터 로드 → 문장 group 하위에 단어 텍스트가 흰색으로 표시(애니메이션 없음)
2. 우측 애셋에서 단어 선택 후 애니메이션 추가 → 해당 단어에 pluginChain 생성되어 재생
3. 사운드 웨이브에서
   - 단어 타이밍 바 드래그 → 노드 baseTime 갱신 → pluginChain 오프셋(초) 재계산
   - 트랙 바(start/end/move) 조정 → timeOffset(초) 재계산
4. 상세 설정 변경 → track.params 갱신 → 미리보기 즉시 반영

## 변경 파일 목록

- 초기 빌더: `src/app/(route)/editor/utils/initialScenario.ts`
- 시나리오 슬라이스: `src/app/(route)/editor/store/slices/scenarioSlice.ts`
- 스토어 통합: `src/app/(route)/editor/store/editorStore.ts`
- 오버레이: `src/app/(route)/editor/components/EditorMotionTextOverlay.tsx`
- 파형 UI: `src/app/(route)/editor/components/ClipComponent/ExpandedClipWaveform.tsx`
- 애셋 UI: `src/app/(route)/editor/components/AnimationAssetSidebar/{AssetGrid,UsedAssetsStrip,AssetCard,index}.tsx`
- 타입/유틸: `src/app/shared/motiontext/utils/scenarioGenerator.ts`
- 계획/스펙 문서: `MOTIONTEXT_INITIAL_SCENARIO_PIPELINE.md`, `CLIPWORD_ANIMATION_SCENARIO_SYNC_PLAN.md`

## 설계/규칙 재확인

- baseTime은 node-level 필드(단어 발화 구간)
- displayTime은 group에서 상속(문장 구간)
- timeOffset은 기본적으로 “초”로 기록(퍼센트는 옵션)
- pluginChain.name은 `pluginKey`의 베이스 이름(버전 제거)을 사용
- 모든 시간은 삭제 구간 반영(adjusted) 후 기록

## 남은 작업(우선순위 순)

1. 매니페스트 기반 파라미터 기본값/검증
   - `loadPluginManifest(pluginKey)` + `getDefaultParameters` + `validateAndNormalizeParams` 적용, 트랙 추가 시 초기 params 주입
2. 성능 최적화
   - 대량 단어/트랙 시 부분 리빌드(표시 범위 기반) & 렌더 빈도 제한
3. 예외 처리/로깅
   - 시나리오 로딩 실패시 복구, 플러그인 로딩 실패시 graceful degrade
4. 이름 정합성
   - plugin 등록명과 scenario의 `name` 일치 보장 및 맵핑 유틸(필요 시)

## 참고 문서

- v2 시나리오 스펙: `motiontext-renderer/context/scenario-json-spec-v-2-0.md`
- 프로젝트 내 문서: `MOTIONTEXT_INITIAL_SCENARIO_PIPELINE.md`, `CLIPWORD_ANIMATION_SCENARIO_SYNC_PLAN.md`
