'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import TopMenu from '@/components/TopMenu'
import { sortBearbricks, collapseBasicGroup } from '@/lib/sortBearbricks'
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
  isSecret: boolean
  images: { url: string; isPrimary: boolean }[]
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
  return (
    <Suspense fallback={null}>
      <AdminManagePageInner />
    </Suspense>
  )
}

const SERIES_STORAGE_KEY = 'gombrick:selectedSeries'

function AdminManagePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    seriesId: '',
    categoryId: '',
    description: '',
    isSecret: false,
  })
  const [creatingSeries, setCreatingSeries] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ updateCount: number; createCount: number; unchangedCount: number; errors: { rowNum: number; reason: string }[]; newSeriesNames: string[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ updated: number; created: number; skipped: number } | null>(null)
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number; etaSeconds: number | null } | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    const role = session?.user?.role
    if (role !== 'ADMIN' && role !== 'OWNER') {
      router.push('/')
      return
    }
    loadInitial()
  }, [status, session])

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add') setShowAddForm(true)
    if (action === 'import') setShowImportPanel(true)
  }, [searchParams])

  const loadInitial = async () => {
    fetchCategoryList()
    const series = await fetchSeriesList()
    const saved = sessionStorage.getItem(SERIES_STORAGE_KEY)
    const savedIsValid = saved === 'all' || (saved && series.some((s: Series) => s.name === saved))
    setSelectedSeries(savedIsValid ? saved! : series.length > 0 ? series[0].name : 'all')
  }

  useEffect(() => {
    if (!selectedSeries) return
    sessionStorage.setItem(SERIES_STORAGE_KEY, selectedSeries)
    fetchBearbricks(selectedSeries)
  }, [selectedSeries])

  const fetchBearbricks = async (series: string) => {
    try {
      const url = series !== 'all' ? `/api/bearbricks?series=${encodeURIComponent(series)}` : '/api/bearbricks'
      const res = await fetch(url)
      const data = await res.json()
      setBearbricks(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch:', error)
    }
  }

  const fetchSeriesList = async () => {
    try {
      const res = await fetch('/api/series')
      if (res.ok) {
        const data = await res.json()
        setSeriesList(data)
        return data
      }
    } catch (error) {
      console.error('Failed to fetch series:', error)
    }
    return []
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.seriesId === '__new__') {
      alert('Please create the new series first')
      return
    }

    try {
      const res = await fetch('/api/admin/bearbricks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        alert('Add failed')
        return
      }

      const created = await res.json()

      if (imageFile) {
        setUploading(true)
        setUploadProgress(0)
        try {
          const ext = imageFile.name.split('.').pop() || 'jpg'
          const filename = `bearbrick-${created.id}-${Date.now()}.${ext}`

          const blob = await upload(filename, imageFile, {
            access: 'public',
            handleUploadUrl: '/api/upload/presigned',
            onUploadProgress: (progress) => {
              setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
            },
          })

          await fetch(`/api/admin/bearbricks/${created.id}/upload-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl: blob.url, isPrimary: true }),
          })
        } catch (error) {
          console.error('Failed to upload image:', error)
          alert('The bearbrick was added, but the image upload failed')
        } finally {
          setUploading(false)
          setUploadProgress(0)
        }
      }

      alert('Added')
      setShowAddForm(false)
      router.replace('/admin/manage')
      setFormData({ name: '', seriesId: '', categoryId: '', description: '', isSecret: false })
      setImageFile(null)
      setImagePreview('')
      fetchBearbricks(selectedSeries)
    } catch (error) {
      console.error('Failed to add:', error)
      alert('Add failed')
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setImageFile(compressed)
    setImagePreview(URL.createObjectURL(compressed))
  }

  const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1
    if (month >= 3 && month <= 5) return 'Spring'
    if (month >= 6 && month <= 8) return 'Summer'
    if (month >= 9 && month <= 11) return 'Fall'
    return 'Winter'
  }

  const nextSeriesNumber = seriesList.length > 0
    ? Math.max(...seriesList.map((s) => s.number)) + 1
    : 1

  const handleSeriesSelect = async (value: string) => {
    if (value !== '__new__') {
      setFormData({ ...formData, seriesId: value })
      return
    }

    setFormData((prev) => ({ ...prev, seriesId: '__new__' }))
    setCreatingSeries(true)
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: nextSeriesNumber,
          name: `Series ${nextSeriesNumber}`,
          season: getCurrentSeason(),
          releaseYear: new Date().getFullYear(),
        }),
      })

      if (res.ok) {
        const newSeries = await res.json()
        await fetchSeriesList()
        setFormData((prev) => ({ ...prev, seriesId: newSeries.id }))
      } else {
        alert('Failed to add series')
        setFormData((prev) => ({ ...prev, seriesId: '' }))
      }
    } catch (error) {
      console.error('Failed to add series:', error)
      alert('Failed to add series')
      setFormData((prev) => ({ ...prev, seriesId: '' }))
    } finally {
      setCreatingSeries(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/bearbricks/export')
      if (!res.ok) {
        alert('Export failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bearbricks-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export:', error)
      alert('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportFile(file)
    setImportResult(null)
    setImportPreview(null)
    setImporting(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('mode', 'preview')
      const res = await fetch('/api/admin/bearbricks/import', {
        method: 'POST',
        body,
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Could not read the file')
        setImportFile(null)
        return
      }
      setImportPreview(data)
    } catch (error) {
      console.error('Failed to preview import:', error)
      alert('Could not read the file')
      setImportFile(null)
    } finally {
      setImporting(false)
    }
  }

  const handleImportConfirm = async () => {
    if (!importFile) return

    const estimatedTotal = importPreview
      ? importPreview.updateCount + importPreview.createCount + importPreview.unchangedCount + importPreview.errors.length
      : 0

    setImporting(true)
    const startTime = Date.now()
    setImportProgress({ processed: 0, total: estimatedTotal, etaSeconds: null })

    try {
      let offset = 0
      let done = false
      let totalUpdated = 0
      let totalCreated = 0
      let totalSkipped = 0

      while (!done) {
        const body = new FormData()
        body.append('file', importFile)
        body.append('mode', 'apply')
        body.append('offset', String(offset))

        const res = await fetch('/api/admin/bearbricks/import', {
          method: 'POST',
          body,
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data.error || 'Apply failed')
          return
        }

        offset = data.nextOffset
        done = data.done
        totalUpdated += data.batchUpdated
        totalCreated += data.batchCreated
        totalSkipped += data.batchSkipped

        const elapsedSeconds = (Date.now() - startTime) / 1000
        const remaining = data.total - data.processed
        const etaSeconds = data.processed > 0 ? Math.round((elapsedSeconds / data.processed) * remaining) : null
        setImportProgress({ processed: data.processed, total: data.total, etaSeconds })
      }

      setImportResult({
        updated: totalUpdated,
        created: totalCreated,
        skipped: totalSkipped,
      })
      setImportPreview(null)
      setImportFile(null)
      setShowImportPanel(false)
      router.replace('/admin/manage')
      fetchBearbricks(selectedSeries)
    } catch (error) {
      console.error('Failed to apply import:', error)
      alert('Apply failed')
    } finally {
      setImporting(false)
      setImportProgress(null)
    }
  }

  const handleImportCancel = () => {
    setImportFile(null)
    setImportPreview(null)
  }

  const sortedBearbricks = collapseBasicGroup(sortBearbricks(bearbricks))

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <img src="/logo-gombrick.png" alt="GomBrick" className="h-9 md:h-[42px] w-auto" />
          </Link>
          <TopMenu />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Bearbricks</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Series</label>
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {showImportPanel && !importPreview && !importResult && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Import from Excel</h2>
            <label className="block w-full px-4 py-10 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 text-center transition-colors">
              <input type="file" accept=".xlsx,.xls" onChange={handleImportFileSelect} className="hidden" />
              <p className="text-gray-600">{importing ? 'Reading...' : 'Click to choose an Excel file'}</p>
            </label>
            <button
              onClick={() => { setShowImportPanel(false); router.replace('/admin/manage') }}
              className="mt-4 px-4 py-2 text-sm text-gray-500 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        )}

        {importPreview && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Import Preview</h2>
            <p className="mb-2">
              <span className="font-semibold text-blue-600">{importPreview.updateCount}</span> to update,{' '}
              <span className="font-semibold text-green-600">{importPreview.createCount}</span> to add
              {importPreview.errors.length > 0 && (
                <>, <span className="font-semibold text-red-600">{importPreview.errors.length}</span> errors</>
              )}
            </p>
            {importPreview.unchangedCount > 0 && (
              <p className="mb-2 text-sm text-gray-500">
                Skipped (no changes): {importPreview.unchangedCount}
              </p>
            )}
            {importPreview.newSeriesNames.length > 0 && (
              <p className="mb-2 text-sm text-gray-700">
                New series to be created: {importPreview.newSeriesNames.join(', ')}
              </p>
            )}
            {importPreview.errors.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                {importPreview.errors.map((err, i) => (
                  <p key={i} className="text-red-700">
                    Row {err.rowNum}: {err.reason}
                  </p>
                ))}
              </div>
            )}

            {importing && importProgress && (
              <div className="mb-4">
                <p className="text-sm text-blue-600 mb-1">
                  Applying... {importProgress.processed} / {importProgress.total}
                  {importProgress.etaSeconds !== null && importProgress.etaSeconds > 0 && (
                    <> (about {importProgress.etaSeconds}s left)</>
                  )}
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${importProgress.total > 0 ? Math.round((importProgress.processed / importProgress.total) * 100) : 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleImportConfirm}
                disabled={importing || (importPreview.updateCount === 0 && importPreview.createCount === 0)}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700 disabled:opacity-50"
              >
                {importing ? 'Applying...' : 'Apply'}
              </button>
              <button
                onClick={handleImportCancel}
                disabled={importing}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {importResult && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold mb-2">Import Complete</h2>
            <p className="">
              {importResult.updated} updated, {importResult.created} added
              {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
            </p>
            <button
              onClick={() => setImportResult(null)}
              className="mt-4 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        )}

        {showAddForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Add a New Bearbrick</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Series *</label>
                <select
                  value={formData.seriesId}
                  onChange={(e) => handleSeriesSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  disabled={creatingSeries}
                  required
                >
                  <option value="">Select a series</option>
                  <option value="__new__">
                    {creatingSeries ? 'Creating...' : `+ New series (Series ${nextSeriesNumber})`}
                  </option>
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
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
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
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={formData.isSecret}
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
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  rows={4}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Image</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 text-sm font-medium text-gray-700 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    {imagePreview ? 'Change Image' : 'Choose Image'}
                  </label>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt=""
                      className="w-12 h-12 object-cover object-top rounded-lg"
                    />
                  )}
                  <span className="text-xs text-gray-400">Optional — a placeholder is used if left empty</span>
                </div>
                {uploading && (
                  <div className="mt-2">
                    <p className="text-sm text-blue-600 mb-1">Uploading image... {uploadProgress}%</p>
                    <div className="w-full max-w-xs bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); router.replace('/admin/manage') }}
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {!showAddForm && !showImportPanel && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Series</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedBearbricks.map((bearbrick) => {
                const primaryImage = bearbrick.images.find(img => img.isPrimary)
                return (
                  <tr key={bearbrick.id}>
                    <td className="px-6 py-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden">
                        <img
                          src={primaryImage?.url || bearbrick.images[0]?.url || '/bearbrick-placeholder.svg'}
                          alt={bearbrick.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {bearbrick.isSecret && (
                        <span
                          className={`inline-block px-2 py-0.5 mr-2 text-xs font-semibold rounded-full ${
                            bearbrick.category?.name === 'Super Secret' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          Secret
                        </span>
                      )}
                      {bearbrick.category && (
                        <span className="text-gray-400">[{bearbrick.category.name}] </span>
                      )}
                      {bearbrick.category?.name === 'Basic' ? 'BE@RBRICK' : bearbrick.name}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{bearbrick.series?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/bearbricks/${bearbrick.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}
      </main>
    </div>
  )
}
