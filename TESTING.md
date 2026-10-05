# 테스트 가이드 📝

TOMO CALENDAR 프로젝트의 테스트 가이드입니다. PR을 제출하기 전에 반드시 모든 테스트를 통과해야 합니다.

## TOMO CALENDAR 2.2.1 추가 검증 기록 (2026-10-05)

타입 검사와 프로덕션 빌드가 통과했습니다. 단위·모의 서비스 테스트 **94개**, 전체 Electron E2E **19개**, 최종 2.2.1 포장 EXE의 신규 핵심 시나리오 **3개**가 통과했습니다. Windows NSIS 설치형·portable x64 실행파일을 생성했습니다. 로컬 피드에서 실제 2.2.1 설치파일 다운로드와 SHA-512 검증·잘못된 해시 거부도 통과했습니다. 전체 소스 커버리지는 **21.61%**로 기존 80% 목표에 미달하여 PR은 Draft로 유지합니다.

추가 검증은 한국어 조합 중 저장 유예, 편집 종료 시 최신 입력 저장, 변경 필드 병합, 이미지 원본 보존·중복 제거·경로 검증, 메모 글자 크기 24px 저장/복원, 여러 D-DAY의 개별 표시/해제 및 재실행 복원을 포함합니다. 실제 창 닫기 요청이 마지막 입력 저장을 기다리는 것도 확인했습니다.

3,152,409바이트 PNG를 메모 25개에 반복 삽입한 시험에서는 약 105MB의 인라인 이미지 문자열을 원본 이미지 파일 하나와 6,406바이트 설정 JSON으로 분리했습니다. 200자 입력 후 창을 닫을 때 전달된 변경분은 511바이트였습니다. 원본 파일 크기는 별도로 유지되며, 모든 컴퓨터의 지연 시간을 보장하는 측정은 아닙니다. 업데이트 후 백업에는 **config.json과 images 폴더를 함께** 보관해야 합니다. 이전 버전으로 되돌리면 새 이미지 참조를 표시하지 못합니다.

새 사용자 저장소에서도 Google/Microsoft 공통 등록 정보와 활성 로그인 버튼, 고급 연결 설정 제거를 확인했습니다. **외부 실계정의 로그인·동기화 성공을 검증한 것은 아닙니다.** Google Testing 허용 사용자, 공개 상태 및 심사 조건은 별도입니다. 권한 범위를 캘린더 일정·목록 읽기·앱 생성 캘린더로 줄였으며 새 권한 동의의 실계정 검증은 남아 있습니다.

지원 이메일 bokmunssu@gmail.com을 사용한 홈페이지·개인정보처리방침·이용약관과 [Google 인증 신청 안내](docs/GOOGLE_VERIFICATION.md)를 준비했습니다. 소유 도메인이 없어 소유권 확인, 검증 동영상 및 심사 제출은 완료하지 않았습니다. 사이트도 아직 배포하지 않았습니다.

아래 2.2.0 기록은 이전 검증 이력입니다. 신규 최종 실행파일 검사는 위 세 시나리오를 대상으로 했으며 설치·제거 및 공개 GitHub 업데이트 설치는 재실행하지 않았습니다.

## TOMO CALENDAR 2.2.0 검증 기록 (2026-10-05)
Windows 10 x64, Node.js 22, Electron 38.2.0에서 확인했습니다. 기존 가이드의 80% 커버리지 목표는 유지합니다.

