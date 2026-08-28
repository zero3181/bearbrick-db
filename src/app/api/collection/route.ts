import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/serverAuth'

// Returns just the current user's collection bearbrick IDs - the home
// page uses this to know which thumbnails to show as already added and
// to power the "My Collection" filter.
export async function GET() {
  const session = await requireUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const items = await prisma.collectionItem.findMany({
    where: { userId: session.user.id },
    select: { bearbrickId: true },
  })

  return NextResponse.json(items.map((i) => i.bearbrickId))
}
