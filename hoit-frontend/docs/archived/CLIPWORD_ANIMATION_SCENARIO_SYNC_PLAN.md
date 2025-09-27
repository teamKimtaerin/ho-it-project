# Editor ClipWord → MotionText V2 시나리오 동기화 계획

목표: 에디터의 단어(clipword) 단위 애니메이션 상태를 MotionText v2 시나리오에 즉시 반영한다. 단어 더블클릭으로 열리는 사운드 웨이브에서 단어·애니메이션 타이밍을 조정하면 baseTime/timeOffset이 정확히 재계산되고, 애니메이션 상세 패널에서 파라미터를 수정하면 manifest.json 기본값을 기반으로 유효성 검증 후 적용·미리보기까지 연결한다.

## 범위/전제

- 대상 화면: `src/app/(route)/editor/page.tsx` 및 하위 구성요소
  - 비디오/렌더러: `src/app/(route)/editor/components/VideoSection.tsx`, `EditorMotionTextOverlay.tsx`, `VideoPlayer.tsx`
  - 파형 편집: `src/app/(route)/editor/components/ClipComponent/ExpandedClipWaveform.tsx`
  - 애니메이션 자산 UI: `src/app/(route)/editor/components/AnimationAssetSidebar/*`
  - 전역 상태: `src/app/(route)/editor/store/editorStore.ts` + `slices/*`
- 시나리오 스펙: MotionText v2 (`baseTime` + `timeOffset`), 플러그인 API v3.0
  - 시나리오/플러그인 유틸: `src/app/shared/motiontext/utils/scenarioGenerator.ts`, `pluginLoader.ts`
  - 플러그인 서버: `NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN` (기본 `http://localhost:3300`)
- 애니메이션은 “단어(clipword) 단위”로 적용, 단어마다 최대 3개 트랙을 순서대로 pluginChain에 삽입.

## 데이터 모델 변경

- 파일: `src/app/(route)/editor/store/slices/wordSlice.ts`
  - AnimationTrack 확장:
    - 현재: `{ assetId, assetName, timing: {start,end}, intensity, color }`
    - 추가: `{ pluginKey: string; params: Record<string, unknown>; manifest?: { name: string; version: string } }`
      - pluginKey: `public/asset-store/assets-database.json`의 `pluginKey` (예: `elastic@2.0.0`)
      - params: manifest.json의 기본값을 로드하여 초기화, 이후 상세 패널에서 업데이트
  - 액션 추가/확장:
    - `initializeAnimationTrackParams(wordId, assetId)` → pluginKey 조회 → `loadPluginManifest()` → `getDefaultParameters()`로 params 채움
    - `updateAnimationTrackParams(wordId, assetId, partialParams)` → 병합 저장 (적용 전 `validateAndNormalizeParams`)
    - 필요 시 `reorderAnimationTracks(wordId, from, to)` (향후)

## 애셋 레지스트리/플러그인 매니페스트

- 애셋 레지스트리 유틸(간단 캐시): `public/asset-store/assets-database.json` 로드 → `{ [assetId]: { pluginKey, title } }` 맵 구성
  - 접근 지점: `AssetGrid.tsx`, `UsedAssetsStrip.tsx`에서 이미 동일 JSON을 fetch함
  - 공용 유틸로 분리하여 store 액션/Overlay에서 재사용 (중복 fetch 방지)
- 매니페스트 로딩: `loadPluginManifest(pluginKey, { mode: 'server', serverBase })`
  - 기본 파라미터: `getDefaultParameters(manifest)`
  - 파라미터 검증: `validateAndNormalizeParams(params, manifest)`

## 시나리오 V2 매핑(핵심)

- 구현 파일: `src/app/(route)/editor/components/EditorMotionTextOverlay.tsx`
  - 기존 `buildScenarioFromClips()`는 클립 단위 텍스트 1개를 생성. 변경: “단어 단위 텍스트 노드” 생성 구조로 확장.
  - 각 clip에 대해 1 cue 유지, `root.children`에 단어별 텍스트 노드 나열:
    - word displayTime = `[wordStartAdj, wordEndAdj]` (원본 초 → `videoSegmentManager.mapToAdjustedTime()`로 보정)
    - baseTime = displayTime
    - timeOffset = UI가 제공하는 절대 초 기반 사용 권장(향후 편집 안정성)
      - `computeTimeOffsetSeconds(baseTime, absStartSec, absEndSec)` 사용
      - 퍼센트가 필요할 때만 `computeBaseTimeAndOffset`으로 변환(옵션)
    - pluginChain = `wordAnimationTracks`의 배열 순서 그대로
      - `name`: manifest.name (또는 pluginKey의 base 이름),
      - `params`: 트랙의 `params` (없으면 manifest 기본값),
      - `baseTime`, `timeOffset`: 위 계산값 적용
    - 텍스트 내용은 `word.text` (단어 단위), 스타일은 track 유무와 무관하게 트랙 기본 스타일 상위에서 지정 가능
  - 삭제 클립은 제외(`deletedClipIds`), 자막 위치/크기 설정은 현행 로직 유지

## 파형(더블클릭) 편집 동작 연결

