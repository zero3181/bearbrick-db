import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const series = searchParams.get('series')

    const bearbricks = await prisma.bearbrick.findMany({
      where: series ? {
        series: {
          name: series,
        },
      } : undefined,
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Map to simpler structure
    const mapped = bearbricks.map((b) => ({
      id: b.id,
      name: b.name,
      series: b.series?.name || null,
      size: b.sizePercentage,
      images: b.images,
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Failed to fetch bearbricks:', error)
    // Return empty array instead of error object to prevent client-side crashes
    return NextResponse.json([])
  }
}
