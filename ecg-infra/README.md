# ECG Video Processing Infrastructure

동영상에서 음성을 추출하고 감정 분석, 화자 분리를 통해 애니메이션 자막을 생성하는 웹서비스의 인프라스트럭처입니다.

## 아키텍처 ⭐ **S3 정적 호스팅 적용**

```
사용자 → CloudFront (3개 Origin)
  ├── /* → S3 (Frontend 정적 파일)
  ├── /api/* → ALB → ECS (FastAPI Backend)
  └── /videos/* → S3 (Video Storage)
            ↓
        EC2 (ML Model Server)
```

## 구성 요소

- **VPC**: 격리된 네트워크 환경 (10.0.0.0/16)
- **ECS Fargate**: FastAPI 백엔드 서버 (2개 인스턴스)
- **EC2 g4dn.xlarge**: ML 모델 서버 (GPU 인스턴스)
- **S3**: 
  - 프론트엔드 정적 파일 버킷 (Next.js)
  - 비디오 파일 저장 버킷
  - CloudFront 로그 버킷
- **CloudFront**: CDN 및 라우팅 (3개 Origin)
- **Application Load Balancer**: ECS 서비스 로드밸런싱

## 사전 요구사항

1. AWS CLI 설치 및 설정
2. Terraform 설치
3. AWS 계정 및 적절한 권한

## 배포 방법

### 1. 환경 설정

```bash
# AWS 자격증명 설정
aws configure

# 테라폼 초기화
cd terraform
terraform init
```

### 2. 변수 설정

`terraform.tfvars` 파일을 생성하고 다음 내용을 입력:

```hcl
# 복사해서 수정
cp terraform.tfvars.example terraform.tfvars

# 필수 수정 항목
api_container_image = "nginx:latest"  # 초기 배포용 임시 이미지
```

### 3. Next.js 설정 (S3 정적 호스팅) ⭐ **신규**

```bash
# 프론트엔드 설정 변경
cd ../ecg-frontend
# next.config.ts에서 output: 'export' 확인
```

### 4. 배포 실행

```bash
# 실행 계획 확인
terraform plan

# 인프라 생성 (임시 nginx 이미지)
terraform apply

# 백엔드 이미지 빌드 & ECR 푸시
ECR_REPO=$(terraform output -raw ecr_api_repository_url)
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin $ECR_REPO

cd ../ecg-backend
docker build -t $ECR_REPO:latest .
docker push $ECR_REPO:latest

# terraform.tfvars 실제 이미지로 업데이트 후 재배포
cd ../ecg-infra
terraform apply

# 프론트엔드 S3 배포
cd ../ecg-frontend
yarn build
S3_FRONTEND_BUCKET=$(terraform output -raw s3_frontend_bucket)
aws s3 sync ./out/ s3://$S3_FRONTEND_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id $(terraform output -raw cloudfront_distribution_id) --paths "/*"
```

### 4. 배포 확인

```bash
# 생성된 리소스 확인
terraform show
```

## 환경별 배포

- **개발 환경**: `environments/dev/`
- **스테이징 환경**: `environments/staging/`
- **프로덕션 환경**: `environments/prod/`

## 주요 출력값

배포 후 다음 정보들이 출력됩니다:

- VPC ID
- S3 버킷 이름들
- CloudFront 도메인
- 모델 서버 IP

## 정리

```bash
# 모든 리소스 삭제
terraform destroy
```

## 트러블슈팅

### 일반적인 문제들

1. **권한 부족**: IAM 권한 확인
2. **리전 설정**: 모든 리소스가 같은 리전에 있는지 확인
3. **키페어**: EC2 키페어가 해당 리전에 존재하는지 확인

## 연관 레포지토리

- Frontend: [ecg-frontend](https://github.com/teamKimtaerin/ecg-frontend)
- Backend: [ecg-backend](https://github.com/teamKimtaerin/ecg-backend)
