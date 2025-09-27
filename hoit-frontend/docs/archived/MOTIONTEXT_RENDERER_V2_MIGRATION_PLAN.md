# MotionText Renderer v2.0 Migration Plan (ecg-frontend)

> Agent Prompt (for Codex)
>
> - This plan targets ecg-frontend: `/Users/jactio/develop/crafton_jungle/my_own_weaphone/ecg-frontend`
> - Use Yarn scripts: `yarn dev`, `yarn test`, `yarn lint`, `yarn build`.
> - Update code under `src/app/shared/motiontext/**` and consumers under `src/app/(route)/**`.
> - MotionText docs to reference first:
>   - `/Users/jactio/develop/crafton_jungle/my_own_weaphone/motiontext-renderer/context/folder-structure.md`
>   - `/Users/jactio/develop/crafton_jungle/my_own_weaphone/motiontext-renderer/context/scenario-json-spec-v-2-0.md`
>   - `/Users/jactio/develop/crafton_jungle/my_own_weaphone/motiontext-renderer/context/plugin-system-architecture-v-3-0.md`
> - Plugin origin will be served from `http://localhost:3300` (dev). Configure via env `NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN`.

## 목표와 범위

- ecg-frontend 내부의 v1.3 기반 시나리오 제네레이터/플러그인 사용 코드를 v2.0/Plugin API v3.0으로 마이그레이션.
- 플러그인 공급을 `public/plugin/` 로컬 경로 → `http://localhost:3300` 로컬 서버에서 fetch하는 방식으로 전환.

## BaseTime 필수 원칙

- `timeOffset`은 노드의 표시 구간과 독립적인 기준 창인 `baseTime: [start, end]`을 참조합니다.
- 퍼센트(`"50%"`)는 `baseTime` 길이에 대한 비율입니다. 숫자는 초 단위 절대 오프셋입니다(기준은 `baseTime[0]`).
- `baseTime`이 생략되면 해당 노드의 `displayTime`을 기준으로 사용합니다.
- 권장: 플러그인 효과가 노드 구간 중 일부만 차지한다면 `baseTime`을 명시해 의도된 윈도우를 고정하세요.
  - 예: `{ baseTime: [2.0, 6.0], timeOffset: ["20%", "80%"] }` → 최종 실행 창 `[3.6, 5.2]`.

## 핵심 변경 요약

- 필드 재명명: `hintTime`→`domLifetime`, `absStart/absEnd`→`displayTime`, `relStart/relEnd`→`timeOffset` (시간 표기는 `[start,end]`).
- Define/상속 시스템 도입, 모든 노드 `id` 의무화.
- Plugin API v3.0: DOM 경계 분리(`baseWrapper`/`effectsRoot`), 채널 합성(replace/add/multiply), 권한(capabilities) 확장.
- Layout Constraints: 트랙 정책+제약 기반 레이아웃, breakout/portal 정식화.

## 마일스톤 계획 (ecg-frontend 전용)

### M0 — 현황 점검/준비

- 작업: v1.3 전용 코드 식별 및 영향도 산출.
  - 시나리오 제네레이터: `/Users/jactio/develop/crafton_jungle/my_own_weaphone/ecg-frontend/src/app/shared/motiontext/utils/scenarioGenerator.ts`
  - 플러그인 로더: `/Users/jactio/develop/crafton_jungle/my_own_weaphone/ecg-frontend/src/app/shared/motiontext/utils/pluginLoader.ts`
  - 렌더러 훅: `/Users/jactio/develop/crafton_jungle/my_own_weaphone/ecg-frontend/src/app/shared/motiontext/hooks/useMotionTextRenderer.ts`
  - 데모/에디터 사용처: `/Users/jactio/develop/crafton_jungle/my_own_weaphone/ecg-frontend/src/app/(route)/motiontext-demo/page.tsx`, `/Users/jactio/develop/crafton_jungle/my_own_weaphone/ecg-frontend/src/app/(route)/editor/components/EditorMotionTextOverlay.tsx`
- 산출물: 변경 목록(필드: e_type/absStart/absEnd/hintTime 등), 로컬 `/plugin/` 의존 경로 리스트.
- 검증: `yarn test` 기본 통과.
- 참고(스펙): 위 MotionText v2.0/v3.0 문서 3종.

### M1 — 타입/인터페이스 정리(호환 레이어)

- 작업: v2 타입 도입. `RendererConfigV2` 생성 후 점진적 적용, 필요 시 v1→v2 변환 헬퍼 추가.
- 작업 경로: `src/app/shared/motiontext/utils/scenarioGenerator.ts`(타입 분리/내보내기), 사용처 타입 업데이트.
- 산출물: v2 타입과 변환 유틸 초안, 빌드 통과.
- 검증: `yarn type-check` 통과.
- 참고: v2 타입 레퍼런스 `/Users/jactio/.../motiontext-renderer/src/types/scenario-v2.ts`.

### M2 — 시나리오 제네레이터 v2 출력 전환

- 작업: v1.3 출력 필드 → v2.0 스키마 반영.
  - `version:"2.0"`, `pluginApiVersion:"3.0"`, `eType`, `displayTime`, `timeOffset`, `domLifetime` 계산.
  - Define 활용(중복 스타일/에셋 변수화) 최소 1개 예시 반영.
