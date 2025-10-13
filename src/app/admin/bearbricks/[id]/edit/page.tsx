'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'

interface Bearbrick {
  id: string
  name: string
  series: string | null
  size: number
  releaseDate: string | null
  description: string | null
  images: {
    id: string
    url: string
    isPrimary: boolean
  }[]
}

export default function EditBearbrickPage() {
  const params = useParams()
  const router = useRouter()
  const [bearbrick, setBearbrick] = useState<Bearbrick | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    series: '',
    size: '100',
    releaseDate: '',
    description: '',
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true'
    if (!isAdmin) {
      router.push('/')
      return
    }
    fetchBearbrick()
  }, [params.id])

  const fetchBearbrick = async () => {
    try {
      const res = await fetch(`/api/bearbricks/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setBearbrick(data)
        setFormData({
          name: data.name,
          series: data.series || '',
          size: data.size.toString(),
          releaseDate: data.releaseDate ? data.releaseDate.split('T')[0] : '',
          description: data.description || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch(`/api/admin/bearbricks/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 4321',
        },
        body: JSON.stringify({
          ...formData,
          size: parseInt(formData.size),
          releaseDate: formData.releaseDate || null,
        }),
      })

      if (res.ok) {
        alert('수정되었습니다')
        router.push('/admin/manage')
      } else {
        alert('수정 실패')
      }
    } catch (error) {
      console.error('Failed to update:', error)
      alert('수정 실패')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Upload to Vercel Blob
      const timestamp = Date.now()
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `bearbrick-${params.id}-${timestamp}.${ext}`

      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: '/api/upload/presigned',
        clientPayload: JSON.stringify({ authorization: '4321' }),
        onUploadProgress: (progress) => {
          setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
        },
      })

      // Save to database
      const res = await fetch(`/api/admin/bearbricks/${params.id}/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 4321',
        },
        body: JSON.stringify({
          imageUrl: blob.url,
          isPrimary: bearbrick?.images.length === 0,
        }),
      })

      if (res.ok) {
        alert('이미지가 업로드되었습니다')
        fetchBearbrick()
      } else {
        alert('이미지 저장 실패')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('업로드 실패')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSetPrimary = async (imageId: string) => {
    try {
      const res = await fetch(`/api/admin/bearbricks/${params.id}/set-primary-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 4321',
        },
        body: JSON.stringify({ imageId }),
      })

      if (res.ok) {
        fetchBearbrick()
      }
    } catch (error) {
      console.error('Failed to set primary:', error)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('이미지를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/bearbricks/${params.id}/delete-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 4321',
        },
        body: JSON.stringify({ imageId }),
      })

      if (res.ok) {
        fetchBearbrick()
      } else {
        alert('삭제 실패')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('삭제 실패')
    }
  }

  if (!bearbrick) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/admin/manage" className="text-blue-600 hover:underline">
            ← 관리 페이지로
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">베어브릭 수정</h1>

        {/* Basic Info Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">기본 정보</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">이름 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">시리즈</label>
              <input
                type="text"
                value={formData.series}
                onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                className="w-full px-4 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">사이즈 *</label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              >
                <option value="50">50%</option>
                <option value="70">70%</option>
                <option value="100">100%</option>
                <option value="200">200%</option>
                <option value="400">400%</option>
                <option value="1000">1000%</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">출시일</label>
              <input
                type="date"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                className="w-full px-4 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                rows={4}
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              저장
            </button>
          </form>
        </div>

        {/* Images */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">이미지 관리</h2>

          {/* Upload */}
          <div className="mb-6">
            <label className="block w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <div>
                  <p className="text-blue-600 mb-2">업로드 중... {uploadProgress}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">클릭하여 이미지 업로드</p>
                  <p className="text-sm text-gray-400 mt-1">JPG, PNG, GIF (최대 5MB)</p>
                </div>
              )}
            </label>
          </div>

          {/* Image List */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {bearbrick.images.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.url}
                  alt=""
                  className="w-full aspect-square object-cover rounded"
                />
                {image.isPrimary && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    메인
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!image.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(image.id)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      메인 설정
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>

          {bearbrick.images.length === 0 && (
            <p className="text-center text-gray-500 py-8">등록된 이미지가 없습니다</p>
          )}
        </div>
      </main>
    </div>
  )
}
