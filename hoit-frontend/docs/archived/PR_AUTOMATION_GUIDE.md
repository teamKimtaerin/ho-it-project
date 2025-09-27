# 🚀 PR 자동화 도구 사용 가이드

## 📦 설치 방법 (처음 한 번만)

```bash
# 1. 설치 스크립트 실행
./install.sh

# 2. PATH 적용
source ~/.zshrc  # zsh 사용자
source ~/.bashrc # bash 사용자

# 3. GitHub CLI 인증
gh auth login
```

## 🎯 사용법

```bash
# 1. 코드 작업 후 변경사항 추가
git add .

# 2. PR 생성 (자동 커밋 + 푸시 + PR)
prm "Feat: 블로그 생성"
```

## 📝 상세 흐름

1. **코드 작업** → 원하는 기능 구현
2. **`git add .`** → 변경사항 스테이징
3. **`prm "작업 내용"`** → PR 자동화 실행
   - 자동 커밋 ✅
   - 자동 푸시 ✅
   - Claude Code 프롬프트 클립보드 복사 ✅
4. **Claude Code에서 분석**
   - [claude.ai/code](https://claude.ai/code) 접속
   - Cmd+V로 프롬프트 붙여넣기
   - 생성된 PR 제목과 본문 복사
5. **터미널에서 PR 완성**
   - Enter 누르고 Claude 분석 결과 붙여넣기
   - GitHub PR 자동 생성!

## ⚠️ 주의사항

- `prm` 명령어 사용 (시스템 `pr` 명령어와 충돌 방지)
- main/master 브랜치에서는 직접 PR 생성 불가
- 작업은 항상 feature 브랜치에서!

## 🛠 필수 요구사항

- GitHub CLI (`brew install gh`)
- GitHub 인증 (`gh auth login`)
- Claude Code 접속 권한

## 💡 PR 제목 컨벤션

- `[Feat]` - 새로운 기능
- `[Fix]` - 버그 수정
- `[Refactor]` - 코드 리팩토링
- `[Docs]` - 문서 수정
- `[Test]` - 테스트 추가

## 🆘 문제 해결

### prm 명령어를 찾을 수 없을 때

```bash
source ~/.zshrc  # 또는 ~/.bashrc
```

### GitHub CLI 인증 문제

```bash
gh auth status  # 상태 확인
gh auth login   # 재로그인
```

## 📂 파일 구조

```
.claude/
├── scripts/
│   └── prm         # PR 자동화 스크립트
├── CLAUDE.md       # 프로젝트 가이드
└── settings.local.json
install.sh          # 설치 스크립트
```

---

🤝 **팀원과 공유하세요!** 이 도구로 PR 작성 시간을 단축하고 일관된 PR 품질을 유지할 수 있습니다.
