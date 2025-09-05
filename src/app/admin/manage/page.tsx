'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Bearbrick {
  id: string
  name: string
  description: string
  rarityPercentage: number
  estimatedQuantity: number
  sizePercentage: number
  materialType: string
  series: {
    id: string
    name: string
    number: number
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
    isPrimary: boolean
  }>
}

interface Series {
  id: string
  name: string
  number: number
}

interface Category {
  id: string
  name: string
}

export default function AdminManagePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBearbrick, setSelectedBearbrick] = useState<Bearbrick | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [imageMode, setImageMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Form states
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    rarityPercentage: '',
    estimatedQuantity: '',
    sizePercentage: '',
    materialType: '',
    seriesId: '',
    categoryId: ''
  })

  const [imageForm, setImageForm] = useState({
    imageUrl: '',
    altText: '',
    isPrimary: false,
    replacePrimary: false
  })

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      const [bearbricsRes, seriesRes, categoriesRes] = await Promise.all([
        fetch('/api/bearbricks?limit=50'),
        fetch('/api/series'),
        fetch('/api/categories')
      ])

      if (bearbricsRes.ok) {
        const data = await bearbricsRes.json()
        setBearbricks(data.data || [])
      }

      if (seriesRes.ok) {
        const seriesData = await seriesRes.json()
        setSeries(seriesData)
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditBearbrick = (bearbrick: Bearbrick) => {
    setSelectedBearbrick(bearbrick)
    setEditForm({
      name: bearbrick.name,
      description: bearbrick.description,
      rarityPercentage: bearbrick.rarityPercentage.toString(),
      estimatedQuantity: bearbrick.estimatedQuantity.toString(),
      sizePercentage: bearbrick.sizePercentage.toString(),
      materialType: bearbrick.materialType,
      seriesId: bearbrick.series.id,
      categoryId: bearbrick.category.id
    })
    setEditMode(true)
  }

  const handleImageUpload = (bearbrick: Bearbrick) => {
    setSelectedBearbrick(bearbrick)
    setImageForm({
      imageUrl: '',
      altText: '',
      isPrimary: false,
      replacePrimary: false
    })
    setImageMode(true)
  }

  const submitEdit = async () => {
    if (!selectedBearbrick) return

    try {
      const response = await fetch(`/api/admin/bearbricks/${selectedBearbrick.id}/edit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        alert('베어브릭 정보가 성공적으로 수정되었습니다!')
        setEditMode(false)
        setSelectedBearbrick(null)
        fetchData() // Refresh data
      } else {
        const error = await response.json()
        alert(`수정 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Edit failed:', error)
      alert('수정 중 오류가 발생했습니다.')
    }
  }

  const submitImageUpload = async () => {
    if (!selectedBearbrick || !imageForm.imageUrl) return

    try {
      const response = await fetch(`/api/admin/bearbricks/${selectedBearbrick.id}/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(imageForm)
      })

      if (response.ok) {
        alert('이미지가 성공적으로 업로드되었습니다!')
        setImageMode(false)
        setSelectedBearbrick(null)
        fetchData() // Refresh data
      } else {
        const error = await response.json()
        alert(`업로드 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('업로드 중 오류가 발생했습니다.')
    }
  }

  const filteredBearbricks = bearbricks.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="bg-gray-300 rounded-lg h-96"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                베어브릭 직접 관리
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                관리자 권한으로 베어브릭 정보를 직접 수정하고 이미지를 업로드하세요
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/admin/dashboard"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                대시보드로
              </a>
              <a
                href="/"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                메인으로
              </a>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="베어브릭 이름으로 검색..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Bearbricks List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              베어브릭 목록 ({filteredBearbricks.length}개)
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBearbricks.map((bearbrick) => (
                <div key={bearbrick.id} className="border dark:border-gray-700 rounded-lg p-4">
                  <div className="mb-3">
                    {bearbrick.images.length > 0 ? (
                      <img
                        src={bearbrick.images.find(img => img.isPrimary)?.url || bearbrick.images[0].url}
                        alt={bearbrick.name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">이미지 없음</span>
                      </div>
                    )}
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {bearbrick.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {bearbrick.series.name} | {bearbrick.category.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      희귀도: {bearbrick.rarityPercentage}%
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditBearbrick(bearbrick)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                    >
                      정보 수정
                    </button>
                    <button
                      onClick={() => handleImageUpload(bearbrick)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors"
                    >
                      이미지 업로드
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editMode && selectedBearbrick && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                베어브릭 정보 수정
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    이름
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    설명
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                      value={editForm.rarityPercentage}
                      onChange={(e) => setEditForm({...editForm, rarityPercentage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      예상 수량
                    </label>
                    <input
                      type="number"
                      value={editForm.estimatedQuantity}
                      onChange={(e) => setEditForm({...editForm, estimatedQuantity: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    시리즈
                  </label>
                  <select
                    value={editForm.seriesId}
                    onChange={(e) => setEditForm({...editForm, seriesId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {series.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    카테고리
                  </label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm({...editForm, categoryId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={submitEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
                >
                  저장
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Upload Modal */}
        {imageMode && selectedBearbrick && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                이미지 업로드
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    이미지 URL
                  </label>
                  <input
                    type="url"
                    value={imageForm.imageUrl}
                    onChange={(e) => setImageForm({...imageForm, imageUrl: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    대체 텍스트 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={imageForm.altText}
                    onChange={(e) => setImageForm({...imageForm, altText: e.target.value})}
                    placeholder="이미지 설명"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={imageForm.isPrimary}
                      onChange={(e) => setImageForm({...imageForm, isPrimary: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      메인 이미지로 설정
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={imageForm.replacePrimary}
                      onChange={(e) => setImageForm({...imageForm, replacePrimary: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      기존 메인 이미지 교체
                    </span>
                  </label>
                </div>
                
                {imageForm.imageUrl && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">미리보기:</p>
                    <img
                      src={imageForm.imageUrl}
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
                  onClick={submitImageUpload}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition-colors"
                  disabled={!imageForm.imageUrl}
                >
                  업로드
                </button>
                <button
                  onClick={() => setImageMode(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}