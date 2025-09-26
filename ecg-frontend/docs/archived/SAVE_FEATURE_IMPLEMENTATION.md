# ECG 에디터 저장 기능 구현 문서

## 📋 프로젝트 개요

ECG (Easy Caption Generator) 에디터에 로컬 저장소와 서버 저장소를 활용한 하이브리드 저장 시스템을 구현했습니다.

## 🎯 구현 목표

1. **1단계: 로컬 저장** - 브라우저 localStorage 활용한 즉시 저장
2. **2단계: 서버 저장** - REST API 기반 서버 저장 시스템
3. **자동 저장** - 3초마다 자동으로 프로젝트 상태 저장
4. **키보드 단축키** - Ctrl+S / Cmd+S로 수동 저장
5. **툴바 연동** - UI에서 저장 버튼 클릭으로 저장

## 🏗️ 구현 구조

### 1. 타입 정의

**파일**: `src/app/(route)/editor/types/project.ts`

```typescript
export interface ProjectData {
  id: string
  name: string
  clips: ClipItem[]
  settings: ProjectSettings
  createdAt: Date
  updatedAt: Date
}

export interface ProjectSettings {
  autoSaveEnabled: boolean
  autoSaveInterval: number // seconds
  defaultSpeaker: string
  exportFormat: 'srt' | 'vtt' | 'ass'
}

export interface ProjectStorage {
  saveProject: (project: ProjectData) => Promise<void>
  loadProject: (id: string) => Promise<ProjectData | null>
  listProjects: () => Promise<SavedProject[]>
  deleteProject: (id: string) => Promise<void>
  exportProject: (id: string, format: 'srt' | 'vtt' | 'ass') => Promise<string>
}
```

### 2. 로컬 저장소 구현

**파일**: `src/utils/projectStorage.ts`

**주요 기능:**

- localStorage 기반 프로젝트 저장/불러오기
- 자막 파일 내보내기 (SRT, VTT, ASS 형식)
- 현재 작업 상태 자동 저장/복원
- 프로젝트 목록 관리

**핵심 메서드:**

```typescript
class LocalProjectStorage implements ProjectStorage {
  async saveProject(project: ProjectData): Promise<void>
  async loadProject(id: string): Promise<ProjectData | null>
  async listProjects(): Promise<SavedProject[]>
  async deleteProject(id: string): Promise<void>
  async exportProject(id: string, format): Promise<string>
}
```

### 3. 서버 저장소 구현

#### API 엔드포인트

1. **`POST /api/projects/save`** - 프로젝트 저장
2. **`GET /api/projects/save`** - 프로젝트 목록 조회
3. **`GET /api/projects/[id]`** - 특정 프로젝트 조회
4. **`DELETE /api/projects/[id]`** - 프로젝트 삭제
5. **`GET /api/projects/export/[id]`** - 자막 파일 내보내기

#### 서버 저장소 클라이언트

**파일**: `src/utils/serverProjectStorage.ts`

```typescript
class ServerProjectStorage implements ProjectStorage {
  private baseUrl = '/api/projects'

  async saveProject(project: ProjectData): Promise<void>
  async loadProject(id: string): Promise<ProjectData | null>
  async listProjects(): Promise<SavedProject[]>
  async deleteProject(id: string): Promise<void>
  async exportProject(id: string, format): Promise<string>
}
```

### 4. 하이브리드 저장소

로컬과 서버 저장소를 결합한 하이브리드 방식:

```typescript
class HybridProjectStorage implements ProjectStorage {
  constructor(localStorage: ProjectStorage, serverStorage: ProjectStorage)

  async saveProject(project: ProjectData): Promise<void> {
    // 1. 로컬에 먼저 저장 (빠른 응답)
    await this.localStorage.saveProject(project)

    // 2. 백그라운드에서 서버에 저장
    try {
      await this.serverStorage.saveProject(project)
    } catch (error) {
      console.warn('서버 저장 실패, 로컬에만 저장됨:', error)
    }
  }
}
```

### 5. 상태 관리 통합

**파일**: `src/app/(route)/editor/store/slices/clipSlice.ts`

Zustand 스토어에 프로젝트 관리 기능 추가:

```typescript
export interface ClipSlice {
  clips: ClipItem[]
  currentProject: ProjectData | null

  // 기존 클립 관리 메서드들...

  // 새로 추가된 프로젝트 관리 메서드들
  saveProject: (name?: string) => Promise<void>
  loadProject: (id: string) => Promise<void>
  createNewProject: (name?: string) => void
  setCurrentProject: (project: ProjectData) => void
}
```

### 6. 자동 저장 구현

**파일**: `src/app/(route)/editor/page.tsx`