| 검사 | 결과 | 범위 |
| --- | --- | --- |
| `yarn typecheck` | 통과 | 렌더러·Electron 메인·프리로드 |
| `yarn test:coverage` | **89개 통과 / 전체 20.94%** | 기존 검사 + 팔레트·설치 폰트 네이티브/파일 로딩·캐시·업데이트 상태/설치 보호 |
| `yarn prebuild` | 통과 | 웹 및 Electron 번들 |
| Electron E2E | **16개 통과** | 프로덕션 번들, 격리 저장소, 아래 시나리오 전체 |
| 포장된 EXE E2E | **4개 통과** | 작은 캘린더, 실제 폰트 선택/복원, 이미지 위치/줌과 작은 위젯 입력, 추천 테마 |
| Windows NSIS / portable 빌드 | 통과 | TOMO 이름·아이콘·제품 속성의 x64 EXE |
| 실제 설치 / 제거 | 2.0.0에서 확인 | 2.2.0에서 설치·제거 재실행 안 함 |
| 실제 updater 다운로드 | 통과 | 로컬 시험 피드의 실제 2.2.0 NSIS EXE 다운로드와 SHA-512 일치, 잘못된 해시 다운로드 거부 |
| 공개 GitHub 업데이트 설치 | 미확인 | 새 공개 릴리즈 간 재시작·설치·데이터 유지 확인 필요 |

Electron E2E 시나리오:
1. 760×480 창, 6주 달력, 240px 배너에서도 마지막 날짜 접근 및 배너 숨김.
2. 메모 2개 별도 창, 자동 저장·핀, 캘린더를 닫아도 창과 타이머 유지 및 본체 다시 열기.
3. 캘린더와 할 일 위젯의 완료 상태 공유, 핀 해제.
4. 캘린더 뷰·사이드바 상태 복원.
5. Windows 프로그램/창 제목 활성화에 따라 뽀모도로 진행·정지, 제한 해제.
6. 심플 모드에서도 파란 테마 유지, 한국 공휴일 표시 전환.
7. D-DAY 관리에서 두 날짜를 별도 위젯으로 열기.
8. 원형 타이머·할 일 표시와 접힌 개인 설정의 Microsoft 로그인 화면.
9. 선택한 활성 창의 작업시간 기록 및 다른 제목으로 바뀌면 정지.
10. 설치 폰트 검색·선택 및 열린 위젯 적용, 재실행 후 복원.
11. Google 연동 창이 도구 모음을 가리지 않고 최상단에 표시, 설정 누락 및 개인 설정 안내.
12. 배너 표시 위치·확대/축소 저장과 원본 이미지 보존.
13. 외부 실행 창을 미리보기에서 선택해 두 타이머에 같은 대상 저장. 창 활성화에 따른 시간 계산은 5/9번에서 별도 검증.
14. 할 일/메모 헤더 x/y/zoom 저장·재실행 복원, 작은 위젯의 축소·입력·스크롤바 숨김.
15. 기준색 추천 팔레트의 미리보기·저장·적용 및 반복 렌더링 오류 없음.
16. 실제 설치 폰트 **375종 전부 로딩 성공**, 글꼴 조회 **121.8ms**, 창 10개 조회 **787ms**, 캐시 재조회 **1ms**. 이 컴퓨터에서 한 번 측정한 값이며 모든 컴퓨터의 속도를 보장하지 않습니다. 글꼴에 없는 문자는 시스템 폰트로 보완합니다.

전체 첫 실행에서는 외부 창 활성화 간섭으로 타이머 1건과 레거시 폰트 직접 파일 로딩 검사가 실패했습니다. 시험 창 로딩 완료 후 활성화하고, 폰트를 네이티브 이름으로 먼저 로딩하도록 수정했습니다. 수정 후 해당 검사 2개와 전체 16개가 통과했습니다. 포장된 EXE에서도 핵심 4개가 통과했고 스크린샷을 확인했습니다.

NSIS 빌드 후 `yarn exec electron tests/updater-download-smoke.cjs`를 실행하면 격리된 로컬 HTTP 피드와 실제 electron-updater로 설치 파일 다운로드·해시 오류 거부를 검사합니다. 테스트 캐시는 test-results 내부에 생성합니다. **설치·재시작을 수행하지 않으며 GitHub 피드 실검증을 대신하지 않습니다.**

Graph 모의 서비스 테스트 8개는 페이지 이동, 완료 업로드/ETag, 삭제, 충돌 사본, 응답 유실 복구, 요청 중 편집, 외부 URL 거부, 요청 중 연결 해제를 검증합니다. **실계정 로그인 검증으로 간주하지 않습니다.** Google OAuth 모의 테스트 6개는 설정 누락, 시스템 브라우저/PKCE, state 불일치, 취소, invalid_client 안내, 설정 교체 시 토큰 제거를 확인합니다.

