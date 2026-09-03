import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'

interface RarityUpdate {
  id: string
  rarityPercentage: number | null
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates = body.updates as RarityUpdate[]

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array is required' }, { status: 400 })
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.bearbrick.update({
          where: { id: u.id },
          data: { rarityPercentage: u.rarityPercentage },
        })
      )
    )

    return NextResponse.json({ success: true, count: updates.length })
  } catch (error) {
    console.error('Failed to update rarity:', error)
    return NextResponse.json({ error: 'Failed to update rarity' }, { status: 500 })
  }
}
