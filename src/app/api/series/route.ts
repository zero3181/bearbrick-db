import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'
import { collapseBasicGroup } from '@/lib/sortBearbricks'

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
      orderBy: { number: 'desc' }
    })

    // A raw row count would double up the Basic set (9 letters, or more for
    // a series with a secret Basic sub-set, are separate rows) - collapse
    // those the same way the listing screens do so the number matches what
    // a collector would count as one series' worth of distinct pieces.
    const bearbricks = await prisma.bearbrick.findMany({
      select: {
        id: true,
        name: true,
        isSecret: true,
        seriesId: true,
        categories: { select: { name: true } },
      },
    })
    const collapsed = collapseBasicGroup(
      bearbricks.map((b) => ({
        id: b.id,
        name: b.name,
        isSecret: b.isSecret,
        category: b.categories,
        series: b.seriesId ? { id: b.seriesId } : null,
      }))
    )
    const countBySeriesId = new Map<string, number>()
    for (const b of collapsed) {
      const key = b.series?.id
      if (!key) continue
      countBySeriesId.set(key, (countBySeriesId.get(key) ?? 0) + 1)
    }

    const withCounts = series.map((s) => ({
      ...s,
      _count: { bearbricks: countBySeriesId.get(s.id) ?? 0 },
    }))

    console.log(`[API] Found ${series.length} series`)
    return NextResponse.json(withCounts)
  } catch (error) {
    console.error('Error fetching series:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : '')
    return NextResponse.json({ error: 'Failed to fetch series', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