- 작업: 플러그인 체인 항목에 `baseTime` 지원 추가 및 기본 규칙 적용.
  - 명시 우선: 노드의 세부 효과 구간이 있다면 `baseTime`을 해당 구간 `[start,end]`로 지정.
  - 생략 시 폴백: 해당 노드의 `displayTime`을 `baseTime`으로 간주.
  - 기존 `relStartPct/relEndPct` → `timeOffset`으로 변환(퍼센트 문자열 사용).
- 작업 경로: `src/app/shared/motiontext/utils/scenarioGenerator.ts` 및 관련 테스트.
- 산출물: v2 시나리오 샘플 생성 함수 2종(`generatePreviewScenarioV2`, `generateLoopedScenarioV2`).
- 검증: 유닛 테스트 업데이트 `src/app/shared/motiontext/utils/__tests__/scenarioGenerator.test.ts`.
- 참고: v2 스펙 문서, 퍼센트 규칙/상속 규칙 섹션.

### M3 — 플러그인 로더 전환(서버 소스)

- 작업: `configurePluginLoader()`를 server 모드로 교체, env 사용.
  - `NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN` 기본값 `http://localhost:3300`.
  - 로컬 `/plugin/` 폴더 의존 제거(폴백은 비활성 또는 명시적).
- 작업 경로: `src/app/shared/motiontext/utils/pluginLoader.ts`.
- 산출물: 서버 제공 플러그인 로딩/등록 동작, 오류 시 경고/복구.
- 검증: 에디터/데모에서 플러그인 로딩 성공, 네트워크 요청 경로 확인.
- 참고: 플러그인 서버 스크립트 `/Users/jactio/.../motiontext-renderer/demo/plugin-server/server.js`.

### M3.5 — 플러그인 체인 규약 정비(시간 체계)

- 작업: v2 시간 체계 재점검 — `baseTime`/`timeOffset` 변환 함수 유틸 추가.
  - 입력: 노드 `displayTime`, 옵션: 상대 퍼센트 또는 절대 초.
  - 출력: `{ baseTime: [start,end], timeOffset: [a,b] }` 보장.
- 작업 경로: `src/app/shared/motiontext/utils/scenarioGenerator.ts` 또는 별도 유틸로 분리.
- 산출물: 변환 유틸 테스트(경계값: 음수, 0%, 100%, 초과 퍼센트 clamp 등).
- 검증: 퍼센트/절대 혼합 케이스가 의도대로 평가되는지 스냅샷 검증.

### M4 — 렌더러 훅 적응(v2 필드/길이/시킹)

- 작업: `useMotionTextRenderer`가 v2 필드에서 duration/seek 기준을 추정하도록 수정.
  - 기존 `absEnd` 참조 → v2에서는 `domLifetime` 또는 `root.displayTime`의 max를 사용.
  - 플러그인 재생 구간은 렌더러 합성 결과를 따르나, 프리뷰 타임라인 보조 계산 시 `baseTime`을 우선 활용.
- 작업 경로: `src/app/shared/motiontext/hooks/useMotionTextRenderer.ts`.
- 산출물: v2 시나리오 로딩/재생/시킹 정상 동작.
- 검증: 에디터 재생/정지/루프 동작 수동 확인 + 기본 테스트.

### M5 — UI/사용처 업데이트

- 작업: 에디터/데모가 v2 시나리오 제너레이터/플러그인 로더를 사용하도록 변경.
- 작업 경로: `src/app/(route)/editor/components/EditorMotionTextOverlay.tsx`, `src/app/(route)/motiontext-demo/page.tsx`.
- 산출물: v2 플로우로 미리보기/Loop 동작.
- 검증: 브라우저 수동 시연 + `yarn test` 스냅샷/렌더 테스트 통과.

### M6 — 데이터 마이그레이션(저장 시나리오가 있는 경우)

- 작업: 저장된 v1.3 시나리오 → v2 변환 스크립트 초안 작성(옵션).
- 산출물: `scripts/mtx-migrate-v13-to-v20.ts` (프런트/백 어디에 둘지 결정) 및 사용 가이드.
- 검증: 샘플 2~3건 변환/검증.
- 참고: 변환 규칙은 MotionText `V13ToV20Migrator.ts` 로직을 요약 반영.

### M7 — 테스트/정리/문서화

- 작업: 단위/통합 테스트 보강, dead code 제거, `public/plugin/` 청소.
- 산출물: README/AGENTS에 v2 반영, ENV 샘플에 `NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN` 추가.
- 검증: `yarn lint`, `yarn type-check`, `yarn test`, `yarn build` 모두 통과.

## 플러그인 공급 방식(상세)

- 현행: `public/plugin/<name>@<ver>/` 직접 import.
- 전환: 로컬 서버(`http://localhost:3300`)에서 manifest/entry/assets 서빙.
- 실행: motiontext-renderer 레포에서 `pnpm plugin:server` → `node /Users/jactio/develop/crafton_jungle/my_own_weaphone/motiontext-renderer/demo/plugin-server/server.js` (CORS 허용).
- ecg-frontend 설정: `.env.local`에 `NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN=http://localhost:3300` 추가.
- 로더: fetch → (무결성 검증 예정) → Blob URL import → 레지스트리 등록.
- 로더: fetch → (무결성 검증 예정) → Blob URL import → 레지스트리 등록. 폴백(local)은 명시적으로 opt‑in.

## 릴리스 체크리스트

- 빌드/테스트: `yarn build`, `yarn test`, 데모/에디터 시연 OK.
- 샘플/문서: 에디터 가이드/README 업데이트, `.env.local.example`에 `NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN` 추가.
- 정리: `public/plugin/` 제거 또는 비활성, 변경 이력/롤백 가이드 기록.
