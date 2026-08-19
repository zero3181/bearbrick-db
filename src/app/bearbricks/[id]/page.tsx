'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import TopMenu from '@/components/TopMenu'
import { BASIC_ORDER } from '@/lib/sortBearbricks'
import { compressImage } from '@/lib/compressImage'

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
  releaseDate: string | null
  description: string | null
  isSecret: boolean
  images: {
    id: string
    url: string
    isPrimary: boolean
  }[]
}

interface Series {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

export default function BearbrickDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'
  const [bearbrick, setBearbrick] = useState<Bearbrick | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [basicVariants, setBasicVariants] = useState<{ id: string; name: string }[]>([])

  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestData, setRequestData] = useState({
    name: '',
    seriesId: '',
    categoryId: '',
    releaseDate: '',
    description: '',
    isSecret: false,
  })
  const [requestReason, setRequestReason] = useState('')
  const [requestImageFile, setRequestImageFile] = useState<File | null>(null)
  const [requestImagePreview, setRequestImagePreview] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)

  useEffect(() => {
    fetchBearbrick()
    fetch('/api/series')
      .then((res) => (res.ok ? res.json() : []))
      .then(setSeriesList)
      .catch(() => setSeriesList([]))
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then(setCategoryList)
      .catch(() => setCategoryList([]))
  }, [params.id])

  const fetchBearbrick = async () => {
    try {
      const res = await fetch(`/api/bearbricks/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setBearbrick(data)
        const primary = data.images.find((img: { isPrimary: boolean }) => img.isPrimary)
        setSelectedImage(primary?.url || data.images[0]?.url || '/bearbrick-placeholder.svg')

        if (data.category?.name === 'Basic' && data.series?.name) {
          fetchBasicVariants(data.series.name)
        } else {
          setBasicVariants([])
        }
      }
    } catch (error) {
      console.error('Failed to fetch bearbrick:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBasicVariants = async (seriesName: string) => {
    try {
      const res = await fetch(`/api/bearbricks?series=${encodeURIComponent(seriesName)}`)
      if (!res.ok) return
      const data = await res.json()
      const variants = (Array.isArray(data) ? data : [])
        .filter((b: Bearbrick) => b.category?.name === 'Basic')
        .sort((a: Bearbrick, b: Bearbrick) => BASIC_ORDER.indexOf(a.name) - BASIC_ORDER.indexOf(b.name))
        .map((b: Bearbrick) => ({ id: b.id, name: b.name }))
      setBasicVariants(variants)
    } catch (error) {
      console.error('Failed to fetch basic variants:', error)
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

  const openRequestForm = () => {
    if (!bearbrick) return
    setRequestData({
      name: bearbrick.name,
      seriesId: bearbrick.series?.id || '',
      categoryId: bearbrick.category?.id || '',
      releaseDate: bearbrick.releaseDate ? bearbrick.releaseDate.split('T')[0] : '',
      description: bearbrick.description || '',
      isSecret: bearbrick.isSecret,
    })
    setRequestReason('')
    setRequestImageFile(null)
    setRequestImagePreview('')
    setShowRequestForm(true)
  }

  const handleRequestImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setRequestImageFile(compressed)
    setRequestImagePreview(URL.createObjectURL(compressed))
  }

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bearbrick) return

    setSubmittingRequest(true)
    try {
      let imageUrl: string | null = null

      if (requestImageFile) {
        const ext = requestImageFile.name.split('.').pop() || 'jpg'
        const blob = await upload(`request-${bearbrick.id}-${Date.now()}.${ext}`, requestImageFile, {
          access: 'public',
          handleUploadUrl: '/api/upload/presigned',
        })
        imageUrl = blob.url
      }

      const res = await fetch('/api/edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bearbrickId: bearbrick.id,
          description: requestReason,
          newData: {
            name: requestData.name,
            seriesId: requestData.seriesId || null,
            categoryId: requestData.categoryId || null,
            releaseDate: requestData.releaseDate || null,
            description: requestData.description || null,
            isSecret: requestData.isSecret,
            imageUrl,
          },
        }),
      })

      if (res.ok) {
        alert('수정 요청이 접수되었습니다. 관리자 승인 후 반영됩니다.')
        setShowRequestForm(false)
      } else {
        alert('요청 실패')
      }
    } catch (error) {
      console.error('Failed to submit edit request:', error)
      alert('요청 실패')
    } finally {
      setSubmittingRequest(false)
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
            ← 목록으로
          </Link>
          <TopMenu />
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
                  src={selectedImage || '/bearbrick-placeholder.svg'}
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
              <h1 className="text-3xl font-bold mb-4">
                {bearbrick.isSecret && (
                  <span className="inline-block align-middle mr-2 px-2 py-1 text-sm font-semibold bg-blue-600 text-white rounded">
                    Secret
                  </span>
                )}
                {bearbrick.category && (
                  <span className="text-gray-500">[{bearbrick.category.name}] </span>
                )}
                {bearbrick.name}
              </h1>

              {basicVariants.length > 0 && (
                <div className="mb-6">
                  <span className="block font-semibold w-24 mb-2">종류 선택:</span>
                  <div className="flex flex-wrap gap-2">
                    {basicVariants.map((variant) => (
                      <label
                        key={variant.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer text-sm font-medium ${
                          variant.id === bearbrick.id
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="basic-variant"
                          value={variant.id}
                          checked={variant.id === bearbrick.id}
                          onChange={() => router.push(`/bearbricks/${variant.id}`)}
                          className="sr-only"
                        />
                        {variant.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {bearbrick.series && (
                  <div className="flex">
                    <span className="font-semibold w-24">시리즈:</span>
                    <span>{bearbrick.series.name}</span>
                  </div>
                )}
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

              {/* Edit request (regular users) */}
              {!isAdmin && (
                <div className="pt-6 border-t">
                  {session ? (
                    <button
                      onClick={openRequestForm}
                      className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
                    >
                      정보 수정 요청
                    </button>
                  ) : (
                    <button
                      onClick={() => signIn('google')}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      로그인하고 정보 수정 요청하기
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Request Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">정보 수정 요청</h3>
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">이름</label>
                <input
                  type="text"
                  value={requestData.name}
                  onChange={(e) => setRequestData({ ...requestData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">시리즈</label>
                <select
                  value={requestData.seriesId}
                  onChange={(e) => setRequestData({ ...requestData, seriesId: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="">시리즈 없음</option>
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">카테고리</label>
                <select
                  value={requestData.categoryId}
                  onChange={(e) => setRequestData({ ...requestData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="">카테고리 없음</option>
                  {categoryList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={requestData.isSecret}
                    onChange={(e) => setRequestData({ ...requestData, isSecret: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Secret
                </label>
              </div>
              <div>
                <label className="block font-semibold mb-1">출시일</label>
                <input
                  type="date"
                  value={requestData.releaseDate}
                  onChange={(e) => setRequestData({ ...requestData, releaseDate: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">설명</label>
                <textarea
                  value={requestData.description}
                  onChange={(e) => setRequestData({ ...requestData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                  rows={3}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">새 이미지 (선택)</label>
                <label className="block w-full px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 text-center">
                  <input type="file" accept="image/*" onChange={handleRequestImageSelect} className="hidden" />
                  {requestImagePreview ? (
                    <img src={requestImagePreview} alt="" className="w-20 h-20 object-cover rounded mx-auto" />
                  ) : (
                    <p className="text-sm text-gray-500">클릭하여 이미지 첨부</p>
                  )}
                </label>
              </div>
              <div>
                <label className="block font-semibold mb-1">수정 사유</label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="무엇이 왜 잘못됐는지 알려주세요"
                  className="w-full px-4 py-2 border rounded"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingRequest ? '제출 중...' : '요청 보내기'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  disabled={submittingRequest}
                  className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
