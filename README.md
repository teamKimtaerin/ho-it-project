# Hoit (Sub : Expressive Caption Generator)

🎬 **AI 기반 동적 자막 생성 플랫폼**

동영상에 화자별 감정 분석과 동적 애니메이션이 포함된 표현력 있는 자막을 자동으로 생성하는 웹 서비스입니다.

## 📖 목차

- [🌐 서비스 목적](#-서비스-목적)
- [🗓️ 개발 기간](#️-개발-기간)
- [📽️ 시연 영상](#️-시연-영상)
- [👥 Team members](#-team-members)
- [🛠️ 기술 스택](#️-기술-스택)
- [⚙️ Architecture](#️-architecture)
- [⭐ 기능](#-기능)
  - [영상 업로드 및 분석](#영상-업로드-및-분석)
  - [화자 분리 및 감정 분석](#화자-분리-및-감정-분석)
  - [동적 자막 편집](#동적-자막-편집)
  - [실시간 미리보기](#실시간-미리보기)
  - [GPU 가속 렌더링](#gpu-가속-렌더링)
  - [사용자 인증](#사용자-인증)

---

## 🌐 서비스 목적

기존의 정적인 자막 시스템을 넘어서, **AI가 화자의 톤과 억양을 분석**하여 자동으로 **동적 애니메이션 자막**을 생성합니다.

### 주요 포인트
- 🎯 **다중 화자 자동 식별**: WhisperX 기반 정밀 화자 분리
- ✨ **동적 애니메이션**: 감정에 따른 자막 스타일 자동 적용
- 🎨 **표현력 있는 UI**: 감정별 색상, 크기, 애니메이션 효과
- ⚡ **고속 처리**: GPU 가속으로 30초 영상을 10초만에 처리

이를 통해 유튜브 크리에이터, 교육 콘텐츠 제작자, 기업 홍보 영상 등에서 **더욱 생동감 있고 매력적인 자막**을 손쉽게 만들 수 있습니다.

---

## 🗓️ 개발 기간

**2025년 8월 24일 ~ 2025년 9월 27일(5주)** 

---

## 👥 Team members

| 역할 | 이름 | GitHub |
|------|------|--------|
| Backend & ML | 안태주 | [Github](https://github.com) |
| Frontend | 김동규 | [Github](https://github.com) |
| Frontend | 박혜린 | [Github](https://github.com) |
| Backend & Infrastructure | 신예린 | [Github](https://github.com) |
| Frontend & Animation Render | 김기래 | [Github](https://github.com) |

---

## 🛠️ 기술 스택

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

### Backend & ML
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![WhisperX](https://img.shields.io/badge/WhisperX-412991?style=for-the-badge&logo=openai&logoColor=white)

### Rendering & Processing
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)

### Infrastructure
![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-623CE4?style=for-the-badge&logo=terraform&logoColor=white)

---

## ⚙️ Architecture

### 전체 시스템 구조

![Hoit Architecture](./hoit-architecture.png)

### 2단계 처리 파이프라인

#### Phase 1: 영상 업로드 및 AI 분석
```
1. 사용자 영상 업로드 → S3 스토리지
2. ML 서버에 분석 요청 전송
3. WhisperX로 음성 → 텍스트 변환
4. pyannote로 화자 분리 수행
5. 분석 결과를 데이터베이스 저장
```

#### Phase 2: 자막 편집 및 렌더링
```
1. 웹 편집기에서 자막 스타일링
2. MotionText(자체 렌더러)로 애니메이션 시나리오 생성
3. Puppeteer로 웹 기반 애니메이션 렌더링
4. FFmpeg로 원본 영상과 합성
5. 최종 영상을 S3에 업로드
```

---

## ⭐ 기능

### 영상 업로드 및 분석
- **다양한 형식 지원**: MP4, MOV, AVI 등 주요 영상 포맷
- **대용량 파일 처리**: S3 Direct Upload로 최대 5GB 지원
- **실시간 진행률**: 업로드 진행 상황 실시간 표시
- **메타데이터 자동 추출**: 해상도, 프레임율, 코덱 정보

### 화자 분리 및 감정 분석
- **정밀한 화자 식별**: WhisperX + pyannote 조합으로 95% 이상 정확도
- **화자별 색상 매핑**: 자동으로 화자별 고유 색상 할당


### 동적 자막 편집
- **드래그 앤 드롭 편집**: 직관적인 타임라인 기반 편집
- **17가지 애니메이션 효과**: fadeIn, pop, bounce, shake 등 다양한 효과
- **감정별 자동 스타일링**: 감정에 따른 색상, 크기, 애니메이션 자동 적용
- **실시간 미리보기**: 편집과 동시에 결과 확인 가능
- **템플릿 시스템**: 사전 정의된 스타일 템플릿 제공


### 실시간 미리보기
- **프레임 단위 동기화**: requestVideoFrameCallback 기반 정밀 동기화
- **다중 해상도 지원**: 16:9, 9:16, 1:1 등 다양한 종횡비
- **반응형 레이아웃**: 다양한 화면 크기에 자동 대응
- **키보드 단축키**: 스페이스바 재생/일시정지, 화살표 탐색

### GPU 가속 렌더링
- **고속 처리 성능**: 30분 영상을 3-5분만에 렌더링
- **하드웨어 가속**: NVENC 기반 GPU 인코딩
- **청크 기반 처리**: 대용량 영상도 안정적 처리
- **품질 최적화**: H.264/H.265 고품질 인코딩
- **진행률 추적**: 실시간 렌더링 진행 상황 모니터링

![렌더링](https://via.placeholder.com/600x300/fff3e0/000000?text=GPU+가속+렌더링)

---

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- AWS 계정 (S3, ECS)

### 로컬 개발 환경 구성

1. **저장소 클론**
```bash
git clone https://github.com/teamKimtaerin/ecg-project.git
cd ecg-project
```

2. **백엔드 실행**
```bash
cd ecg-backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

3. **프론트엔드 실행**
```bash
cd ecg-frontend
npm install
npm run dev
```

4. **ML 서버 실행**
```bash
cd ecg-audio-analyzer
pip install -r requirements.txt
python ml_api_server.py --host 0.0.0.0 --port 8080
```

5. **렌더링 서버 실행**
```bash
cd ecg-render
npm install
npm run dev
```

### Docker Compose로 전체 실행

```bash
docker-compose up -d
```

서비스 접속:
- 웹 앱: http://localhost:3000
- 백엔드 API: http://localhost:8000
- ML 서버: http://localhost:8080
- 렌더링 서버: http://localhost:3001

---
## 포스터
![Hoit Poster](./hoit-poster.png)


---

## 📁 프로젝트 구조

```
ecg-project/
├── ecg-frontend/           # Next.js 웹 애플리케이션
│   ├── src/app/           # App Router 기반 페이지
│   ├── src/components/    # React 컴포넌트
│   └── src/store/         # 상태 관리 (Zustand)
├── ecg-backend/           # FastAPI 백엔드 서버
│   ├── app/api/v1/        # REST API 엔드포인트
│   ├── app/models/        # SQLAlchemy 모델
│   └── app/services/      # 비즈니스 로직
├── ecg-audio-analyzer/    # ML 음성 분석 서버
│   ├── src/pipeline/      # WhisperX 파이프라인
│   ├── src/models/        # 음성 인식 모델
│   └── src/services/      # 화자 분리, 감정 분석
├── motiontext-renderer/   # 자막 애니메이션 엔진
│   ├── src/core/          # 렌더링 코어
│   ├── src/plugins/       # 애니메이션 플러그인
│   └── demo/              # 데모 및 샘플
├── ecg-render/            # GPU 렌더링 서버
│   ├── src/pipeline/      # 렌더링 파이프라인
│   ├── src/renderer/      # Puppeteer 렌더러
│   └── src/queue/         # BullMQ 작업 큐
└── ecg-infra/             # AWS 인프라 (Terraform)
    ├── terraform/         # 인프라 코드
    └── environments/      # 환경별 설정
```

---

## 🔗 관련 링크

- **프론트엔드**: [ecg-frontend](./ecg-frontend/)
- **백엔드**: [ecg-backend](./ecg-backend/)
- **ML 서버**: [ecg-audio-analyzer](./ecg-audio-analyzer/)
- **렌더링 엔진**: [motiontext-renderer](./motiontext-renderer/)
- **렌더링 서버**: [ecg-render](./ecg-render/)
- **인프라**: [ecg-infra](./ecg-infra/)