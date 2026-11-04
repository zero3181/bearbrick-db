import { S3Client } from '@aws-sdk/client-s3'

// Cloudflare R2 speaks the S3 API, so the AWS SDK works unmodified against
// R2's account-scoped endpoint - no AWS account or region involved.
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET = process.env.R2_BUCKET_NAME!

export function r2PublicUrl(key: string) {
  return `${process.env.R2_PUBLIC_URL}/${key}`
}
