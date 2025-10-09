'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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

export default function BearbrickDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [bearbrick, setBearbrick] = useState<Bearbrick | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')

  useEffect(() => {
    fetchBearbrick()
    const adminStatus = localStorage.getItem('isAdmin') === 'true'
    setIsAdmin(adminStatus)
  }, [params.id])

  const fetchBearbrick = async () => {
    try {
      const res = await fetch(`/api/bearbricks/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setBearbrick(data)
        const primary = data.images.find((img: any) => img.isPrimary)
        setSelectedImage(primary?.url || data.images[0]?.url || '')
      }
    } catch (error) {
      console.error('Failed to fetch bearbrick:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/bearbricks/${params.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('삭제되었습니다')
        router.push('/')
      } else {
        alert('삭제 실패')
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert('삭제 실패')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!bearbrick) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">베어브릭을 찾을 수 없습니다</h2>
          <Link href="/" className="text-blue-600 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:underline">
            ← 목록으로
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Images */}
            <div>
              <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <img
                  src={selectedImage || '/placeholder.png'}
                  alt={bearbrick.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {bearbrick.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {bearbrick.images.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImage(image.url)}
                      className={`aspect-square bg-gray-100 rounded overflow-hidden ${
                        selectedImage === image.url ? 'ring-2 ring-blue-600' : ''
                      }`}
                    >
                      <img
                        src={image.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <h1 className="text-3xl font-bold mb-4">{bearbrick.name}</h1>

              <div className="space-y-3 mb-6">
                {bearbrick.series && (
                  <div className="flex">
                    <span className="font-semibold w-24">시리즈:</span>
                    <span>{bearbrick.series}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="font-semibold w-24">사이즈:</span>
                  <span>{bearbrick.size}%</span>
                </div>
                {bearbrick.releaseDate && (
                  <div className="flex">
                    <span className="font-semibold w-24">출시일:</span>
                    <span>{new Date(bearbrick.releaseDate).toLocaleDateString('ko-KR')}</span>
                  </div>
                )}
              </div>

              {bearbrick.description && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">설명</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{bearbrick.description}</p>
                </div>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex gap-3 pt-6 border-t">
                  <Link
                    href={`/admin/bearbricks/${bearbrick.id}/edit`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                  >
                    수정
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
