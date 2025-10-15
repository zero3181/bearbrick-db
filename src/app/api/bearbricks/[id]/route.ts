import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bearbrick = await prisma.bearbrick.findUnique({
      where: { id: params.id },
      include: {
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
          },
        },
        series: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!bearbrick) {
      return NextResponse.json(
        { error: 'Bearbrick not found' },
        { status: 404 }
      )
    }

    // Map to simpler structure
    const mapped = {
      id: bearbrick.id,
      name: bearbrick.name,
      series: bearbrick.series?.name || null,
      size: bearbrick.sizePercentage,
      releaseDate: bearbrick.releaseDate,
      description: bearbrick.description,
      images: bearbrick.images,
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Failed to fetch bearbrick:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bearbrick' },
      { status: 500 }
    )
  }
}
