import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/serverAuth'

export async function POST(request: NextRequest) {
  const session = await requireUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bearbrickId } = await request.json()
  if (!bearbrickId) {
    return NextResponse.json({ error: 'bearbrickId is required' }, { status: 400 })
  }

  const existing = await prisma.collectionItem.findUnique({
    where: { userId_bearbrickId: { userId: session.user.id, bearbrickId } },
  })

  try {
    if (existing) {
      await prisma.collectionItem.delete({ where: { id: existing.id } })
      return NextResponse.json({ inCollection: false })
    }

    await prisma.collectionItem.create({
      data: { userId: session.user.id, bearbrickId },
    })
    return NextResponse.json({ inCollection: true })
  } catch (error) {
    // Two rapid toggle requests for the same item can both pass the check
    // above before either write lands - treat the resulting race errors as
    // the toggle having already gone through, instead of a hard failure.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return NextResponse.json({ inCollection: true })
      if (error.code === 'P2025') return NextResponse.json({ inCollection: false })
    }
    throw error
  }
}
