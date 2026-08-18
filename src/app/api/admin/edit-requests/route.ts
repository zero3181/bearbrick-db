import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requests = await prisma.edit_requests.findMany({
    where: { status: 'PENDING' },
    include: {
      bearbricks: { select: { id: true, name: true } },
      users: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(requests)
}
