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
    const { name, seriesId, categoryId, releaseDate, description, isSecret } = body

    if (!name || !seriesId) {
      return NextResponse.json(
        { error: 'Name and series are required' },
        { status: 400 }
      )
    }

    const bearbrick = await prisma.bearbrick.create({
      data: {
        name,
        seriesId,
        categoryId: categoryId || null,
        createdById: session.user.id,
        sizePercentage: 100,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        description: description || null,
        isSecret: Boolean(isSecret),
      },
    })

    return NextResponse.json(bearbrick)
  } catch (error) {
    console.error('Error creating bearbrick:', error)
    return NextResponse.json(
      { error: 'Failed to create bearbrick' },
      { status: 500 }
    )
  }
}
