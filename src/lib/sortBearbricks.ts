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
  'Villain',
  'Secret',
]

// Within the Basic category, items follow this fixed code order
export const BASIC_ORDER = ['B', 'E', '@', 'R', 'b', 'R(2)', 'I', 'C', 'K']

interface SortableBearbrick {
  name: string
  isSecret: boolean
  category: { name: string } | null
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

    if (a.category?.name === 'Basic' && b.category?.name === 'Basic') {
      const basicIdxA = BASIC_ORDER.indexOf(a.name)
      const basicIdxB = BASIC_ORDER.indexOf(b.name)
      return (basicIdxA === -1 ? BASIC_ORDER.length : basicIdxA) - (basicIdxB === -1 ? BASIC_ORDER.length : basicIdxB)
    }

    return a.name.localeCompare(b.name)
  })
}

interface BasicGroupable extends SortableBearbrick {
  id: string
  series: { id: string } | null
}

// Basic items (B E @ R b R I C K) are 9 separate records per series.
// On listing screens we only want to show one representative card per
// series for the group; the detail page offers a selector for the rest.
export function collapseBasicGroup<T extends BasicGroupable>(items: T[]): T[] {
  const seenSeries = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    if (item.category?.name === 'Basic') {
      const seriesKey = item.series?.id ?? 'none'
      if (seenSeries.has(seriesKey)) continue
      seenSeries.add(seriesKey)
    }
    result.push(item)
  }
  return result
}
