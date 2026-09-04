'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import TopMenu from '@/components/TopMenu'
import LoadingSpinner from '@/components/LoadingSpinner'
import { sortBearbricks, collapseBasicGroup, sortCategoriesOfficial, SECRET_BASIC_ORDERS, SECRET_BASIC_REPRESENTATIVE_NAMES } from '@/lib/sortBearbricks'
import { isSuperSecretRarity } from '@/lib/rarity'

interface Bearbrick {
  id: string
  name: string
  series: {
    id: string
    name: string
    number: number
  } | null
  category: {
    id: string
    name: string
  } | null
  size: number
  isSecret: boolean
  rarityPercentage: number | null
  images: {
    url: string
    isPrimary: boolean
  }[]
}

interface Series {
  id: string
  name: string
  _count?: {
    bearbricks: number
  }
}

interface Category {
  id: string
  name: string
}

const SERIES_STORAGE_KEY = 'gombrick:selectedSeries'
const CATEGORY_FILTER_STORAGE_KEY = 'gombrick:categoryFilter'
const COLLECTION_CACHE_KEY = 'gombrick:collectionIds'

export default function HomePage() {
  const { data: session, status: sessionStatus } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [allSeries, setAllSeries] = useState<Series[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set())
  const pendingToggleIdsRef = useRef<Set<string>>(new Set())
  const [collectionLoaded, setCollectionLoaded] = useState(false)
  const [myCollectionOnly, setMyCollectionOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [seriesMenuOpen, setSeriesMenuOpen] = useState(false)
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [compactHeader, setCompactHeader] = useState(false)
  const seriesMenuRef = useRef<HTMLDivElement>(null)
  const compactSeriesMenuRef = useRef<HTMLDivElement>(null)
  const categoryMenuRef = useRef<HTMLDivElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchPool, setSearchPool] = useState<Bearbrick[]>([])
  const [searchPoolLoaded, setSearchPoolLoaded] = useState(false)
  const searchMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadInitialData = async () => {
      // Fetch series first, then restore whichever series the user was
      // last looking at (if still valid), defaulting to the latest one
      const seriesData = await fetchSeries()
      const saved = sessionStorage.getItem(SERIES_STORAGE_KEY)
      const savedIsValid = saved === 'all' || (saved && seriesData.some((s: Series) => s.name === saved))
      setSelectedSeries(savedIsValid ? saved! : seriesData && seriesData.length > 0 ? seriesData[0].name : 'all')
    }

    loadInitialData()
    fetchCategories()

    const savedCategory = sessionStorage.getItem(CATEGORY_FILTER_STORAGE_KEY)
    if (savedCategory) setSelectedCategory(savedCategory)
  }, [])

  useEffect(() => {
    if (!selectedSeries) return
    sessionStorage.setItem(SERIES_STORAGE_KEY, selectedSeries)
    if (selectedSeries === 'all') {
      fetchBearbricks()
    } else {
      fetchBearbricks(selectedSeries)
    }
  }, [selectedSeries])

  useEffect(() => {
    sessionStorage.setItem(CATEGORY_FILTER_STORAGE_KEY, selectedCategory)
  }, [selectedCategory])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchCollection()
    } else if (sessionStatus === 'unauthenticated') {
      setCollectionIds(new Set())
      setMyCollectionOnly(false)
      setCollectionLoaded(true)
    }
  }, [sessionStatus])

  useEffect(() => {
    // Direction-based, not position-based: scrolling down compacts the
    // header immediately, scrolling up restores it immediately - it doesn't
    // wait for the very top. A small deadzone plus rAF throttling stops
    // tiny momentum-scroll jitters (mobile especially) from flip-flopping
    // the state and causing a flicker.
    let lastY = window.scrollY
    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const currentY = window.scrollY
        setShowScrollTop(currentY > 800)
        if (currentY <= 10) {
          setCompactHeader(false)
        } else {
          const delta = currentY - lastY
          if (delta > 5) setCompactHeader(true)
          else if (delta < -5) setCompactHeader(false)
        }
        lastY = currentY
        ticking = false
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      const inBigSeriesMenu = seriesMenuRef.current?.contains(target)
      const inCompactSeriesMenu = compactSeriesMenuRef.current?.contains(target)
      if (!inBigSeriesMenu && !inCompactSeriesMenu) {
        setSeriesMenuOpen(false)
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setCategoryMenuOpen(false)
      }
      if (searchMenuRef.current && !searchMenuRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    if (seriesMenuOpen || categoryMenuOpen || searchOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [seriesMenuOpen, categoryMenuOpen, searchOpen])

  const fetchSeries = async () => {
    try {
      const res = await fetch('/api/series')
      const data = await res.json()
      const seriesArray = Array.isArray(data) ? data : []
      setAllSeries(seriesArray)
      return seriesArray
    } catch (error) {
      console.error('Failed to fetch series:', error)
      setAllSeries([])
      return []
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategoryList(sortCategoriesOfficial(Array.isArray(data) ? data : []))
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      setCategoryList([])
    }
  }

  const fetchBearbricks = async (series?: string) => {
    // Show cached data from this session instantly (if any) instead of a
    // loading spinner, then quietly refetch in the background to refresh it.
    const cacheKey = `gombrick:bearbricks:${series || 'all'}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        setBearbricks(JSON.parse(cached))
        setLoading(false)
      } catch {
        // ignore malformed cache entry
      }
    } else {
      setLoading(true)
    }

    try {
      const url = series && series !== 'all' ? `/api/bearbricks?series=${encodeURIComponent(series)}` : '/api/bearbricks'
      const res = await fetch(url)
      const data = await res.json()
      const bearbricksArray = Array.isArray(data) ? data : []
      setBearbricks(bearbricksArray)
      sessionStorage.setItem(cacheKey, JSON.stringify(bearbricksArray))
    } catch (error) {
      console.error('Failed to fetch bearbricks:', error)
      if (!cached) setBearbricks([])
    } finally {
      setLoading(false)
    }
  }

  const ensureSearchPool = async () => {
    if (searchPoolLoaded) return
    // Reuses the same cache key the "All series" view warms, so search is
    // instant for anyone who's already browsed with that filter active.
    const cached = sessionStorage.getItem('gombrick:bearbricks:all')
    if (cached) {
      try {
        setSearchPool(JSON.parse(cached))
        setSearchPoolLoaded(true)
      } catch {
        // ignore malformed cache entry
      }
    }
    try {
      const res = await fetch('/api/bearbricks')
      const data = await res.json()
      const bearbricksArray = Array.isArray(data) ? data : []
      setSearchPool(bearbricksArray)
      sessionStorage.setItem('gombrick:bearbricks:all', JSON.stringify(bearbricksArray))
    } catch (error) {
      console.error('Failed to fetch bearbricks for search:', error)
    } finally {
      setSearchPoolLoaded(true)
    }
  }

  const openSearch = () => {
    setSearchOpen(true)
    ensureSearchPool()
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return searchPool
      .filter((b) => b.name.toLowerCase().includes(q) || b.series?.name.toLowerCase().includes(q))
      .slice(0, 8)
  })()

  const fetchCollection = async () => {
    // Show cached membership instantly (if any) so the bookmark doesn't
    // flash "not saved" while the real fetch is in flight; still fetch
    // fresh data underneath and reconcile once it lands.
    const cached = sessionStorage.getItem(COLLECTION_CACHE_KEY)
    if (cached) {
      try {
        setCollectionIds(new Set(JSON.parse(cached)))
        setCollectionLoaded(true)
      } catch {
        // ignore malformed cache entry
      }
    }

    try {
      const res = await fetch('/api/collection')
      if (!res.ok) return
      const ids = await res.json()
      const idsArray = Array.isArray(ids) ? ids : []
      setCollectionIds(new Set(idsArray))
      sessionStorage.setItem(COLLECTION_CACHE_KEY, JSON.stringify(idsArray))
    } catch (error) {
      console.error('Failed to fetch collection:', error)
    } finally {
      setCollectionLoaded(true)
    }
  }

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), 2000)
  }

  const handleToggleCollection = async (e: React.MouseEvent, bearbrickId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!session) {
      signIn('google')
      return
    }

    // A request for this item is already in flight - ignore rapid re-clicks
    // on the same item instead of firing an overlapping toggle.
    if (pendingToggleIdsRef.current.has(bearbrickId)) return
    pendingToggleIdsRef.current.add(bearbrickId)

    // Optimistic update, reverted if the request fails
    const wasInCollection = collectionIds.has(bearbrickId)
    setCollectionIds((prev) => {
      const next = new Set(prev)
      wasInCollection ? next.delete(bearbrickId) : next.add(bearbrickId)
      return next
    })
    showToast(wasInCollection ? 'Removed from My Collection' : 'Added to My Collection')

    try {
      const res = await fetch('/api/collection/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bearbrickId }),
      })
      if (!res.ok) throw new Error('Toggle failed')
    } catch (error) {
      console.error('Failed to toggle collection item:', error)
      setCollectionIds((prev) => {
        const next = new Set(prev)
        wasInCollection ? next.add(bearbrickId) : next.delete(bearbrickId)
        return next
      })
      showToast('Failed to update - try again')
    } finally {
      pendingToggleIdsRef.current.delete(bearbrickId)
    }
  }

  const handleSeriesChange = (series: string) => {
    setSelectedSeries(series)
    setSeriesMenuOpen(false)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setCategoryMenuOpen(false)
  }

  const getPrimaryImage = (bearbrick: Bearbrick) => {
    const primary = bearbrick.images.find(img => img.isPrimary)
    return primary?.url || bearbrick.images[0]?.url || '/bearbrick-placeholder.svg'
  }

  const baseSortedBearbricks = collapseBasicGroup(sortBearbricks(bearbricks))
  // allSeries is already ordered newest-first (API returns number: 'desc'),
  // so grouping "All" by that index keeps series clustered together with
  // the latest series at the top, while a stable sort preserves each
  // series's own category/secret ordering within its group.
  const seriesRank = new Map(allSeries.map((s, i) => [s.id, i]))
  const sortedBearbricks =
    selectedSeries === 'all'
      ? [...baseSortedBearbricks].sort(
          (a, b) =>
            (a.series ? seriesRank.get(a.series.id) ?? allSeries.length : allSeries.length) -
            (b.series ? seriesRank.get(b.series.id) ?? allSeries.length : allSeries.length)
        )
      : baseSortedBearbricks

  // Basic is collapsed to one representative card per series+secret-status
  // (see collapseBasicGroup - a series' secret Basic sub-set, like Series 5's
  // GOODENOUGH, is its own group), so its collection state can't be a simple
  // saved/unsaved toggle - instead show how many pieces in that group are
  // saved. Built from the raw (pre-collapse) bearbricks list.
  const basicIdsByGroupKey = new Map<string, string[]>()
  // Toggling collection membership from the home grid can't know which piece
  // the user actually owns, so it always targets a stand-in (the group's
  // first letter) - the detail page lets them correct it to the real piece.
  const basicStandInIdByGroupKey = new Map<string, string>()
  for (const b of bearbricks) {
    if (b.category?.name === 'Basic' && !SECRET_BASIC_REPRESENTATIVE_NAMES.includes(b.name)) {
      const key = `${b.series?.id ?? 'none'}:${b.isSecret}`
      if (!basicIdsByGroupKey.has(key)) basicIdsByGroupKey.set(key, [])
      basicIdsByGroupKey.get(key)!.push(b.id)
      const standInName = b.isSecret ? SECRET_BASIC_ORDERS[b.series?.name ?? '']?.[0] : 'B'
      if (b.name === standInName) basicStandInIdByGroupKey.set(key, b.id)
    }
  }

  const filteredBearbricks = sortedBearbricks
    .filter((b) => {
      if (selectedCategory === 'all') return true
      // "Secret" filters by the isSecret flag across every category, not
      // just the category-less "Secret" bucket, so Hero/Artist/etc secrets
      // show up here too.
      if (selectedCategory === 'Secret') return b.isSecret
      return b.category?.name === selectedCategory
    })
    .filter((b) => !myCollectionOnly || collectionIds.has(b.id))

  return (
    <div className="min-h-screen bg-white">
      {/* Header - sticky; the row below tucks away on scroll, leaving this pinned */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className={`max-w-7xl mx-auto px-4 ${compactHeader ? 'pt-2 pb-2' : 'pt-4 pb-0'}`}>
          {/* Row 1: logo + icons - always a single line, never wraps */}
          <div className="flex items-center flex-nowrap gap-3">
            {/* Dedicated "G@M" mark once compact, instead of clipping the full wordmark */}
            <img
              src={compactHeader ? '/logo-gombrick-mark.png' : '/logo-gombrick.png'}
              alt="GomBrick"
              className={`w-auto shrink-0 ${compactHeader ? 'h-6' : 'h-9 md:h-[42px]'}`}
            />

            {/* Compact-only mini series selector, sits next to the clipped logo */}
            {compactHeader && (
              <div className="relative shrink-0" ref={compactSeriesMenuRef}>
                <button
                  onClick={() => setSeriesMenuOpen((v) => !v)}
                  className="flex items-center gap-1 text-sm text-gray-900 hover:text-gray-500 transition-colors"
                >
                  <span className="font-agency-wide inline-block">
                    {selectedSeries === 'all' ? 'All' : selectedSeries}
                  </span>
                  <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-gray-400">
                    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {seriesMenuOpen && (
                  <div className="absolute left-0 mt-2 w-72 max-h-96 overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
                    <button
                      onClick={() => handleSeriesChange('all')}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedSeries === 'all' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                    >
                      All
                    </button>
                    {allSeries.map((series) => (
                      <button
                        key={series.id}
                        onClick={() => handleSeriesChange(series.name)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedSeries === series.name ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                      >
                        {series.name}
                        {series._count && <span className="text-gray-400"> ({series._count.bearbricks})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="ml-auto flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  if (!session) {
                    signIn('google')
                    return
                  }
                  setMyCollectionOnly((v) => !v)
                }}
                aria-label="My Collection"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  myCollectionOnly ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill={myCollectionOnly ? 'currentColor' : 'none'}>
                  <path d="M5 3h10a1 1 0 0 1 1 1v13l-6-3.5L4 17V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                <span
                  className={`overflow-hidden whitespace-nowrap ${compactHeader ? 'max-w-0 opacity-0' : 'max-w-[8rem] opacity-100'}`}
                >
                  My Collection
                </span>
              </button>
              <div className="relative" ref={searchMenuRef}>
                <button
                  onClick={() => (searchOpen ? setSearchOpen(false) : openSearch())}
                  aria-label="Search"
                  className="p-2.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M13.5 13.5L17.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                {searchOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-lg z-20 p-2">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search bearbricks..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    />
                    {searchQuery.trim() && (
                      <div className="mt-2 max-h-96 overflow-y-auto divide-y divide-gray-50">
                        {!searchPoolLoaded ? (
                          <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
                        ) : searchResults.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">No matches</p>
                        ) : (
                          searchResults.map((item) => {
                            const img = item.images.find((i) => i.isPrimary)?.url || item.images[0]?.url || '/bearbrick-placeholder.svg'
                            const displayName = item.category?.name === 'Basic' && !item.isSecret ? 'BE@RBRICK' : item.name
                            return (
                              <Link
                                key={item.id}
                                href={`/bearbricks/${item.id}`}
                                onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                                className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg"
                              >
                                <img src={img} alt="" className="w-10 h-10 object-cover object-top rounded bg-gray-50 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-900 truncate">{displayName}</p>
                                  {item.series && <p className="text-xs text-gray-400 truncate">{item.series.name}</p>}
                                </div>
                              </Link>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <TopMenu />
            </div>
          </div>

          {/* Row 2: big title + category - collapses away entirely in compact mode */}
          <div
            className={compactHeader ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-56 opacity-100 overflow-visible'}
          >
            <div className="mt-3 mb-3 relative inline-block" ref={seriesMenuRef}>
              <button
                onClick={() => setSeriesMenuOpen((v) => !v)}
                className="flex items-center gap-2 text-xl sm:text-3xl md:text-4xl text-gray-900 hover:text-gray-500 transition-colors"
              >
                <span className="font-agency-wide inline-block">
                  {selectedSeries === 'all' ? 'All' : selectedSeries}
                </span>
                <svg viewBox="0 0 20 20" fill="none" className="mt-1 text-gray-400 w-4 h-4 sm:w-[22px] sm:h-[22px]">
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {seriesMenuOpen && (
                <div className="absolute left-0 mt-2 w-72 max-h-96 overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
                  <button
                    onClick={() => handleSeriesChange('all')}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedSeries === 'all' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                  >
                    All
                  </button>
                  {allSeries.map((series) => (
                    <button
                      key={series.id}
                      onClick={() => handleSeriesChange(series.name)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedSeries === series.name ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                    >
                      {series.name}
                      {series._count && <span className="text-gray-400"> ({series._count.bearbricks})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-8 relative inline-block" ref={categoryMenuRef}>
              <button
                onClick={() => setCategoryMenuOpen((v) => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {selectedCategory === 'all' ? 'All categories' : selectedCategory}
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-gray-400">
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {categoryMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 max-h-96 overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
                  <button
                    onClick={() => handleCategoryChange('all')}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedCategory === 'all' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                  >
                    All
                  </button>
                  {categoryList.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.name)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedCategory === category.name ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-1 pb-8">
        {loading ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <LoadingSpinner label="Loading..." />
          </div>
        ) : filteredBearbricks.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-400">No bearbricks registered yet</p>
            {isAdmin && (
              <Link
                href="/admin/manage"
                className="mt-4 inline-block px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700"
              >
                Add a bearbrick
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredBearbricks.map((bearbrick) => (
              <Link
                key={bearbrick.id}
                href={`/bearbricks/${bearbrick.id}`}
                className="group"
              >
                <div className="relative aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden">
                  {bearbrick.isSecret && (
                    <span
                      className={`absolute top-2 left-2 px-2 py-1 text-[10px] md:text-xs font-semibold rounded-full z-10 ${
                        isSuperSecretRarity(bearbrick.rarityPercentage) ? 'bg-yellow-400 text-gray-900' : 'bg-blue-600 text-white'
                      }`}
                    >
                      Secret
                    </span>
                  )}
                  <img
                    src={getPrimaryImage(bearbrick)}
                    alt={bearbrick.name}
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gray-900/[0.04] pointer-events-none" />
                  {collectionLoaded && (
                    bearbrick.category?.name === 'Basic' ? (
                      (() => {
                        const groupKey = `${bearbrick.series?.id ?? 'none'}:${bearbrick.isSecret}`
                        const ids = basicIdsByGroupKey.get(groupKey) ?? []
                        const owned = ids.filter((id) => collectionIds.has(id)).length
                        const bId = basicStandInIdByGroupKey.get(groupKey) ?? ids[0]
                        return (
                          <button
                            onClick={(e) => bId && handleToggleCollection(e, bId)}
                            aria-label={owned > 0 ? 'Remove from my collection' : 'Add to my collection'}
                            className="absolute top-0 right-0 z-10 pt-0 pr-2 pb-3 pl-3 transition-transform hover:scale-105"
                          >
                            <svg width="22" height="32" viewBox="0 0 20 30" fill={owned > 0 ? '#2563eb' : 'white'} className="drop-shadow-md">
                              <path
                                d="M0 0h20v22l-10 8-10-8z"
                                stroke={owned > 0 ? '#2563eb' : '#9ca3af'}
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {owned > 0 && (
                              <span className="absolute top-0 right-2 w-[22px] h-6 flex items-center justify-center text-white text-xs font-bold">
                                {owned}
                              </span>
                            )}
                          </button>
                        )
                      })()
                    ) : (
                      <button
                        onClick={(e) => handleToggleCollection(e, bearbrick.id)}
                        aria-label={collectionIds.has(bearbrick.id) ? 'Remove from my collection' : 'Add to my collection'}
                        className="absolute top-0 right-0 z-10 pt-0 pr-2 pb-3 pl-3 transition-transform hover:scale-105"
                      >
                        <svg width="22" height="32" viewBox="0 0 20 30" fill={collectionIds.has(bearbrick.id) ? '#2563eb' : 'white'} className="drop-shadow-md">
                          <path
                            d="M0 0h20v22l-10 8-10-8z"
                            stroke={collectionIds.has(bearbrick.id) ? '#2563eb' : '#9ca3af'}
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )
                  )}
                </div>
                <div className="pt-2 px-1">
                  <h3 className="font-medium text-xs md:text-sm line-clamp-2 text-gray-900">
                    {bearbrick.category && <span className="text-gray-400">[{bearbrick.category.name}] </span>}
                    {bearbrick.category?.name === 'Basic' && !bearbrick.isSecret ? 'BE@RBRICK' : bearbrick.name}
                  </h3>
                  {selectedSeries === 'all' && bearbrick.series && (
                    <p className="text-xs text-gray-400 mt-0.5">{bearbrick.series.name}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 text-white text-sm rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-50 w-11 h-11 flex items-center justify-center bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      )}
    </div>
  )
}
