아래는 “이전 시나리오가 남아 동시에 재생” 문제를 없애고, scenario 상태를 일원화하기 위한 실행 계획입니다. 현재 코드
흐름과 훅/스토어 구조에 맞춰 제안합니다.

핵심 원인

- useMotionTextRenderer.loadScenario가 기존 렌더 상태를 완전히 초기화하지 않아, 렌더러 내부/DOM에 이전 시나리오 잔
  존(중복 cue)이 남음.
- 시나리오 갱신 경로가 분산되어 있어(여러 기능이 직접 수정), 시점 경합과 레이스로 오래된 로드가 뒤늦게 반영되는 경
  우 발생.

단계별 계획

1. 렌더러 초기화 보장

- 전략: 시나리오가 바뀔 때마다 기존 렌더러를 완전 dispose 후 새 인스턴스에 attach + load.
- 구현:
  - useMotionTextRenderer.loadScenario 진입 시:
    - pause(), cancelAnimationFrame, timeout 정리.
    - rendererRef.current?.dispose()로 완전 해제, rendererRef.current = null.
    - 컨테이너 DOM 비우기 후 initializeRenderer() 재호출, attachMedia(video) 재부착.
    - 새 시나리오 loadConfig().
- 영향: 무거운 재초기화지만 중복 렌더 제거에 가장 확실. 이후 최적화(빠른 reset API가 있으면 교체) 가능.

2. 단일 소스(Single Source of Truth) 확립

- Zustand scenarioSlice.currentScenario에만 쓰기/읽기 집중.
- 모든 기능(자동 줄바꿈 포함)은 스토어 액션(예: setScenarioFromJson, buildInitialScenario, update\*)만 호출하도록 정
  리. 컴포넌트/훅/유틸의 직접 수정 금지.
- 컴포넌트는 currentScenario만 구독하고, 로컬 캐시(참조 유지) 사용 금지.

3. 시나리오 변경 전파 규약

- “교체(Replace)” vs “패치(Patch)”를 명확히:
  - Replace: 전체 시나리오를 새 객체로 교체(자동 줄바꿈, 병합 후 재생성 등).
  - Patch: 국소 속성 변경 시에도 “최상위·cues·tracks 참조”는 새로운 객체를 생성하여 변경 감지 보장.
- 모든 액션은 참조 변경을 보장(불변성 유지). Immer 도입 고려.

4. 비동기 로드 레이스 가드

- useMotionTextRenderer에 loadIdRef(증가 토큰) 추가:
  - const id = ++loadIdRef.current 후 비동기 단계마다 if (id !== loadIdRef.current) return으로 오래된 로드 중단.
- EditorMotionTextOverlay의 scenarioVersion 구독 로드도 동일 토큰 사용.
- 외부/실시간 scenario fetch(real.json, scenario.json) 경로에도 동일 가드 적용.

5. 배치/디바운스

- scenarioVersion 구독 후 loadScenario 호출 시 50~100ms 디바운스 유지(이미 60ms 있음). 파인튜닝하여 과도한 재초기화
  방지.
- 연속 액션(자동 줄바꿈 → 짧은 클립 병합 등)은 내부에서 하나의 Replace로 묶기(중간 단계에서 렌더 재로딩 금지).

6. 자동 줄바꿈 경로 정리

- applyAutoLineBreak 후에는 무조건 buildInitialScenario(processedClips)로 “새 시나리오 교체(Replace)” 수행(이미 호
  출 중).
- 보완: 기존 시나리오 조각을 덧붙이지 않도록, cues/words/track을 완전히 재구성하고 이전 플러그인 체인/노드 참조
  제거.
- 필요 시 nodeIndex 재생성(스토어에서 이미 수행 중인지 확인).

7. 방어적 로깅/스모크 테스트

- 로드 전/후 scenarioVersion, loadId, renderer status를 dev 로깅.
- Jest: scenarioSlice 액션이 참조 변경을 보장하는지 테스트(깊은 불변성, cues 교체 시 이전 참조가 남지 않는지).
- 간단 스모크: 시나리오 두 번 연속 교체 시 cues 길이가 2배로 늘지 않음을 검증할 리그레션 테스트 추가.

적용 순서 제안

- 1차(빠른 해결): 1, 4, 5 적용 → 중복 렌더 제거와 레이스 방지.
- 2차(구조 개선): 2, 3, 6 정리 → 상태 일원화/명확한 전파 규약.
- 3차(품질): 7 추가 → 회귀 방지.

원하시면 바로 1차 변경을 구현해 드릴게요:

- useMotionTextRenderer.loadScenario에 reset(dispose→init→attach→load) + loadId 가드 추가
- EditorMotionTextOverlay 구독 로직에 동일 토큰 연동 및 디바운스 점검
