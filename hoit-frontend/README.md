## 🛠️ 기술 스택
### Frontend
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

---
## ✨ 주요 기능
### 1. 고급 자막 편집기
- **드래그 앤 드롭** 방식의 직관적 편집
- **실시간 비디오 미리보기**와 동기화
- **단어 단위 편집**과 타임라인 조정
- **다중 선택**과 일괄 편집 기능
### 2. 동적 애니메이션 시스템
- **60+ 프리셋 애니메이션** 플러그인
- **MotionText 렌더러** 기반 고품질 효과
- **GSAP 3.13** 활용 부드러운 애니메이션
- **실시간 파라미터 조정**과 미리보기
### 3. 화자 관리 시스템
- **자동 화자 인식**과 수동 할당
- **화자별 스타일** 개별 설정
- **음성 데이터** 기반 동적 효과
- **음성 특성** 분석 (볼륨, 피치, 신뢰도)
### 4. GPU 가속 렌더링
- **서버 사이드 렌더링**으로 20-40배 성능 향상
- **File System Access API** 활용 직접 저장
- **실시간 진행률** 추적과 에러 핸들링
- **다중 포맷** 지원 (MP4, WebM 등)
### 5. 플러그인 마켓플레이스
- **외부 플러그인 서버** 연동
- **동적 UI 생성**과 파라미터 제어
- **플러그인 프리뷰**와 실시간 적용
- **ES 모듈** 기반 확장 시스템
### 6. AI 통합 기능
- **ChatBot 어시스턴트** 플로팅 UI
- **자동 라인 분할**과 안전 영역 계산
- **음성 분석** 데이터 활용 스마트 편집
- **컨텍스트 기반** 편집 제안
### 7. YouTube 자동 업로드
- **원클릭 업로드**: 렌더링 완료 후 YouTube에 자동 업로드
- **메타데이터 설정**: 제목, 설명, 공개 설정 자동 구성
- **진행률 표시**: 실시간 업로드 상태 및 에러 핸들링
### 8. 컷편집 기능
- **RVFC 기반**: `requestVideoFrameCallback`을 사용한 프레임 단위 정밀 동기화
- **비파괴 편집**: 원본 비디오는 변경하지 않고 편집 정보만 JSON으로 관리
- **Cut Edit 통합**: 기존 split, delete, move 작업을 Virtual Timeline으로 통합
- **Frame-by-Frame Export**: WebCodecs API를 활용한 픽셀 단위 정확한 export
- **Plugin 호환**: 기존 animation plugin 시스템과 완전 호환
```
React Components ──▶ VirtualTimelineSlice (Zustand)
                              │
                              ▼
                    VirtualPlayerController
                    ├─ RVFC Engine
                    ├─ Virtual/Real time mapping
                    └─ Frame-precise synchronization
                              │
                              ▼
                    ┌─ VirtualSubtitleRenderer ─┐
                    │  ├─ Frame-based subtitle   │
                    │  ├─ Word-level timing     │
                    │  └─ Animation integration │
                    └─────────────────────────────┘
                              │
                              ▼
                    VirtualTimelineExporter
                    ├─ timeline.json generation
                    ├─ Frame-by-frame capture
                    └─ WebCodecs encoding
```
---
## 📁 폴더 구조

