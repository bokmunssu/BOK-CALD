# 테스트 가이드 📝

심야 캘린더 프로젝트의 테스트 가이드입니다. PR을 제출하기 전에 반드시 모든 테스트를 통과해야 합니다.

## BOK-CALD 1.4.0 검증 기록 (2026-10-05)

테스트는 Node.js 22 LTS와 Windows Electron 실행에서 진행했습니다. 프로젝트의 기존 테스트 가이드와 목표를 유지합니다.

| 검사 | 결과 | 범위 |
| --- | --- | --- |
| `yarn typecheck` | 통과 | 렌더러와 Electron 메인/프리로드 타입 검사 |
| `yarn test:run` | 57개 통과 | 날짜·반복 일정·이벤트 폼·위젯 상태·업데이트 링크·타이머 계산 |
| `yarn test:coverage` | 실행됨, **전체 16.64%** | 80% 목표 미달. 기존 앱의 상당수 화면과 서비스가 유닛 테스트되지 않음 |
| `yarn prebuild` | 통과 | Vite 웹·Electron 메인·프리로드 번들 |
| `yarn test:e2e` | 5개 통과 | 작은 창에서 6주 날짜 접근, 메모 2개 및 창 종료 후 유지, 할 일 양방향 반영, 캘린더 닫기/복원, Windows 활성 창 타이머 |

E2E는 각 실행마다 `BOK_CALD_TEST_USER_DATA`로 격리된 테스트 저장소를 사용하므로 개인 캘린더 데이터를 변경하지 않습니다. `test-results/`에 실패 추적과 화면 캡처를 남기며 Git에는 포함하지 않습니다.

수동 검증이 필요한 항목: macOS/Linux 설치 파일, Google OAuth 실계정 동기화, 알림의 운영체제별 표시, 장시간 메모리 사용량, 다량의 반복 일정에서 성능, 기존 1.3.0 설치본에서의 실제 업그레이드 및 데이터 복원. Microsoft To Do는 검토 단계이므로 계정 연동 테스트 대상이 아닙니다. 커버리지 목표와 이 수동 항목을 해결하기 전에는 릴리즈 준비 완료로 표시하지 않습니다.

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
