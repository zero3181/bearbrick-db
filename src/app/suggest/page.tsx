'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import TopMenu from '@/components/TopMenu'
import { compressImage } from '@/lib/compressImage'

interface Series {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

export default function SuggestBearbrickPage() {
  const { data: session, status } = useSession()
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    name: '',
    seriesId: '',
    categoryId: '',
    description: '',
    isSecret: false,
    rarityPercentage: '',
  })
  const [note, setNote] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch('/api/series')
      .then((res) => (res.ok ? res.json() : []))
      .then(setSeriesList)
      .catch(() => setSeriesList([]))
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then(setCategoryList)
      .catch(() => setCategoryList([]))
  }, [])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setImageFile(compressed)
    setImagePreview(URL.createObjectURL(compressed))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      let imageUrl: string | null = null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'jpg'
        const blob = await upload(`suggestion-${Date.now()}.${ext}`, imageFile, {
          access: 'public',
          handleUploadUrl: '/api/upload/presigned',
        })
        imageUrl = blob.url
      }

      const res = await fetch('/api/edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: note,
          newData: {
            name: formData.name,
            seriesId: formData.seriesId || null,
            categoryId: formData.categoryId || null,
            description: formData.description || null,
            isSecret: formData.isSecret,
            rarityPercentage: formData.rarityPercentage === '' ? null : parseFloat(formData.rarityPercentage),
            imageUrl,
          },
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        alert('Submission failed')
      }
    } catch (error) {
      console.error('Failed to submit suggestion:', error)
      alert('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const isSecretCategory = categoryList.find((c) => c.id === formData.categoryId)?.name === 'Secret'

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back
          </Link>
          <TopMenu />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Suggest a Bearbrick</h1>
        <p className="text-sm text-gray-500 mb-8">
          Don&apos;t see a piece in the database? Suggest it here - an admin will review and add it.
        </p>

        {status === 'loading' ? null : !session ? (
          <button
            onClick={() => signIn('google')}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Sign in to suggest a bearbrick
          </button>
        ) : submitted ? (
          <div className="bg-gray-50 border rounded-lg p-6 text-center">
            <p className="font-semibold mb-2">Thanks! Your suggestion has been submitted.</p>
            <p className="text-sm text-gray-500 mb-4">It will appear once an admin approves it.</p>
            <Link href="/" className="text-blue-600 hover:underline text-sm">
              Back to the collection
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block font-semibold mb-1">Series *</label>
              <select
                value={formData.seriesId}
                onChange={(e) => setFormData({ ...formData, seriesId: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              >
                <option value="">Select a series</option>
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
                value={formData.categoryId}
                onChange={(e) => {
                  const categoryId = e.target.value
                  const isSecretCat = categoryList.find((c) => c.id === categoryId)?.name === 'Secret'
                  setFormData({ ...formData, categoryId, isSecret: isSecretCat ? true : formData.isSecret })
                }}
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
              <label className="block font-semibold mb-1">Rarity % (optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.rarityPercentage}
                onChange={(e) => setFormData({ ...formData, rarityPercentage: e.target.value })}
                placeholder="e.g. 4.16 for 1/24 in a 24-piece case"
                className="w-full px-4 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Image (optional)</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 text-sm font-medium text-gray-700 transition-colors">
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  {imagePreview ? 'Change Image' : 'Attach Image'}
                </label>
                {imagePreview && (
                  <img src={imagePreview} alt="" className="w-12 h-12 object-cover object-top rounded" />
                )}
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Note for the admin (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Where did you find this? Anything else worth knowing?"
                className="w-full px-4 py-2 border rounded"
                rows={2}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Suggestion'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
