'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import TopMenu from '@/components/TopMenu'
import LoadingSpinner from '@/components/LoadingSpinner'
import { BASIC_ORDER } from '@/lib/sortBearbricks'
import { compressImage } from '@/lib/compressImage'

interface Bearbrick {
  id: string
  name: string
  series: {
    id: string
    name: string
    season: string
    releaseYear: number
  } | null
  category: {
    id: string
    name: string
  } | null
  size: number
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

const COLLECTION_CACHE_KEY = 'gombrick:collectionIds'

export default function BearbrickDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'
  const [bearbrick, setBearbrick] = useState<Bearbrick | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [basicVariants, setBasicVariants] = useState<{ id: string; name: string }[]>([])
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set())
  const [collectionLoaded, setCollectionLoaded] = useState(false)

  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestData, setRequestData] = useState({
    name: '',
    seriesId: '',
    categoryId: '',
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

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchCollection()
    } else if (sessionStatus === 'unauthenticated') {
      setCollectionIds(new Set())
      setCollectionLoaded(true)
    }
  }, [sessionStatus])

  const fetchCollection = async () => {
    const cached = sessionStorage.getItem(COLLECTION_CACHE_KEY)
    if (cached) {
      try {
        setCollectionIds(new Set(JSON.parse(cached)))
        setCollectionLoaded(true)
      } catch {
        // ignore malformed cache entry
      }
    }

    try {
      const res = await fetch('/api/collection')
      if (!res.ok) return
      const ids = await res.json()
      const idsArray = Array.isArray(ids) ? ids : []
      setCollectionIds(new Set(idsArray))
      sessionStorage.setItem(COLLECTION_CACHE_KEY, JSON.stringify(idsArray))
    } catch (error) {
      console.error('Failed to fetch collection:', error)
    } finally {
      setCollectionLoaded(true)
    }
  }

  const handleToggleCollection = async (e: React.MouseEvent, bearbrickId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!session) {
      signIn('google')
      return
    }

    const wasInCollection = collectionIds.has(bearbrickId)
    setCollectionIds((prev) => {
      const next = new Set(prev)
      wasInCollection ? next.delete(bearbrickId) : next.add(bearbrickId)
      return next
    })

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
    if (!confirm('Are you sure you want to delete this?')) return

    try {
      const res = await fetch(`/api/admin/bearbricks/${params.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('Deleted')
        router.push('/')
      } else {
        alert('Delete failed')
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Delete failed')
    }
  }

  const openRequestForm = () => {
    if (!bearbrick) return
    setRequestData({
      name: bearbrick.name,
      seriesId: bearbrick.series?.id || '',
      categoryId: bearbrick.category?.id || '',
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
            description: requestData.description || null,
            isSecret: requestData.isSecret,
            imageUrl,
          },
        }),
      })

      if (res.ok) {
        alert('Your edit request has been submitted. It will take effect once an admin approves it.')
        setShowRequestForm(false)
      } else {
        alert('Request failed')
      }
    } catch (error) {
      console.error('Failed to submit edit request:', error)
      alert('Request failed')
    } finally {
      setSubmittingRequest(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!bearbrick) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Bearbrick not found</h2>
          <Link href="/" className="text-blue-600 hover:underline">
            Back to home
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
            ← Back to list
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
                  className="w-full h-full object-cover object-top"
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
                        className="w-full h-full object-cover object-top"
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
                  <span
                    className={`inline-block align-middle mr-2 px-2 py-1 text-sm font-semibold rounded ${
                      bearbrick.category?.name === 'Secret' ? 'bg-yellow-400 text-gray-900' : 'bg-blue-600 text-white'
                    }`}
                  >
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
                  <span className="block font-semibold w-24 mb-2">Collected:</span>
                  <div className="flex flex-wrap gap-2">
                    {basicVariants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={!collectionLoaded}
                        onClick={(e) => handleToggleCollection(e, variant.id)}
                        aria-label={collectionIds.has(variant.id) ? `${variant.name}: remove from my collection` : `${variant.name}: add to my collection`}
                        className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                          collectionIds.has(variant.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                        }`}
                      >
                        {variant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {bearbrick.series && (
                  <div className="flex">
                    <span className="font-semibold w-24">Series:</span>
                    <span>{bearbrick.series.name}</span>
                  </div>
                )}
                {bearbrick.series && (
                  <div className="flex">
                    <span className="font-semibold w-24">Released:</span>
                    <span>{bearbrick.series.season} {bearbrick.series.releaseYear}</span>
                  </div>
                )}
              </div>

              {bearbrick.description && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Description</h3>
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
                    Edit
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
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
                      Request a correction
                    </button>
                  ) : (
                    <button
                      onClick={() => signIn('google')}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Sign in to request a correction
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
            <h3 className="text-xl font-bold mb-4">Request a Correction</h3>
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Name</label>
                <input
                  type="text"
                  value={requestData.name}
                  onChange={(e) => setRequestData({ ...requestData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Series</label>
                <select
                  value={requestData.seriesId}
                  onChange={(e) => setRequestData({ ...requestData, seriesId: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="">No series</option>
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Category</label>
                <select
                  value={requestData.categoryId}
                  onChange={(e) => setRequestData({ ...requestData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="">No category</option>
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
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  value={requestData.description}
                  onChange={(e) => setRequestData({ ...requestData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                  rows={3}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">New Image (optional)</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 text-sm font-medium text-gray-700 transition-colors">
                    <input type="file" accept="image/*" onChange={handleRequestImageSelect} className="hidden" />
                    {requestImagePreview ? 'Change Image' : 'Attach Image'}
                  </label>
                  {requestImagePreview && (
                    <img src={requestImagePreview} alt="" className="w-12 h-12 object-cover object-top rounded" />
                  )}
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Reason for the change</label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Let us know what's wrong and why"
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
                  {submittingRequest ? 'Submitting...' : 'Send Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  disabled={submittingRequest}
                  className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
