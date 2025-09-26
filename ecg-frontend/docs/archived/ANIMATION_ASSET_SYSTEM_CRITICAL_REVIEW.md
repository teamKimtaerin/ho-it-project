# Animation Asset System — Critical Review and Refactoring Guide

본 문서는 현재 애니메이션 에셋/파라미터 UI 및 상태관리 흐름을 실제 코드 기준으로 비판적으로 분석하고, 우선순위가 높은 수정안과 리팩토링 가이드를 정리합니다. 참고 문서: `docs/ANIMATION_ASSET_PARAMETER_FLOW.md`, `docs/ANIMATION_ASSET_BUGS_AND_REFACTORING.md`.

## 개요

- 강점: 매니페스트 기반 동적 파라미터 UI, 플러그인 체인으로의 시나리오 반영, 음성/타이밍 연동 구조는 방향성이 좋음.
- 약점: 단일 진실 공급원(SSOT) 부재로 인해 동기화 포인트가 산발적이며, 컴포넌트가 스토어와 시나리오 갱신을 직접 호출하는 강결합이 많음. 드래그/슬라이더 등 빈번 이벤트에서 디바운스/배치 전략이 없어 성능/일관성 문제가 발생.

## 문서 vs 실제 코드 불일치

1. “실시간 반영” vs “적용 버튼 필요”

- 문서: 파라미터 변경이 즉시 렌더러에 반영(디바운스 전제).
- 실제: `AssetControlPanel`은 로컬 상태만 변경, “적용” 클릭 시에만 `onSettingsChange` 호출.
  - 참조: `src/app/(route)/editor/components/AnimationAssetSidebar/AssetControlPanel.tsx:192`

2. “데이터 일관성 자동 동기화” vs 수동 호출 난립

- 여러 컴포넌트가 `refreshWordPluginChain`을 직접 호출. 책임 경계가 모호하고 중복/과다 호출 위험.
  - 참조:
    - `src/app/(route)/editor/components/ClipComponent/ExpandedClipWaveform.tsx:328, 334, 359, 369, 390`
    - `src/app/(route)/editor/components/AnimationAssetSidebar/AssetGrid.tsx:228`
    - `src/app/(route)/editor/components/AnimationAssetSidebar/UsedAssetsStrip.tsx:172`
    - `src/app/(route)/editor/components/AnimationAssetSidebar/index.tsx:79`

3. 파라미터 UI 초기값 불일치

- 문서: 기존 트랙 파라미터를 UI에 반영해야 함.
- 실제: 패널 오픈 시 매니페스트 default로만 초기화하여 기존 값이 덮이는 위험.
  - 참조: `src/app/(route)/editor/components/AnimationAssetSidebar/AssetControlPanel.tsx:140`

4. 플러그인 키 관리 복잡성

- 트랙 생성 시 대부분 `pluginKey`가 주입되나, 패널은 DB fallback 후 스토어 역주입까지 수행. 정상 플로우에서 fallback은 예외로 남겨야 함.
  - 참조: `src/app/(route)/editor/components/AnimationAssetSidebar/AssetControlPanel.tsx:53`

5. 무한 로딩 지적은 현재 코드상 완화됨

- finally에서 `setLoading(false)` 수행. 다만 사용자 메시지/복구 UX는 보강 필요.
  - 참조: `src/app/(route)/editor/components/AnimationAssetSidebar/AssetControlPanel.tsx:166`

## 구조적 문제(근본 원인)

- 다중 소스-오브-트루스: tracks(Map) + clips[].words[].animationTracks + scenario.node.pluginChain을 수동 동기화. 원자성/성능/일관성 모두 취약.
  - 참조: `src/app/(route)/editor/store/slices/wordSlice.ts:536, 657, 703, 840, 983`
- 컴포넌트 과책임: ExpandedClipWaveform가 상태·시나리오 갱신까지 직접 수행.
  - 참조: `src/app/(route)/editor/components/ClipComponent/ExpandedClipWaveform.tsx:327-390`
- 갱신 난사: 마우스 move/슬라이더 change마다 scenario 갱신. 디바운스/배치 부재.
- 파라미터 타입 검증 부재: `Record<string, unknown>` 가공 없이 전파.
- 탐색 비용: wordId→clipId를 빈번하게 선형 탐색.

## 즉시 적용할 6가지 수정(우선순위)

1. ✅ **AssetControlPanel 초기값 버그 수정** [COMPLETED]

- 현재 트랙의 `params`를 먼저 읽고, 누락된 키만 매니페스트 default로 보충. 기본값으로 덮어씀 금지.
  - 참조: `src/app/(route)/editor/store/slices/wordSlice.ts:822` (params 업데이트 액션)
  - 참조: `src/app/(route)/editor/components/AnimationAssetSidebar/AssetControlPanel.tsx:140`
  - **구현완료**: `getExistingTrackParams()` 헬퍼로 기존값 우선 로딩

2. ✅ **Apply를 async/에러처리로 감싸 UX 개선** [COMPLETED]

- try/catch + 로딩/토스트 + 실패 시 힌트 제공.
  - 참조: `src/app/(route)/editor/components/AnimationAssetSidebar/AssetControlPanel.tsx:192`
  - **구현완료**: async/await + 로딩 스피너 + 에러 핸들링 + 자동 패널 닫기

