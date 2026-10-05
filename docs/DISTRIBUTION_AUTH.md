# 로그인 가능한 EXE 배포 안내

## 구조와 일반 사용자 안내

유지보수자가 소유한 Google 데스크톱 OAuth 앱과 Microsoft 공개 클라이언트 앱을 공통으로 사용합니다. 계정 데이터와 토큰은 사용자마다 별도로 저장되며 공용 서버나 공용 계정을 사용하지 않습니다. Microsoft Store에 올릴 필요가 없습니다.

사용자는 설치형 EXE 실행 → 구글 캘린더 또는 Microsoft To Do 연동 → 본인 계정 로그인 → 사용할 캘린더/목록 선택 순서로 연결합니다. 일반 사용자에게 클라이언트 ID/JSON/API 발급을 요구하지 않습니다. 고급 개인 설정은 개발자나 다른 등록을 쓰는 경우에만 필요합니다. 처음에는 시험용 캘린더/목록으로 생성·수정·삭제를 확인하세요.

## 유지보수자가 배포 전에 확인

1. Google Calendar API를 켜고 **데스크톱 앱** 클라이언트를 사용합니다. 시스템 브라우저, 임의 포트의 루프백 수신기, state, PKCE를 사용합니다.
2. Google Testing 상태에서는 공유받는 사람을 테스트 사용자에 추가해야 합니다. 테스트 사용자 상한 및 Calendar 권한의 refresh token 7일 만료 조건이 있습니다. 장기·일반 배포는 Production 전환과 민감한 Calendar 권한의 검증 필요 여부를 Google 콘솔에서 확인하세요. Production 전환만으로 검증이나 제한 해제가 보장되지는 않습니다.
3. 앱 이름, 지원 이메일, 본인 소유 홈페이지·개인정보처리방침·사용조건·도메인을 준비합니다. 저장소의 기존 제작자용 HTML을 그대로 TOMO 정책으로 제출하지 마세요. 실제 수집·보관·삭제 동작에 맞춰 유지보수자 정보와 연락처를 작성하고 Google이 요구하는 도메인 확인을 수행합니다.
4. Microsoft 등록은 개인 계정을 지원해야 합니다. 현재 등록은 조직+개인 유형이며 리디렉션은 모바일 및 데스크톱의 `http://localhost`입니다. 요청 권한은 위임 `User.Read`, `Tasks.ReadWrite`와 OIDC/offline_access입니다. 공유 목록 API는 사용하지 않아 `Tasks.ReadWrite.Shared`가 필요하지 않습니다. 조직 계정은 해당 조직 정책에 따라 관리자 승인이 필요할 수 있습니다.
5. Microsoft는 공개 클라이언트+PKCE이므로 비밀키를 생성하거나 EXE에 넣지 않습니다. Google의 **데스크톱** client secret은 앱에서 완전히 숨길 수 있는 서버 비밀이 아니며 데스크톱 JSON에 맞춰 토큰 교환에 사용합니다. 서버용 비밀키/서비스 계정/개인 토큰을 배포하거나 커밋하지 마세요.

## 빌드와 GitHub Actions

로컬은 git에서 제외된 `.env.local`에 Google의 `VITE_TOMO_GOOGLE_CLIENT_ID`, `VITE_TOMO_GOOGLE_CLIENT_SECRET`를 지정합니다. Microsoft는 유지보수자 등록 ID를 기본으로 사용하며 `TOMO_MICROSOFT_CLIENT_ID`로 교체할 수 있습니다. 개인 고급 설정은 이 기본값보다 우선하므로 시험할 때 예전 잘못된 설정을 지우세요.

GitHub 저장소 **Settings → Secrets and variables → Actions**에서 다음을 유지보수자가 한 번 등록합니다.

| 종류 | 이름 | 값 |
| --- | --- | --- |
| Variable | `VITE_TOMO_GOOGLE_CLIENT_ID` | Google 데스크톱 클라이언트 ID |
| Secret | `VITE_TOMO_GOOGLE_CLIENT_SECRET` | 같은 데스크톱 JSON의 client_secret |
| Variable, 선택 | `TOMO_MICROSOFT_CLIENT_ID` | Microsoft 공개 클라이언트 ID 교체 시 |

릴리즈 워크플로는 Google 설정 누락 시 실패시킵니다. 이 검사는 콘솔 게시 상태나 실제 로그인 성공을 검증하지 않습니다. 로컬 JSON과 `.env.local`은 커밋하지 않으며 CI 로그에 값을 출력하지 않습니다. 배포자가 앱 등록을 삭제/차단하면 배포받은 사용자도 다시 로그인하지 못할 수 있습니다.

## 업데이트 운영

패키지 버전과 릴리즈 태그를 일치시키고 예를 들어 `v2.2.0`을 **일반 공개 릴리즈**로 게시합니다. Actions가 설치 EXE, portable EXE, `.blockmap`, `latest.yml`을 같은 릴리즈에 올립니다. `latest.yml`을 소스 ZIP 대신 반드시 배포해야 설치형 updater가 버전·다운로드·해시를 확인합니다. 두 아키텍처를 별도 빌드해 같은 latest.yml을 덮어쓰지 마세요. 현재 워크플로는 x64 단일 빌드입니다.

설치형은 실행 30초 뒤 또는 최신 버전 버튼에서 확인하고 자동 다운로드합니다. 완료되면 사용자에게 재시작·설치를 안내하며 편집 중에 강제로 종료하지 않습니다. portable은 자동 설치를 지원하지 않습니다. **2.1.0에는 설치 updater가 없으므로 2.2.0으로는 EXE를 직접 받아 한 번 설치해야 합니다.** 이후 2.2.0→새 버전의 실제 업데이트 시험은 별도로 수행해야 합니다.

## 배포 허용 전 시험

- 유지보수자 계정과 새 사용자 개인 계정 각각 로그인·동의·동기화, 취소, 로그아웃, 재로그인.
- Google Testing 신규 계정 차단 안내/Production 검증 조건, Microsoft 개인 계정 로그인.
- 양쪽 생성·수정·완료·삭제·충돌, 오프라인 복구, 토큰 만료 후 복구.
- 테스트 설치형의 이전 버전→새 공개 테스트 릴리즈 다운로드·진행률·해시·재시작·버전 변경·기존 데이터 유지. 잘못된 latest.yml/네트워크 실패도 확인.
- 계정 전환 시 시험용 데이터로 동기화 대상을 다시 확인. 동시에 여러 계정을 연결하는 기능은 제공하지 않습니다.

현재 로컬 자동 테스트와 모의 OAuth/Graph/updater 검사만으로 위 실계정·공개 릴리즈 조건까지 통과했다고 판단하지 않습니다.

공식 기준: [Google 데스크톱 OAuth](https://developers.google.com/identity/protocols/oauth2/native-app), [Google 운영 준비](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance), [Microsoft 공개 클라이언트](https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-applications), [Electron Builder 업데이트](https://www.electron.build/docs/features/auto-update/).
