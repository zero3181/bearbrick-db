import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'
import { r2, R2_BUCKET } from '@/lib/r2'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cascade (onDelete: Cascade on BearbrickImage) only drops the DB rows,
    // so the image URLs have to be read out before that transaction runs.
    const images = await prisma.bearbrickImage.findMany({
      where: { bearbrickId: params.id },
      select: { url: true },
    })

    await prisma.$transaction([
      prisma.edit_requests.deleteMany({ where: { bearbrickId: params.id } }),
      prisma.image_requests.deleteMany({ where: { bearbrickId: params.id } }),
      prisma.bearbrick.delete({ where: { id: params.id } }),
    ])

    await Promise.all(
      images
        .filter((img) => img.url.startsWith(process.env.R2_PUBLIC_URL!))
        .map((img) => {
          const key = new URL(img.url).pathname.replace(/^\//, '')
          return r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })).catch((error) => {
            console.error(`Failed to delete R2 object for ${img.url}:`, error)
          })
        })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bearbrick:', error)
    return NextResponse.json(
      { error: 'Failed to delete bearbrick' },
      { status: 500 }
    )
  }
}
