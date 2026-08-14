import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
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
    const { name, seriesId, size, releaseDate, description } = body

    if (!name || !seriesId) {
      return NextResponse.json(
        { error: 'Name and series are required' },
        { status: 400 }
      )
    }

    const category = await prisma.categories.findFirst({ orderBy: { name: 'asc' } })
    const createdBy = await prisma.users.findFirst({
      where: { email: 'system@bearbrickdb.com' },
    })

    if (!category || !createdBy) {
      return NextResponse.json(
        { error: 'Missing default category or system user' },
        { status: 500 }
      )
    }

    const bearbrick = await prisma.bearbrick.create({
      data: {
        name,
        seriesId,
        categoryId: category.id,
        createdById: createdBy.id,
        sizePercentage: parseInt(size),
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        description: description || null,
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
