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
