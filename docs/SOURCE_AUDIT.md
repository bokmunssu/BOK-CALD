# 원본 서비스 및 앱 식별자 점검 (2026-10-05)
TOMO CALENDAR는 bokmunssu가 관리하는 SHINYA CALENDAR 기반의 독립 앱입니다. 원본 MIT 라이선스와 기여자 표기는 LICENSE 및 문서에 보존합니다.

| 항목 | 처리 |
| --- | --- |
| 패키지 | tomo-calendar |
| 설치 제품/창 이름 | TOMO CALENDAR |
| 앱 ID | io.github.bokmunssu.tomo.calendar |
| 사용자 데이터 | %APPDATA%/TOMO CALENDAR. 원본 데이터 자동 이전 없음 |
| 아이콘 | TOMO 전용 SVG/PNG/ICO/ICNS |
| 업데이트 확인 | api.github.com/repos/bokmunssu/BOK-CALD/releases/latest |
| 다운로드 | github.com/bokmunssu/BOK-CALD/releases |
| 공유 캘린더 UI/API | SharedCalendarManager, 공유 생성·초대·ACL 관련 메서드 제거 |
| 일기 | 이전 개선에서 UI/작성 기능 제거 |
| Google Calendar | Google 공식 OAuth/Calendar API. 시스템 브라우저·PKCE·state·암호화 저장 및 TOMO 개인 설정 |
| Microsoft To Do | Microsoft 공식 로그인/Graph API. TOMO 배포자 또는 개인 등록 ID 필요 |
| 폰트 CDN | 요청 제거. 설치된 시스템 폰트 사용 |
| 원본 제작자 서비스 | 런타임 소스의 SHINYA 문자열/제작자 API 주소 없음 |

Google 서비스의 [Shinya] 캘린더 접두어 및 shinya_local_id 메타데이터를 [TOMO]/tomo_local_id로 교체했습니다. Google의 일반 개인 캘린더 선택·생성 기능은 유지하며 원본 앱의 OAuth 등록 정보를 포함하지 않습니다. Google 로그인은 별도의 TOMO 배포자 Google OAuth 등록이 있어야 동작합니다.

2.1.0에서 원본 고정 포트 OAuth 처리기와 사용하지 않는 중복 로그인 화면을 제거했습니다. 새 GoogleAccount가 토큰/개인 설정을 OS 암호화로 저장하고 인증을 담당합니다. 실계정 OAuth 성공은 등록 후 별도 확인이 필요합니다. 설치 폰트와 창 선택은 로컬 Windows 기능이며 폰트/미리보기 외부 업로드를 하지 않습니다.
