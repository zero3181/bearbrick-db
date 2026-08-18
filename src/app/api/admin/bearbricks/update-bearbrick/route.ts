import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, seriesId, categoryId, releaseDate, description, isSecret } = body

    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID and name are required' },
        { status: 400 }
      )
    }

    // Update bearbrick
    const bearbrick = await prisma.bearbrick.update({
      where: { id },
      data: {
        name,
        seriesId: seriesId || null,
        categoryId: categoryId || null,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        description,
        isSecret: Boolean(isSecret),
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
