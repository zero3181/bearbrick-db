# Google OAuth 로그인 오류 해결 가이드

## 문제 증상
- 로그인 시 `https://bearbrick-db.vercel.app/auth/signin?error=Callback`로 계속 리다이렉트됨
- 로그인이 완료되지 않음

## 원인
Google OAuth 설정에서 **Redirect URI**가 올바르게 설정되지 않았습니다.

---

## 해결 방법

### 1. Google Cloud Console 접속

```
https://console.cloud.google.com/
```

1. 로그인 후 프로젝트 선택
2. 왼쪽 메뉴에서 **APIs & Services** → **Credentials** 클릭

### 2. OAuth 2.0 Client ID 찾기

- **OAuth 2.0 Client IDs** 섹션에서
- **BearbrickDB Web Client** 클릭 (또는 본인이 생성한 OAuth Client 이름)

### 3. Authorized redirect URIs 추가

**Authorized redirect URIs** 섹션에 다음 URL들을 추가:

#### 운영 환경 (필수):
```
https://bearbrick-db.vercel.app/api/auth/callback/google
```

#### 로컬 개발 환경 (선택):
```
http://localhost:3000/api/auth/callback/google
```

### 4. 저장
- 스크롤 다운해서 **Save** 버튼 클릭
- 변경사항이 반영되기까지 **최대 5분** 소요될 수 있음

---

## Vercel 환경변수 확인

### 1. Vercel Dashboard 접속
```
https://vercel.com/dashboard
```

### 2. 환경변수 확인
1. 프로젝트 선택 (bearbrick-db)
2. **Settings** → **Environment Variables**
3. 다음 환경변수들이 올바르게 설정되어 있는지 확인:

```bash
# NextAuth.js
NEXTAUTH_URL=https://bearbrick-db.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret

# Google OAuth (Vercel Dashboard에서 이미 설정되어 있어야 함)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. NEXTAUTH_URL 수정 (중요!)
- `NEXTAUTH_URL`이 `http://localhost:3000`으로 되어 있다면
- `https://bearbrick-db.vercel.app`로 변경
- **Production**, **Preview**, **Development** 모두 설정

### 4. 재배포
환경변수 변경 후 자동으로 재배포되지만, 수동으로 재배포하려면:
```bash
# Vercel CLI 사용
vercel --prod

# 또는 Dashboard에서
Deployments → ... → Redeploy
```

---

## 테스트

1. 모든 설정 완료 후 5분 대기
2. https://bearbrick-db.vercel.app 접속
3. 로그인 시도
4. 정상적으로 로그인되는지 확인

---

## 문제가 계속되면

### 브라우저 캐시 및 쿠키 삭제
1. 브라우저 설정 → 개인정보 및 보안
2. 쿠키 및 사이트 데이터 삭제
3. `bearbrick-db.vercel.app` 관련 쿠키 모두 삭제
4. 다시 로그인 시도

### Vercel 로그 확인
```bash
# Vercel CLI로 실시간 로그 확인
vercel logs --follow

# 또는 Dashboard에서
프로젝트 → Deployments → 최신 배포 → Runtime Logs
```

### 데이터베이스 연결 확인
```bash
# 로컬에서 데이터베이스 연결 테스트
npx prisma db push
npx prisma studio
```

---

## 참고: NextAuth.js Callback URL 구조

NextAuth.js는 다음 URL 패턴을 사용합니다:
```
{NEXTAUTH_URL}/api/auth/callback/{provider}
```

예시:
- 운영: `https://bearbrick-db.vercel.app/api/auth/callback/google`
- 로컬: `http://localhost:3000/api/auth/callback/google`

이 URL을 Google OAuth의 **Authorized redirect URIs**에 정확히 추가해야 합니다.
