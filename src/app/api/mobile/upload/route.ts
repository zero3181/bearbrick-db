import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/serverAuth'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}
// Vercel caps a serverless function's request body at 4.5MB, so the ceiling
// here is lower than the browser flow's 5MB - that one streams straight to
// Blob storage and never passes through a function. The app resizes before
// sending, so this is a guard rail rather than a limit it works against.
const MAX_BYTES = 3 * 1024 * 1024

// The web uploads images client-side with a presigned Blob token, which needs
// a session cookie the app doesn't have. This is the same upload for bearer
// tokens: the bytes go through the function and out to the same Blob store.
//
// Base64 in a JSON body rather than multipart: Expo's fetch refuses to encode
// a React Native file part, so the app can't send one.
export async function POST(request: NextRequest) {
  const session = await requireUser(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let data: unknown
  let type: unknown
  try {
    const body = await request.json()
    data = body.data
    type = body.type
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  if (typeof data !== 'string' || !data) {
    return NextResponse.json({ error: 'No image data was sent' }, { status: 400 })
  }
  if (typeof type !== 'string' || !(type in EXTENSIONS)) {
    return NextResponse.json({ error: `Unsupported image type: ${String(type)}` }, { status: 400 })
  }

  const bytes = Buffer.from(data, 'base64')
  if (bytes.length === 0) {
    return NextResponse.json({ error: 'Image data is not valid base64' }, { status: 400 })
  }
  if (bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: 'Image is larger than 3MB' }, { status: 413 })
  }

  try {
    const blob = await put(`upload-${crypto.randomUUID()}.${EXTENSIONS[type]}`, bytes, {
      access: 'public',
      contentType: type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Mobile image upload failed:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
