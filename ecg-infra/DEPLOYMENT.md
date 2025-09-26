# ECG 동영상 처리 파이프라인 - 배포 가이드

## 사전 요구사항

1. **AWS CLI** 설치 및 설정 완료
2. **Terraform** >= 1.0 설치
3. **Docker** 설치
4. AWS 리전에 **SSH 키 페어** 생성
5. 적절한 권한을 가진 AWS 계정

## 빠른 시작

### 1. 초기 설정

```bash
# 저장소로 이동
cd /Users/yerin/Desktop/ecg-infra

# 설정 파일 복사 및 편집
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars 파일을 편집하여 설정값 입력

# SSH 키 페어 생성 (없는 경우)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa
```

### 2. 변수 설정

`terraform.tfvars` 파일 편집:

```hcl
# AWS 설정
aws_region = "ap-northeast-2"

# 프로젝트 설정
project_name = "ecg-video-pipeline"
environment  = "dev"

# 첫 배포 후 ECR 저장소 URL로 업데이트
api_container_image = "your-account-id.dkr.ecr.ap-northeast-2.amazonaws.com/ecg-video-pipeline-dev-api:latest"

# 모델 서버 인스턴스 타입 (GPU 권장)
model_instance_type = "g4dn.xlarge"
```

### 3. 인프라 배포

```bash
# 배포 스크립트 사용
./scripts/deploy.sh dev ap-northeast-2

# 또는 수동 배포:
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

## 아키텍처 구성 요소

### 네트워크 인프라
- **VPC**: 격리된 네트워크 환경
- **퍼블릭 서브넷**: ALB 및 NAT 게이트웨이용
- **프라이빗 서브넷**: ECS 태스크 및 EC2 모델 서버용
- **인터넷 게이트웨이**: 퍼블릭 인터넷 액세스용
- **NAT 게이트웨이**: 프라이빗 서브넷 인터넷 액세스용

### 컴퓨팅 리소스
- **ECS 클러스터**: Fargate 기반 API 서버
- **EC2 인스턴스**: GPU 지원 모델 서버
- **Application Load Balancer**: 트래픽 분산

### 스토리지 & CDN
- **S3 버킷**: 동영상 저장 및 CloudFront 로그
- **CloudFront**: 콘텐츠 전송 및 프론트엔드 호스팅

### 보안
- **보안 그룹**: 네트워크 액세스 제어
- **IAM 역할**: 서비스 권한
- **S3 버킷 정책**: 안전한 액세스 제어

## 배포 플로우

1. **브라우저 업로드**: 사용자가 웹 인터페이스를 통해 동영상 업로드
2. **API 처리**: ECS API 서버가 동영상을 수신하고 S3에 저장
3. **모델 처리**: API가 동영상 분석을 위해 EC2 모델 서버 호출
4. **결과 처리**: 모델 서버가 자막/애니메이션이 포함된 JSON 반환
5. **콘텐츠 전송**: CloudFront가 프론트엔드를 서비스하고 동영상 스트리밍

## 주요 출력값

배포 후 다음 정보를 얻을 수 있습니다:

- **CloudFront URL**: `https://d123456789.cloudfront.net`
- **API Load Balancer**: `http://alb-123456789.ap-northeast-2.elb.amazonaws.com`
- **S3 버킷**: `ecg-video-pipeline-dev-video-storage-12345678`
- **ECR 저장소**: `123456789.dkr.ecr.ap-northeast-2.amazonaws.com/ecg-video-pipeline-dev-api`

## 애플리케이션 코드 빌드 및 배포

### API 서버 (백엔드)

```bash
# ECR 저장소 URL 가져오기
ECR_REPO=$(terraform output -raw ecr_api_repository_url)

# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin $ECR_REPO

# API 빌드 및 푸시
cd ../ecg-backend
docker build -t $ECR_REPO:latest .
docker push $ECR_REPO:latest

# ECS 서비스 업데이트
aws ecs update-service --cluster $(terraform output -raw ecs_cluster_name) --service $(terraform output -raw ecs_service_name) --force-new-deployment
```

### 프론트엔드

