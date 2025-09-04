'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'

interface Bearbrick {
  id: string
  name: string
  sizePercentage: number
  rarityPercentage: number
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
  createdBy: {
    id: string
    name: string
  }
  images: Array<{
    id: string
    url: string
    altText: string
    isPrimary: boolean
    uploadedBy: {
      id: string
      name: string
    }
  }>
}

export default function BearbrickDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const [bearbrick, setBearbrick] = useState<Bearbrick | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Contribution states
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [showEditRequest, setShowEditRequest] = useState(false)
  const [showImageRequest, setShowImageRequest] = useState(false)
  
  useEffect(() => {
    const fetchBearbrick = async () => {
      try {
        const response = await fetch(`/api/bearbricks/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setBearbrick(data)
        } else {
          setError('베어브릭을 찾을 수 없습니다.')
        }
      } catch (error) {
        console.error('Failed to fetch bearbrick:', error)
        setError('베어브릭 정보를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    
    if (params.id) {
      fetchBearbrick()
    }
  }, [params.id])

  const getRarityColor = (rarity: number) => {
    if (rarity >= 10) return 'text-gray-600 bg-gray-100'
    if (rarity >= 5) return 'text-green-600 bg-green-100'
    if (rarity >= 2) return 'text-blue-600 bg-blue-100'
    if (rarity >= 1) return 'text-purple-600 bg-purple-100'
    return 'text-amber-600 bg-amber-100'
  }

  const getRarityLabel = (rarity: number) => {
    if (rarity >= 10) return 'Common'
    if (rarity >= 5) return 'Uncommon'
    if (rarity >= 2) return 'Rare'
    if (rarity >= 1) return 'Very Rare'
    return 'Ultra Rare'
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-300 rounded-lg h-96"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !bearbrick) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            오류가 발생했습니다
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {error || '베어브릭을 찾을 수 없습니다.'}
          </p>
          <a 
            href="/bearbricks"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            목록으로 돌아가기
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <a href="/" className="hover:text-gray-900 dark:hover:text-white">홈</a>
            <span>›</span>
            <a href="/bearbricks" className="hover:text-gray-900 dark:hover:text-white">베어브릭 목록</a>
            <span>›</span>
            <span className="text-gray-900 dark:text-white">{bearbrick.name}</span>
          </div>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
              {bearbrick.images && bearbrick.images.length > 0 ? (
                <div className="space-y-4">
                  <img
                    src={bearbrick.images.find(img => img.isPrimary)?.url || bearbrick.images[0].url}
                    alt={bearbrick.images.find(img => img.isPrimary)?.altText || bearbrick.name}
                    className="w-full h-96 object-cover rounded-lg"
                  />
                  {bearbrick.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {bearbrick.images.map((image) => (
                        <img
                          key={image.id}
                          src={image.url}
                          alt={image.altText || bearbrick.name}
                          className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75"
                        />
                      ))}
                    </div>
                  )}
                  {/* Image credit */}
                  {bearbrick.images[0]?.uploadedBy && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      📷 이미지 제공: {bearbrick.images[0].uploadedBy.name}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-4xl mb-4 block">🧸</span>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">이미지가 없습니다</p>
                    {session && (
                      <button
                        onClick={() => setShowImageUpload(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        이미지 업로드
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contribution Actions */}
            {session && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  📝 기여하기
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setShowImageUpload(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    이미지 추가
                  </button>
                  <button
                    onClick={() => setShowImageRequest(true)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    disabled={!bearbrick.images || bearbrick.images.length === 0}
                  >
                    이미지 교체 요청
                  </button>
                  <button
                    onClick={() => setShowEditRequest(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    정보 수정 요청
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {bearbrick.name}
              </h1>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">시리즈</span>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    Series {bearbrick.series.number} ({bearbrick.series.releaseYear})
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">카테고리</span>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {bearbrick.category.name}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">사이즈</span>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {bearbrick.sizePercentage}%
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">레어도</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRarityColor(bearbrick.rarityPercentage)}`}>
                    {getRarityLabel(bearbrick.rarityPercentage)} ({bearbrick.rarityPercentage}%)
                  </span>
                </div>
              </div>

              {bearbrick.collaboration && (
                <div className="mb-6">
                  <span className="text-sm text-gray-500 dark:text-gray-400">콜라보레이션</span>
                  <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                    × {bearbrick.collaboration.brandName}
                  </p>
                </div>
              )}

              {bearbrick.description && (
                <div className="mb-6">
                  <span className="text-sm text-gray-500 dark:text-gray-400">설명</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    {bearbrick.description}
                  </p>
                </div>
              )}

              <div className="border-t dark:border-gray-700 pt-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  등록자: {bearbrick.createdBy.name}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📊 통계 정보
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">예상 수량</span>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {bearbrick.estimatedQuantity?.toLocaleString() || 'N/A'}개
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">시즌</span>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {bearbrick.series.season}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals would go here */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">이미지 업로드</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              곧 이미지 업로드 기능이 추가될 예정입니다.
            </p>
            <button
              onClick={() => setShowImageUpload(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}