```
ecg-frontend/
├── 📁 .claude/                    # Claude AI 설정 및 문서
│   ├── 📁 achived/
│   ├── 📄 CLAUDE.md
│   ├── 📄 motiontext-renderer-usage.md
│   ├── 📄 non_destructive_editor.md
│   ├── 📁 scripts/
│   └── 📄 settings.local.json
├── 📁 .github/                    # GitHub Actions 워크플로우
│   └── 📁 workflows/
│       ├── 📄 cd.yml              # 배포 자동화
│       └── 📄 ci.yml              # CI 파이프라인
├── 📁 .husky/                     # Git hooks 설정
├── 📁 .vscode/                    # VS Code 설정
├── 📁 docs/                       # 프로젝트 문서
│   ├── 📁 archived/               # 아카이브된 문서들
│   ├── 📄 BACKEND_API_DOCUMENTATION.md
│   ├── 📁 fix list/
│   ├── 📄 line-split-plan.md
│   └── 📄 scenario-status-refactoring.md
├── 📁 public/                     # 정적 파일들
│   ├── 📁 asset-store/            # 에셋 스토어 데이터
│   ├── 📁 plugin/                 # 플러그인 관련 파일
│   ├── 📁 social-media-logo/      # 소셜미디어 로고
│   ├── 📁 templates/              # 템플릿들
│   └── 📁 youtube-upload/         # YouTube 업로드 관련
├── 📁 scripts/                    # 빌드 및 유틸리티 스크립트
├── 📁 src/                        # 소스 코드
│   ├── 📁 app/                    # Next.js App Router
│   │   ├── 📁 (main)/             # 메인 레이아웃 그룹
│   │   ├── 📁 (route)/            # 라우트 그룹
│   │   ├── 📁 api/                # API 라우트
│   │   ├── 📁 auth/               # 인증 관련
│   │   ├── 📁 shared/             # 공유 컴포넌트
│   │   ├── 📄 globals.css         # 글로벌 스타일
│   │   ├── 📄 layout.tsx          # 루트 레이아웃
│   │   └── 📄 page.tsx            # 메인 페이지
│   ├── 📁 components/             # React 컴포넌트
│   │   ├── 📁 auth/               # 인증 컴포넌트
│   │   ├── 📁 DragDrop/           # 드래그앤드롭
│   │   ├── 📁 icons/              # 아이콘 컴포넌트
│   │   ├── 📁 layout/             # 레이아웃 컴포넌트
│   │   ├── 📁 NewLandingPage/     # 새로운 랜딩페이지
│   │   ├── 📁 ui/                 # UI 기본 컴포넌트
│   │   └── 📁 UploadModal/        # 업로드 모달
│   ├── 📁 config/                 # 설정 파일
│   ├── 📁 hooks/                  # React 커스텀 훅
│   │   ├── 📄 useAuth.ts          # 인증 훅
│   │   ├── 📄 useUploadModal.ts   # 업로드 모달 훅
│   │   └── 📄 useWaveformGeneration.ts # 웨이브폼 생성 훅
│   ├── 📁 lib/                    # 라이브러리 및 유틸리티
│   │   ├── 📁 api/                # API 관련
│   │   ├── 📁 store/              # 상태 관리
│   │   ├── 📁 templates/          # 템플릿 관련
│   │   └── 📁 utils/              # 유틸리티 함수
│   ├── 📁 services/               # 비즈니스 로직 서비스
│   │   ├── 📁 api/                # API 서비스
│   │   ├── 📁 fonts/              # 폰트 서비스
│   │   ├── 📁 youtube/            # YouTube 관련 서비스
│   │   └── 📄 scenarioAwareChatBotService.ts
│   ├── 📁 types/                  # TypeScript 타입 정의
│   │   └── 📁 asset-store/        # 에셋 스토어 타입
│   └── 📁 utils/                  # 유틸리티 함수들
│       ├── 📁 audio/              # 오디오 관련 유틸
│       ├── 📁 editor/             # 에디터 관련 유틸
│       ├── 📁 managers/           # 매니저 클래스들
│       ├── 📁 speaker/            # 스피커/음성 관련
│       ├── 📁 storage/            # 스토리지 관련
│       ├── 📁 subtitle/           # 자막 관련
│       ├── 📁 timeline/           # 타임라인 관련
│       ├── 📁 transcription/      # 음성인식 관련
│       ├── 📁 ui/                 # UI 유틸리티
│       ├── 📁 video/              # 비디오 관련
│       └── 📁 virtual-timeline/   # 가상 타임라인
├── 📄 package.json                # 프로젝트 의존성
├── 📄 next.config.ts              # Next.js 설정
├── 📄 tsconfig.json               # TypeScript 설정
├── 📄 eslint.config.mjs           # ESLint 설정
├── 📄 jest.config.js              # Jest 테스트 설정
├── 📄 docker-compose.yml          # Docker 컴포즈 설정
├── 📄 Dockerfile                  # Docker 이미지 설정
└── 📄 README.md                   # 프로젝트 README
```

## 🔧 주요 기능별 폴더

### 📁 src/app/ - Next.js App Router
- **(main)**: 메인 레이아웃 그룹 (디자인 시스템 등)
- **(route)**: 주요 페이지들 (튜토리얼, 가입, 에셋 스토어, 마이페이지, 에디터)
- **api**: API 엔드포인트
- **auth**: 인증 관련 페이지

### 📁 src/components/ - UI 컴포넌트
- **auth**: 로그인/회원가입 컴포넌트
- **DragDrop**: 파일 드래그앤드롭 기능
- **NewLandingPage**: 새로운 랜딩페이지 컴포넌트
- **ui**: 재사용 가능한 UI 컴포넌트 (shadcn/ui 기반)
- **UploadModal**: 파일 업로드 모달

### 📁 src/utils/ - 유틸리티 함수
- **audio**: 오디오 처리 관련
- **editor**: 에디터 기능 관련
- **managers**: 각종 매니저 클래스
- **timeline**: 타임라인 관리
- **video**: 비디오 처리 관련

### 📁 src/services/ - 비즈니스 로직
- **api**: 백엔드 API 통신
- **youtube**: YouTube 업로드 기능
- **scenarioAwareChatBotService**: AI 챗봇 서비스

## 🛠 개발 도구 및 설정

### 코드 품질
- **ESLint**: 코드 린팅
- **Prettier**: 코드 포맷팅
- **Husky**: Git hooks 관리
- **lint-staged**: 스테이징된 파일만 린팅

### 테스팅
- **Jest**: 단위 테스트 프레임워크
- **테스트 파일**: `src/services/__tests__/`

### 배포 및 CI/CD
- **GitHub Actions**: CI/CD 파이프라인
- **Docker**: 컨테이너화
- **Vercel/Next.js**: 배포 플랫폼

## 📝 문서화
- **docs/**: 프로젝트 관련 문서들
- **.claude/**: Claude AI 관련 설정 및 가이드
- **README.md**: 프로젝트 개요 및 사용법