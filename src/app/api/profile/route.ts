import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/serverAuth'

export async function GET() {
  const session = await requireUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nickname: true, showCredit: true },
  })

  return NextResponse.json(user)
}

export async function PATCH(request: NextRequest) {
  const session = await requireUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 30) || null : null
  const showCredit = Boolean(body.showCredit) && nickname !== null

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { nickname, showCredit },
    select: { nickname: true, showCredit: true },
  })

  return NextResponse.json(user)
}
