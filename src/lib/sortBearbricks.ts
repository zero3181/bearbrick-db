// Official Bearbrick category order (Secret always last, per official series listings)
const CATEGORY_ORDER = [
  'Basic',
  'Jelly Bean',
  'Pattern',
  'Flag',
  'SF',
  'Horror',
  'Cute',
  'Animal',
  'Hero',
  'Artist',
  'Secret',
]

// Within the Basic category, items follow this fixed code order
export const BASIC_ORDER = ['B', 'E', '@', 'R', 'b', 'R(2)', 'I', 'C', 'K']

// Some series also have a secret Basic sub-set that spells out a different
// word (e.g. Series 5's GOODENOUGH secret). Each entry's own record acts as
// the group's representative/label - it isn't itself one of the letters.
export const SECRET_BASIC_ORDERS: Record<string, string[]> = {
  'Series 5': ['G', 'O', 'O(2)', 'D', 'E', 'N', 'O(3)', 'U', 'G(2)', 'H'],
}
export const SECRET_BASIC_REPRESENTATIVE_NAMES = ['GOODENOUGH']

interface SortableBearbrick {
  name: string
  isSecret: boolean
  category: { name: string } | null
  series?: { number?: number } | null
}

function categoryRank(categoryName: string | undefined) {
  if (!categoryName) return CATEGORY_ORDER.length
  const idx = CATEGORY_ORDER.indexOf(categoryName)
  return idx === -1 ? CATEGORY_ORDER.length : idx
}

export function sortBearbricks<T extends SortableBearbrick>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.isSecret !== b.isSecret) return a.isSecret ? 1 : -1

    const rankA = categoryRank(a.category?.name)
    const rankB = categoryRank(b.category?.name)
    if (rankA !== rankB) return rankA - rankB

    const seriesA = a.series?.number
    const seriesB = b.series?.number
    if (seriesA !== undefined && seriesB !== undefined && seriesA !== seriesB) return seriesB - seriesA

    if (a.category?.name === 'Basic' && b.category?.name === 'Basic') {
      const aIsRep = SECRET_BASIC_REPRESENTATIVE_NAMES.includes(a.name)
      const bIsRep = SECRET_BASIC_REPRESENTATIVE_NAMES.includes(b.name)
      if (aIsRep !== bIsRep) return aIsRep ? -1 : 1

      const basicIdxA = BASIC_ORDER.indexOf(a.name)
      const basicIdxB = BASIC_ORDER.indexOf(b.name)
      return (basicIdxA === -1 ? BASIC_ORDER.length : basicIdxA) - (basicIdxB === -1 ? BASIC_ORDER.length : basicIdxB)
    }

    return a.name.localeCompare(b.name)
  })
}

// Orders a category list to match the official Medicom Toy listing order
// (Basic first, Secret always last), for use in filter dropdowns.
export function sortCategoriesOfficial<T extends { name: string }>(categories: T[]): T[] {
  const rank = (name: string) => {
    if (name === 'Secret') return Number.MAX_SAFE_INTEGER
    const idx = CATEGORY_ORDER.indexOf(name)
    return idx === -1 ? CATEGORY_ORDER.length : idx
  }
  return [...categories].sort((a, b) => rank(a.name) - rank(b.name))
}

interface BasicGroupable extends SortableBearbrick {
  id: string
  series: { id: string; number?: number } | null
}

// Basic items (B E @ R b R I C K) are 9 separate records per series.
// On listing screens we only want to show one representative card per
// series for the group; the detail page offers a selector for the rest.
// A series can also have its own secret Basic sub-set (see
// SECRET_BASIC_ORDERS), which collapses to its own separate representative
// card since it's a distinct group, not more of the regular set.
export function collapseBasicGroup<T extends BasicGroupable>(items: T[]): T[] {
  const seenGroups = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    if (item.category?.name === 'Basic') {
      const groupKey = `${item.series?.id ?? 'none'}:${item.isSecret}`
      if (seenGroups.has(groupKey)) continue
      seenGroups.add(groupKey)
    }
    result.push(item)
  }
  return result
}