E2E는 `TOMO_TEST_USER_DATA`로 시험 저장소를 격리합니다. `TOMO_E2E_EXECUTABLE`로 포장된 EXE나 설치된 EXE를 지정할 수 있습니다. 설치본은 Playwright가 실행 시 지우는 `test-results` 밖에 설치하세요. portable NSIS 래퍼는 Playwright 디버깅 연결을 전달하지 못하므로 내부 포장 EXE에서 주요 4개를 확인했습니다.

커버리지는 `src/**/*.{ts,tsx}` 전체를 기준으로 계산합니다. 생성된 dist/dist-electron 및 빌드 도구는 제외하며, Electron 서비스는 별도의 모의 통합 테스트로 검증합니다. **80% 목표 미달**이며 이전 1.4.0의 16.64%와 측정 범위가 일부 다릅니다. 목표를 낮추거나 화면 파일을 제외해 통과시키지 않았습니다.

아직 필요한 확인: 새 배포 빌드의 Microsoft/Google 개인·조직 실계정 OAuth, 신규 공유 사용자 로그인, 토큰 갱신·권한·오프라인 복구, 공개 GitHub 릴리즈 간 자동 설치, 장시간 사용·많은 일정/이미지에서 성능, macOS/Linux 빌드·알림, 연도별 공휴일 데이터 갱신. GitHub Windows 워크플로는 아직 러너에서 실행하지 않았습니다. 이 항목 및 커버리지 목표를 해결하기 전에는 **정식 릴리즈 준비 완료로 표시하지 않습니다.** 이전 앱 데이터 자동 이전은 의도적으로 지원하지 않습니다. [배포 전 확인](docs/DISTRIBUTION_AUTH.md).


## 🚀 빠른 시작

```bash
# 테스트 실행
yarn test

# 테스트를 한 번만 실행
yarn test:run

# 커버리지 리포트와 함께 실행
yarn test:coverage

# UI로 테스트 확인
yarn test:ui
```

## 📋 PR 제출 전 테스트 체크리스트

PR을 제출하기 전에 다음 항목들을 확인해주세요:

### 1. 유닛 테스트

- [ ] **유틸리티 함수 테스트**
  ```bash
  yarn test src/utils/__tests__
  ```
  - 날짜 계산 함수 (`calendar.test.ts`)
  - 이벤트 처리 함수 (`eventUtils.test.ts`)

- [ ] **컴포넌트 테스트**
  ```bash
  yarn test src/components/__tests__
  ```
  - EventForm 컴포넌트 (`EventForm.test.tsx`)
  - 추가 컴포넌트 테스트 작성 필요

### 2. 통합 테스트

- [ ] **캘린더 뷰 테스트**
  - 월간 뷰 렌더링
  - 주간 뷰 렌더링
  - 일간 뷰 렌더링

- [ ] **이벤트 관리**
  - 이벤트 생성
  - 이벤트 수정
  - 이벤트 삭제
  - 반복 이벤트 생성

- [ ] **상태 관리**
  - Recoil 상태 업데이트
  - 로컬 스토리지 저장

### 3. E2E 테스트 (수동)

개발 환경에서 다음 시나리오를 테스트하세요:

- [ ] **앱 시작 및 초기화**
  - 앱이 정상적으로 시작되는가?
  - 이전 상태가 올바르게 복원되는가?

- [ ] **이벤트 생성 플로우**
  1. 날짜 클릭
  2. 이벤트 폼 열기
  3. 정보 입력
  4. 저장
  5. 캘린더에 표시 확인

- [ ] **반복 이벤트**
  1. 반복 이벤트 생성
  2. 반복 패턴 확인
  3. 반복 종료 날짜 확인

- [ ] **Multi-day 이벤트**
  1. 여러 날에 걸친 이벤트 생성
  2. 각 뷰에서 올바르게 표시되는지 확인

