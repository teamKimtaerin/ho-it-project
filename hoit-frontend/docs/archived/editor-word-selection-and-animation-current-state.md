# 에디터 글자 선택/멀티선택 & 애니메이션 적용/삭제 — 현재 상태 분석

본 문서는 에디터에서 “글자(Word)” 단위 선택/멀티선택 및 애니메이션 적용/삭제 흐름의 현재 구현을 정리한 것입니다. 문제 지점과 불일치를 가시화하여 차기 리디자인의 기준점으로 삼습니다.

## 요약

- 선택 상태가 다원화되어 있습니다: 단일 포커스, 그룹 선택(드래그), 멀티선택(토글/범위), UI용 선택이 공존합니다.
- 애니메이션은 `wordAnimationTracks`(스토어) ↔ 단어 내 `animationTracks`/`appliedAssets`(클립 데이터) ↔ UI 표시 상태의 3계층으로 동기화됩니다.
- 멀티선택 상태에서 에셋 그리드는 “토글 일괄 적용/해제”를 수행하지만, 사용중 에셋 스트립은 단일 타깃만 조작합니다.
- 단일 추가(비동기)는 플러그인 `timeOffset`을 반영하지만, 멀티 토글은 반영하지 않습니다(중요 불일치).

## 핵심 상태 모델

- 단어 선택/포커스/그룹/편집(WordSlice)
  - `focusedWordId`, `focusedClipId`, `groupedWordIds`, `editingWordId` 등: `src/app/(route)/editor/store/slices/wordSlice.ts:1`
  - 멀티선택: `multiSelectedWordIds`, `multiSelectedClipIds`, `lastSelectedWordId`, `lastSelectedClipId`
  - 애니메이션 트랙: `wordAnimationTracks: Map<string, AnimationTrack[]>`
- 클립 선택(체크/포커스) (SelectionSlice)
  - `selectedClipIds`, `activeClipId`: `src/app/(route)/editor/store/slices/selectionSlice.ts:1`
- UI 전용(우측 사이드바/에셋 선택 표시 등) (UISlice)
  - `selectedWordId`, `currentWordAssets`, `selectedWordAssets`: `src/app/(route)/editor/store/slices/uiSlice.ts:1`
- 클립/단어 데이터(ClipSlice)
  - 단어 내 상태 미러링: `appliedAssets`, `animationTracks`
  - 적용/동기화 함수: `applyAssetsToWord`, `updateWordAnimationTracks`: `src/app/(route)/editor/store/slices/clipSlice.ts:1`
- 렌더러/시나리오
  - 오버레이는 `wordAnimationTracks` 기반으로 Scenario V2 구성: `src/app/(route)/editor/components/EditorMotionTextOverlay.tsx:1`, `src/app/(route)/editor/utils/initialScenario.ts:1`
  - 플러그인 `timeOffset`은 DOM lifetime 조정에 사용됨: `initialScenario.ts:20`

## 상호작용 흐름 (Words)

- 단일 클릭: 포커스 및 파형 확장
  - `ClipWord` 단일 클릭 시 멀티선택을 해제하고 마지막 선택 기준 갱신 후 상위의 `onWordClick` 수행: `src/app/(route)/editor/components/ClipComponent/ClipWord.tsx:94`
  - 상위 `ClipWords`는 포커스/활성 클립/선택된 단어/현재 에셋 UI 상태를 세팅하고, 파형을 확장: `src/app/(route)/editor/components/ClipComponent/ClipWords.tsx:118`
- 더블 클릭: 인라인 편집 진입
  - 포커스된 동일 단어를 300ms 내 더블 클릭 시 `startInlineEdit`: `ClipWord.tsx:86`
- Ctrl/Cmd+클릭: 멀티선택 토글
  - `toggleMultiSelectWord(clipId, wordId)`: 선택/해제 및 포커스 이동, lastSelected 갱신: `wordSlice.ts:900`
