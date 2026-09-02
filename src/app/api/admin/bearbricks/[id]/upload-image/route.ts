import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'
import { normalizeImageInBackground } from '@/lib/normalizeImage'

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
    const { imageUrl, isPrimary } = body

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Create the image
    const image = await prisma.bearbrickImage.create({
      data: {
        url: imageUrl,
        isPrimary: isPrimary || false,
        bearbrickId: params.id,
        uploadedById: session.user.id,
      },
    })

    // Respond immediately with the raw upload; swap in a background-cropped
    // version once it's ready so the request doesn't wait on it.
    after(() => normalizeImageInBackground(image.id, imageUrl, params.id))

    return NextResponse.json(image)
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
