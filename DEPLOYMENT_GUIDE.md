# 🚀 배포 가이드

## Google OAuth 설정 문제 해결

### 현재 발생한 문제
```
오류 400: redirect_uri_mismatch
요청 세부정보: redirect_uri=https://bearbrick-fxo8clt5l-gombricks-projects.vercel.app/api/auth/callback/google
```

### 해결 방법

#### 1. Google Cloud Console 수정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **APIs & Services** > **Credentials** 이동
3. OAuth 2.0 클라이언트 ID 편집
4. **Authorized redirect URIs**에 다음 추가:
   ```
   https://bearbrick-fxo8clt5l-gombricks-projects.vercel.app/api/auth/callback/google
   ```

#### 2. 권장 해결책: Production 도메인 고정
Vercel에서 production 도메인을 고정하여 매번 새로운 도메인이 생성되는 것을 방지:

1. **Vercel Dashboard** 접속
2. bearbrick-db 프로젝트 선택
3. **Settings** > **Domains** 이동
4. `bearbrick-db.vercel.app`를 Primary Domain으로 설정

#### 3. 환경 변수 확인
`.env` 파일에서 NEXTAUTH_URL 설정:
```env
NEXTAUTH_URL=https://bearbrick-db.vercel.app
```

### 현재 등록되어야 할 OAuth Redirect URIs
```
# Production
https://bearbrick-db.vercel.app/api/auth/callback/google

# Development
http://localhost:3000/api/auth/callback/google

# Temporary (현재 오류 해결용)
https://bearbrick-fxo8clt5l-gombricks-projects.vercel.app/api/auth/callback/google
```

### 완료 후 확인사항
1. OAuth 설정 저장 후 5-10분 대기
2. 로그인 테스트
3. OWNER 권한으로 관리자 기능 테스트

### 권한 시스템 최종 상태
- **🏆 OWNER**: andyjin@gmail.com - 모든 권한 + ADMIN 지정/해제
- **👑 ADMIN**: system@bearbrickdb.com - 이미지 승인 및 편집
- **👤 USER**: 일반 사용자 - 기여 요청 가능 (CONTRIBUTOR 삭제됨)