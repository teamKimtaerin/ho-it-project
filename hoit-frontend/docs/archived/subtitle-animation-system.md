# Subtitle & Animation System Documentation

이 문서는 ECG Frontend의 자막 렌더링 시스템과 애니메이션 시스템에 대한 종합적인 설명을 제공합니다.

## 📋 목차

1. [애니메이션 UI 코드 위치](#애니메이션-ui-코드-위치)
2. [데이터 타입 구조](#데이터-타입-구조)

---

## 1. 애니메이션 UI 코드 위치

### 🎨 애니메이션 선택 UI

#### 메인 사이드바 컴포넌트

**위치**: `src/app/(route)/editor/components/AnimationAssetSidebar/index.tsx`

- 애니메이션 에셋 선택 사이드바의 메인 컴포넌트
- 선택된 단어 정보 표시 및 애니메이션 적용 관리

#### 애니메이션 그리드

**위치**: `src/app/(route)/editor/components/AnimationAssetSidebar/AssetGrid.tsx`

- 애니메이션 에셋들을 그리드로 표시
- 클릭 시 `addAnimationTrack()` 함수 호출 (lines 130-154)
- 단어당 최대 3개 애니메이션 제한

```typescript
// 핵심 로직
if (currentTracks.length < 3) {
  addAnimationTrack(
    focusedWordId,
    asset.id,
    asset.name,
    wordTiming,
    asset.pluginKey
  )
} else {
  showToast('최대 3개의 애니메이션만 선택할 수 있습니다.', 'warning')
}
```

#### 컨트롤 패널

**위치**: `src/app/(route)/editor/components/AnimationAssetSidebar/AssetControlPanel.tsx`

- 선택된 애니메이션의 파라미터 조정 UI

### 🌊 사운드웨이브 애니메이션 트랙 UI

#### 확장된 클립 웨이브폼

**위치**: `src/app/(route)/editor/components/ClipComponent/ExpandedClipWaveform.tsx`

**핵심 섹션들:**

- **Lines 575-669**: 애니메이션 트랙 바 렌더링
- **Lines 577**: 단어별 애니메이션 트랙 가져오기
  ```typescript
  const tracks = wordAnimationTracks.get(focusedWord.id) || []
  ```
- **Lines 599-668**: 컬러별 트랙 바 렌더링 (blue, green, purple)
- **Lines 620-644**: 드래그 가능한 시작/끝 핸들
- **Lines 646-657**: 전체 트랙 이동 가능한 중앙 영역

#### 트랙 바 시각화

```typescript
const trackColors = {
  blue: { base: 'bg-blue-500', hover: 'bg-blue-400', ... },
  green: { base: 'bg-green-500', hover: 'bg-green-400', ... },
  purple: { base: 'bg-purple-500', hover: 'bg-purple-400', ... },
}
```

### 📊 스토어 함수들

**위치**: `src/app/(route)/editor/store/slices/wordSlice.ts`

주요 함수들:

- `addAnimationTrack` (line 94): 단어에 애니메이션 추가
- `removeAnimationTrack`: 애니메이션 제거
- `updateAnimationTrackParams`: 애니메이션 파라미터 업데이트
- `updateAnimationTrackTiming`: 애니메이션 타이밍 조정

### 🔄 전체 플로우

1. **사용자가 단어 선택** → 에디터에서 단어 클릭
2. **애니메이션 사이드바 오픈** → Insert 탭 또는 자동 오픈
3. **애니메이션 에셋 클릭** → AssetGrid에서 선택
4. **`addAnimationTrack()` 호출** → 스토어에 애니메이션 정보 저장
5. **웨이브폼 업데이트** → 컬러 바로 애니메이션 트랙 표시
6. **드래그로 조정** → 타이밍이나 위치 실시간 수정

---

## 2. 데이터 타입 구조

### 🎯 애니메이션 상태 타입

#### AnimationTrack 인터페이스

**위치**: `src/app/(route)/editor/store/slices/wordSlice.ts` (lines 3-11)

```typescript
export interface AnimationTrack {
  assetId: string // 애니메이션 에셋의 고유 ID
  assetName: string // 애니메이션 표시명 (e.g., "elastic", "fadeIn")
  pluginKey?: string // 선택적 플러그인 식별 키
  params?: Record<string, unknown> // 애니메이션 파라미터 (키-값 쌍)
  timing: {
    // 애니메이션 재생 시점
    start: number // 시작 시간 (초)
    end: number // 종료 시간 (초)
  }
  intensity: {
    // 애니메이션 강도 범위
    min: number // 최소 강도 (0-1)
    max: number // 최대 강도 (0-1)
  }
  color: 'blue' | 'green' | 'purple' // 트랙 바 시각적 색상
}
```

#### 저장 구조

```typescript
wordAnimationTracks: Map<string, AnimationTrack[]>
```

- **Key**: Word ID (string)
- **Value**: AnimationTrack 객체 배열 (단어당 최대 3개)

### 📝 단어 데이터 타입

#### Word 인터페이스

**위치**: `src/app/(route)/editor/types/index.ts` 및 `src/app/(route)/editor/components/ClipComponent/types.ts`

```typescript
export interface Word {
  id: string // 단어의 고유 식별자
  text: string // 실제 단어 텍스트
  start: number // 발화 시작 시간 (초)
  end: number // 발화 종료 시간 (초)
  isEditable: boolean // 편집 가능 여부
  confidence?: number // 음성 인식 신뢰도 (0-1)
  appliedAssets?: string[] // 적용된 애니메이션 에셋 ID 목록
}
```

#### 상위 컨테이너: ClipItem

```typescript
export interface ClipItem {
  id: string
  timeline: string // 타임라인 위치
  speaker: string // 화자명
  subtitle: string // 자막 텍스트
  fullText: string // 전체 단어들의 텍스트
  duration: string // 클립 지속 시간
  thumbnail: string // 썸네일 이미지
  words: Word[] // Word 객체들의 배열
}
```

### 🏗️ 데이터 아키텍처

시스템은 **3계층 접근법**을 사용합니다:

#### Layer 1: 기본 단어 데이터 (`Word` 타입)

- **발화 타이밍**: `start`와 `end` (음성 인식에서 추출)
- **적용된 에셋**: `appliedAssets` 배열에 애니메이션 ID 저장
- **기본 속성**: 텍스트, 신뢰도, 편집 가능성

#### Layer 2: 애니메이션 상세 정보 (스토어의 `AnimationTrack`)

실제 애니메이션 설정은 별도로 스토어에 저장:

```typescript
wordAnimationTracks: Map<string, AnimationTrack[]>
// Key: word.id
// Value: 전체 애니메이션 상세 정보를 담은 AnimationTrack 객체 배열
```

#### Layer 3: 타이밍 조정

추가적인 타이밍 조정은 다음에 저장:

```typescript
wordTimingAdjustments: Map<string, { start: number; end: number }>
// 원본 데이터 수정 없이 단어 타이밍 미세 조정 가능
```

### 🔄 완전한 데이터 플로우

1. **단어 생성**: 각 단어는 음성 인식에서 발화 시간(`start`, `end`)을 가짐
2. **애니메이션 선택**: 사용자가 애니메이션 선택 시 다음에 추가:
   - `word.appliedAssets` (ID만)
   - `wordAnimationTracks` Map (전체 애니메이션 상세 정보)
3. **타이밍 조정**: 사용자가 조정 가능:
   - `wordTimingAdjustments`를 통한 단어 타이밍
   - 각 `AnimationTrack` 내에서 애니메이션 타이밍
4. **렌더링**: 시스템이 다음을 결합하여 최종 애니메이션 자막 렌더링:
   - 원본 단어 타이밍
   - 타이밍 조정사항
   - 애니메이션 트랙들

### 💡 아키텍처 장점

이 구조는 관심사를 분리합니다:

- **단어 데이터**는 기본 속성만으로 깔끔하게 유지
- **애니메이션 상세 정보**는 스토어에서 관리
- **타이밍 조정사항**은 실행취소/재실행 기능을 위해 별도 추적

---

## 🎯 결론

이 시스템은 복잡한 애니메이션 기능을 가진 자막 에디터를 위한 견고한 아키텍처를 제공합니다. 각 컴포넌트와 타입이 명확한 책임을 가지며, 확장 가능하고 유지보수하기 쉬운 구조로 설계되어 있습니다.

주요 특징:

- **모듈화된 컴포넌트 구조**
- **타입 안전성을 보장하는 TypeScript**
- **효율적인 상태 관리 (Zustand)**
- **MotionText Renderer v2.0 스펙 준수**
- **사용자 친화적인 드래그 앤 드롭 인터페이스**