- Shift+클릭: 범위 선택(클립 간 가능)
  - `selectWordRange(toClipId, toWordId)`: 이전 기준(`lastSelected*`)부터 범위 계산 후 멀티선택 세트 갱신: `wordSlice.ts:820`
- 그룹 선택(드래그)
  - 단어 양 끝 영역 드래그로 `groupedWordIds` 구성(드래그/재배치용): `src/app/(route)/editor/hooks/useWordGrouping.ts:1`
  - 그룹은 드래그 권한/피드백에 사용되며 멀티선택 세트와 별개임.

## 시각적 상태(Word 셀)

- 포커스: 검정 배경, 흰 글자
- 멀티선택: 파란 배경, 흰 글자
- 그룹: 검정 배경, 흰 글자
- 편집: 노란 배경(클래스 오타 `bg-yel` 존재)
- 참조: `ClipWord.tsx:145`

## 애니메이션 적용/삭제 흐름

- 단일 단어 적용(에셋 카드 클릭)
  - 타깃 단어 결정: `focusedWordId` → `selectedWordId` → 멀티선택 단일 케이스: `AssetGrid.tsx:145`
  - 없으면 추가: `addAnimationTrackAsync`(플러그인 `timeOffset` 동기 취득) → `addAnimationTrack`: `AssetGrid.tsx:167`, `wordSlice.ts:744`
  - 있으면 제거: `removeAnimationTrack`: `AssetGrid.tsx:161`, `wordSlice.ts:540`
  - 단어 내부 미러링 및 시나리오 플러그인 체인 갱신: `applyAssetsToWord`, `updateWordAnimationTracks`, `refreshWordPluginChain`: `wordSlice.ts` 전반
- 멀티선택 적용(에셋 카드 클릭)
  - `toggleAnimationForWords(wordIds, asset)`: 각 단어별 토글(있으면 제거, 없으면 추가) 후 색상 재배치, 미러링, 시나리오 갱신: `wordSlice.ts:700`
  - 주의: 여기서는 `timeOffset` 처리 없음(중요). 단일 추가 경로만 `getPluginTimeOffset`을 사용: `wordSlice.ts:736`
- 사용중 에셋 스트립(삭제/토글)
  - 타깃: `focusedWordId` 혹은 `selectedWordId`, 멀티선택 단일 케이스만 고려: `UsedAssetsStrip.tsx:128`
  - 삭제 버튼 → 해당 단어에서만 `removeAnimationTrack` 수행: `UsedAssetsStrip.tsx:166`
  - 카드 클릭 → 해당 단어에 add/remove 후 컨트롤 패널 토글: `UsedAssetsStrip.tsx:186`

## 단어 삭제(컨텐츠 레벨)

- Delete/Backspace 키에서 멀티선택이 “2개 이상”일 때만 동작: `src/app/(route)/editor/page.tsx:1490`
- `deleteSelectedWords`: 선택된 단어를 각 클립에서 제거 후 `fullText`/`subtitle` 재구성, 선택 상태 초기화: `wordSlice.ts:948`

## 데이터 동기화 레이어

- 스토어: `wordAnimationTracks`(단어별 트랙)
- 클립 데이터: `word.animationTracks`(상세), `word.appliedAssets`(간략)
- UI: `currentWordAssets`/`selectedWordAssets`(선택 표시)
- 일괄 동기화 포인트: `applyAssetsToWord`, `updateWordAnimationTracks`, `refreshWordPluginChain`

## 현재 문제/불일치 정리

- 선택 개념의 분산과 중복
  - 포커스(`focusedWordId`), 멀티선택(`multiSelectedWordIds`), 그룹(`groupedWordIds`), UI 선택(`selectedWordId`)이 공존하며, 각 컴포넌트가 상이한 우선순위로 이를 참조.
  - 멀티선택 토글 시에도 포커스를 이동시켜 사이드바/오버레이 상태가 예상치 않게 변동될 수 있음: `wordSlice.ts:935`.
