# 에디터 페이지 초기화 오류 수정 계획

## 문제 분석

콘솔 로그에서 발견된 주요 오류:

```
page.tsx:679 Uncaught ReferenceError: setSpeakers is not defined
```

이 오류로 인해 에디터 페이지가 로드되지 않는 상황입니다.

## 근본 원인

### 1. 함수명 불일치

- 스토어에서 `setSpeakers: setGlobalSpeakers`로 추출했으나 (line 501)
- 콜백 함수에서는 `setSpeakers`로 호출하고 있음 (line 634, 679)

### 2. 누락된 함수 추출

`checkAndApplyPendingResults` 함수에서 사용하는 함수들이 `useEditorStore()`에서 추출되지 않음:

- `setSpeakerColors` (line 635에서 사용)
- `buildInitialScenario` (line 639에서 사용)
- `setCurrentProject` (line 665에서 사용)

### 3. 의존성 배열 오류

useCallback의 의존성 배열에 정의되지 않은 변수들이 포함됨 (line 679)

## 수정 계획

### 1단계: 누락된 함수 추출

`useEditorStore()` 구조분해 할당에 다음 함수들 추가:

```javascript
const {
  // 기존 함수들...
  setSpeakerColors, // 추가
  buildInitialScenario, // 추가
  setCurrentProject, // 추가
} = useEditorStore()
```

### 2단계: 함수명 수정

- `checkAndApplyPendingResults` 함수 내부에서 `setSpeakers`를 `setGlobalSpeakers`로 변경
- 의존성 배열에서도 함수명 통일

### 3단계: 최적화 (선택사항)

불필요한 함수 호출 방지를 위해 useEffect 조건 추가:

```javascript
useEffect(() => {
  // sessionStorage에 pendingJobId가 있을 때만 실행
  if (sessionStorage.getItem('pendingJobId')) {
    checkAndApplyPendingResults()
  }
}, [])
```

## 예상 결과

- 에디터 페이지가 정상적으로 로드됨
- 대기 중인 처리 결과 자동 적용 기능이 올바르게 작동
- 불필요한 오류 로그 제거

## 영향 범위

- 파일: `/src/app/(route)/editor/page.tsx`
- 영향: 에디터 페이지 초기화 및 대기 결과 처리 로직
- 리스크: 낮음 (함수 참조 오류 수정이므로 기능 변경 없음)
