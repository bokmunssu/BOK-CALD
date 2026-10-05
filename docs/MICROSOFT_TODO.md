# Microsoft To Do 로그인·동기화
일반 사용자는 **할 일 → Microsoft To Do 연동 → Microsoft 계정으로 로그인**을 누르고 목록을 선택합니다. 등록 ID가 포함된 빌드는 사용자별 API 발급이나 키 입력이 없습니다. 개인 사용도 Microsoft Store 배포는 필요하지 않으며, 비용/계정 조건은 [개인 연동 안내](PRIVATE_SYNC.md)를 확인하세요.

## 배포자 또는 개인 사용자가 한 번 준비할 사항
1. [Microsoft Entra 관리 센터](https://entra.microsoft.com/)에 로그인하고 **ID → 애플리케이션 → 앱 등록 → 새 등록**을 엽니다.
2. 이름은 **TOMO CALENDAR**, 지원 계정 유형은 **모든 조직 디렉터리의 계정 및 개인 Microsoft 계정**으로 선택합니다.
3. 등록 후 **인증 → 플랫폼 추가 → 모바일 및 데스크톱 애플리케이션**에서 리디렉션 URI **http://localhost**를 등록합니다. 앱은 실행할 때 임의의 로컬 포트를 사용합니다.
4. **API 사용 권한 → Microsoft Graph → 위임된 권한**에서 **User.Read**, **Tasks.ReadWrite**를 추가합니다. 로그인 요청에 openid/profile/offline_access도 포함합니다. 조직 정책에 따라 해당 조직의 관리자 승인이 필요할 수 있습니다.
5. **개요 → 애플리케이션(클라이언트) ID**를 복사합니다. 클라이언트 비밀키를 만들거나 전달할 필요가 없습니다.
6. 자체 빌드 개발자는 프로젝트 루트의 `.env.local`에 `TOMO_MICROSOFT_CLIENT_ID=복사한-ID`를 넣고 다시 빌드합니다. CI에서는 같은 이름의 환경 변수/저장소 변수를 설정합니다. ID는 공개 식별자입니다. 일반 배포본 사용자는 이 작업 없이 로그인합니다. 2.2.1에서는 고급 개인 연결 설정 화면을 제거했습니다.

2.2.0은 유지보수자 소유 공개 클라이언트 ID를 기본으로 사용합니다. 일반 사용자는 개인 연결 설정 없이 로그인합니다. 개인 계정과 조직 계정의 실제 로그인·권한 정책은 별도 검증해야 합니다. 다른 제작자의 등록 ID를 재사용하지 않습니다. [배포 운영 안내](DISTRIBUTION_AUTH.md).

## 동기화 동작
- 시스템 브라우저에서 인증 코드 + PKCE로 로그인합니다. 로컬 수신기는 127.0.0.1에서만 열리고 state를 검사합니다.
- 토큰은 Electron 메인 프로세스가 OS 암호화 저장소로 암호화합니다. 렌더러나 일반 설정 데이터에 토큰을 넘기지 않습니다.
- 한 계정의 선택한 목록과 제목·완료·중요·기한을 양방향 동기화합니다. 기한 없는 작업도 유지합니다. 메모·D-DAY는 대상이 아닙니다.
- 아직 연결하지 않은 로컬 할 일은 선택한 목록에 업로드됩니다. 삭제도 양쪽에 반영되므로 처음에는 시험용 목록을 권장합니다.
- 동시 수정 시 원격 내용을 반영하고 로컬 수정은 **(로컬 사본)**으로 보존합니다. 요청 중 새로 입력한 내용은 덮어쓰지 않습니다.
- 자동 동기화는 1분 간격이며 수동 동기화도 제공합니다. 페이지별 전체 조회를 사용합니다. delta 증분 조회는 현재 구현하지 않았습니다.
- 매핑을 저장하고 linkedResources로 응답 유실 후 중복 생성을 방지합니다. 목록 변경 시 각 목록의 매핑을 보존합니다.
- 로그아웃은 토큰을 지우고 로컬 할 일은 유지합니다. 자동 동기화는 다음 로그인까지 멈춥니다.

## 검증 상태
모의 Graph 테스트: 페이지 이동, 완료 업로드/ETag, 삭제, 동시 수정 사본, 응답 유실 복구, 업로드 도중 편집, 외부 주소 거부, 요청 중 연결 해제.
실계정 로그인·권한 동의·토큰 갱신·네트워크 오류·조직 정책은 앱 등록 후 별도 검증해야 합니다.

[Microsoft PKCE 인증 흐름](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
[데스크톱 앱 등록](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-desktop-app-registration)
[Graph To Do](https://learn.microsoft.com/en-us/graph/api/resources/todo-overview?view=graph-rest-1.0)
