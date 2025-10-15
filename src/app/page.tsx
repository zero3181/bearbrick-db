'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Bearbrick {
  id: string
  name: string
  series: string | null
  size: number
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
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [allSeries, setAllSeries] = useState<Series[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')

  useEffect(() => {
    const loadInitialData = async () => {
      const adminStatus = localStorage.getItem('isAdmin') === 'true'
      setIsAdmin(adminStatus)

      // Fetch series first
      const seriesData = await fetchSeries()

      // Auto-select the latest series
      if (seriesData && seriesData.length > 0) {
        const latestSeries = seriesData[0].name
        setSelectedSeries(latestSeries)
        fetchBearbricks(latestSeries)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedSeries && selectedSeries !== 'all') {
      fetchBearbricks(selectedSeries)
    } else if (selectedSeries === 'all') {
      fetchBearbricks()
    }
  }, [selectedSeries])

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
  }

  const handleAdminLogin = () => {
    if (password === '4321') {
      localStorage.setItem('isAdmin', 'true')
      setIsAdmin(true)
      setShowPasswordModal(false)
      setPassword('')
    } else {
      alert('잘못된 비밀번호입니다')
      setPassword('')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('isAdmin')
    setIsAdmin(false)
  }

  const getPrimaryImage = (bearbrick: Bearbrick) => {
    const primary = bearbrick.images.find(img => img.isPrimary)
    return primary?.url || bearbrick.images[0]?.url || '/bearbrick-placeholder.svg'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bearbrick DB</h1>
          <div>
            {isAdmin ? (
              <div className="flex gap-3">
                <Link
                  href="/admin/manage"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  관리
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Series Filter */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">베어브릭 컬렉션</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">시리즈:</label>
            <select
              value={selectedSeries}
              onChange={(e) => handleSeriesChange(e.target.value)}
              className="px-4 py-2 border rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
            >
              <option value="all">전체</option>
              {allSeries.map((series) => (
                <option key={series.id} value={series.name}>
                  {series.name}
                  {series._count && ` (${series._count.bearbricks})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">불러오는 중...</p>
          </div>
        ) : bearbricks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">등록된 베어브릭이 없습니다</p>
            {isAdmin && (
              <Link
                href="/admin/manage"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                베어브릭 추가하기
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {bearbricks.map((bearbrick) => (
              <Link
                key={bearbrick.id}
                href={`/bearbricks/${bearbrick.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <img
                    src={getPrimaryImage(bearbrick)}
                    alt={bearbrick.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2 md:p-4">
                  <h3 className="font-semibold text-xs md:text-lg mb-1 line-clamp-2 text-gray-900 dark:text-white">{bearbrick.name}</h3>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    {bearbrick.series && `${bearbrick.series} · `}
                    {bearbrick.size}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">관리자 로그인</h3>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="비밀번호 입력"
              className="w-full px-4 py-2 border dark:border-gray-600 rounded mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleAdminLogin}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                확인
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPassword('')
                }}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
