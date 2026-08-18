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
const BASIC_ORDER = ['B', 'E', '@', 'R', 'b', 'R(2)', 'I', 'C', 'K']

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
