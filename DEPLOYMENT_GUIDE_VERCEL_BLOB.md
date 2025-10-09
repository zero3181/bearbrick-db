# Vercel Blob Storage 설정 가이드

## 1. Vercel Blob Storage 생성

### ⚠️ 중요: Blob Storage와 Database는 다릅니다!

| 구분 | 용도 | 현재 상태 |
|------|------|-----------|
| **Database (PostgreSQL)** | 구조화된 데이터 저장<br>(베어브릭 정보, 사용자 정보 등) | ✅ Supabase 사용 중 |
| **Blob Storage** | 파일 저장<br>(이미지, 동영상 등) | ❌ 새로 생성 필요 |

### 생성 단계:

#### Step 1: Vercel Dashboard 접속
```
https://vercel.com/dashboard
```
- 본인의 Vercel 계정으로 로그인
- 왼쪽 사이드바에서 프로젝트 선택 (bearbrick-db)

#### Step 2: Storage 탭으로 이동
- 상단 메뉴바에서 **Storage** 클릭
- 또는 직접 URL: `https://vercel.com/[your-username]/[project-name]/stores`

#### Step 3: Blob Storage 생성
- **Create** 또는 **Create Database** 버튼 클릭
- 여러 옵션 중 **Blob** 선택 (📁 파일 아이콘)
  - ❌ Postgres (이미 있음)
  - ❌ KV
  - ✅ **Blob** ← 이것 선택!
- Store 이름 입력 (예: `bearbrick-images`)
- **Create** 버튼 클릭

#### Step 4: 프로젝트에 연결
- 생성된 Blob Storage 클릭
- **Connect Project** 버튼 클릭
- 본인의 프로젝트 선택
- 환경 선택 (Production, Preview, Development 모두 체크 권장)
- **Connect** 클릭

#### Step 5: 환경변수 확인 및 복사
- 연결 후 자동으로 `.env.local` 탭이 보임
- 다음과 같은 환경변수가 표시됨:
  ```bash
  BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxx"
  ```
- **Copy Snippet** 버튼으로 복사

## 2. 환경 변수 설정

### 로컬 개발 환경 (.env)

`.env` 파일에 다음 내용 추가:

```bash
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxx"
```

### Vercel 운영 환경

1. Vercel Dashboard에서 프로젝트 선택
2. **Settings** → **Environment Variables** 이동
3. 다음 환경 변수들 추가:

```bash
# Vercel Blob Storage (자동으로 연결됨)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx

# NextAuth.js (운영 도메인으로 변경)
NEXTAUTH_URL=https://yourdomain.com

# Database URLs (이미 설정되어 있음)
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...

# Google OAuth (이미 설정되어 있음)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
```

## 3. 이미지 업로드 흐름

### 현재 구현된 방식

1. **클라이언트 → Vercel Blob** (직접 업로드)
   - `ImageUpload.tsx`에서 `@vercel/blob/client`의 `upload()` 사용
   - `/api/upload/presigned` 엔드포인트로 Presigned URL 요청
   - 클라이언트가 Vercel Blob에 직접 업로드

2. **메타데이터 저장**
   - 업로드 완료 후 `/api/admin/bearbricks/[id]/upload-image` 호출
   - PostgreSQL에 이미지 URL과 메타데이터 저장

### 파일 구조

```
src/
├── components/
│   └── ImageUpload.tsx              # 이미지 업로드 UI 컴포넌트
├── pages/api/
    ├── upload/
    │   └── presigned.ts             # Presigned URL 생성 API
    └── admin/bearbricks/[id]/
        └── upload-image.ts          # 이미지 메타데이터 저장 API
```

## 4. 저장 위치 및 특징

- **물리적 저장소**: Vercel Blob Storage (클라우드)
- **파일명 형식**: `bearbrick-{bearbrickId}-{timestamp}.{ext}`
- **접근 권한**: Public (URL로 누구나 접근 가능)
- **최대 파일 크기**: 5MB (설정 변경 가능)
- **지원 형식**: JPG, PNG, GIF, WebP

## 5. 데이터베이스 스키마

이미지 메타데이터는 `BearbrickImage` 테이블에 저장됩니다:

```prisma
model BearbrickImage {
  id            String    @id @default(cuid())
  url           String    // Vercel Blob URL
  altText       String?   // 대체 텍스트
  isPrimary     Boolean   @default(false)
  bearbrick     Bearbrick @relation(fields: [bearbrickId], references: [id])
  bearbrickId   String
  uploadedBy    User      @relation(fields: [uploadedById], references: [id])
  uploadedById  String
  createdAt     DateTime  @default(now())
}
```

## 6. 배포 후 확인사항

### 환경 변수 확인
```bash
# Vercel CLI로 확인
vercel env ls
```

### 이미지 업로드 테스트
1. 관리자 계정으로 로그인
2. 베어브릭 상세 페이지에서 이미지 업로드 시도
3. 브라우저 개발자 도구에서 네트워크 탭 확인
4. Vercel Blob Storage에서 파일 업로드 확인

## 7. 문제 해결

### BLOB_READ_WRITE_TOKEN 오류
- Vercel Dashboard에서 토큰 재생성
- 환경 변수 재설정 후 재배포

### 업로드 실패
- 파일 크기 확인 (5MB 이하)
- 파일 형식 확인 (JPG, PNG, GIF, WebP)
- 네트워크 연결 상태 확인

### 이미지 표시 안됨
- DB에 저장된 URL 확인
- Vercel Blob URL 접근 권한 확인 (public으로 설정되어야 함)
- CORS 설정 확인

## 8. 비용 관련

Vercel Blob Storage 무료 제공량:
- 1 GB 저장 공간
- 월 100 GB 대역폭

초과 시 요금이 부과되므로 사용량 모니터링 필요.
