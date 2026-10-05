# 테스트 가이드 📝

TOMO CALENDAR 프로젝트의 테스트 가이드입니다. PR을 제출하기 전에 반드시 모든 테스트를 통과해야 합니다.

## TOMO CALENDAR 2.0.0 검증 기록 (2026-10-05)
Windows 10 x64, Node.js 22, Electron 38.2.0에서 확인했습니다. 기존 가이드의 80% 커버리지 목표는 유지합니다.

| 검사 | 결과 | 범위 |
| --- | --- | --- |
| `yarn typecheck` | 통과 | 렌더러·Electron 메인·프리로드 |
| `yarn test:coverage` | **74개 통과 / 전체 20.02%** | 날짜·반복·일정 폼·위젯·공휴일·메모 HTML·작업시간·Graph 동기화 |
| `yarn prebuild` | 통과 | 웹 및 Electron 번들 |
| 포장된 앱 E2E | **9개 통과** | 아래 시나리오 전체 |
| Windows NSIS / portable 빌드 | 통과 | TOMO 이름·아이콘·제품 속성의 x64 EXE |
| 실제 설치 / 제거 | 통과 | 격리된 시험 폴더에 무인 설치·제거, 설치본 UI 시나리오 1개 통과 |
| 무설치 EXE 실행 | 통과 | 실제 TOMO 캘린더 창 표시 및 격리 저장소 생성 확인 |

포장된 앱 E2E 시나리오:
1. 760×480 창, 6주 달력, 240px 배너에서도 마지막 날짜 접근 및 배너 숨김.
2. 메모 2개 별도 창, 자동 저장·핀, 캘린더를 닫아도 창과 타이머 유지 및 본체 다시 열기.
3. 캘린더와 할 일 위젯의 완료 상태 공유, 핀 해제.
4. 캘린더 뷰·사이드바 상태 복원.
5. Windows 프로그램/창 제목 활성화에 따라 뽀모도로 진행·정지, 제한 해제.
6. 심플 모드에서도 파란 테마 유지, 한국 공휴일 표시 전환.
7. D-DAY 관리에서 두 날짜를 별도 위젯으로 열기.
8. 원형 타이머·할 일 표시와 API 입력 없는 Microsoft 로그인 설정.
9. 선택한 활성 창의 작업시간 기록 및 다른 제목으로 바뀌면 정지.

Graph 모의 서비스 테스트 8개는 페이지 이동, 완료 업로드/ETag, 삭제, 충돌 사본, 응답 유실 복구, 요청 중 편집, 외부 URL 거부, 요청 중 연결 해제를 검증합니다. **실계정 로그인 검증으로 간주하지 않습니다.**

E2E는 `TOMO_TEST_USER_DATA`로 시험 저장소를 격리합니다. `TOMO_E2E_EXECUTABLE`로 포장된 EXE나 설치된 EXE를 지정할 수 있습니다. 설치본은 Playwright가 실행 시 지우는 `test-results` 밖에 설치하세요. portable NSIS 래퍼는 Playwright 디버깅 연결을 전달하지 못해 직접 자동화하지 않았으며, 내부 EXE에서 9개 시나리오를 확인하고 래퍼 자체는 일반 실행으로 확인했습니다.

커버리지는 `src/**/*.{ts,tsx}` 전체를 기준으로 계산합니다. 생성된 dist/dist-electron 및 빌드 도구는 제외하며, Electron 서비스는 별도의 모의 통합 테스트로 검증합니다. **80% 목표 미달**이며 이전 1.4.0의 16.64%와 측정 범위가 일부 다릅니다. 목표를 낮추거나 화면 파일을 제외해 통과시키지 않았습니다.

아직 필요한 확인: 배포자 앱 등록 후 Microsoft/Google 개인·조직 실계정 OAuth, 토큰 갱신·권한·오프라인 복구, 장시간 사용·많은 일정/이미지에서 성능, macOS/Linux 빌드·알림, 연도별 공휴일 데이터 갱신. GitHub Windows 워크플로는 아직 러너에서 실행하지 않았습니다. 이 항목 및 커버리지 목표를 해결하기 전에는 **정식 릴리즈 준비 완료로 표시하지 않습니다.** 이전 앱 데이터 자동 이전은 의도적으로 지원하지 않습니다.


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

테스트 관련 질문이나 이슈가 있으면 [이슈 페이지](https://github.com/blissful-y0/shinya_calendar/issues)에 보고해주세요.
