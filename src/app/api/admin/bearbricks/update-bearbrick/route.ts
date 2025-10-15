import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
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
    const { id, name, series, size, releaseDate, description } = body

    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID and name are required' },
        { status: 400 }
      )
    }

    // Find or create series
    let seriesId = null
    if (series) {
      const seriesRecord = await prisma.series.upsert({
        where: { name: series },
        update: {},
        create: { name: series },
      })
      seriesId = seriesRecord.id
    }

    // Update bearbrick
    const bearbrick = await prisma.bearbrick.update({
      where: { id },
      data: {
        name,
        seriesId,
        size: parseInt(size),
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        description,
      },
    })

    return NextResponse.json(bearbrick)
  } catch (error) {
    console.error('Error updating bearbrick:', error)
    return NextResponse.json(
      { error: 'Failed to update bearbrick' },
      { status: 500 }
    )
  }
}