- 그룹 선택 vs 멀티선택의 역할 분리
  - 그룹은 드래그 전용으로 보이며, 에셋 적용/삭제 등 기능과 직접 연결되지 않음. 사용자 입장에서는 “여러 개 선택”이 일관되지 않게 느껴질 수 있음.
- 멀티선택 애니메이션 “토글”의 의미
  - 일부 단어에는 적용되고 일부에는 해제되는 토글 동작은 일괄 “적용”/“해제” 의도와 다를 수 있음. 명시적 “모두 적용/모두 해제” 동작이 없음.
- 멀티선택 경로의 `timeOffset` 미적용
  - 단일 추가 경로(`addAnimationTrackAsync`)만 플러그인 `timeOffset`을 반영. 멀티 토글(`toggleAnimationForWords`)은 `timeOffset` 없이 트랙 생성 → 시나리오 DOM lifetime 보정 불일치 가능.
- 사용중 에셋 스트립의 단일 타깃화
  - 멀티선택을 인지하지 않고 단일 단어만 조작. 멀티선택 상태에서 일괄 삭제/설정 변경이 불가.
- 삭제 UX의 임계값
  - 1개만 멀티선택된 경우(Delete/Backspace) 동작하지 않음(`> 1` 조건). 직관성 저하.
- 시각적/세부
  - 편집 상태 클래스 오타 `bg-yel`: `ClipWord.tsx:160`.

## 경계/사이드 이펙트

- 범위 선택은 클립 간 선택까지 지원하며, 삭제 시 `getSelectedWordsByClip()`로 클립별 묶어서 처리: `wordSlice.ts:1016`.
- 클릭/더블클릭/드래그의 디바운스 혼재: `ClipWords.tsx`(50ms), `ClipWord.tsx`(300ms) + 별도의 `wordStateManager` 유틸 존재하나 UI핸들러에 직접 연결은 제한적: `src/app/(route)/editor/utils/wordStateManager.ts:1`.

## 리디자인 참고 포인트(문제 기반)

- “선택”의 단일 진리원천(SSOT) 확립 및 포커스/편집/멀티/그룹의 관계 명시화.
- 멀티선택 경로에서도 플러그인 `timeOffset`을 동등하게 반영하여 시나리오/렌더러 일관성 확보.
- 에셋 스트립과 에셋 그리드의 멀티선택 처리 정책 통일(토글/일괄적용/일괄해제 모드 명확화).
- 1개 멀티선택의 삭제/적용/해제 동작 정의 명확화.
- UI 상태(`selectedWordId`/`currentWordAssets`)와 데이터 상태(`wordAnimationTracks`/`appliedAssets`) 간 동기화 최소화 또는 단방향화.

---

### 주요 파일 레퍼런스

- `src/app/(route)/editor/components/ClipComponent/ClipWord.tsx:94`
- `src/app/(route)/editor/components/ClipComponent/ClipWords.tsx:118`
- `src/app/(route)/editor/hooks/useWordGrouping.ts:1`
- `src/app/(route)/editor/store/slices/wordSlice.ts:700`
- `src/app/(route)/editor/store/slices/wordSlice.ts:736`
- `src/app/(route)/editor/store/slices/wordSlice.ts:820`
- `src/app/(route)/editor/store/slices/wordSlice.ts:900`
- `src/app/(route)/editor/store/slices/wordSlice.ts:948`
- `src/app/(route)/editor/store/slices/wordSlice.ts:1016`
- `src/app/(route)/editor/components/AnimationAssetSidebar/AssetGrid.tsx:145`
- `src/app/(route)/editor/components/AnimationAssetSidebar/UsedAssetsStrip.tsx:128`
- `src/app/(route)/editor/components/EditorMotionTextOverlay.tsx:1`
- `src/app/(route)/editor/utils/initialScenario.ts:20`
- `src/app/(route)/editor/store/slices/clipSlice.ts:1`
- `src/app/(route)/editor/store/slices/uiSlice.ts:1`
- `src/app/(route)/editor/store/slices/selectionSlice.ts:1`
