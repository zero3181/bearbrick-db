'use client'

// A detail page is its own URL and cannot see the filters that led to it, so
// the home screen leaves the order it is showing here. Paging left and right
// on a detail page then walks the list the reader was actually looking at -
// the selected series, category and search - rather than the whole series.
//
// Session-scoped on purpose: it describes one browsing session, and a stale
// list from yesterday would page through items that are no longer on screen.

const KEY = 'gombrick:browseList'

export function saveBrowseList(ids: string[]) {
  try {
    sessionStorage.setItem(KEY, ids.join(','))
  } catch {
    // A full or disabled session store just means no paging arrows.
  }
}

export function readBrowseList(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? raw.split(',').filter(Boolean) : []
  } catch {
    return []
  }
}

/** The ids either side of `id`, or nulls when it is an end or not in the list. */
export function neighbours(id: string): { prevId: string | null; nextId: string | null } {
  const ids = readBrowseList()
  const index = ids.indexOf(id)
  if (index === -1) return { prevId: null, nextId: null }
  return {
    prevId: index > 0 ? ids[index - 1] : null,
    nextId: index < ids.length - 1 ? ids[index + 1] : null,
  }
}
