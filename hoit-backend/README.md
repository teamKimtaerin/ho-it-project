# 🎬 Expressive Caption Generator Backend

> FastAPI 기반 PR 자동화 및 백엔드 서비스

<br/>

## 📖 목차

1. [프로젝트 소개](#-프로젝트-소개)
2. [프로젝트 구조](#-프로젝트-구조)
3. [주요 기능](#-주요-기능)
4. [기술 스택](#-기술-스택)
5. [설치 및 실행](#-설치-및-실행)
6. [API 문서](#-api-문서)
7. [PR 자동화 시스템](#-pr-자동화-시스템)
8. [Docker](#-docker)
9. [CI/CD Workflow](#-cicd-workflow)
10. [Pre-commit 사용 가이드](#-pre-commit-사용-가이드)
11. [체크리스트 및 리뷰 포인트](#-체크리스트-및-리뷰-포인트)

<br/>

## 📌 프로젝트 소개

### 🤔 개발 배경

- FastAPI 기반 백엔드 프로젝트에서 **PR 자동화** 필요성 증가
- PR 작성에 소요되는 시간과 품질 편차 문제
- **Claude Code AI**를 통한 자동화된 워크플로우 필요

### 💡 프로젝트 목표

- **PR 자동 생성 및 관리 자동화**
- **팀 개발 생산성 향상**
- **표준화된 코드 품질 보장**
- **Docker 기반 배포 및 CI/CD 파이프라인** 구축

<br/>

## 📂 프로젝트 구조

```
expressive-caption-generator-backend/
├── app/
│   ├── main.py              # FastAPI 앱 진입점
│   ├── core/config.py       # 환경 설정
│   ├── db/                  # DB 연결
│   ├── models/              # SQLAlchemy 모델
│   ├── schemas/             # Pydantic 스키마
│   ├── services/            # 비즈니스 로직
│   └── api/v1/              # API 라우트
│       ├── endpoints/
│       └── routers.py
├── tests/
├── requirements.txt
├── .env.example
└── README.md
```

<br/>

## ✨ 주요 기능

- **PR 자동화 스크립트**: Bash 기반, Claude Code AI와 통합
- **GitHub CLI 연동**: 자동 커밋/푸시 및 PR 생성
- **CI/CD Workflow**: GitHub Actions 기반 테스트 및 배포 자동화
- **코드 품질 보장**: Black, Ruff, Mypy, Bandit 검사 자동화
- **Pre-commit Hooks**: 커밋 전 자동 포맷팅 및 검사

### 사용자 인증 및 관리
- **이중 인증 시스템**: 로컬 계정(이메일/비밀번호) + Google OAuth 2.0
- **JWT 토큰 기반**: Bearer 토큰 인증으로 24시간 세션 유지
- **사용자별 할당량 관리**: 일일/월간 렌더링 한도 및 동시 작업 제한
- **세션 관리**: OAuth 상태 처리 및 보안 토큰 갱신

### 비디오 처리 및 저장
- **AWS S3 통합**: Presigned URL 기반 안전한 파일 업로드/다운로드
- **비동기 작업 처리**: UUID 기반 작업 추적 및 상태 관리
- **ML 서버 연동**: WhisperX 음성 분석 서버와 콜백 기반 통신
- **메타데이터 관리**: 비디오 정보, 처리 상태, 결과 데이터 저장

### 프로젝트 관리 시스템
- **실시간 협업**: 다중 사용자 프로젝트 편집 및 동기화
- **버전 관리**: 프로젝트 변경 이력 추적 및 충돌 해결
- **계층적 구조**: 프로젝트 → 클립 → 단어 단위의 세밀한 관리
- **JSON 스키마**: PostgreSQL JSON 컬럼 활용한 유연한 데이터 구조

### GPU 렌더링 서비스
- **할당량 시스템**: 사용자별 일일/월간 렌더링 제한 관리
- **속도 제한**: 분당 20회 요청 제한으로 서버 보호
- **실시간 진행률**: 렌더링 진행 상황 실시간 추적
- **에러 핸들링**: 통합 에러 응답 시스템 및 재시도 로직

### 데이터베이스 및 인프라
- **자동 초기화**: SQLAlchemy 모델 기반 테이블 자동 생성
- **개발 데이터**: 테스트용 사용자 및 샘플 데이터 자동 생성
- **연결 풀링**: 프로덕션 확장성을 위한 데이터베이스 최적화
- **헬스 체크**: Docker 기반 서비스 상태 모니터링

### API 문서화 및 보안
- **자동 문서화**: FastAPI 기반 Swagger UI (/docs) 및 ReDoc (/redoc)
- **CORS 설정**: 환경별 프론트엔드 URL 화이트리스트
- **보안 검사**: Bandit 기반 취약점 스캔 및 사전 커밋 훅
- **환경별 설정**: Pydantic Settings로 개발/프로덕션 환경 분리

<br/>

## 🛠️ 기술 스택

| 구분             | 기술                      |
| ---------------- | ------------------------- |
| **Framework**    | FastAPI, Uvicorn          |
| **Language**     | Python 3.11               |
| **Infra/DevOps** | GitHub Actions, Docker    |
| **Code Quality** | Black, Ruff, Mypy, Bandit |
| **AI 통합**      | Claude Code               |

<br/>

## 🚀 설치 및 실행

### 1. 환경 설정

```bash
git clone https://github.com/your-username/expressive-caption-generator-backend.git
cd expressive-caption-generator-backend

python -m venv venv
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

pip install -r requirements.txt
cp .env.example .env
```

### 2. 서버 실행

```bash
uvicorn app.main:app --reload
```

<br/>

## 📑 API 문서

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

<br/>

## 🔄 PR 자동화 시스템

- **자동 커밋 및 푸시**
- **Claude Code 분석 및 PR 생성**
- **브라우저 자동 연동**
- **팀 환경 설정 자동화 스크립트 제공**

<br/>

## 🐳 Docker

```bash
# 개발환경 빌드
docker build --target dev -t ecg-backend:dev .
docker run -d -p 8000:8000 ecg-backend:dev

# 프로덕션 빌드
docker build --target prod -t ecg-backend:prod .
docker run -d -p 8001:8000 ecg-backend:prod
```

<br/>

## ⚙️ CI/CD Workflow

- **트리거**: main/dev 브랜치 push 및 PR 시 실행
- **검증 단계**: Black, Ruff, Mypy, Bandit 검사
- **테스트 단계**: pytest 실행
- **배포 단계**: Docker 이미지 빌드 및 배포

<br/>

## 🔧 Pre-commit 사용 가이드

```bash
pip install pre-commit
pre-commit install
```

- **Black**: 코드 포맷팅
- **Ruff**: 린터
- **Mypy**: 타입 검사

<br/>

## 📋 체크리스트 및 리뷰 포인트

- [x] 기능 테스트 완료
- [x] 코드 리뷰 준비 완료
- [ ] 온보딩 테스트 진행

### 리뷰 포인트

- Bash 스크립트 보안성
- Windows/Linux 호환성
- Claude Code 프롬프트 품질
