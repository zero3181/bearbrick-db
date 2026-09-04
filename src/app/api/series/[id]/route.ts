import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data: { season?: string; releaseYear?: number } = {}
    if (typeof body.season === 'string') data.season = body.season
    if (typeof body.releaseYear === 'number') data.releaseYear = body.releaseYear

    const series = await prisma.series.update({ where: { id: params.id }, data })
    return NextResponse.json(series)
  } catch (error) {
    console.error('Failed to update series:', error)
    return NextResponse.json({ error: 'Failed to update series' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await prisma.bearbrick.count({ where: { seriesId: params.id } })
    if (count > 0) {
      return NextResponse.json(
        { error: `Series still has ${count} bearbrick(s) - remove them first` },
        { status: 400 }
      )
    }

    await prisma.series.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete series:', error)
    return NextResponse.json({ error: 'Failed to delete series' }, { status: 500 })
  }
}
