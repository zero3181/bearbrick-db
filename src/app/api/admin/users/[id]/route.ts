import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireOwner } from '@/lib/serverAuth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireOwner()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { role } = await request.json()
  const userId = params.id

  if (!role || !Object.values(UserRole).includes(role)) {
    return NextResponse.json({ error: 'A valid role is required' }, { status: 400 })
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "You can't change your own role" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.role === 'OWNER') {
    return NextResponse.json({ error: "The OWNER role can't be changed" }, { status: 400 })
  }

  if (role === 'OWNER') {
    return NextResponse.json({ error: "Can't grant the OWNER role" }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, role: true },
  })

  return NextResponse.json({ success: true, user: updated })
}
