import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== '4321') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { imageId } = body

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }

    // Set all images for this bearbrick to not primary
    await prisma.image.updateMany({
      where: {
        bearbrickId: params.id,
      },
      data: {
        isPrimary: false,
      },
    })

    // Set the specified image as primary
    const image = await prisma.image.update({
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
