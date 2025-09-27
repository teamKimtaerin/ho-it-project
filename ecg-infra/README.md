# ☁️ ECG Video Processing Infrastructure

> Terraform 기반 고성능 비디오 처리 및 음성 분석 인프라

<br/>

## 📖 목차

1. [프로젝트 소개](#-프로젝트-소개)
2. [주요 기능](#-주요-기능)
3. [기술 스택](#-기술-스택)
4. [시스템 아키텍처](#-시스템-아키텍처)
5. [설치 및 실행](#-설치-및-실행)
6. [환경별 배포](#-환경별-배포)
7. [트러블슈팅](#-트러블슈팅)
8. [연관 레포지토리](#-연관-레포지토리)

<br/>

## 📌 프로젝트 소개

### 🤔 개발 배경

- 대규모 비디오 처리와 자막 생성을 위한 안정적 인프라 필요
- **확장성**과 **고가용성**을 동시에 만족해야 함
- Terraform 기반 IaC로 **자동화된 인프라 관리** 추구

### 💡 목표

- **S3 정적 호스팅** 기반 프론트엔드 배포
- **ECS Fargate** 기반 서버리스 백엔드 운영
- **GPU EC2 인스턴스**를 통한 ML 모델 처리
- **CloudFront CDN**으로 전세계 서비스 최적화

<br/>

## ✨ 주요 기능

- **S3 정적 호스팅**: Next.js 빌드 파일 배포
- **ECS Fargate**: FastAPI 백엔드 실행
- **EC2 GPU 서버**: WhisperX/화자 분리 모델 실행
- **CloudFront CDN**: 3개 Origin 라우팅
- **Terraform IaC**: 일관된 인프라 배포 및 관리

<br/>

## 🛠️ 기술 스택

| 구분            | 기술                  |
| --------------- | --------------------- |
| **IaC**         | Terraform             |
| **컨테이너**    | ECS Fargate, Docker   |
| **네트워크**    | VPC, ALB, CloudFront  |
| **스토리지**    | S3                    |
| **ML 서버**     | EC2 g4dn.xlarge (GPU) |
| **배포 자동화** | AWS CLI, Terraform    |

<br/>

## ⚙️ 시스템 아키텍처

```
사용자 → CloudFront (3개 Origin)
  ├── /* → S3 (Frontend)
  ├── /api/* → ALB → ECS (Backend)
  └── /videos/* → S3 (Video Storage)
            ↓
        EC2 (ML Server)
```

### 📁 주요 구성 요소

- **VPC**: 격리된 네트워크 환경 (10.0.0.0/16)
- **ECS Fargate**: FastAPI 백엔드 서버 (2개 인스턴스)
- **EC2 GPU 서버**: ML 모델 실행 (WhisperX, Pyannote)
- **S3 버킷**: 정적 파일, 비디오 저장, 로그 관리
- **CloudFront**: 글로벌 CDN
- **ALB**: ECS 서비스 로드밸런싱

<br/>

## 🚀 설치 및 실행

### 1. 사전 요구사항

- AWS CLI 설치 및 설정
- Terraform 설치
- AWS 계정 및 IAM 권한

### 2. 배포 과정

```bash
aws configure
cd terraform
terraform init

cp terraform.tfvars.example terraform.tfvars
terraform plan
terraform apply
```

### 3. 프론트엔드 배포

```bash
cd ../ecg-frontend
yarn build
S3_BUCKET=$(terraform output -raw s3_frontend_bucket)
aws s3 sync ./out/ s3://$S3_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id $(terraform output -raw cloudfront_distribution_id) --paths "/*"
```

<br/>

## 🆘 트러블슈팅

- **권한 부족**: IAM 권한 확인
- **리전 설정 오류**: 모든 리소스가 같은 리전에 있는지 확인
- **EC2 키페어 오류**: 올바른 리전에 키페어가 존재하는지 확인

<br/>

## 🔗 연관 레포지토리

- **Frontend**: [ecg-frontend](https://github.com/teamKimtaerin/ecg-frontend)
- **Backend**: [ecg-backend](https://github.com/teamKimtaerin/ecg-backend)
