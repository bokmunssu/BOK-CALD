# 📅 TOMO CALENDAR

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[다운로드](https://github.com/bokmunssu/BOK-CALD/releases) · [문제 보고](https://github.com/bokmunssu/BOK-CALD/issues)

SHINYA CALENDAR를 기반으로 bokmunssu가 유지보수하는 별도의 캘린더입니다. 원본 제작자의 공식 업데이트가 아니며 MIT 라이선스와 원본 기여를 존중합니다.

## 2.0.0 테스트 빌드
- 앱 이름, 패키지, 앱 ID, 아이콘, 설치 이름, 저장 위치를 **TOMO CALENDAR**로 분리했습니다. 기존 앱과 별도로 설치되며 데이터는 자동 이전하지 않습니다.
- 심플 모드는 테마색을 그대로 유지합니다. 이미지 배너·스티커 꾸미기도 지원합니다.
- 상단 **배너 설정**에서 숨김 및 높이 **40–240px**를 조절합니다. 높이를 바꾸면 배너가 즉시 표시됩니다. 작은 창에서는 캘린더 영역을 스크롤해 하단 날짜에 접근합니다.
- 캘린더 사이드바는 **일정 / 할 일 / 메모**입니다. 별도 리스트 기능 없이 할 일과 같은 데이터를 사용합니다.
- **할 일**은 검색, 완료/중요 필터, 기한, 태그와 선택형 이미지 배너를 지원합니다. 달력과 위젯의 변경은 함께 저장됩니다.
- **메모**는 접힌 모서리의 스티커 카드입니다. 각 메모를 독립 창으로 열고 이미지, 제목, 굵게·기울임·밑줄·취소선과 배경색을 설정합니다. 자동 저장하며 여러 창을 동시에 사용할 수 있습니다.
- **D-DAY 관리**에서 각 날짜를 개별 위젯으로 엽니다. 별도 D-DAY 목록 위젯은 제공하지 않습니다.
- **뽀모도로**는 원형 진행 표시, 집중/휴식 설정, 일시정지·초기화·완료 알림을 지원합니다.
- **작업시간**은 지정한 프로그램/탭이 활성화된 시간만 기록하고 전체/오늘/대상별 시간을 보여줍니다.
- 활성 창 감지는 Windows에서 지원합니다. 대상 지정 후 4초 안에 원하는 창으로 전환하고 프로그램 전체 또는 정확한 창 제목을 선택합니다. 제목이 같은 탭은 구분하지 못하며 제목 변경 시 다시 지정해야 합니다.
- 감지 간격은 0.5초이며 전환·잠금·절전 경계 시간을 보수적으로 제외합니다. 잠금·절전 후에는 직접 다시 시작합니다. 관측한 창 제목 이력을 저장/전송하지 않습니다.
- 모든 위젯은 **핀 버튼**으로 맨 위 고정을 전환합니다. 위치·크기·고정 상태를 복원합니다.
- 캘린더를 닫아도 열린 위젯은 유지됩니다. 위젯의 캘린더 버튼으로 본체를 다시 엽니다. 마지막 창을 닫으면 Windows 앱이 종료됩니다.
- **공휴일** 체크로 한국 공휴일 날짜의 빨간 표시를 전환합니다. 인터넷/API 키 없이 2018–2027년 데이터를 사용합니다. 그 밖의 연도는 안내 문구를 표시하며 매년 데이터 갱신이 필요합니다.
- 일기 및 공유 캘린더 기능을 제거했습니다. 원본 제작자의 API/공유 기능을 사용하지 않습니다. [점검 기록](docs/SOURCE_AUDIT.md).
- 업데이트 확인은 **bokmunssu/BOK-CALD Releases**를 사용합니다. 버전 안내와 다운로드 페이지 이동을 제공하며 자동 무인 설치는 아닙니다.

## Windows에서 실행
Releases의 **Assets**에서 `TOMO-CALENDAR-Setup-2.0.0-x64.exe`를 실행해 설치합니다. 설치 없이 시험하려면 `TOMO-CALENDAR-2.0.0-win-x64.exe`를 실행합니다. GitHub의 **Source code (zip)**은 소스이며 실행 파일이 아닙니다.

이 빌드는 기능 확인용입니다. [TESTING.md](TESTING.md)의 검증 범위와 미확인 항목을 확인하세요.

## Microsoft To Do
사용자는 **Microsoft 계정 로그인 → 목록 선택 → 지금 동기화**만 하면 됩니다. 개인 API 키 입력은 없습니다. 다만 현재 테스트 빌드는 배포자 Microsoft 앱 등록 ID가 없어 로그인 버튼이 비활성화됩니다. 구현된 동기화는 모의 Graph로 검증했으며 실계정 검증은 등록 완료 후 진행합니다.

배포자 1회 등록 방법과 동기화 정책은 [Microsoft To Do 안내](docs/MICROSOFT_TODO.md)를 참고하세요.


## 개발자용: 소스에서 빌드

#### 필수 요구사항

- Node.js 22 LTS 이상
- Yarn 패키지 매니저

#### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/bokmunssu/BOK-CALD.git
cd BOK-CALD

# 의존성 설치
yarn install

# 개발 모드 실행
yarn dev

# 프로덕션 빌드
yarn build
```

## 🛠️ 기술 스택

- **Frontend**: React, TypeScript, Recoil
- **Desktop**: Electron
- **Styling**: SCSS Modules
- **Build**: Vite, electron-builder
- **Date Handling**: date-fns, rrule
- **API Integration**: Google Calendar API v3, Microsoft Graph v1.0

---

## 👨‍💻 개발자를 위한 정보

### Git 브랜치 전략

이 프로젝트는 **Feature Branch Workflow**를 따릅니다:

```
master (main)
  ├── feature/새로운-기능
  ├── fix/버그-수정
  └── enhance/기능-개선
```

### 기여 가이드라인

1. **Fork & Clone**

   ```bash
   # 저장소 Fork 후
   git clone https://github.com/[your-username]/BOK-CALD.git
   cd BOK-CALD
   ```

2. **Feature Branch 생성**

   ```bash
   # 새로운 기능 개발
   git checkout -b feature/amazing-feature

   # 버그 수정
   git checkout -b fix/issue-123

   # 기능 개선
   git checkout -b enhance/improve-performance
   ```

3. **개발 및 커밋**

   ```bash
   # 변경사항 확인
   git status

   # 스테이징
   git add .

   # 커밋 (명확한 메시지 작성)
   git commit -m "feat: Add amazing feature

   - Detailed description of what changed
   - Why this change was necessary"
   ```

4. **Push & Pull Request**
   ```bash
   git push origin feature/amazing-feature
   ```
   그 후 GitHub에서 Pull Request를 생성합니다.

### 커밋 메시지 규칙

- `feat:` 새로운 기능 추가
- `fix:` 버그 수정
- `docs:` 문서 수정
- `style:` 코드 포맷팅, 세미콜론 누락 등
- `refactor:` 코드 리팩토링
- `test:` 테스트 추가 또는 수정
- `chore:` 빌드 업무, 패키지 매니저 설정 등

### 코드 스타일

- TypeScript 엄격 모드 사용
- React 함수형 컴포넌트 선호
- SCSS 모듈을 통한 스타일 캡슐화
- 의미있는 변수명과 함수명 사용

### Pull Request 체크리스트

- [ ] 코드가 프로젝트 스타일 가이드를 따르는가?
- [ ] 모든 테스트가 통과하는가? (`yarn test:run`)
- [ ] 테스트 커버리지가 80% 이상인가? (`yarn test:coverage`)
- [ ] 새로운 기능에 대한 테스트를 작성했는가?
- [ ] TypeScript 에러가 없는가? (`yarn typecheck`)
- [ ] 새로운 기능에 대한 문서를 추가했는가?
- [ ] 커밋 메시지가 규칙을 따르는가?
- [ ] 관련 이슈를 참조했는가?

### 테스트 (TDD)

이 프로젝트는 **Test-Driven Development (TDD)** 를 따릅니다.

```bash
# 테스트 실행
yarn test

# 테스트 커버리지 확인
yarn test:coverage

# 특정 테스트 실행
yarn test calendar
```

**중요**: PR 제출 전 반드시 [TESTING.md](TESTING.md)의 모든 체크리스트를 확인하세요.

## 📁 프로젝트 구조

```
BOK-CALD/
├── electron/           # Electron 메인 프로세스
├── src/
│   ├── components/    # React 컴포넌트
│   │   ├── Calendar/  # 캘린더 관련 컴포넌트
│   │   ├── Sidebar/   # 사이드바 컴포넌트
│   │   ├── Common/    # 공통 컴포넌트
│   │   ├── Layout/    # 레이아웃 컴포넌트
│   │   └── Styling/   # 스타일링 관련 컴포넌트
│   ├── store/         # Recoil 상태 관리
│   ├── styles/        # 전역 스타일
│   ├── utils/         # 유틸리티 함수
│   ├── types/         # TypeScript 타입 정의
│   ├── hooks/         # 커스텀 React 훅
│   └── services/      # 서비스 로직
├── public/            # 정적 파일
└── package.json       # 프로젝트 설정

```

## 🐛 이슈 보고

[이슈 페이지](https://github.com/bokmunssu/BOK-CALD/issues)에서 보고해주세요.
이 포크의 유지보수 관련 문의는 위 이슈 페이지를 이용해 주세요.

이슈를 작성할 때는 다음 정보를 포함해주세요:

- 운영체제 및 버전
- 재현 단계
- 예상 동작
- 실제 동작
- 가능하다면 스크린샷

### 주요 원칙

✅ 앱 데이터는 로컬에 저장되며 계정 연결 시 선택한 서비스와 동기화됩니다
✅ Google Calendar / Microsoft To Do 데이터는 사용자가 선택한 동기화 목적으로만 사용됩니다
✅ 제3자와 데이터를 공유하지 않습니다
✅ 언제든지 계정 연결을 해제하고 데이터를 삭제할 수 있습니다

---

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 📞 연락처 및 지원

### 원작자 및 개인 유지보수

원작: **SHINYA (Shinya / blissful-y0)** · [원본 저장소](https://github.com/blissful-y0/shinya_calendar)

개인 유지보수: **bokmunssu**. 원작자의 업데이트가 중단된 프로젝트를 개인적으로 개선하는 포크입니다. 원작자의 저작권과 MIT 라이선스는 유지합니다.

### 버그 신고 및 기능 제안

- **이슈 트래커**: [GitHub Issues](https://github.com/bokmunssu/BOK-CALD/issues)
- 원작자에게 이 포크의 버그 지원을 요청하지 마세요.

### 기여자 모집

변경 사항은 기능 브랜치와 PR을 통해 검토합니다.
## GitHub에서 실행 파일 배포
위 Windows 빌드 워크플로를 기본 브랜치에 병합하면, Release를 게시했을 때 설치형과 무설치 EXE를 해당 Release의 Assets에 추가합니다. 소스 ZIP을 실행 파일로 바꾸는 것이 아니라 별도의 EXE 자산을 만드는 방식입니다. Actions의 ‘Windows 실행 파일’을 수동 실행하면 테스트용 EXE를 아티팩트로 받을 수도 있습니다.

Microsoft 앱 등록 후에는 저장소 Settings → Secrets and variables → Actions → Variables에 `TOMO_MICROSOFT_CLIENT_ID`를 설정하세요. Google 로그인은 별도의 TOMO용 OAuth 등록 정보가 필요합니다. 현재 워크플로는 로컬에서만 내용과 빌드 명령을 검증했으며 GitHub 러너에서 실행하지 않았습니다.

근거: [GitHub 실행 파일 보관](https://github.com/actions/upload-artifact), [릴리즈 자산 업로드](https://cli.github.com/manual/gh_release_upload).
