import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/serverAuth'

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bearbrickId, newData, description } = body

    if (!bearbrickId || !newData) {
      return NextResponse.json({ error: 'bearbrickId and newData are required' }, { status: 400 })
    }

    const bearbrick = await prisma.bearbrick.findUnique({
      where: { id: bearbrickId },
      select: {
        name: true,
        seriesId: true,
        categoryId: true,
        description: true,
        isSecret: true,
      },
    })

    if (!bearbrick) {
      return NextResponse.json({ error: 'Bearbrick not found' }, { status: 404 })
    }

    const editRequest = await prisma.edit_requests.create({
      data: {
        id: crypto.randomUUID(),
        bearbrickId,
        requestedById: session.user.id,
        type: 'INFO_UPDATE',
        description: description || null,
        oldData: {
          name: bearbrick.name,
          seriesId: bearbrick.seriesId,
          categoryId: bearbrick.categoryId,
          description: bearbrick.description,
          isSecret: bearbrick.isSecret,
        },
        newData,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(editRequest)
  } catch (error) {
    console.error('Error creating edit request:', error)
    return NextResponse.json({ error: 'Failed to create edit request' }, { status: 500 })
  }
}