- 파일: `src/app/(route)/editor/components/ClipComponent/ExpandedClipWaveform.tsx`
  - 단어 더블클릭 시 열림. 현재 지원:
    - 단어 타이밍 조정 → `wordTimingAdjustments`에 절대 초 저장
    - 애니메이션 트랙 바(최대 3) 생성/이동/리사이즈 → `updateAnimationTrackTiming(wordId, assetId, startSec, endSec)`로 절대 초 저장
  - 시나리오 반영 규칙:
    - baseTime: 단어 타이밍(조정값이 있으면 그 값, 없으면 원본 `word.start/end`)의 adjusted 초를 사용
    - timeOffset: 트랙 타이밍(절대 초 → adjusted 초)과 baseTime의 차이를 퍼센트로 환산
  - 결과: 사용자가 바를 움직이면 store 값이 변경되고, Overlay가 해당 변경을 구독해 시나리오를 재생성/로딩

## 애니메이션 상세 조절(파라미터) 패널

- 우선 구현 위치: `src/app/(route)/editor/components/AnimationAssetSidebar/AssetControlPanel.tsx` 확장 또는 별도 패널 추가
- 열기 트리거: `UsedAssetsStrip`에서 확장 토글 또는 워드 포커스 시 트랙 라벨 클릭
- 동작:
  1. 패널 오픈 시 해당 트랙의 `pluginKey`로 `loadPluginManifest()` 호출(캐시) → `schema` 기반 컨트롤 렌더
  2. 현재 트랙 `params` 없으면 manifest 기본값으로 `initializeAnimationTrackParams()` 실행
  3. 컨트롤 변경 시 `updateAnimationTrackParams()` → 즉시 `validateAndNormalizeParams()` 후 저장
  4. Overlay는 store 변경을 감지하여 시나리오 재생성 및 `loadScenario({ silent: true })`

## Overlay 재생성 트리거/디바운스

- 파일: `EditorMotionTextOverlay.tsx`
  - 현재 의존성: `clips`, `deletedClipIds`, `showSubtitles` 등
  - 추가 의존성: `wordAnimationTracks`, `wordTimingAdjustments`, (선택) `focusedWordId`
  - 디바운스: 기존 120ms 유지, 파형 드래그 중에는 과도한 갱신 방지(드래그 종료에서 한 번 강제 로드)

## 플러그인 로딩/사전 준비

- 파일: `src/app/shared/motiontext/utils/pluginLoader.ts`
  - `configurePluginSource({ mode: 'server', serverBase })` 사용 (이미 적용)
  - `preloadPluginsForScenario()`는 scenario 생성 직후 필요한 플러그인 사전 로딩
  - Asset → pluginKey → manifest → params 흐름이 정상 동작하도록 서버 기반 URL 구성 유지

## 테스트/검증

- 유닛 테스트: `computeBaseTimeAndOffset()` 정상화 (경계값/음수/초과 퍼센트 클램프)
- 시나리오 생성 스냅샷:
  - 단어 1개, 트랙 2개(시간 겹침/비겹침) → pluginChain 순서, baseTime/timeOffset 기대치 비교
  - 단어 타이밍/트랙 타이밍 조합 변경 시 시나리오 재계산 결과 확인
- 통합 검증: 파형에서 트랙 바 이동 → Overlay 미리보기 타이밍 변화 시각 확인(수동)

## 마일스톤

1. 모델 확장: AnimationTrack에 `pluginKey/params` 추가, 액션 정의
2. 애셋 레지스트리 유틸 추가(AssetId→pluginKey 매핑), 매니페스트 로더 결합
3. 파라미터 초기화/업데이트 흐름 구현(`validateAndNormalizeParams` 포함)
4. 시나리오 빌더 변경: 단어 단위 텍스트 노드 + pluginChain 매핑 + 시간 보정
5. Overlay 의존성 추가와 디바운스/드래그 종료 강제 로드 처리
6. 파형/사이드패널 UI 연결: 트랙 타이밍/파라미터 조절 이벤트 → store 반영
7. 테스트/성능 점검(대량 단어/트랙), 필요 시 파셜 리빌드 또는 가시 범위 최적화

## 수용 기준 (Acceptance)

- 단어에 애니메이션을 추가하면, preview에 해당 단어 구간에서 애니 효과가 보인다.
- 파형에서 단어 구간을 조정하면 preview의 단어 표시 타이밍(baseTime)이 즉시 반영된다.
- 파형에서 트랙 바를 이동/리사이즈하면 해당 애니메이션 효과 구간(timeOffset)이 즉시 반영된다.
- 애니메이션 상세 패널에서 파라미터를 수정하면 즉시 preview에 반영된다(매니페스트 기본값/검증 포함).
- 같은 단어의 여러 트랙은 순서대로 pluginChain에 반영된다.

## 오픈 이슈/결정 사항

- 성능: 단어 수가 많은 경우 cue/child 노드 수 증가 → 필요 시 “현재 표시 중 클립”만 시나리오에 포함 또는 가시 범위 가변 생성 고려
- 트랙 재정렬 UI: 현재는 추가 순서 우선, 향후 드래그로 순서 변경 필요 시 `reorderAnimationTracks()` 추가
- 플러그인 이름: `pluginKey` vs `manifest.name` 중 무엇을 `pluginChain.name`에 둘지 → 원칙적으로 `manifest.name` 사용
- 단어 구간 조정 시, 트랙 타이밍의 “상대 유지” vs “절대 유지” 전략: 현재 계획은 절대 초를 저장하고 시나리오 빌드 시 상대 퍼센트로 환산
