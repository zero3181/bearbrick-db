'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import TopMenu from '@/components/TopMenu'
import LoadingSpinner from '@/components/LoadingSpinner'
import { sortBearbricks, collapseBasicGroup, sortCategoriesOfficial } from '@/lib/sortBearbricks'

interface Bearbrick {
  id: string
  name: string
  series: {
    id: string
    name: string
  } | null
  category: {
    id: string
    name: string
  } | null
  size: number
  isSecret: boolean
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

export default function HomePage() {
  const { data: session, status: sessionStatus } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [allSeries, setAllSeries] = useState<Series[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set())
  const [myCollectionOnly, setMyCollectionOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [seriesMenuOpen, setSeriesMenuOpen] = useState(false)
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false)
  const seriesMenuRef = useRef<HTMLDivElement>(null)
  const categoryMenuRef = useRef<HTMLDivElement>(null)

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
    }
  }, [sessionStatus])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (seriesMenuRef.current && !seriesMenuRef.current.contains(e.target as Node)) {
        setSeriesMenuOpen(false)
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setCategoryMenuOpen(false)
      }
    }
    if (seriesMenuOpen || categoryMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [seriesMenuOpen, categoryMenuOpen])

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

  const fetchCollection = async () => {
    try {
      const res = await fetch('/api/collection')
      if (!res.ok) return
      const ids = await res.json()
      setCollectionIds(new Set(Array.isArray(ids) ? ids : []))
    } catch (error) {
      console.error('Failed to fetch collection:', error)
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
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <img src="/logo-gombrick.png" alt="GomBrick" className="h-9 md:h-[42px] w-auto" />
          <div className="flex items-center gap-1">
            {session && (
              <button
                onClick={() => setMyCollectionOnly((v) => !v)}
                aria-label="My Collection"
                className={`p-2 rounded-full transition-colors ${
                  myCollectionOnly ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill={myCollectionOnly ? 'currentColor' : 'none'}>
                  <path d="M5 3h10a1 1 0 0 1 1 1v13l-6-3.5L4 17V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <TopMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-1 pb-8">
        {/* Series title / selector */}
        <div className="mb-3 relative inline-block" ref={seriesMenuRef}>
          <button
            onClick={() => setSeriesMenuOpen((v) => !v)}
            className="flex items-center gap-2 text-3xl md:text-4xl text-gray-900 hover:text-gray-500 transition-colors"
          >
            <span className="font-agency-wide inline-block">
              {selectedSeries === 'all' ? 'All' : selectedSeries}
            </span>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" className="mt-1 text-gray-400">
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

        {/* Category filter */}
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
                        bearbrick.category?.name === 'Secret' ? 'bg-yellow-400 text-gray-900' : 'bg-blue-600 text-white'
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
                  <button
                    onClick={(e) => handleToggleCollection(e, bearbrick.id)}
                    aria-label={collectionIds.has(bearbrick.id) ? 'Remove from my collection' : 'Add to my collection'}
                    className="absolute top-0 right-0 z-10 pt-0 pr-2 pb-3 pl-3 transition-transform hover:scale-105"
                  >
                    <svg width="22" height="32" viewBox="0 0 20 30" fill={collectionIds.has(bearbrick.id) ? '#2563eb' : 'white'} className="drop-shadow-md">
                      <path
                        d="M0 0h20v22l-10 8-10-8z"
                        stroke={collectionIds.has(bearbrick.id) ? '#2563eb' : '#374151'}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <div className="pt-2 px-1">
                  <h3 className="font-medium text-xs md:text-sm line-clamp-2 text-gray-900">
                    {bearbrick.category && <span className="text-gray-400">[{bearbrick.category.name}] </span>}
                    {bearbrick.category?.name === 'Basic' ? 'BE@RBRICK' : bearbrick.name}
                  </h3>
                  {bearbrick.series && (
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
    </div>
  )
}
