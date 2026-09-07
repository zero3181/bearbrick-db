import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/serverAuth'
import { sortBearbricks, sortCategoriesOfficial } from '@/lib/sortBearbricks'
import { isSuperSecretRarity } from '@/lib/rarity'

const RECENT_ACTIVITY_LIMIT = 20

// Aggregate stats for the "My Collection Stats" page. Unlike the home grid
// and /api/series, this deliberately does NOT run bearbricks through
// collapseBasicGroup - a collector's literal CollectionItem rows are what
// this page reports, so each of the 9 Basic pieces (B E @ R b R I C K, or a
// series' secret Basic sub-set) counts on its own rather than folding into
// one representative card.
export async function GET() {
  const session = await requireUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const [bearbricks, ownedRows, recentActivity] = await Promise.all([
    prisma.bearbrick.findMany({
      select: {
        id: true,
        name: true,
        isSecret: true,
        rarityPercentage: true,
        series: { select: { id: true, name: true, number: true, basicColor: true } },
        categories: { select: { id: true, name: true } },
        images: { select: { url: true, isPrimary: true } },
      },
    }),
    prisma.collectionItem.findMany({
      where: { userId },
      select: { bearbrickId: true },
    }),
    prisma.collectionItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        createdAt: true,
        bearbrick: {
          select: {
            id: true,
            name: true,
            isSecret: true,
            rarityPercentage: true,
            series: { select: { name: true } },
            categories: { select: { name: true } },
            images: { select: { url: true, isPrimary: true } },
          },
        },
      },
    }),
  ])

  const ownedIds = new Set(ownedRows.map((i) => i.bearbrickId))

  const overall = {
    owned: bearbricks.filter((b) => ownedIds.has(b.id)).length,
    total: bearbricks.length,
  }

  const seriesMap = new Map<
    string,
    { id: string; name: string; number: number; owned: number; total: number; color: string | null }
  >()
  // Keyed by the actual `categories` relation (an 11-row lookup table that
  // already has its own "Secret" row) rather than the isSecret boolean,
  // which instead flags a chase variant within another category (e.g. a
  // secret Hero piece keeps categoryId -> "Hero" and only isSecret: true).
  const categoryMap = new Map<string, { id: string; name: string; owned: number; total: number }>()
  // "Secret" here means the isSecret chase-variant flag across every
  // category (a secret Hero piece counts too), not just the dedicated
  // "Secret" category row - this mirrors the badge shown on cards
  // throughout the site, so it's the definition collectors recognize.
  let secretOwned = 0
  let secretTotal = 0
  let superSecretOwned = 0
  let superSecretTotal = 0

  for (const b of bearbricks) {
    const owned = ownedIds.has(b.id)

    if (b.isSecret) {
      secretTotal += 1
      if (owned) secretOwned += 1
      if (isSuperSecretRarity(b.rarityPercentage)) {
        superSecretTotal += 1
        if (owned) superSecretOwned += 1
      }
    }

    if (b.series) {
      const key = b.series.id
      if (!seriesMap.has(key)) {
        seriesMap.set(key, {
          id: b.series.id,
          name: b.series.name,
          number: b.series.number,
          owned: 0,
          total: 0,
          color: b.series.basicColor,
        })
      }
      const entry = seriesMap.get(key)!
      entry.total += 1
      if (owned) entry.owned += 1
    }

    const cat = b.categories
    const catKey = cat?.id ?? 'uncategorized'
    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, { id: catKey, name: cat?.name ?? 'Uncategorized', owned: 0, total: 0 })
    }
    const catEntry = categoryMap.get(catKey)!
    catEntry.total += 1
    if (owned) catEntry.owned += 1
  }

  const perSeries = Array.from(seriesMap.values()).sort((a, b) => b.number - a.number)
  const perCategory = sortCategoriesOfficial(Array.from(categoryMap.values()))

  const secrets = {
    owned: secretOwned,
    total: secretTotal,
    superSecretOwned,
    superSecretTotal,
  }

  // Sort using the same series/category/secret ordering as the browse grid,
  // reusing sortBearbricks purely for its comparator - collapseBasicGroup is
  // NOT applied here either, for the same reason as the aggregates above.
  const ownedSorted = sortBearbricks(
    bearbricks
      .filter((b) => ownedIds.has(b.id))
      .map((b) => ({ ...b, category: b.categories }))
  )
  const ownedItems = ownedSorted.map((b) => {
    const isBasicNonSecret = b.categories?.name === 'Basic' && !b.isSecret
    return {
      id: b.id,
      // Unlike the home grid, which collapses the 9 Basic pieces into one
      // "BE@RBRICK" representative card (the whole-set entry point), this
      // list shows each owned piece on its own row - so it should say which
      // individual letter it is, not the whole-set name.
      name: isBasicNonSecret ? `Basic "${b.name}"` : b.name,
      isSecret: b.isSecret,
      rarityPercentage: b.rarityPercentage,
      seriesName: b.series?.name ?? null,
      seriesNumber: b.series?.number ?? null,
      categoryName: b.categories?.name ?? null,
      image: b.images.find((img) => img.isPrimary)?.url ?? b.images[0]?.url ?? null,
    }
  })

  return NextResponse.json({
    overall,
    perSeries,
    perCategory,
    secrets,
    ownedItems,
    // createdAt reflects when the piece was toggled into the collection,
    // not a real "date acquired" - copy for this list should say "added",
    // never "acquired on" or similar.
    recentActivity: recentActivity.map((item) => {
      const b = item.bearbrick
      const isBasicNonSecret = b.categories?.name === 'Basic' && !b.isSecret
      return {
        id: item.id,
        createdAt: item.createdAt,
        bearbrick: {
          id: b.id,
          name: isBasicNonSecret ? `Basic "${b.name}"` : b.name,
          isSecret: b.isSecret,
          rarityPercentage: b.rarityPercentage,
          seriesName: b.series?.name ?? null,
          categoryName: b.categories?.name ?? null,
          image: b.images.find((img) => img.isPrimary)?.url ?? b.images[0]?.url ?? null,
        },
      }
    }),
  })
}