- [ ] **테마 변경**
  - 테마 변경이 즉시 반영되는가?
  - 커스텀 테마 생성이 작동하는가?

- [ ] **알림 기능**
  - 알림이 설정한 시간에 표시되는가?
  - 반복 이벤트 알림이 작동하는가?

### 4. 성능 테스트

- [ ] **렌더링 성능**
  - 많은 이벤트가 있을 때 부드럽게 스크롤되는가?
  - 뷰 전환이 빠른가?

- [ ] **메모리 사용량**
  - 장시간 사용 시 메모리 누수가 없는가?

## 🧪 테스트 작성 가이드

### 새로운 기능 추가 시 (TDD)

1. **테스트 먼저 작성**
   ```typescript
   // 예: 새로운 유틸리티 함수
   describe('newFunction', () => {
     it('should do something', () => {
       const result = newFunction(input);
       expect(result).toBe(expectedOutput);
     });
   });
   ```

2. **구현**
   ```typescript
   export function newFunction(input: any) {
     // 구현
     return output;
   }
   ```

3. **리팩토링**
   - 테스트가 통과하면 코드를 개선

### 컴포넌트 테스트 작성

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import YourComponent from '../YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(
      <RecoilRoot>
        <YourComponent />
      </RecoilRoot>
    );

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### 유틸리티 함수 테스트

```typescript
import { describe, it, expect } from 'vitest';
import { yourFunction } from '../yourUtils';

describe('yourFunction', () => {
  it('handles edge cases', () => {
    expect(yourFunction(null)).toBe(defaultValue);
    expect(yourFunction(undefined)).toBe(defaultValue);
  });

  it('processes valid input correctly', () => {
    expect(yourFunction(validInput)).toBe(expectedOutput);
  });
});
```

## 📊 커버리지 목표

- 유틸리티 함수: **90% 이상**
- 컴포넌트: **70% 이상**
- 전체: **80% 이상**

커버리지 확인:
```bash
yarn test:coverage
```

## 🐛 테스트 디버깅

### 특정 테스트만 실행

```bash
# 파일명으로 필터
yarn test calendar

# 테스트 설명으로 필터
yarn test -t "should create event"
```

### 디버그 모드

```typescript
it.only('debug this test', () => {
  // 이 테스트만 실행됨
});

it.skip('skip this test', () => {
  // 이 테스트는 건너뜀
});
```

## 🔍 일반적인 이슈와 해결방법

### 1. Electron API 모킹

테스트 환경에서 Electron API가 없을 때:

```typescript
// src/test/setup.ts에서 이미 모킹됨
global.electronAPI = {
  store: {
    get: vi.fn(),
    set: vi.fn(),
  },
  // ...
};
```

### 2. 날짜 테스트

날짜 관련 테스트는 고정된 시간을 사용:

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-15'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### 3. Recoil 상태 테스트

```typescript
import { RecoilRoot } from 'recoil';
import { eventsState } from '@store/atoms';

const initializeState = ({ set }) => {
  set(eventsState, mockEvents);
};

render(
  <RecoilRoot initializeState={initializeState}>
    <YourComponent />
  </RecoilRoot>
);
```

## 📚 참고 자료

- [Vitest 문서](https://vitest.dev/)
- [Testing Library 문서](https://testing-library.com/)
- [React Testing 베스트 프랙티스](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## ✅ 최종 체크리스트

PR 제출 전:

1. [ ] 모든 테스트 통과 (`yarn test:run`)
2. [ ] 커버리지 80% 이상 (`yarn test:coverage`)
3. [ ] 새로운 기능에 대한 테스트 작성
4. [ ] 수동 E2E 테스트 완료
5. [ ] 콘솔 에러 없음
6. [ ] TypeScript 에러 없음 (`yarn typecheck`)

---

테스트 관련 질문이나 이슈가 있으면 [이슈 페이지](https://github.com/bokmunssu/BOK-CALD/issues)에 보고해주세요.
