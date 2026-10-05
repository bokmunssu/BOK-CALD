// Validate presence without printing credentials into CI logs.
const id = process.env.VITE_TOMO_GOOGLE_CLIENT_ID || '';
const secret = process.env.VITE_TOMO_GOOGLE_CLIENT_SECRET || '';
if (!id.endsWith('.apps.googleusercontent.com') || !secret) {
  console.error('배포용 Google 데스크톱 OAuth 설정이 없습니다. VITE_TOMO_GOOGLE_CLIENT_ID 변수와 VITE_TOMO_GOOGLE_CLIENT_SECRET Secret을 등록하세요.');
  process.exitCode = 1;
} else console.log('배포용 Google OAuth 설정 존재 확인 완료. 콘솔 게시/검토 상태와 실제 로그인은 별도 검증해야 합니다.');
