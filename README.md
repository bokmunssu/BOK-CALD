# 📅 BOK-CALD

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/bokmunssu/BOK-CALD)](https://github.com/bokmunssu/BOK-CALD/issues)

🌐 **[공식 홈페이지 보기](https://github.com/bokmunssu/BOK-CALD)** | 📥 **[다운로드](https://github.com/bokmunssu/BOK-CALD/releases)**

---


## 1.4.0: 심플한 캘린더와 독립 위젯

- **심플 모드**가 기본입니다. 끄면 기존 이미지 배너·스티커를 다시 표시합니다. 이미지 데이터는 삭제하지 않습니다.
- 상단 **배너 설정**에서 표시 여부와 높이(40–240px)를 조절합니다. 작은 창에서도 모든 날짜에 접근할 수 있도록 캘린더 영역이 필요한 경우 스크롤됩니다.
- **위젯 → 할 일 / 디데이 / 뽀모도로**, **메모장 → 새 메모**로 독립 창을 엽니다. 각 창에서 맨 위 고정을 켜거나 끌 수 있습니다. 메모는 여러 개를 동시에 열 수 있습니다.
- 캘린더를 닫아도 열린 위젯은 계속 동작합니다. 위젯의 **캘린더** 버튼으로 다시 엽니다. Windows에서 마지막 창을 닫으면 종료됩니다. 뽀모도로 창을 닫으면 타이머를 멈춥니다.
- 할 일 검색·중요/미완료 필터·모든 날짜 보기·직접 수정, 여러 디데이 목록, 메모 제목과 자동 저장을 지원합니다. 같은 항목의 동시 수정은 마지막 저장을 따르며, 다른 항목의 변경은 병합합니다.
- 뽀모도로는 집중/휴식 1–180분, 일시정지·초기화, 완료 알림을 제공합니다. 다음 구간은 직접 시작합니다.
- **Windows 활성 창 감지**: 타이머를 멈춘 상태에서 ‘4초 후 활성 창 지정’을 누르고 원하는 프로그램/탭으로 전환합니다. 프로그램 전체 또는 정확한 창 제목을 선택하고 ‘지정한 프로그램/탭에서만 집중’을 켭니다. 감지 간격은 0.5초이며 전환 경계에서는 보수적으로 시간을 제외합니다.
- 브라우저 탭 감지는 활성 탭이 반영된 **창 제목**을 사용합니다. 동일 제목의 탭은 구별하지 못하며 제목이 바뀌면 다시 지정해야 합니다. macOS/Linux에서는 일반 타이머만 지원합니다. 감지는 켜진 동안만 동작하고 관측한 창 목록이나 제목 이력을 저장/전송하지 않습니다. 지정한 대상 제목만 로컬 설정에 저장합니다.
- 절전·화면 잠금 시 타이머를 일시정지합니다. 재시작 후에는 시간을 임의로 진행하지 않습니다. 위젯 위치·크기·고정 여부는 다시 열 때 복원합니다.
- 일기 화면과 작성 기능을 제거했습니다. 기존 저장 파일의 일기 데이터는 자동 삭제하지 않습니다.
- 업데이트 확인과 다운로드 링크는 **bokmunssu/BOK-CALD Releases**만 사용합니다. 기존 방식은 새 버전 알림과 릴리즈 페이지 이동이며 무인 설치는 아닙니다. 정상 릴리즈를 게시해야 새 버전을 확인할 수 있습니다.
- 기존 데이터 호환을 위해 패키지 이름·앱 ID·설치 제품 이름은 유지했습니다. 제거 시 사용자 데이터를 자동 삭제하지 않습니다.

Microsoft To Do 연동은 [검토 문서](docs/MICROSOFT_TODO.md)를 참고하세요. 현재 로그인·동기화 기능이 구현된 것은 아닙니다.

검증 결과와 남은 수동 확인 항목은 [TESTING.md](TESTING.md)에 기록합니다.

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
- **API Integration**: Google Calendar API v3

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

✅ 사용자 데이터는 기기에 로컬로만 저장됩니다  
✅ Google Calendar 데이터는 동기화 목적으로만 사용됩니다  
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
