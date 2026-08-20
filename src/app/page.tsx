'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import TopMenu from '@/components/TopMenu'
import LoadingSpinner from '@/components/LoadingSpinner'
import { sortBearbricks, collapseBasicGroup } from '@/lib/sortBearbricks'

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

export default function HomePage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [allSeries, setAllSeries] = useState<Series[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [seriesMenuOpen, setSeriesMenuOpen] = useState(false)
  const seriesMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadInitialData = async () => {
      // Fetch series first, then default the view to the latest one
      // instead of loading every bearbrick across all series
      const seriesData = await fetchSeries()
      setSelectedSeries(seriesData && seriesData.length > 0 ? seriesData[0].name : 'all')
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (!selectedSeries) return
    if (selectedSeries === 'all') {
      fetchBearbricks()
    } else {
      fetchBearbricks(selectedSeries)
    }
  }, [selectedSeries])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (seriesMenuRef.current && !seriesMenuRef.current.contains(e.target as Node)) {
        setSeriesMenuOpen(false)
      }
    }
    if (seriesMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [seriesMenuOpen])

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

  const fetchBearbricks = async (series?: string) => {
    try {
      setLoading(true)
      const url = series && series !== 'all' ? `/api/bearbricks?series=${encodeURIComponent(series)}` : '/api/bearbricks'
      const res = await fetch(url)
      const data = await res.json()
      // Ensure data is an array before setting state
      setBearbricks(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch bearbricks:', error)
      setBearbricks([])
    } finally {
      setLoading(false)
    }
  }

  const handleSeriesChange = (series: string) => {
    setSelectedSeries(series)
    setSeriesMenuOpen(false)
  }

  const getPrimaryImage = (bearbrick: Bearbrick) => {
    const primary = bearbrick.images.find(img => img.isPrimary)
    return primary?.url || bearbrick.images[0]?.url || '/bearbrick-placeholder.svg'
  }

  const baseSortedBearbricks = collapseBasicGroup(sortBearbricks(bearbricks))
  // allSeries is already ordered newest-first (API returns number: 'desc'),
  // so grouping "전체" by that index keeps series clustered together with
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <img src="/logo-gombrick.png" alt="GomBrick" className="h-9 md:h-[42px] w-auto" />
          <TopMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-1 pb-8">
        {/* Series title / selector */}
        <div className="mb-8 relative inline-block" ref={seriesMenuRef}>
          <button
            onClick={() => setSeriesMenuOpen((v) => !v)}
            className="flex items-center gap-2 text-3xl md:text-4xl text-gray-900 hover:text-gray-500 transition-colors"
          >
            <span className="font-agency-wide inline-block">
              {selectedSeries === 'all' ? '전체' : selectedSeries}
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
                전체
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

        {loading ? (
          <div className="py-24">
            <LoadingSpinner label="불러오는 중..." />
          </div>
        ) : sortedBearbricks.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-400">등록된 베어브릭이 없습니다</p>
            {isAdmin && (
              <Link
                href="/admin/manage"
                className="mt-4 inline-block px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700"
              >
                베어브릭 추가하기
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {sortedBearbricks.map((bearbrick) => (
              <Link
                key={bearbrick.id}
                href={`/bearbricks/${bearbrick.id}`}
                className="group"
              >
                <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden">
                  {bearbrick.isSecret && (
                    <span className="absolute top-2 left-2 px-2 py-1 text-[10px] md:text-xs font-semibold bg-blue-600 text-white rounded-full z-10">
                      Secret
                    </span>
                  )}
                  <img
                    src={getPrimaryImage(bearbrick)}
                    alt={bearbrick.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gray-900/[0.04] pointer-events-none" />
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
    </div>
  )
}
