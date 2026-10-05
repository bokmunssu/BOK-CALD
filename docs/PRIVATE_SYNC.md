# 개인용 계정 연동

TOMO CALENDAR는 설치 파일을 직접 실행하는 데스크톱 앱입니다. Microsoft Store 배포나 별도의 유료 서버가 필요하지 않습니다. 캘린더·메모·할 일·타이머는 계정 연결 없이 로컬에서 동작합니다. 저장소 공개 여부와 Microsoft 앱 등록은 별개이며, 이번 작업에서 GitHub 저장소의 공개 범위는 변경하지 않았습니다.

## 구글 로그인 실패 원인과 해결

[원본 서비스](https://github.com/blissful-y0/shinya_calendar/blob/master/src/services/googleCalendarService.ts)는 빌드 시 `VITE_GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_SECRET`에 제작자 OAuth 정보를 넣는 구조였습니다. 원본 소스를 가져오기만 하면 해당 정보가 생기지는 않습니다. TOMO 2.0.0 시험 빌드에는 TOMO 소유 OAuth 정보가 없어 실패했습니다. 사용자가 로그인 순서를 놓친 것이 아닙니다.

또한 이전 `open-external` 처리기는 Google URL을 앱 내부 창으로 열었습니다. Google은 데스크톱 OAuth에 시스템 브라우저를 요구하므로, 2.1.0에서는 기본 브라우저 + 임의 포트의 127.0.0.1 수신기 + state 검증 + PKCE로 교체했습니다. 실패 이유와 설정 누락을 화면에 표시합니다.

개인 연결 설정은 최초 한 번만 필요합니다. 이후에는 **구글 계정 로그인**으로 연결합니다. 원본 제작자의 클라이언트 ID를 대신 사용하지 않습니다.

1. [Google Cloud Console](https://console.cloud.google.com/)에서 본인 소유 프로젝트를 만들거나 선택합니다.
2. **Google Calendar API**를 사용 설정합니다. OAuth 동의 화면/Google Auth Platform에서 앱 이름을 TOMO CALENDAR로 설정합니다.
3. 개인 사용이라면 대상 사용자를 External, 상태를 Testing으로 두고 본인 Google 계정을 테스트 사용자에 추가합니다. Calendar 권한을 설정합니다.
4. OAuth 클라이언트를 만들 때 **데스크톱 앱** 유형을 선택합니다. 웹 애플리케이션 유형과 고정 8080 리디렉션을 사용하지 않습니다.
5. 앱의 **설정 → 구글 캘린더 → 개인 연결 설정**에서 발급된 클라이언트 ID와 클라이언트 비밀번호를 입력하고 저장합니다. 이는 Google 계정 비밀번호가 아닙니다. 채팅·GitHub·스크린샷에 올리지 마세요.
6. 구글 계정 로그인을 누르고 기본 브라우저에서 본인 계정으로 동의합니다. 앱으로 돌아가 목록을 선택합니다.

설정과 토큰은 Windows 암호화 저장소로 보호하고 TOMO 사용자 데이터 폴더에 보관합니다. 배너/창 미리보기와 함께 외부 서버에 저장하지 않습니다. 개인 설정은 실행 파일에 포함되지 않으며 빌드를 다시 할 필요가 없습니다. Google API 요청은 선택한 캘린더 데이터와 함께 Google로 전송됩니다.

Calendar API의 표준 사용에는 추가 비용이 없습니다. Testing 상태에서 Calendar 권한을 사용하는 refresh token은 7일 후 만료되어 재로그인이 필요할 수 있습니다. 공개 배포를 하지 않는 개인 사용에도 OAuth 앱 등록 자체는 필요합니다. 상태 변경과 검증은 Google 정책에 따라 별도로 판단해야 합니다.

[Google 데스크톱 OAuth](https://developers.google.com/identity/protocols/oauth2/native-app) · [Calendar 사용량/비용](https://developers.google.com/workspace/calendar/api/guides/quota) · [Testing 토큰 만료](https://developers.google.com/identity/protocols/oauth2)

## Microsoft To Do를 비공개로 사용하기

**앱 등록은 앱스토어 배포가 아닙니다.** Microsoft Entra에 로그인용 앱 정보를 등록하고 로컬 EXE만 개인적으로 사용해도 됩니다. 서버 호스팅이나 Microsoft Store 등록은 요구되지 않습니다. 개인 계정만 쓸 경우 지원 계정 유형을 개인 Microsoft 계정으로 제한할 수 있습니다.

현재 Microsoft Graph 유료 API 목록에는 To Do API가 포함되지 않습니다. 다만 Entra 앱 등록 권한과 접근 가능한 테넌트가 필요하고, 조직 정책이나 계정 조건은 별개입니다. 신규 테넌트 생성에는 제한이 있으며 Azure 무료 계정 경로에서 본인 확인/카드 정보 등을 요구할 수 있습니다. 따라서 모든 계정에서 추가 가입 없이 무료 등록이 가능하다고 보장하지 않습니다. 앱은 유료 구독을 생성하지 않습니다.

기존 테넌트에서 앱 등록이 가능한 경우 [Microsoft To Do 안내](MICROSOFT_TODO.md)를 따라 ID를 만든 뒤 **할 일 → Microsoft To Do 연동 → 개인 연결 설정(선택)**에 ID만 저장하면 됩니다. 클라이언트 비밀키는 필요하지 않습니다. 이후 로그인·목록 선택으로 동기화합니다. 등록 ID가 빌드에 이미 포함된 경우 개인 설정 없이 로그인합니다.

본인 계정에서 앱 등록이 불가능하고 추가 Azure 가입도 원하지 않는다면 공식 자동 동기화를 활성화할 수 없습니다. 비용과 등록이 없는 대안은 TOMO의 로컬 할 일을 사용하거나 연동 화면의 **Microsoft To Do 웹 열기**로 공식 웹 앱을 따로 사용하는 것입니다. 웹 열기는 자동 동기화가 아닙니다.

[앱 등록 안내](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app) · [신규 테넌트 조건](https://learn.microsoft.com/en-us/entra/fundamentals/create-new-tenant) · [Graph 유료 API 목록](https://learn.microsoft.com/en-us/graph/metered-api-list)

## 확인 범위

로그인 수신기·PKCE·state·취소·오류 처리와 Graph 동기화는 모의 서버로 검증했습니다. 실제 본인 OAuth 등록 정보가 제공되지 않아 Google/Microsoft 실계정 로그인 성공은 아직 검증하지 않았습니다. 등록 후 실제 연결 결과를 확인해야 합니다.
