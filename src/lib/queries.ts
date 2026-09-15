import { prisma } from '@/lib/prisma'
import { collapseBasicGroup } from '@/lib/sortBearbricks'

// The home screen's three queries, shared by the API routes and by the server
// component that renders the first screen. Keeping one copy means the
// server-rendered first paint can't drift from what the client refetches.

export async function listCategories() {
  return prisma.categories.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export async function listSeriesWithCounts() {
  const series = await prisma.series.findMany({ orderBy: { number: 'desc' } })

  // A raw row count would double up the Basic set (9 letters, or more for
  // a series with a secret Basic sub-set, are separate rows) - collapse
  // those the same way the listing screens do so the number matches what
  // a collector would count as one series' worth of distinct pieces.
  const bearbricks = await prisma.bearbrick.findMany({
    select: {
      id: true,
      name: true,
      isSecret: true,
      seriesId: true,
      categories: { select: { name: true } },
    },
  })
  const collapsed = collapseBasicGroup(
    bearbricks.map((b) => ({
      id: b.id,
      name: b.name,
      isSecret: b.isSecret,
      category: b.categories,
      series: b.seriesId ? { id: b.seriesId } : null,
    }))
  )

  const countBySeriesId = new Map<string, number>()
  for (const b of collapsed) {
    const key = b.series?.id
    if (!key) continue
    countBySeriesId.set(key, (countBySeriesId.get(key) ?? 0) + 1)
  }

  return series.map((s) => ({
    ...s,
    _count: { bearbricks: countBySeriesId.get(s.id) ?? 0 },
  }))
}

export async function listBearbricks(seriesName?: string) {
  const bearbricks = await prisma.bearbrick.findMany({
    where: seriesName ? { series: { name: seriesName } } : undefined,
    include: {
      images: {
        select: { id: true, url: true, isPrimary: true },
        // Fixed order, so making a different image the primary one moves the
        // badge without shuffling the gallery under the reader.
        orderBy: { uploadedAt: 'asc' },
      },
      series: { select: { id: true, name: true, number: true } },
      categories: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return bearbricks.map((b) => ({
    id: b.id,
    name: b.name,
    series: b.series || null,
    category: b.categories || null,
    size: b.sizePercentage,
    isSecret: b.isSecret,
    rarityPercentage: b.rarityPercentage,
    images: b.images,
  }))
}
