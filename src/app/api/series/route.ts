import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'
import { listSeriesWithCounts } from '@/lib/queries'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
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
    const withCounts = await listSeriesWithCounts()
    console.log(`[API] Found ${withCounts.length} series`)
    return NextResponse.json(withCounts)
  } catch (error) {
    console.error('Error fetching series:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : '')
    return NextResponse.json({ error: 'Failed to fetch series', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
