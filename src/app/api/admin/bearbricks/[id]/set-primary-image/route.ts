import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { imageId } = body

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }

    // Set all images for this bearbrick to not primary
    await prisma.bearbrickImage.updateMany({
      where: {
        bearbrickId: params.id,
      },
      data: {
        isPrimary: false,
      },
    })

    // Set the specified image as primary
    const image = await prisma.bearbrickImage.update({
      where: {
        id: imageId,
      },
      data: {
        isPrimary: true,
      },
    })

    return NextResponse.json(image)
  } catch (error) {
    console.error('Error setting primary image:', error)
    return NextResponse.json(
      { error: 'Failed to set primary image' },
      { status: 500 }
    )
  }
}
