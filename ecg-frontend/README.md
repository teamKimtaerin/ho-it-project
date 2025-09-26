# Next.js Project

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🎬 ECG (Easy Caption Generator) Frontend

강력한 자막 편집 도구를 위한 Next.js 기반 프론트엔드 애플리케이션입니다.

## 🚀 PR 자동화 도구 - 팀원 설정 가이드

### 0. Github CLI 설치

```bash
brew install gh      # macOS
winget install Github.cli  # Windows
```

### 1. 최신 코드 받기

```bash
git pull origin main
```

### 2. 설치 스크립트 실행 (한 번만)

```bash
chmod +x install.sh
./install.sh
```

### 3. PATH 적용 (설치 후 한 번만)

```bash
source ~/.zshrc  # zsh 사용자 (macOS 기본)
source ~/.bashrc # bash 사용자
```

### 4. GitHub CLI 로그인 (각자 개인 계정으로)

```bash
gh auth login
# → GitHub.com 선택
# → HTTPS 선택
# → Y (인증)
# → Login with a web browser 선택
```

### 5. 사용 시작!

```bash
# 작업 후 변경사항 추가
git add .

# PR 생성 (자동 커밋 + 푸시 + Claude 분석 + PR)
prm "Feat: 첫 번째 테스트 PR"  # ⚠️ pr이 아닌 prm 사용!
```

### 📝 사용 흐름

1. **코드 작업** → 기능 구현
2. **`git add .`** → 변경사항 스테이징
3. **`prm "작업 내용"`** → 자동 커밋/푸시
4. **Claude Code 분석**
   - 클립보드에 자동 복사된 프롬프트를 claude.ai/code에 붙여넣기
   - 생성된 PR 내용 복사
5. **터미널에 붙여넣기** → PR 자동 생성!

### ⚠️ 주의사항

- 명령어는 `pr`이 아닌 `prm` (PR Make)
- 작업은 feature 브랜치에서 (main 브랜치 X)
- Claude Code 접속: https://claude.ai/code

---

## ⭐️ Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 🐳 Docker

### 1. Docker Desktop 실행

### 2. 실행 확인

```bash
# Docker Desktop이 완전히 시작될 때까지 1-2분 기다린 후
docker info

# 이렇게 나오면 성공
Server:
 Containers: X
 Running: X
 ...
```

### 3. 빌드 테스트

#### 개발환경 버전

```bash
# 개발환경 빌드 테스트
docker build --target dev -t ecg-frontend:dev .

# 개발 컨테이너 실행 (포트 매핑)
docker run -p 3000:3000 --rm ecg-frontend:dev
```

#### API 테스트

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/test
```

### 참고 명령어

```bash
# 현재 8000번 포트를 사용 중인 프로세스
lsof -i :8000

# 프로세스를 종료
kill -9 <PID>

# 기존에 실행 중인 Docker 컨테이너 확인 및 제거
docker ps -a

# 컨테이너 로그 확인
docker logs <컨테이너 이름 또는 ID>

# 기존 컨테이너 삭제
docker rm <컨테이너 이름 또는 ID>

# 실행 여부와 상관 없이 삭제
docker rm -f <컨테이너 이름 또는 ID>

# 컨테이너 정리
docker stop <컨테이너 이름 또는 ID> && docker rm <컨테이너 이름 또는 ID>
```

---

## ⚙️ CI Workflow (ci.yml)

### 워크플로우 트리거 조건 (`on`)

- `main` 또는 `dev` 브랜치에 푸시(push)되거나, `main` 또는 `dev` 브랜치를 대상으로 풀 리퀘스트(pull_request)가 생성/업데이트될 때 자동으로 실행

### 실행 작업 (`jobs`)

`build-and-test`라는 단일 작업(Job)으로 구성되어 있으며, 이 작업은 `ubuntu-latest` 가상 환경에서 순차적으로 여러 단계를 실행

#### 1. 코드 체크아웃

- `actions/checkout@v4` 액션을 사용하여 GitHub 저장소의 최신 코드를 가상 머신으로 가져옴

#### 2. 환경 설정

- `actions/setup-node@v4` 액션으로 Node.js 20 버전을 설정하고, `cache: 'yarn'` 옵션을 통해 의존성 캐싱을 활성화하여 빌드 시간을 단축
- `corepack enable` 명령어로 Yarn을 활성화하고, `yarn cache clean` 명령어로 캐시를 정리해 깨끗한 상태에서 시작

#### 3. 의존성 및 코드 품질 검사

- `yarn install` 명령어를 실행하여 프로젝트에 필요한 모든 의존성을 설치
- `yarn format:check`로 코드 포맷팅 규칙을 준수했는지 확인
- `yarn lint`로 코드의 잠재적 오류를 찾아내는 린팅 검사를 수행
- `yarn type-check`로 TypeScript의 타입 오류가 없는지 확인

#### 4. 빌드 및 테스트

- `yarn build` 명령어로 Next.js 프로젝트를 빌드하여 프로덕션 환경에서 문제가 없는지 검증
- **Jest 유닛 테스트**: `jest.config.*` 파일이 존재할 경우, `yarn test` 명령어를 실행하여 단위 및 통합 테스트를 수행
- **Playwright E2E 테스트**: `playwright.config.*` 파일이 존재할 경우, `yarn playwright install`로 브라우저를 설치한 후, `yarn test:e2e` 명령어로 실제 사용자처럼 동작하는 E2E 테스트를 실행

#### 5. Docker 빌드 테스트

- `docker build` 명령어를 사용하여 `dev`와 `prod` 환경용 Docker 이미지가 성공적으로 빌드되는지 확인
- 배포 과정에서 발생할 수 있는 빌드 문제를 사전 방지

#### 6. 테스트 결과 업로드

- `if: failure()` 조건에 따라, 위의 스텝들 중 하나라도 실패했을 경우 `actions/upload-artifact@v4` 액션이 실행
- `test-results/` 및 `playwright-report/` 디렉토리에 있는 테스트 리포트를 아티팩트(artifact)로 저장
