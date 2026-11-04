import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/serverAuth'
import { r2, R2_BUCKET, r2PublicUrl } from '@/lib/r2'

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

// Mirrors the old Vercel Blob client flow's shape (ask the server for
// permission to upload, then PUT straight to storage from the browser) but
// as a plain presigned S3 PUT URL instead of Vercel's own handshake protocol.
export async function POST(request: NextRequest) {
  const session = await requireUser(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { filename, contentType, size } = body as { filename?: string; contentType?: string; size?: number }

  if (!filename || typeof filename !== 'string') {
    return NextResponse.json({ error: 'A filename is required' }, { status: 400 })
  }
  if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 })
  }
  if (typeof size === 'number' && size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is larger than 5MB' }, { status: 400 })
  }

  // Filenames are already made unique by the caller (timestamp/uuid suffix) -
  // strip path separators defensively so a crafted filename can't climb out
  // of the bucket's flat namespace.
  const key = filename.replace(/[/\\]/g, '_')

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 60 * 5 }
  )

  return NextResponse.json({ uploadUrl, publicUrl: r2PublicUrl(key) })
}
