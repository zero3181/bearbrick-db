import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/serverAuth'

export async function GET(request: NextRequest) {
  const session = await requireUser(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nickname: true, showCredit: true },
  })

  // The mobile app has no session cookie to read the signed-in user from, so
  // this doubles as its "who am I" call - the role is what gates its admin UI.
  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    role: session.user.role,
    ...user,
  })
}

export async function PATCH(request: NextRequest) {
  const session = await requireUser(request)
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