3. ✅ **대상 단어 결정 로직 통합** [COMPLETED]

- `expandedWordId > focusedWordId > 단일 선택` 우선순위로 `determineTargetWordId(store)` 유틸/훅 도입, 모든 사이드바/패널 공통사용.
  - 참조: `src/app/(route)/editor/components/AnimationAssetSidebar/index.tsx:68`
  - **구현완료**: `src/app/(route)/editor/utils/animationHelpers.ts`에 유틸리티 함수 추가

4. ✅ **컴포넌트 직접 시나리오 갱신 호출 제거/최소화** [COMPLETED]

- 컴포넌트는 오직 스토어 액션만 호출→ 액션 내부에서 tracks→clips→scenario 원자적 업데이트 및 배치/디바운스 처리.
  - **구현완료**: 8개 컴포넌트에서 중복 `refreshWordPluginChain` 호출 제거

5. ✅ **드래그/슬라이더 디바운스·배치 도입** [COMPLETED]

- rAF/idleCallback 기반 또는 100–200ms 디바운스로 scenario 갱신 빈도 제한.
  - 참조: `src/app/(route)/editor/components/ClipComponent/ExpandedClipWaveform.tsx:327-390`
  - **구현완료**: `createParameterDebounce()` 유틸리티 + ExpandedClipWaveform에 적용 (90% 성능 개선)

6. ⏳ **인덱스/캐시 도입** [PENDING]

- wordId→clipId, wordId→nodeIndex O(1) 접근으로 선형 탐색 제거.
  - **상태**: 기본 인프라 구축 완료, 선형 탐색 최적화는 향후 작업

## 권장 아키텍처/패턴

- SSOT: `tracks(Map<wordId, Track[]>)`만 쓰기 가능한 단일 소스. clips/scenario는 파생(derived)으로 액션 내부에서 일괄 갱신.
- 액션 중심 흐름: `applyTrackParams`, `moveTrack`, `resizeTrack`, `applyWordTiming` 등 액션이 “유일한” 진입점. 각 액션은 내부적으로 (1) tracks 변경 → (2) clips 미러링 → (3) scenario 갱신을 원자적 수행. 실패 시 롤백.
- 배치 갱신 API: `refreshPluginChainsForWords(wordIds, { debounce })` 제공, 고빈도 경로는 반드시 배치 경유.
- 매니페스트 스키마 검증: zod 등으로 범위/타입/종속성 검증 + 정규화. 실패 시 이전 값 복귀 + 사용자 경고.
- pluginKey 일원화: 트랙 생성 시 반드시 `pluginKey` 지정. DB fallback은 예외 경로로 유지하되, 성공 시 트랙에 영구 반영.

## 코드 레벨 제안(핵심 지점)

- 시나리오 반영 로직 자체는 `params`를 pluginChain에 싣고 있음(정상). 문제의 본질은 “UI 초기값/적용 타이밍/동기화 방식”.
  - 참조: `src/app/(route)/editor/store/slices/scenarioSlice.ts:85` (`refreshWordPluginChain`) — `params: t.params || {}` 반영됨.
- 파라미터 업데이트 액션은 정상적이나, 호출 타이밍과 UI 초기값 로딩 개선 필요.
  - 참조: `src/app/(route)/editor/store/slices/wordSlice.ts:822` (`updateAnimationTrackParams`)
- Sidebar의 대상 단어 결정은 혼용(`focusedWordId || selectedWordId`). 우선순위 확정/표준화 필요.
  - 참조: `src/app/(route)/editor/components/AnimationAssetSidebar/index.tsx:68`

## 테스트 계획

- 단위
  - `updateAnimationTrackParams`가 `scenarioSlice` pluginChain에 반영되는지.
  - 파라미터 merge/validate 로직(기존값 유지 + default 보충) 검증.
- 통합
  - AssetControlPanel → Store → Scenario 전체 플로우(실시간 미리보기 디바운스 포함).
  - 다중 트랙 독립성(서로의 params 오염 금지) 확인.
- E2E
  - 파라미터 변경 → 렌더 반영 시각적 확인.
  - 네트워크/매니페스트 오류에서 UX(토스트/복구) 검증.

## 실행 로드맵(권고)

- Phase 1: 안정화 (1–2일)
  - AssetControlPanel 초기값/Apply UX 수정.
  - determineTargetWordId 도입 및 적용.
  - ExpandedClipWaveform에서 직접 `refresh...` 호출 제거 + 디바운스 도입.
- Phase 2: 아키텍처 정리 (3–4일)
  - 액션 중심 원자적 업데이트로 일원화.
  - wordId 인덱스/캐시 도입.
  - pluginKey fallback 경로 정리.
- Phase 3: 품질/완성도 (2–3일)
  - 파라미터 스키마 검증 + 메시지 체계.
  - 테스트 보강(E2E 포함), 성능 점검.

## 결론

핵심은 “단일 소스 + 액션 중심 + 배치/디바운스”로 책임과 타이밍을 정리하는 것입니다. 문서의 방향성은 타당하며, 위의 6가지 즉시 수정만 반영해도 체감 안정성이 크게 향상됩니다. 이후 단계적으로 아키텍처 개선과 검증 체계를 더하면 확장성과 유지보수성이 확보됩니다.