```bash
# 프론트엔드 빌드
cd ../ecg-frontend
npm run build

# S3에 배포
S3_BUCKET=$(terraform output -raw s3_video_storage_bucket)
aws s3 sync ./dist/ s3://$S3_BUCKET/ --delete

# CloudFront 캐시 무효화
aws cloudfront create-invalidation --distribution-id $(terraform output -raw cloudfront_distribution_id) --paths "/*"
```

## 모델 서버

EC2 모델 서버는 다음과 같이 자동 구성됩니다:
- Python 3 및 필수 패키지
- 컨테이너화된 워크로드용 Docker
- 동영상 파일용 S3 액세스
- 기본 FastAPI 서버 템플릿

모델 서버 접속:
```bash
# 모델 서버 인스턴스 정보 가져오기
INSTANCE_ID=$(terraform output -raw model_server_instance_id)
PRIVATE_IP=$(terraform output -raw model_server_private_ip)

# Session Manager를 통한 접속 (권장)
aws ssm start-session --target $INSTANCE_ID

# 또는 베스천 호스트를 통한 SSH 접속
ssh -i ~/.ssh/id_rsa ec2-user@$PRIVATE_IP
```

## 모니터링 및 로그

- **CloudWatch Logs**: `/ecs/ecg-video-pipeline-dev-api`
- **ECS 서비스 메트릭**: CloudWatch에서 확인 가능
- **ALB 액세스 로그**: CloudWatch에 저장
- **모델 서버 로그**: `/var/log/model-server.log`

## 스케일링

### ECS 오토 스케일링
```bash
# 원하는 인스턴스 수 업데이트
aws ecs update-service --cluster $(terraform output -raw ecs_cluster_name) --service $(terraform output -raw ecs_service_name) --desired-count 3
```

### 모델 서버 스케일링
여러 모델 서버를 위해서는 `ec2.tf`를 수정하여 Auto Scaling Groups를 사용하세요.

## 정리

```bash
# 먼저 S3 버킷 비우기
S3_BUCKET=$(terraform output -raw s3_video_storage_bucket)
aws s3 rm s3://$S3_BUCKET --recursive

# 인프라 삭제
./scripts/destroy.sh

# 또는 수동 삭제
terraform destroy -var-file="terraform.tfvars"
```

## 문제 해결

### 일반적인 문제들

1. **ECS 태스크 시작 실패**
   - CloudWatch 로그 확인: `/ecs/ecg-video-pipeline-dev-api`
   - ECR 이미지가 존재하고 액세스 가능한지 확인
   - ECS 태스크 정의의 환경 변수 확인

2. **모델 서버가 응답하지 않음**
   - 인스턴스에 SSH 접속하여 서비스 확인: `sudo systemctl status model-server`
   - 로그 확인: `sudo tail -f /var/log/model-server.log`
   - 보안 그룹이 ECS로부터의 트래픽을 허용하는지 확인

3. **CloudFront가 프론트엔드를 서비스하지 않음**
   - S3 버킷 내용 확인
   - CloudFront 원본 설정 확인
   - CloudFront 오류 페이지 구성 확인

4. **권한 오류**
   - IAM 역할에 올바른 정책이 있는지 확인
   - S3 버킷 정책 확인
   - ECS 태스크 역할에 S3 권한이 있는지 확인

### 상태 확인

- **API 상태**: `http://alb-url/health`
- **모델 서버 상태**: `http://model-server-ip:8080/health`
- **프론트엔드**: CloudFront URL 액세스

## 보안 고려사항

- 모델 서버 SSH 액세스가 0.0.0.0/0으로 열려 있습니다 - 프로덕션에서는 IP를 제한하세요
- 프로덕션 배포시 HTTPS/SSL 인증서 사용
- 프로덕션에서 CloudFront용 WAF 활성화
- 네트워크 모니터링을 위해 VPC Flow Logs 구성
- 민감한 설정을 위해 AWS Secrets Manager 사용

## 비용 최적화

- 비프로덕션 환경에서는 모델 서버에 스팟 인스턴스 사용
- 오래된 동영상을 위한 S3 수명주기 정책 구현
- CloudFront 캐싱 효과적으로 활용
- ECS 태스크 모니터링 및 적절한 크기 조정
- 예측 가능한 워크로드에는 예약 인스턴스 사용