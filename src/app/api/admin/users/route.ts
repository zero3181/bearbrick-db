import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOwner } from '@/lib/serverAuth'

export async function GET() {
  const session = await requireOwner()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [users, requestCounts] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        _count: {
          select: { collectionItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.edit_requests.groupBy({
      by: ['requestedById', 'type'],
      _count: { _all: true },
    }),
  ])

  const countsByUser = new Map<string, { total: number; newItem: number }>()
  for (const row of requestCounts) {
    const entry = countsByUser.get(row.requestedById) ?? { total: 0, newItem: 0 }
    entry.total += row._count._all
    if (row.type === 'NEW_ITEM') entry.newItem += row._count._all
    countsByUser.set(row.requestedById, entry)
  }

  const withStats = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    createdAt: u.createdAt,
    collectionCount: u._count.collectionItems,
    suggestionCount: countsByUser.get(u.id)?.newItem ?? 0,
    correctionCount: (countsByUser.get(u.id)?.total ?? 0) - (countsByUser.get(u.id)?.newItem ?? 0),
  }))

  return NextResponse.json({ users: withStats })
}
