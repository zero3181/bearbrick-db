import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { number, name, season, releaseYear, theme, description } = body

    if (!number || !name || !season || !releaseYear) {
      return NextResponse.json(
        { error: 'Number, name, season, and release year are required' },
        { status: 400 }
      )
    }

    const series = await prisma.series.create({
      data: {
        id: crypto.randomUUID(),
        number: parseInt(number),
        name,
        season,
        releaseYear: parseInt(releaseYear),
        theme: theme || null,
        description: description || null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(series)
  } catch (error) {
    console.error('Error creating series:', error)
    return NextResponse.json(
      { error: 'Failed to create series' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    console.log('[API] Fetching series...')
    const series = await prisma.series.findMany({
      include: {
        _count: {
          select: { bearbricks: true }
        }
      },
      orderBy: { number: 'desc' }
    })

    console.log(`[API] Found ${series.length} series`)
    return NextResponse.json(series, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('Error fetching series:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : '')
    return NextResponse.json({ error: 'Failed to fetch series', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
