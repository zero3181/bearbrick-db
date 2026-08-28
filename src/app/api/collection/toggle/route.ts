import { NextRequest, NextResponse } from 'next/server'
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

  if (existing) {
    await prisma.collectionItem.delete({ where: { id: existing.id } })
    return NextResponse.json({ inCollection: false })
  }

  await prisma.collectionItem.create({
    data: { userId: session.user.id, bearbrickId },
  })
  return NextResponse.json({ inCollection: true })
}
