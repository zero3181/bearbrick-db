'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'

interface Bearbrick {
  id: string
  name: string
  sizePercentage: number
  rarityPercentage: number | null
  estimatedQuantity: number | null
  description: string | null
  materialType: string | null
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
  _count?: {
    recommendations: number
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function BearbrickDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const [bearbrick, setBearbrick] = useState<Bearbrick | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Recommendation states
  const [isRecommended, setIsRecommended] = useState(false)
  const [recommendationCount, setRecommendationCount] = useState(0)
  
  // Contribution states
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [showEditRequest, setShowEditRequest] = useState(false)
  const [showImageRequest, setShowImageRequest] = useState(false)
  const [showAdminEdit, setShowAdminEdit] = useState(false)
  const [showAdminImageUpload, setShowAdminImageUpload] = useState(false)

  // Admin form states
  const [adminEditForm, setAdminEditForm] = useState({
    name: '',
    description: '',
    rarityPercentage: '',
    estimatedQuantity: '',
    materialType: ''
  })

  const [adminImageForm, setAdminImageForm] = useState({
    imageUrl: '',
    altText: '',
    isPrimary: false,
    replacePrimary: false
  })

  const isAdmin = user?.role === 'ADMIN'
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const bearbrickResponse = await fetch(`/api/bearbricks/${params.id}`)
        if (bearbrickResponse.ok) {
          const data = await bearbrickResponse.json()
          setBearbrick(data)
          setRecommendationCount(data._count?.recommendations || 0)
          setAdminEditForm({
            name: data.name || '',
            description: data.description || '',
            rarityPercentage: data.rarityPercentage ? data.rarityPercentage.toString() : '0',
            estimatedQuantity: data.estimatedQuantity ? data.estimatedQuantity.toString() : '0',
            materialType: data.materialType || 'ABS Plastic'
          })

          // Fetch user recommendation status if logged in
          if (session?.user?.email) {
            try {
              const recommendResponse = await fetch(`/api/bearbricks/${data.id}/recommend`)
              if (recommendResponse.ok) {
                const recommendData = await recommendResponse.json()
                setIsRecommended(recommendData.recommended)
              }
            } catch (error) {
              console.error('Failed to fetch recommendation status:', error)
            }
          }
        } else {
          setError('베어브릭을 찾을 수 없습니다.')
        }

        // Fetch user info if logged in
        if (session?.user?.email) {
          const userResponse = await fetch('/api/user/me')
          if (userResponse.ok) {
            const userData = await userResponse.json()
            setUser(userData)
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setError('데이터를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    
    if (params.id) {
      fetchData()
    }
  }, [params.id, session])

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

  const handleAdminEdit = () => {
    if (!bearbrick) return
    setAdminEditForm({
      name: bearbrick.name || '',
      description: bearbrick.description || '',
      rarityPercentage: bearbrick.rarityPercentage ? bearbrick.rarityPercentage.toString() : '0',
      estimatedQuantity: bearbrick.estimatedQuantity ? bearbrick.estimatedQuantity.toString() : '0',
      materialType: bearbrick.materialType || 'ABS Plastic'
    })
    setShowAdminEdit(true)
  }

  const handleAdminImageUpload = () => {
    setAdminImageForm({
      imageUrl: '',
      altText: '',
      isPrimary: false,
      replacePrimary: false
    })
    setShowAdminImageUpload(true)
  }

  const submitAdminEdit = async () => {
    if (!bearbrick) return

    try {
      const response = await fetch(`/api/admin/bearbricks/${bearbrick.id}/edit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(adminEditForm)
      })

      if (response.ok) {
        alert('베어브릭 정보가 성공적으로 수정되었습니다!')
        setShowAdminEdit(false)
        // Refresh data
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`수정 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Edit failed:', error)
      alert('수정 중 오류가 발생했습니다.')
    }
  }

  const submitAdminImageUpload = async () => {
    if (!bearbrick || !adminImageForm.imageUrl) return

    try {
      const response = await fetch(`/api/admin/bearbricks/${bearbrick.id}/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(adminImageForm)
      })

      if (response.ok) {
        alert('이미지가 성공적으로 업로드되었습니다!')
        setShowAdminImageUpload(false)
        // Refresh data
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`업로드 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('업로드 중 오류가 발생했습니다.')
    }
  }

  const handleRecommend = async () => {
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!bearbrick) return

    try {
      const response = await fetch(`/api/bearbricks/${bearbrick.id}/recommend`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setIsRecommended(data.recommended)
        setRecommendationCount(data.totalRecommendations)
      } else {
        const error = await response.json()
        alert(error.error || '추천 처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Recommendation failed:', error)
      alert('추천 처리 중 오류가 발생했습니다.')
    }
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
                    <img 
                      src="/bearbrick-placeholder.svg"
                      alt="베어브릭 이미지 없음"
                      className="w-32 h-32 mx-auto mb-4 opacity-50"
                    />
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

            {/* Admin Actions */}
            {session && isAdmin && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 shadow-sm border border-red-200 dark:border-red-800">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">
                  🔧 관리자 직접 편집
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleAdminEdit}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    정보 즉시 수정
                  </button>
                  <button
                    onClick={handleAdminImageUpload}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    이미지 즉시 업로드
                  </button>
                </div>
              </div>
            )}

            {/* Contribution Actions */}
            {session && !isAdmin && (
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
                    {getRarityLabel(bearbrick.rarityPercentage)} ({bearbrick.rarityPercentage || 0}%)
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

              {/* Recommendation Section */}
              <div className="border-t dark:border-gray-700 pt-6 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <span className="text-2xl">❤️</span>
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        {recommendationCount}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        명이 추천
                      </span>
                    </div>
                  </div>
                  
                  {session && (
                    <button
                      onClick={handleRecommend}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        isRecommended
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-300'
                      }`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill={isRecommended ? 'currentColor' : 'none'}
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
                      <span>{isRecommended ? '추천 취소' : '추천하기'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-4 mt-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  등록자: {bearbrick.createdBy.name}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Regular User Modals */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">이미지 업로드</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              곧 사용자 이미지 업로드 기능이 추가될 예정입니다.
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

      {/* Admin Edit Modal */}
      {showAdminEdit && bearbrick && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              관리자 정보 수정
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={adminEditForm.name}
                  onChange={(e) => setAdminEditForm({...adminEditForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  설명
                </label>
                <textarea
                  value={adminEditForm.description}
                  onChange={(e) => setAdminEditForm({...adminEditForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    희귀도 (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adminEditForm.rarityPercentage}
                    onChange={(e) => setAdminEditForm({...adminEditForm, rarityPercentage: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    예상 수량
                  </label>
                  <input
                    type="number"
                    value={adminEditForm.estimatedQuantity}
                    onChange={(e) => setAdminEditForm({...adminEditForm, estimatedQuantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  재질 (선택사항)
                </label>
                <input
                  type="text"
                  value={adminEditForm.materialType}
                  onChange={(e) => setAdminEditForm({...adminEditForm, materialType: e.target.value})}
                  placeholder="ABS Plastic"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={submitAdminEdit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md transition-colors"
              >
                즉시 저장
              </button>
              <button
                onClick={() => setShowAdminEdit(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Image Upload Modal */}
      {showAdminImageUpload && bearbrick && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              관리자 이미지 업로드
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  이미지 URL
                </label>
                <input
                  type="url"
                  value={adminImageForm.imageUrl}
                  onChange={(e) => setAdminImageForm({...adminImageForm, imageUrl: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  대체 텍스트 (선택사항)
                </label>
                <input
                  type="text"
                  value={adminImageForm.altText}
                  onChange={(e) => setAdminImageForm({...adminImageForm, altText: e.target.value})}
                  placeholder="이미지 설명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={adminImageForm.isPrimary}
                    onChange={(e) => setAdminImageForm({...adminImageForm, isPrimary: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    메인 이미지로 설정
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={adminImageForm.replacePrimary}
                    onChange={(e) => setAdminImageForm({...adminImageForm, replacePrimary: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    기존 메인 이미지 교체
                  </span>
                </label>
              </div>
              
              {adminImageForm.imageUrl && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">미리보기:</p>
                  <img
                    src={adminImageForm.imageUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTkiPkVycm9yPC90ZXh0Pjwvc3ZnPg=='
                    }}
                  />
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={submitAdminImageUpload}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md transition-colors"
                disabled={!adminImageForm.imageUrl}
              >
                즉시 업로드
              </button>
              <button
                onClick={() => setShowAdminImageUpload(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md transition-colors"
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