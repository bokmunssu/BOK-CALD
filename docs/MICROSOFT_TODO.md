# Microsoft To Do 연동 검토

검토 기준: 2026-10-05. 결론: **가능**. Microsoft Graph v1.0의 To Do API로 개인 Microsoft 계정과 회사/학교 계정의 목록 및 작업을 읽고 수정할 수 있습니다. 이 변경에서는 연동 가능성만 검토했으며 로그인이나 실제 동기화는 활성화하지 않았습니다.

## 필요한 준비

1. 유지보수자 소유 Microsoft Entra 앱 등록. 개인 계정과 조직 계정을 모두 지원하도록 계정 유형 설정.
2. 데스크톱 공개 클라이언트용 인증 코드 + PKCE, 시스템 브라우저와 loopback redirect 사용. 데스크톱 앱에 client secret을 넣지 않습니다.
3. 사용자가 로그인하고 delegated `Tasks.ReadWrite` 및 필요한 로그인/오프라인 접근 권한에 동의해야 합니다. 조직 정책에 따라 관리자 승인이 필요할 수 있습니다.
4. 토큰은 Electron 메인 프로세스의 OS 보안 저장소에 보관합니다. 현재 일반 설정 파일이나 브라우저 localStorage에 저장하면 안 됩니다.

## 권장 구현

| 로컬 값 | Microsoft To Do 값 | 처리 |
| --- | --- | --- |
| content | title | 양방향 |
| completed | status | completed ↔ 완료; 나머지 상태는 원격 값을 함께 보존 |
| important | importance | high ↔ 중요; normal/low 원격 값 보존 |
| date | dueDateTime | 날짜/시간대 정책을 명시; 기한 없는 원격 작업을 오늘 날짜로 바꾸지 않음 |
| id | task id + list id | 매핑 테이블로 유지; 로컬 ID를 덮어쓰지 않음 |

- 연결할 목록을 사용자가 선택합니다. 처음 연결할 때 병합/가져오기 정책을 보여 주고 대량 변경을 검토 가능하게 합니다.
- 처음에는 전체 목록을 가져오고 이후 작업·목록의 delta API를 사용합니다. `@odata.nextLink`를 모두 처리한 뒤 `@odata.deltaLink`를 보관합니다.
- 로컬 변경 큐와 삭제 표시를 내구성 있게 저장합니다. 동기화 성공 전에 큐를 지우지 않습니다. 429의 Retry-After, 만료된 토큰, 오프라인, 삭제된 목록, 만료된 delta 토큰을 처리해야 합니다.
- 마지막 동기화 스냅샷과 양쪽 수정 내용을 비교합니다. 같은 작업이 양쪽에서 수정되면 사용자에게 선택시키거나 충돌 사본을 보존합니다. 원격 삭제를 로컬 빈 목록과 혼동해 전체 삭제하면 안 됩니다.
- 메모장과 디데이는 작업 목록 동기화 대상에서 제외합니다. 연결 해제 시 토큰·동기화 설정만 제거하고 로컬 할 일은 보존합니다.

## 검증할 시나리오

개인/조직 계정 로그인과 취소, 연결 해제, 토큰 갱신, 양방향 생성·수정·완료·삭제, 기한 없는 작업, 한국 시간대 자정, 같은 작업 동시 편집, 페이지가 여러 개인 목록, 429/401/403, 오프라인 후 재연결, 삭제된 목록, delta 재초기화를 테스트해야 합니다.

## 공식 근거

- [Microsoft Graph To Do 개요](https://learn.microsoft.com/en-us/graph/api/resources/todo-overview?view=graph-rest-1.0)
- [작업 수정 및 계정별 권한](https://learn.microsoft.com/en-us/graph/api/todotask-update?view=graph-rest-1.0)
- [작업 delta](https://learn.microsoft.com/en-us/graph/api/todotask-delta?view=graph-rest-1.0)
- [목록 delta](https://learn.microsoft.com/en-us/graph/api/todotasklist-delta?view=graph-rest-1.0)
- [Microsoft 인증 코드 흐름 및 PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)

다음 구현 단계에는 유지보수자가 등록한 앱의 client ID와 redirect URI가 필요합니다. 이 검토를 이유로 사용자 계정에 접근하거나 앱 등록을 자동 생성하지 않습니다.
