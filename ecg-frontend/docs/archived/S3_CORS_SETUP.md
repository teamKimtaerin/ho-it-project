# S3 CORS 설정 가이드

## 🚨 비디오 플레이어 "No supported sources" 오류 해결

### 문제 상황

- 비디오 파일이 S3에 업로드되어 있지만 브라우저에서 재생되지 않음
- 콘솔에서 CORS 관련 오류 메시지 표시
- "The element has no supported sources" 오류 발생

### 해결 방법: S3 버킷 CORS 설정

## 1. AWS Console을 통한 설정

### 단계 1: S3 버킷 접근

1. AWS Console → S3 서비스 접근
2. 해당 버킷 선택 (예: `ecg-project-pipeline-dev-video-storage`)

### 단계 2: CORS 설정 편집

1. 버킷의 **Permissions** 탭 클릭
2. **Cross-origin resource sharing (CORS)** 섹션 찾기
3. **Edit** 버튼 클릭

### 단계 3: CORS 규칙 적용

다음 JSON 설정을 복사하여 붙여넣기:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://yourdomain.com"
    ],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Type",
      "Content-Range",
      "Accept-Ranges",
      "Cache-Control",
      "Expires"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 단계 4: 설정 저장

**Save changes** 버튼 클릭

## 2. AWS CLI를 통한 설정

```bash
# CORS 설정 파일 업로드
aws s3api put-bucket-cors \
  --bucket your-bucket-name \
  --cors-configuration file://docs/S3_CORS_CONFIG.json
```

## 3. 도메인별 설정 가이드

### 개발 환경

```json
"AllowedOrigins": [
  "http://localhost:3000",
  "http://localhost:3001"
]
```

### 스테이징 환경

```json
"AllowedOrigins": [
  "https://staging.yourdomain.com"
]
```

### 프로덕션 환경

```json
"AllowedOrigins": [
  "https://yourdomain.com",
  "https://www.yourdomain.com"
]
```

## 4. 설정 검증

### 브라우저에서 확인

1. 개발자 도구 → Network 탭
2. 비디오 파일 요청 확인
3. Response Headers에서 다음 항목 확인:
   - `Access-Control-Allow-Origin: *` 또는 허용된 도메인
   - `Access-Control-Allow-Methods: GET, HEAD`

### curl로 테스트

```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://your-s3-bucket.amazonaws.com/video.mp4
```

## 5. 문제 해결

### 여전히 CORS 오류가 발생하는 경우

1. **캐시 클리어**: 브라우저 캐시와 개발자 도구 캐시 삭제
2. **설정 전파**: S3 CORS 설정 변경 후 최대 15분 대기
3. **도메인 확인**: AllowedOrigins에 현재 도메인이 정확히 포함되어 있는지 확인

### 디버깅 체크리스트

- [ ] S3 버킷 CORS 설정 적용됨
- [ ] AllowedOrigins에 현재 도메인 포함
- [ ] AllowedMethods에 GET, HEAD 포함
- [ ] 브라우저 캐시 클리어함
- [ ] 15분 이상 대기함
- [ ] Network 탭에서 CORS 헤더 확인함

## 6. 추가 고려사항

### Presigned URL 사용 시

Presigned URL을 사용하는 경우에도 CORS 설정이 필요합니다.

### CloudFront 사용 시

CloudFront를 통해 비디오를 서빙하는 경우:

1. CloudFront distribution에서 CORS 헤더 전달 설정
2. Origin Request Policy에서 필요한 헤더 포함

### 보안 고려사항

- 프로덕션에서는 와일드카드(`*`) 대신 명시적 도메인 사용
- HTTPS 도메인만 허용하는 것을 권장

---

## 연락처

CORS 설정 관련 문의:

- DevOps 팀: [담당자]
- 백엔드 팀: [담당자]

_Last updated: 2025-09-16_
