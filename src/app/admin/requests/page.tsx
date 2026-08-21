'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import TopMenu from '@/components/TopMenu'
import LoadingSpinner from '@/components/LoadingSpinner'

interface RequestData {
  name?: string
  seriesId?: string | null
  categoryId?: string | null
  releaseDate?: string | null
  description?: string | null
  isSecret?: boolean
  imageUrl?: string | null
}

interface EditRequest {
  id: string
  description: string | null
  oldData: RequestData
  newData: RequestData
  createdAt: string
  bearbricks: { id: string; name: string }
  users: { name: string | null; email: string }
}

interface Series {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

export default function AdminRequestsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [requests, setRequests] = useState<EditRequest[]>([])
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    const role = session?.user?.role
    if (role !== 'ADMIN' && role !== 'OWNER') {
      router.push('/')
      return
    }
    fetchRequests()
    fetch('/api/series')
      .then((res) => (res.ok ? res.json() : []))
      .then(setSeriesList)
      .catch(() => setSeriesList([]))
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then(setCategoryList)
      .catch(() => setCategoryList([]))
  }, [status, session])

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/edit-requests')
      if (res.ok) {
        setRequests(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const seriesName = (id: string | null | undefined) => {
    if (!id) return '(none)'
    return seriesList.find((s) => s.id === id)?.name || id
  }

  const categoryName = (id: string | null | undefined) => {
    if (!id) return '(none)'
    return categoryList.find((c) => c.id === id)?.name || id
  }

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/admin/edit-requests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id))
      } else {
        alert('Failed to process')
      }
    } catch (error) {
      console.error('Failed to review request:', error)
      alert('Failed to process')
    } finally {
      setProcessingId(null)
    }
  }

  const Field = ({ label, oldVal, newVal }: { label: string; oldVal: string; newVal: string }) => {
    const changed = oldVal !== newVal
    return (
      <div className="flex gap-2 text-sm">
        <span className="w-16 shrink-0 text-gray-500 dark:text-gray-400">{label}</span>
        {changed ? (
          <span>
            <span className="text-gray-400 line-through dark:text-gray-500">{oldVal || '(none)'}</span>
            {' → '}
            <span className="text-blue-600 font-medium dark:text-blue-400">{newVal || '(none)'}</span>
          </span>
        ) : (
          <span className="text-gray-700 dark:text-gray-300">{oldVal || '(none)'}</span>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-950">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin/manage" className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            ← Back to admin
          </Link>
          <TopMenu />
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Approve Edit Requests</h1>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {requests.length === 0 ? (
          <p className="text-center text-gray-500 py-12 dark:text-gray-400">No pending edit requests</p>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-white rounded-lg shadow p-6 dark:bg-gray-900">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Link href={`/bearbricks/${req.bearbricks.id}`} className="text-lg font-bold text-blue-600 hover:underline dark:text-blue-400">
                    {req.bearbricks.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                    Requested by: {req.users.name || req.users.email} · {new Date(req.createdAt).toLocaleString('en-US')}
                  </p>
                </div>
              </div>

              {req.description && (
                <p className="text-sm bg-gray-50 border rounded p-3 mb-4 dark:bg-gray-800 dark:border-gray-700">Reason: {req.description}</p>
              )}

              <div className="space-y-1 mb-4">
                <Field label="Name" oldVal={req.oldData.name || ''} newVal={req.newData.name || ''} />
                <Field
                  label="Series"
                  oldVal={seriesName(req.oldData.seriesId)}
                  newVal={seriesName(req.newData.seriesId)}
                />
                <Field
                  label="Category"
                  oldVal={categoryName(req.oldData.categoryId)}
                  newVal={categoryName(req.newData.categoryId)}
                />
                <Field label="Released" oldVal={req.oldData.releaseDate || ''} newVal={req.newData.releaseDate || ''} />
                <Field label="Description" oldVal={req.oldData.description || ''} newVal={req.newData.description || ''} />
                <Field
                  label="Secret"
                  oldVal={req.oldData.isSecret ? 'Yes' : 'No'}
                  newVal={req.newData.isSecret ? 'Yes' : 'No'}
                />
              </div>

              {req.newData.imageUrl && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1 dark:text-gray-400">Attached image</p>
                  <img src={req.newData.imageUrl} alt="" className="w-32 h-32 object-cover rounded border" />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleReview(req.id, 'approve')}
                  disabled={processingId === req.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(req.id, 'reject')}
                  disabled={processingId === req.id}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