```typescript
// 3초마다 자동 저장
useEffect(() => {
  const autoSave = () => {
    if (clips.length > 0) {
      saveProject().catch((error) => {
        console.error('Auto-save failed:', error)
      })
    }
  }

  const interval = setInterval(autoSave, 3000)
  return () => clearInterval(interval)
}, [clips, saveProject])
```

### 7. 키보드 단축키

Ctrl+S (Windows/Linux) 및 Cmd+S (macOS) 저장 단축키:

```typescript
// Command/Ctrl+S (save)
if (cmdOrCtrl && event.key === 's') {
  event.preventDefault()
  saveProject()
    .then(() => {
      showToast('프로젝트가 저장되었습니다.', 'success')
    })
    .catch((error) => {
      showToast('저장에 실패했습니다.')
    })
}
```

### 8. UI 통합

**파일**: `src/components/ui/Toolbar.tsx`

```typescript
const handleSave = async () => {
  try {
    await saveProject()
    showToast('프로젝트가 저장되었습니다.', 'success')
  } catch (error) {
    showToast('저장에 실패했습니다.')
  }
}

const handleSaveAs = async () => {
  const name = prompt(
    '프로젝트 이름을 입력하세요:',
    currentProject?.name || '새 프로젝트'
  )
  if (name) {
    await saveProject(name)
    showToast(`"${name}" 프로젝트가 저장되었습니다.`, 'success')
  }
}
```

## 🚀 사용 방법

### 자동 저장

- 클립을 편집하면 3초 후 자동으로 저장됩니다
- 페이지 새로고침 시 마지막 작업 상태가 복원됩니다

### 수동 저장

1. **키보드 단축키**: `Ctrl+S` (Windows/Linux) 또는 `Cmd+S` (macOS)
2. **툴바 버튼**: 상단 툴바에서 "파일" 탭 → "저장" 또는 "다른 이름으로 저장"

### 프로젝트 관리

```typescript
// 새 프로젝트 생성
createNewProject('프로젝트 이름')

// 프로젝트 저장
await saveProject()
await saveProject('특정 이름으로 저장')

// 프로젝트 불러오기
await loadProject('project-id')

// 프로젝트 목록 조회
const projects = await hybridProjectStorage.listProjects()
```

## 🎨 자막 내보내기 기능

지원하는 형식:

- **SRT** (SubRip Subtitle) - 가장 일반적인 자막 형식
- **VTT** (WebVTT) - 웹 표준 자막 형식
- **ASS** (Advanced SubStation Alpha) - 고급 스타일링 지원

## 🔧 기술적 세부사항

### 저장소 계층 구조

```
HybridProjectStorage
├── LocalProjectStorage (localStorage)
└── ServerProjectStorage (REST API)
```

### 데이터 흐름

1. **저장 시**: 로컬 저장 → 서버 저장 (백그라운드)
2. **불러오기 시**: 서버에서 시도 → 실패 시 로컬에서 시도
3. **자동 저장**: 클립 변경 감지 → 3초 후 저장

### 에러 처리

- 서버 저장 실패 시에도 로컬 저장은 유지
- 네트워크 오류 시 graceful fallback
- 사용자에게 명확한 상태 피드백 제공

## 📝 향후 개선사항

1. **실시간 동기화**: WebSocket 기반 실시간 멀티 유저 편집
2. **버전 관리**: 프로젝트 히스토리 및 복원 기능
3. **클라우드 저장소**: AWS S3, Google Drive 등 클라우드 연동
4. **압축 저장**: 대용량 프로젝트 압축 저장
5. **오프라인 동기화**: 오프라인 작업 후 온라인 시 자동 동기화

## ✅ 구현 완료 체크리스트

- [x] 프로젝트 데이터 타입 정의
- [x] 로컬 저장소 구현 (localStorage)
- [x] 서버 저장 API 구현 (REST)
- [x] 하이브리드 저장소 구현
- [x] Zustand 스토어 통합
- [x] 자동 저장 기능 (3초 간격)
- [x] 키보드 단축키 (Ctrl+S, Cmd+S)
- [x] UI 툴바 저장 버튼 연결
- [x] 자막 파일 내보내기 (SRT, VTT, ASS)
- [x] 토스트 알림 시스템
- [x] 에러 처리 및 Fallback

## 🎉 결과

ECG 에디터는 이제 완전한 저장 기능을 갖추고 있습니다:

- **안정적인 데이터 보존**: 로컬 + 서버 하이브리드 저장
- **사용자 편의성**: 자동 저장 + 수동 저장 + 키보드 단축키
- **확장성**: 모듈화된 구조로 향후 기능 추가 용이
- **호환성**: 표준 자막 형식 내보내기 지원

사용자는 더 이상 작업 내용을 잃어버릴 걱정 없이 자막 편집에 집중할 수 있습니다!
