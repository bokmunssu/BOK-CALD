# 📅 TOMO CALENDAR

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[다운로드](https://github.com/bokmunssu/BOK-CALD/releases) · [문제 보고](https://github.com/bokmunssu/BOK-CALD/issues)

SHINYA CALENDAR를 기반으로 bokmunssu가 유지보수하는 별도의 캘린더입니다. 원본 제작자의 공식 업데이트가 아니며 MIT 라이선스와 원본 기여를 존중합니다.

## 2.3.3 보안 업데이트 (검토용)
- Google Calendar 로그인·갱신 토큰은 화면으로 전달하지 않습니다. 허용된 캘린더 작업만 앱 내부에서 실행하며 기존 암호화 계정 저장소를 사용합니다.
- 본체·위젯의 외부 페이지 이동과 새 창을 차단하고 내부 기능 요청의 창·페이지·프레임 출처를 검사합니다. 외부 링크는 허용된 HTTPS 사이트만 엽니다.
- 배포본에 콘텐츠 보안 정책(CSP)을 적용하고 실험 기능을 끕니다. Electron과 배포용 취약 라이브러리를 업데이트합니다.
- 캘린더 요청에 시간 제한·동시 요청 제한·분당 제한과 한도 오류 후 대기를 적용합니다. 이 제한은 PC 내부의 보호이며 Google Cloud 프로젝트 전체의 과금 차단 장치가 아닙니다.
- 별도 서버·유료 서비스는 추가하지 않습니다. 실행파일 전자서명과 로컬 메모·일정 암호화는 적용하지 않았습니다. [보안 범위와 배포 주의사항](docs/SECURITY.md).

## 2.3.2 테스트 빌드
2.3.2는 PR 검토용 빌드이며 아직 공개 릴리즈로 게시하지 않았습니다.
- 할 일의 태그 입력을 **Google Tasks 목록 선택**으로 바꿨습니다. 새 할 일의 목록 지정, 기존 할 일의 목록 이동, 목록별 보기와 **전체 목록 동기화**를 지원합니다. 중요 표시는 Google Tasks 공식 API가 제공하지 않아 TOMO에만 저장됩니다.
- Google Tasks 메뉴·연동 화면을 파란 체크 아이콘으로 통일했습니다.
- 상단 **기간 일정: 날짜별 / 이어서**에서 여러 날 일정의 표시 방식을 선택합니다. 이어서는 월·주 보기에서 하나의 막대로 날짜 칸을 연결하고, 주 경계는 이어짐 표시로 연결합니다. 겹치는 일정은 별도 줄에 배치합니다.
- 이어서 표시의 날짜·막대·일정 공간을 내용에 맞춰 배치하여 작은 창에서도 하단 일정이 잘리지 않도록 했습니다. 공휴일 이름은 날짜에 마우스를 올리거나 클릭/키보드 포커스를 주면 말풍선으로 표시하고, 벗어나거나 다른 곳을 누르면 닫힙니다.
- Google 공휴일 구독을 일정 가져오기에서 제외합니다. 기존에 가져온 공휴일 일정도 화면에서 숨기며 사용자가 직접 만든 일정은 보존합니다.
- **음력** 체크로 월/주/일 달력 표시를 전환합니다. 일정·D-DAY 날짜 입력에서 음력과 윤달을 선택하고 양력으로 변환해 저장합니다. 반복 규칙은 양력 기준입니다.
- Google 연결 상태에서 새 카테고리는 기본적으로 Google 캘린더와 연결됩니다. 생성 요청을 합치고 목록 캐시를 갱신합니다. 자동 동기화가 켜져 있으면 일정 카테고리 수정 시 Google 캘린더도 이동합니다.
- 할 일 연동은 **Google Tasks**로 교체했습니다. 기존 로컬 할 일은 보존하며 Microsoft 자동 동기화는 실행하지 않습니다. 제목·기한 날짜·완료·삭제를 양방향 동기화하고 중요/태그는 로컬에 유지합니다. [사용·배포 안내](docs/GOOGLE_TASKS.md).
- 최신 버전 안내는 1.4초, 다운로드 완료 안내는 2.5초로 줄였습니다.

- 메모와 할 일 입력은 화면에 즉시 반영하고, 한글 조합이 끝난 뒤 변경된 필드만 저장합니다. 창 종료 전에 마지막 입력의 저장 완료를 기다립니다. 메모별 **글자 크기 10–36px**를 지원합니다.
- PNG/JPG/GIF/WebP 이미지는 사용자 데이터의 `images` 폴더로 분리하고 동일 이미지는 재사용합니다. 기존 인라인 이미지는 시작 시 이전합니다. 백업할 때 **설정 파일과 images 폴더를 함께** 보관하세요. 이전 버전은 새 이미지 주소를 표시하지 못할 수 있습니다.
- D-DAY 관리의 **캘린더 표시** 버튼을 각각 켜고 끌 수 있어 여러 날짜를 함께 표시합니다.
- Google 연동의 고급 API 입력 화면을 제거했습니다. 일반 사용자는 공통 설정이 포함된 배포본에서 각자 로그인하면 됩니다. Google 검토 준비와 미완료 조건은 [인증 안내](docs/GOOGLE_VERIFICATION.md)를 확인하세요.
- **스타일 관리 → 폰트**에서 설치 폰트를 검색·선택합니다. Windows의 한글/영문 이름 차이로 대체 폰트가 나오던 문제를 실제 폰트 파일 로딩으로 개선했습니다. 열린 창과 재실행 후에도 적용됩니다. 해당 폰트에 없는 글자는 다른 폰트로 보완합니다.
- **스타일 관리 → 배너**에서 표시 여부와 높이 **40–240px**를 조절합니다. 캘린더·할 일·메모 헤더는 가로/세로 위치와 **50–300% 확대/축소**를 지원하며 원본을 보존합니다. 이전에 잘라 저장한 이미지의 원본은 복원하지 못합니다.
- **커스텀 테마**에서 기준색을 고르면 읽기 쉬운 밝은/어두운 팔레트를 추천합니다. 작은 위젯은 내용을 함께 축소하고 스크롤은 유지하면서 스크롤바를 숨깁니다.
- 폰트 목록과 프로그램 조회를 캐시하며 Windows 창 조회 도우미를 재사용합니다. 목록 렌더링과 변경 없는 데이터 비교 비용도 줄였습니다.
- 구글 연동 창을 본문 위에 표시하고 시스템 브라우저 로그인으로 전환했습니다. 설정 누락·취소·실패 이유를 안내합니다. [연동 안내](docs/PRIVATE_SYNC.md).
- 앱 이름, 패키지, 앱 ID, 아이콘, 설치 이름, 저장 위치를 **TOMO CALENDAR**로 분리했습니다. 기존 앱과 별도로 설치되며 데이터는 자동 이전하지 않습니다.
- 심플 모드는 테마색을 그대로 유지합니다. 이미지 배너·스티커 꾸미기도 지원합니다.
- 작은 창에서는 캘린더 영역을 스크롤해 하단 날짜에 접근합니다. 배너 설정은 상단 도구 모음 대신 스타일 관리에 있습니다.
- 캘린더 사이드바는 **일정 / 할 일 / 메모**입니다. 별도 리스트 기능 없이 할 일과 같은 데이터를 사용합니다.
- **할 일**은 검색, 완료/중요 필터, 기한, Google Tasks 목록 선택과 선택형 이미지 배너를 지원합니다. 달력과 위젯의 변경은 함께 저장됩니다. 이전 태그 데이터는 보존하지만 태그 편집은 제공하지 않습니다.
- **메모**는 접힌 모서리의 스티커 카드입니다. 각 메모를 독립 창으로 열고 이미지, 제목, 굵게·기울임·밑줄·취소선과 배경색을 설정합니다. 자동 저장하며 여러 창을 동시에 사용할 수 있습니다.
- **D-DAY 관리**에서 각 날짜를 개별 위젯으로 엽니다. 별도 D-DAY 목록 위젯은 제공하지 않습니다.
- **뽀모도로**는 원형 진행 표시, 집중/휴식 설정, 일시정지·초기화·완료 알림을 지원합니다.
- **작업시간**은 지정한 프로그램/탭이 활성화된 시간만 기록하고 전체/오늘/대상별 시간을 보여줍니다.
- 활성 창 감지는 Windows에서 지원합니다. **기록할 창 선택 / 프로그램 추가**에서 실행 중인 창의 미리보기를 보고 선택한 뒤 프로그램 전체 또는 정확한 창 제목을 선택합니다. 제목이 같은 탭은 구분하지 못하며 제목 변경 시 다시 지정해야 합니다.
- 감지 간격은 0.5초이며 전환·잠금·절전 경계 시간을 보수적으로 제외합니다. 잠금·절전 후에는 직접 다시 시작합니다. 관측한 창 제목 이력을 저장/전송하지 않습니다.
- 모든 위젯은 **핀 버튼**으로 맨 위 고정을 전환합니다. 위치·크기·고정 상태를 복원합니다.
- 캘린더를 닫아도 열린 위젯은 유지됩니다. 위젯의 캘린더 버튼으로 본체를 다시 엽니다. 마지막 창을 닫으면 Windows 앱이 종료됩니다.
- **공휴일** 체크로 한국 공휴일 날짜의 빨간 표시를 전환합니다. 인터넷/API 키 없이 2018–2027년 데이터를 사용합니다. 그 밖의 연도는 안내 문구를 표시하며 매년 데이터 갱신이 필요합니다.
- 일기 및 공유 캘린더 기능을 제거했습니다. 원본 제작자의 API/공유 기능을 사용하지 않습니다. [점검 기록](docs/SOURCE_AUDIT.md).
- Windows **설치형**은 **bokmunssu/BOK-CALD Releases**에서 새 버전을 자동 다운로드하고 완료 후 확인을 받아 재시작·설치합니다. 포터블은 새 EXE 다운로드 안내를 사용합니다. 실제 공개 릴리즈 간 자동 설치는 별도 검증이 필요합니다.

## Windows에서 실행
Releases의 **Assets**에서 게시된 버전의 설치형 EXE를 실행합니다. 2.3.1 로컬 시험 파일은 `TOMO-CALENDAR-Setup-2.3.1-x64.exe`이며 무설치형은 `TOMO-CALENDAR-2.3.1-win-x64.exe`입니다. GitHub의 **Source code (zip)**은 소스이며 실행 파일이 아닙니다.

이 빌드는 기능 확인용입니다. [TESTING.md](TESTING.md)의 검증 범위와 미확인 항목을 확인하세요.

## 계정 연동과 개인 사용
Microsoft Store 배포나 유료 서버 없이 로컬 EXE로 사용합니다. **배포자가 공통 OAuth 앱을 한 번 등록하고 빌드에 포함하면 일반 사용자는 각자 계정으로 로그인하면 됩니다.** 2.3.0 로컬 시험 EXE에는 유지보수자의 등록 정보가 포함됩니다. Google의 테스트 사용자/공개·검토 상태는 별도 조건입니다. 새 빌드의 실계정 동기화는 별도 확인이 필요합니다.

[배포 인증·업데이트 운영 안내](docs/DISTRIBUTION_AUTH.md)

[개인 사용·구글 실패 원인·비용 조건](docs/PRIVATE_SYNC.md) · [Google Tasks 연동](docs/GOOGLE_TASKS.md)

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
- **API Integration**: Google Calendar API v3, Google Tasks API v1

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
✅ Google Calendar / Google Tasks 데이터는 사용자가 선택한 동기화 목적으로만 사용됩니다
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

Google 로그인에는 TOMO용 데스크톱 OAuth 공통 설정이 필요합니다. Calendar API와 Tasks API를 사용 설정하고 CI의 Google 클라이언트 ID 변수·데스크톱 client secret을 등록하세요. 사용자 로그인 토큰은 포함하지 않습니다. 2.2.1 공개 릴리즈에서 설치파일 다운로드·해시 확인을 검증했으며 새 버전의 실제 설치는 별도 확인이 필요합니다.

근거: [GitHub 실행 파일 보관](https://github.com/actions/upload-artifact), [릴리즈 자산 업로드](https://cli.github.com/manual/gh_release_upload).
