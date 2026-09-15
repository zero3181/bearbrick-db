'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import TopMenu from '@/components/TopMenu'
import BearbrickThumb from '@/components/BearbrickThumb'
import Skeleton from '@/components/Skeleton'
import { signInWithGoogle } from '@/lib/nativeAuth'
import { shareLink, successFeedback, tapFeedback } from '@/lib/native'
import { neighbours } from '@/lib/browseList'
import { BASIC_ORDER, SECRET_BASIC_ORDERS, SECRET_BASIC_REPRESENTATIVE_NAMES } from '@/lib/sortBearbricks'
import { isSuperSecretRarity, toFraction } from '@/lib/rarity'
import { compressImage } from '@/lib/compressImage'
import PhotoInput from '@/components/PhotoInput'

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
  rarityPercentage: number | null
  images: {
    id: string
    url: string
    isPrimary: boolean
  }[]
  contributor: string | null
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
  const t = useTranslations('bearbrickDetail')
  const tc = useTranslations('common')
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
  const pendingToggleIdsRef = useRef<Set<string>>(new Set())

  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestData, setRequestData] = useState({
    name: '',
    seriesId: '',
    categoryId: '',
    description: '',
    isSecret: false,
    rarityPercentage: '',
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
        setSelectedImage(primary?.url || data.images[0]?.url || '')

        if (data.category?.name === 'Basic' && data.series?.name) {
          fetchBasicVariants(data.series.name, Boolean(data.isSecret))
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

  // Whatever the home screen was showing when this page was opened. Read
  // after mount: sessionStorage does not exist during the server render.
  const [paging, setPaging] = useState<{ prevId: string | null; nextId: string | null }>({
    prevId: null,
    nextId: null,
  })
  useEffect(() => {
    setPaging(neighbours(String(params.id)))
  }, [params.id])

  const goTo = useCallback(
    (id: string | null) => {
      if (!id) return
      tapFeedback()
      router.push(`/bearbricks/${id}`)
    },
    [router]
  )

  // Arrow keys for a desktop browser.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (e.key === 'ArrowLeft') goTo(paging.prevId)
      if (e.key === 'ArrowRight') goTo(paging.nextId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, paging])

  // Horizontal swipe on a phone. Tracked by hand rather than with a gesture
  // library so the page keeps scrolling normally: a drag that is mostly
  // vertical is left alone.
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    goTo(dx > 0 ? paging.prevId : paging.nextId)
  }

  // The OS share sheet on a phone, the Web Share API in a browser that has
  // one, and a copied link everywhere else.
  const [shareToast, setShareToast] = useState<string | null>(null)
  const handleShare = async () => {
    if (!bearbrick) return
    const url = window.location.href
    const shared = await shareLink({ title: bearbrick.name, url })
    if (shared) {
      successFeedback()
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareToast(tc('linkCopied'))
      setTimeout(() => setShareToast(null), 2000)
    } catch {
      // A browser that blocks clipboard access leaves the label as it was.
    }
  }

  const handleToggleCollection = async (e: React.MouseEvent, bearbrickId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!session) {
      signInWithGoogle()
      return
    }

    // A request for this item is already in flight - ignore rapid re-clicks
    // on the same item instead of firing an overlapping toggle.
    if (pendingToggleIdsRef.current.has(bearbrickId)) return
    pendingToggleIdsRef.current.add(bearbrickId)

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
    } finally {
      pendingToggleIdsRef.current.delete(bearbrickId)
    }
  }

  const fetchBasicVariants = async (seriesName: string, isSecret: boolean) => {
    try {
      const res = await fetch(`/api/bearbricks?series=${encodeURIComponent(seriesName)}`)
      if (!res.ok) return
      const data = await res.json()
      const order = isSecret ? (SECRET_BASIC_ORDERS[seriesName] ?? []) : BASIC_ORDER
      const rank = (name: string) => {
        const idx = order.indexOf(name)
        return idx === -1 ? order.length : idx
      }
      const variants = (Array.isArray(data) ? data : [])
        .filter((b: Bearbrick) => b.category?.name === 'Basic' && b.isSecret === isSecret)
        .filter((b: Bearbrick) => !SECRET_BASIC_REPRESENTATIVE_NAMES.includes(b.name))
        .sort((a: Bearbrick, b: Bearbrick) => rank(a.name) - rank(b.name))
        .map((b: Bearbrick) => ({ id: b.id, name: b.name }))
      setBasicVariants(variants)
    } catch (error) {
      console.error('Failed to fetch basic variants:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return

    try {
      const res = await fetch(`/api/admin/bearbricks/${params.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert(t('deleted'))
        router.push('/')
      } else {
        alert(t('deleteFailed'))
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert(t('deleteFailed'))
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
      rarityPercentage: bearbrick.rarityPercentage != null ? String(bearbrick.rarityPercentage) : '',
    })
    setRequestReason('')
    setRequestImageFile(null)
    setRequestImagePreview('')
    setShowRequestForm(true)
  }

  const handleRequestImageSelect = async (file: File) => {
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
            rarityPercentage: requestData.rarityPercentage === '' ? null : parseFloat(requestData.rarityPercentage),
            imageUrl,
          },
        }),
      })

      if (res.ok) {
        alert(t('requestSuccess'))
        setShowRequestForm(false)
      } else {
        alert(t('requestFailed'))
      }
    } catch (error) {
      console.error('Failed to submit edit request:', error)
      alert(t('requestFailed'))
    } finally {
      setSubmittingRequest(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-100 pt-[env(safe-area-inset-top)]">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
              {t('backToList')}
            </Link>
            <TopMenu />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
              <Skeleton className="aspect-[3/4] rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-7 rounded w-3/4" />
                <Skeleton className="h-4 rounded w-1/2" />
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-4 rounded w-full" />
                  <Skeleton className="h-4 rounded w-full" />
                  <Skeleton className="h-4 rounded w-2/3" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!bearbrick) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('notFound')}</h2>
          <Link href="/" className="text-blue-600 hover:underline">
            {t('backToHome')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
            {t('backToList')}
          </Link>
          <div className="flex items-center gap-1">
            {(paging.prevId || paging.nextId) && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(paging.prevId)}
                  disabled={!paging.prevId}
                  aria-label={t('previousItem')}
                  className="p-2 text-gray-500 disabled:opacity-30 hover:text-gray-900"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => goTo(paging.nextId)}
                  disabled={!paging.nextId}
                  aria-label={t('nextItem')}
                  className="p-2 text-gray-500 disabled:opacity-30 hover:text-gray-900"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
            <TopMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div
          className="bg-white rounded-lg shadow-lg overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Images */}
            <div>
              <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 overflow-hidden">
                <BearbrickThumb src={selectedImage || null} alt={bearbrick.name} />
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
                      isSuperSecretRarity(bearbrick.rarityPercentage) ? 'bg-yellow-400 text-gray-900' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {tc('secret')}
                  </span>
                )}
                {bearbrick.category && (
                  <span className="text-gray-500">[{bearbrick.category.name}] </span>
                )}
                {bearbrick.name}
              </h1>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 mb-6 text-sm text-gray-500 hover:text-gray-900"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <path d="M16 6l-4-4-4 4" />
                  <path d="M12 2v14" />
                </svg>
                {shareToast ?? tc('share')}
              </button>

              {basicVariants.length === 0 && (
                <button
                  type="button"
                  disabled={!collectionLoaded}
                  onClick={(e) => handleToggleCollection(e, bearbrick.id)}
                  aria-label={
                    collectionIds.has(bearbrick.id)
                      ? t('removeFromCollection', { name: bearbrick.name })
                      : t('addToCollection', { name: bearbrick.name })
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border text-sm font-medium transition-colors disabled:opacity-50 ${
                    collectionIds.has(bearbrick.id)
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill={collectionIds.has(bearbrick.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                    <path d="M5 3h10a1 1 0 0 1 1 1v13l-6-3.5L4 17V4a1 1 0 0 1 1-1z" />
                  </svg>
                  {collectionIds.has(bearbrick.id) ? t('inCollection') : t('addToCollectionShort')}
                </button>
              )}

              {basicVariants.length > 0 && (
                <div className="mb-6">
                  <span className="block font-semibold w-24 mb-2">{t('collected')}</span>
                  <div className="flex flex-wrap gap-2">
                    {basicVariants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={!collectionLoaded}
                        onClick={(e) => handleToggleCollection(e, variant.id)}
                        aria-label={collectionIds.has(variant.id) ? t('removeFromCollection', { name: variant.name }) : t('addToCollection', { name: variant.name })}
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
                    <span className="font-semibold w-24">{t('series')}</span>
                    <span>{bearbrick.series.name}</span>
                  </div>
                )}
                {bearbrick.series && (
                  <div className="flex">
                    <span className="font-semibold w-24">{t('released')}</span>
                    <span>{bearbrick.series.season} {bearbrick.series.releaseYear}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="font-semibold w-24">{t('rarity')}</span>
                  <span>
                    {bearbrick.rarityPercentage == null
                      ? '--%'
                      : basicVariants.length > 0
                        ? // The page represents the whole Basic set, so show what
                          // the set is worth in a case - the ~14% the official
                          // series information lists - rather than the per-letter
                          // share the rows are stored as. No fraction: the set
                          // does not land on a clean one.
                          `${Math.round(bearbrick.rarityPercentage * basicVariants.length * 100) / 100}%`
                        : `${bearbrick.rarityPercentage}% (${toFraction(bearbrick.rarityPercentage)})`}
                  </span>
                </div>
              </div>

              {bearbrick.description && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">{t('description')}</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{bearbrick.description}</p>
                </div>
              )}

              {bearbrick.contributor && (
                <p className="text-xs text-gray-400 mb-6">{t('submittedBy', { name: bearbrick.contributor })}</p>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex gap-3 pt-6 border-t">
                  <Link
                    href={`/admin/bearbricks/${bearbrick.id}/edit`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                  >
                    {t('edit')}
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    {t('delete')}
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
                      {t('requestCorrection')}
                    </button>
                  ) : (
                    <button
                      onClick={() => signInWithGoogle()}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      {t('signInToRequestCorrection')}
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
            <h3 className="text-xl font-bold mb-4">{t('requestModalTitle')}</h3>
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">{t('name')}</label>
                <input
                  type="text"
                  value={requestData.name}
                  onChange={(e) => setRequestData({ ...requestData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{t('seriesLabel')}</label>
                <select
                  value={requestData.seriesId}
                  onChange={(e) => setRequestData({ ...requestData, seriesId: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="">{t('noSeries')}</option>
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">{t('categoryLabel')}</label>
                <select
                  value={requestData.categoryId}
                  onChange={(e) => setRequestData({ ...requestData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="">{t('noCategory')}</option>
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
                  {tc('secret')}
                </label>
              </div>
              <div>
                <label className="block font-semibold mb-1">{t('rarityPercentLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={requestData.rarityPercentage}
                  onChange={(e) => setRequestData({ ...requestData, rarityPercentage: e.target.value })}
                  placeholder={t('rarityPlaceholder')}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{t('descriptionLabel')}</label>
                <textarea
                  value={requestData.description}
                  onChange={(e) => setRequestData({ ...requestData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                  rows={3}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{t('newImageLabel')}</label>
                <div className="flex items-center gap-3">
                  <PhotoInput
                    onSelect={handleRequestImageSelect}
                    label={requestImagePreview ? t('changeImage') : t('attachImage')}
                  />
                  {requestImagePreview && (
                    <img src={requestImagePreview} alt="" className="w-12 h-12 object-cover object-top rounded" />
                  )}
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">{t('reasonLabel')}</label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder={t('reasonPlaceholder')}
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
                  {submittingRequest ? t('submitting') : t('sendRequest')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  disabled={submittingRequest}
                  className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  {tc('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
