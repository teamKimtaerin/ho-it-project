# 🚨 Frontend 403 Authentication Issue - Resolution Report

## 문제 요약

- **증상**: 로그인 성공 후에도 파일 업로드 시 403 Forbidden 에러 발생
- **영향 범위**: 모든 업로드 관련 API 엔드포인트
- **근본 원인**: Frontend가 JWT 토큰을 백엔드로 전달하지 않음

## 영향받은 엔드포인트

1. `POST /api/upload-video/generate-url`
2. `POST /api/upload-video/request-process`
3. `GET /api/upload-video/status/{job_id}`

## 문제 분석

### 인증 플로우 차이점

#### ❌ 이전 상태 (문제 발생)

```typescript
// uploadService.ts - Authorization 헤더 누락
headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  // ❌ No Authorization header!
}
```

#### ✅ 수정 후 (정상 작동)

```typescript
// uploadService.ts - Authorization 헤더 포함
const token = useAuthStore.getState().token
if (token) {
  headers['Authorization'] = `Bearer ${token}`
}
```

### Next.js API 프록시 문제

프록시 라우트들이 클라이언트의 Authorization 헤더를 백엔드로 전달하지 않았음:

#### ❌ 이전 상태

```typescript
// API Route proxy - 헤더 전달 안 함
const response = await fetch(backendUrl, {
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})
```

#### ✅ 수정 후

```typescript
// API Route proxy - Authorization 헤더 전달
const authHeader = request.headers.get('Authorization')
if (authHeader) {
  headers['Authorization'] = authHeader
}
```

## 구현된 해결 방법

### 1. uploadService.ts 수정

- Zustand store에서 JWT 토큰 가져오기
- 모든 요청에 Authorization 헤더 추가
- 파일 경로: `/src/services/api/uploadService.ts`

### 2. API Route 프록시 수정

다음 파일들에서 Authorization 헤더 전달 로직 추가:

- `/src/app/api/upload-video/generate-url/route.ts`
- `/src/app/api/upload-video/request-process/route.ts` (renamed from process)
- `/src/app/api/upload-video/status/[jobId]/route.ts` (dynamic route 생성)

### 3. 동적 라우트 구조 변경

- Status 엔드포인트를 Next.js 15 동적 라우트로 변경
- `params`를 Promise로 처리하도록 업데이트

## 백엔드 팀 확인 사항

### 1. 인증 요구사항 확인

다음 엔드포인트들이 모두 JWT 인증을 요구하는지 확인 필요:

- `POST /api/upload-video/generate-url`
- `POST /api/upload-video/request-process`
- `GET /api/upload-video/status/{job_id}`

### 2. 에러 코드 처리

- 401 Unauthorized: 토큰 만료 또는 유효하지 않음
- 403 Forbidden: 권한 부족
- 두 에러를 구분해서 처리해야 하는지?

### 3. 토큰 갱신 플로우

- Access token 만료 시 refresh token으로 갱신하는 플로우가 있는지?
- 현재는 토큰 만료 시 로그인 페이지로 리다이렉트

## 테스트 체크리스트

- [ ] 로그인 후 파일 업로드 성공 확인
- [ ] 토큰 없이 업로드 시도 → 403 에러 확인
- [ ] 토큰 만료 후 업로드 시도 → 적절한 에러 처리
- [ ] 대용량 파일 업로드 시 토큰 유지 확인

## 모니터링 포인트

1. **Frontend Console**: Authorization 헤더 전달 로그
2. **API Route Logs**: 헤더 포워딩 확인 로그
3. **Backend Logs**: 인증 성공/실패 로그

## 추가 개선 사항

1. **토큰 자동 갱신**: Interceptor를 통한 자동 토큰 갱신
2. **에러 처리 개선**: 401/403 구분하여 사용자 친화적 메시지 표시
3. **보안 강화**: HttpOnly 쿠키 사용 고려

## 결론

Frontend에서 JWT 토큰을 모든 업로드 API 요청에 포함하도록 수정하여 403 에러 해결.
백엔드 팀과 인증 플로우 세부사항 확인 필요.

---

_작성일: 2025-09-16_
_작성자: Frontend Team_
