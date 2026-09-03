'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import TopMenu from '@/components/TopMenu'
import LoadingSpinner from '@/components/LoadingSpinner'
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
  number: number
}

interface Category {
  id: string
  name: string
}

export default function EditBearbrickPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [bearbrick, setBearbrick] = useState<Bearbrick | null>(null)
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    name: '',
    seriesId: '',
    categoryId: '',
    description: '',
    isSecret: false,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    if (status === 'loading') return
    const role = session?.user?.role
    if (role !== 'ADMIN' && role !== 'OWNER') {
      router.push('/')
      return
    }
    fetchSeriesList()
    fetchCategoryList()
    fetchBearbrick()
  }, [params.id, status, session])

  const fetchSeriesList = async () => {
    try {
      const res = await fetch('/api/series')
      if (res.ok) {
        const data = await res.json()
        setSeriesList(data)
      }
    } catch (error) {
      console.error('Failed to fetch series:', error)
    }
  }

  const fetchCategoryList = async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        setCategoryList(data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchBearbrick = async () => {
    try {
      const res = await fetch(`/api/bearbricks/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setBearbrick(data)
        setFormData({
          name: data.name,
          seriesId: data.series?.id || '',
          categoryId: data.category?.id || '',
          description: data.description || '',
          isSecret: Boolean(data.isSecret),
        })
      }
    } catch (error) {
      console.error('Failed to fetch:', error)
    }
  }

  // Used after image actions (upload/set-primary/delete) to refresh the
  // image list without clobbering in-progress, unsaved edits in formData.
  const refreshImages = async () => {
    try {
      const res = await fetch(`/api/bearbricks/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setBearbrick(data)
      }
    } catch (error) {
      console.error('Failed to fetch:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch(`/api/admin/bearbricks/update-bearbrick`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: params.id,
          ...formData,
        }),
      })

      if (res.ok) {
        alert('Updated')
        router.push('/admin/manage')
      } else {
        alert('Update failed')
      }
    } catch (error) {
      console.error('Failed to update:', error)
      alert('Update failed')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const compressedFile = await compressImage(file)

      // Upload to Vercel Blob
      const timestamp = Date.now()
      const ext = compressedFile.name.split('.').pop() || 'jpg'
      const filename = `bearbrick-${params.id}-${timestamp}.${ext}`

      const blob = await upload(filename, compressedFile, {
        access: 'public',
        handleUploadUrl: '/api/upload/presigned',
        onUploadProgress: (progress) => {
          setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
        },
      })

      // Save to database
      const res = await fetch(`/api/admin/bearbricks/${params.id}/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: blob.url,
          isPrimary: bearbrick?.images.length === 0,
        }),
      })

      if (res.ok) {
        alert('Image uploaded')
        refreshImages()
      } else {
        alert('Failed to save the image')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed')
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
        },
        body: JSON.stringify({ imageId }),
      })

      if (res.ok) {
        refreshImages()
      }
    } catch (error) {
      console.error('Failed to set primary:', error)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image?')) return

    try {
      const res = await fetch(`/api/admin/bearbricks/${params.id}/delete-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId }),
      })

      if (res.ok) {
        refreshImages()
      } else {
        alert('Delete failed')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Delete failed')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${bearbrick?.name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/admin/bearbricks/${params.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/admin/manage')
      } else {
        alert('Delete failed')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Delete failed')
    }
  }

  const isSecretCategory = categoryList.find((c) => c.id === formData.categoryId)?.name === 'Secret'

  if (!bearbrick) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin/manage" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to admin
          </Link>
          <TopMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Edit Bearbrick</h1>

        {/* Basic Info Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Basic Info</h2>
          <form id="edit-bearbrick-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Series</label>
              <select
                value={formData.seriesId}
                onChange={(e) => setFormData({ ...formData, seriesId: e.target.value })}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="">No series</option>
                {seriesList.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => {
                  const categoryId = e.target.value
                  const isSecretCat = categoryList.find((c) => c.id === categoryId)?.name === 'Secret'
                  setFormData({ ...formData, categoryId, isSecret: isSecretCat ? true : formData.isSecret })
                }}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="">No category</option>
                {categoryList.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`flex items-center gap-2 font-semibold ${isSecretCategory ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSecretCategory ? true : formData.isSecret}
                  disabled={isSecretCategory}
                  onChange={(e) => setFormData({ ...formData, isSecret: e.target.checked })}
                  className="w-4 h-4"
                />
                Secret
              </label>
            </div>
            <div>
              <label className="block font-semibold mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                rows={4}
              />
            </div>
          </form>
        </div>

        {/* Images */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Manage Images</h2>

          {/* Upload */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:text-blue-600 text-sm font-medium text-gray-700 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Image'}
              </label>
              <span className="text-xs text-gray-400">JPG, PNG, GIF (max 5MB)</span>
            </div>
            {uploading && (
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Image List */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {bearbrick.images.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.url}
                  alt=""
                  className="w-full aspect-[3/4] object-cover object-top rounded"
                />
                {image.isPrimary && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!image.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(image.id)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Set as primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {bearbrick.images.length === 0 && (
            <p className="text-center text-gray-500 py-8">No images yet</p>
          )}
        </div>

        <button
          type="submit"
          form="edit-bearbrick-form"
          className="w-full mt-8 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>

        <button
          onClick={handleDelete}
          className="w-full mt-3 px-4 py-2 border border-red-200 text-red-600 rounded hover:bg-red-50"
        >
          Delete
        </button>
      </main>
    </div>
  )
}
