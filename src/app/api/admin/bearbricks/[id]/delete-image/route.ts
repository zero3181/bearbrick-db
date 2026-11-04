import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'
import { r2, R2_BUCKET } from '@/lib/r2'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { imageId } = body

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }

    const image = await prisma.bearbrickImage.delete({
      where: {
        id: imageId,
      },
    })

    // Only images already migrated to R2 have a deletable key here - any
    // still on the old Vercel Blob host during the migration window are
    // left alone (that store is being retired wholesale, not per-file).
    if (image.url.startsWith(process.env.R2_PUBLIC_URL!)) {
      const key = new URL(image.url).pathname.replace(/^\//, '')
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
