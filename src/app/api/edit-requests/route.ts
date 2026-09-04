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

    if (!newData) {
      return NextResponse.json({ error: 'newData is required' }, { status: 400 })
    }

    // No bearbrickId means this is a suggestion for a brand-new bearbrick,
    // not a correction to an existing one - there's nothing to diff against.
    if (!bearbrickId) {
      if (!newData.name || !newData.seriesId) {
        return NextResponse.json({ error: 'Name and series are required' }, { status: 400 })
      }

      const editRequest = await prisma.edit_requests.create({
        data: {
          id: crypto.randomUUID(),
          requestedById: session.user.id,
          type: 'NEW_ITEM',
          description: description || null,
          oldData: undefined,
          newData,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json(editRequest)
    }

    const bearbrick = await prisma.bearbrick.findUnique({
      where: { id: bearbrickId },
      select: {
        name: true,
        seriesId: true,
        categoryId: true,
        description: true,
        isSecret: true,
        rarityPercentage: true,
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
          rarityPercentage: bearbrick.rarityPercentage,
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
