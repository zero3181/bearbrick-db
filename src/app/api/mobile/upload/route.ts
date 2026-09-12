import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/serverAuth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}
// Vercel caps a serverless function's request body at 4.5MB, so the ceiling
// here is lower than the browser flow's 5MB - that one streams straight to
// Blob storage and never passes through a function.
const MAX_BYTES = 4 * 1024 * 1024

// The web uploads images client-side with a presigned Blob token, which needs
// a session cookie the app doesn't have. This is the same upload for bearer
// tokens: the file goes through the function and out to the same Blob store.
export async function POST(request: NextRequest) {
  const session = await requireUser(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let file: File | null = null
  try {
    const form = await request.formData()
    const value = form.get('file')
    if (value instanceof File) file = value
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  if (!file) {
    return NextResponse.json({ error: 'No file was uploaded' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported image type: ${file.type}` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image is larger than 4MB' }, { status: 413 })
  }

  try {
    const blob = await put(`upload-${crypto.randomUUID()}.${EXTENSIONS[file.type]}`, file, {
      access: 'public',
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Mobile image upload failed:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
