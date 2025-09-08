'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Bearbrick {
  id: string
  name: string
  sizePercentage: number
  rarityPercentage: number | null
  estimatedQuantity: number
  description: string
  series: {
    id: string
    number: number
    name: string
    season: string
    releaseYear: number
  }
  category: {
    id: string
    name: string
  }
  collaboration: {
    id: string
    brandName: string
  } | null
  images: Array<{
    id: string
    url: string
    altText: string
  }>
  _count?: {
    recommendations: number
  }
}

interface BearbrickResponse {
  data: Bearbrick[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

interface Series {
  id: string
  number: number
  name: string
  season: string
  releaseYear: number
  _count: { bearbricks: number }
}

interface Category {
  id: string
  name: string
  _count: { bearbricks: number }
}

export default function BearbricsPage() {
  const { data: session } = useSession()
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState<Series[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  
  // Filters
  const [selectedSeries, setSelectedSeries] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Recommendation states
  const [userRecommendations, setUserRecommendations] = useState<Set<string>>(new Set())

  // Fetch metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [seriesRes, categoriesRes] = await Promise.all([
          fetch('/api/series'),
          fetch('/api/categories')
        ])
        
        if (seriesRes.ok) {
          const seriesData = await seriesRes.json()
          setSeries(seriesData)
          // Set the first series (latest) as default selection
          if (seriesData.length > 0 && selectedSeries === '') {
            setSelectedSeries(seriesData[0].number.toString())
          }
        }
        
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          setCategories(categoriesData)
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error)
      }
    }
    
    fetchMetadata()
  }, [])

  // Fetch bearbricks
  useEffect(() => {
    const fetchBearbricks = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString()
        })
        
        if (selectedSeries) params.set('series', selectedSeries)
        if (selectedCategory) params.set('category', selectedCategory)
        if (searchTerm) params.set('search', searchTerm)
        
        const response = await fetch(`/api/bearbricks?${params}`)
        if (response.ok) {
          const data: BearbrickResponse = await response.json()
          setBearbricks(data.data)
          setPagination(data.pagination)
        }
      } catch (error) {
        console.error('Failed to fetch bearbricks:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchBearbricks()
  }, [pagination.page, selectedSeries, selectedCategory, searchTerm])

  const getRarityColor = (rarity: number | null) => {
    if (!rarity || rarity <= 0) return 'text-gray-600 bg-gray-100'
    if (rarity >= 10) return 'text-gray-600 bg-gray-100'
    if (rarity >= 5) return 'text-green-600 bg-green-100'
    if (rarity >= 2) return 'text-blue-600 bg-blue-100'
    if (rarity >= 1) return 'text-purple-600 bg-purple-100'
    return 'text-amber-600 bg-amber-100'
  }

  const getRarityLabel = (rarity: number | null) => {
    if (!rarity || rarity <= 0) return 'Unknown'
    if (rarity >= 10) return 'Common'
    if (rarity >= 5) return 'Uncommon'
    if (rarity >= 2) return 'Rare'
    if (rarity >= 1) return 'Very Rare'
    return 'Ultra Rare'
  }

  const resetFilters = () => {
    setSelectedSeries('')
    setSelectedCategory('')
    setSearchTerm('')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // Load user recommendations when bearbricks change
  useEffect(() => {
    if (session && bearbricks.length > 0) {
      const fetchUserRecommendations = async () => {
        try {
          const promises = bearbricks.map(async (bearbrick) => {
            const response = await fetch(`/api/bearbricks/${bearbrick.id}/recommend`)
            if (response.ok) {
              const data = await response.json()
              return data.recommended ? bearbrick.id : null
            }
            return null
          })
          
          const results = await Promise.all(promises)
          const recommendedIds = results.filter(id => id !== null) as string[]
          setUserRecommendations(new Set(recommendedIds))
        } catch (error) {
          console.error('Failed to fetch user recommendations:', error)
        }
      }
      
      fetchUserRecommendations()
    }
  }, [bearbricks, session])

  const handleRecommend = async (bearbrickId: string, event: React.MouseEvent) => {
    event.preventDefault() // Prevent navigation
    event.stopPropagation()

    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      const response = await fetch(`/api/bearbricks/${bearbrickId}/recommend`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update local state
        setUserRecommendations(prev => {
          const newSet = new Set(prev)
          if (data.recommended) {
            newSet.add(bearbrickId)
          } else {
            newSet.delete(bearbrickId)
          }
          return newSet
        })

        // Update bearbricks data with new count
        setBearbricks(prev => prev.map(bearbrick => 
          bearbrick.id === bearbrickId 
            ? { ...bearbrick, _count: { recommendations: data.totalRecommendations } }
            : bearbrick
        ))
      } else {
        const error = await response.json()
        alert(error.error || '추천 처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Recommendation failed:', error)
      alert('추천 처리 중 오류가 발생했습니다.')
    }
  }

  if (loading && bearbricks.length === 0) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-gray-300 rounded-lg aspect-[3/4.5]"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            베어브릭 컬렉션
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            전체 {pagination.total}개의 베어브릭을 만나보세요
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                검색
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="베어브릭 이름 검색..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                시리즈
              </label>
              <select
                value={selectedSeries}
                onChange={(e) => setSelectedSeries(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">전체 시리즈</option>
                {series.map((s) => (
                  <option key={s.id} value={s.number}>
                    Series {s.number} ({s.releaseYear}) - {s._count.bearbricks}개
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                카테고리
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">전체 카테고리</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c._count.bearbricks}개)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                필터 초기화
              </button>
            </div>
          </div>
        </div>

        {/* Bearbricks Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">베어브릭을 불러오는 중...</p>
          </div>
        ) : bearbricks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              조건에 맞는 베어브릭을 찾을 수 없습니다.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
              {bearbricks.map((bearbrick) => (
                <a 
                  key={bearbrick.id}
                  href={`/bearbricks/${bearbrick.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1 block"
                >
                  <div className="p-4">
                    {/* Image with 3:4 aspect ratio */}
                    <div className="w-full aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 overflow-hidden">
                      {bearbrick.images.length > 0 ? (
                        <img 
                          src={bearbrick.images[0].url}
                          alt={bearbrick.images[0].altText || bearbrick.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img 
                          src="/bearbrick-placeholder.svg"
                          alt={`${bearbrick.name} placeholder`}
                          className="w-full h-full object-contain p-4"
                        />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                        {bearbrick.name}
                      </h3>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          Series {bearbrick.series.number}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {bearbrick.series.releaseYear}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(bearbrick.rarityPercentage)}`}>
                          {getRarityLabel(bearbrick.rarityPercentage)} ({bearbrick.rarityPercentage || 0}%)
                        </span>
                      </div>
                      
                      {bearbrick.collaboration && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          × {bearbrick.collaboration.brandName}
                        </div>
                      )}

                      {/* Recommendation section */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                          <span>❤️</span>
                          <span>{bearbrick._count?.recommendations || 0}</span>
                        </div>
                        
                        {session && (
                          <button
                            onClick={(e) => handleRecommend(bearbrick.id, e)}
                            className={`p-1 rounded-full transition-colors ${
                              userRecommendations.has(bearbrick.id)
                                ? 'text-red-500 hover:text-red-600'
                                : 'text-gray-400 hover:text-red-500'
                            }`}
                            title={userRecommendations.has(bearbrick.id) ? '추천 취소' : '추천하기'}
                          >
                            <svg
                              className="w-4 h-4"
                              fill={userRecommendations.has(bearbrick.id) ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}개
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  이전
                </button>
                
                <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                  {pagination.page} / {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  다음
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}