'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'

interface Bearbrick {
  id: string
  name: string
  series: {
    id: string
    name: string
  } | null
  size: number
  images: { url: string; isPrimary: boolean }[]
}

interface Series {
  id: string
  name: string
  number: number
}

export default function AdminManagePage() {
  const router = useRouter()
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    seriesId: '',
    size: '100',
    releaseDate: '',
    description: '',
  })
  const [creatingSeries, setCreatingSeries] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ updateCount: number; createCount: number; unchangedCount: number; errors: { rowNum: number; reason: string }[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ updated: number; created: number; skipped: number } | null>(null)
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number; etaSeconds: number | null } | null>(null)

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true'
    if (!isAdmin) {
      router.push('/')
      return
    }
    fetchBearbricks()
    fetchSeriesList()
  }, [])

  const fetchBearbricks = async () => {
    try {
      const res = await fetch('/api/bearbricks')
      const data = await res.json()
      setBearbricks(data)
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
      }
    } catch (error) {
      console.error('Failed to fetch series:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.seriesId === '__new__') {
      alert('새 시리즈를 먼저 생성해주세요')
      return
    }

    try {
      const res = await fetch('/api/admin/bearbricks', {
        method: 'POST',
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

      if (!res.ok) {
        alert('추가 실패')
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
            clientPayload: JSON.stringify({ authorization: '4321' }),
            onUploadProgress: (progress) => {
              setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
            },
          })

          await fetch(`/api/admin/bearbricks/${created.id}/upload-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer 4321',
            },
            body: JSON.stringify({ imageUrl: blob.url, isPrimary: true }),
          })
        } catch (error) {
          console.error('Failed to upload image:', error)
          alert('베어브릭은 추가되었지만 이미지 업로드에 실패했습니다')
        } finally {
          setUploading(false)
          setUploadProgress(0)
        }
      }

      alert('추가되었습니다')
      setShowAddForm(false)
      setFormData({ name: '', seriesId: '', size: '100', releaseDate: '', description: '' })
      setImageFile(null)
      setImagePreview('')
      fetchBearbricks()
    } catch (error) {
      console.error('Failed to add:', error)
      alert('추가 실패')
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
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
          'Authorization': 'Bearer 4321',
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
        alert('시리즈 추가 실패')
        setFormData((prev) => ({ ...prev, seriesId: '' }))
      }
    } catch (error) {
      console.error('Failed to add series:', error)
      alert('시리즈 추가 실패')
      setFormData((prev) => ({ ...prev, seriesId: '' }))
    } finally {
      setCreatingSeries(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/bearbricks/export', {
        headers: { 'Authorization': 'Bearer 4321' },
      })
      if (!res.ok) {
        alert('내보내기 실패')
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
      alert('내보내기 실패')
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
        headers: { 'Authorization': 'Bearer 4321' },
        body,
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '파일을 읽을 수 없습니다')
        setImportFile(null)
        return
      }
      setImportPreview(data)
    } catch (error) {
      console.error('Failed to preview import:', error)
      alert('파일을 읽을 수 없습니다')
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
          headers: { 'Authorization': 'Bearer 4321' },
          body,
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '적용 실패')
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
      fetchBearbricks()
    } catch (error) {
      console.error('Failed to apply import:', error)
      alert('적용 실패')
    } finally {
      setImporting(false)
      setImportProgress(null)
    }
  }

  const handleImportCancel = () => {
    setImportFile(null)
    setImportPreview(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">베어브릭 관리</h1>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              홈으로
            </Link>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
            >
              {exporting ? '내보내는 중...' : '엑셀 내보내기'}
            </button>
            <label className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 cursor-pointer">
              엑셀 가져오기
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFileSelect}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showAddForm ? '취소' : '+ 추가'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {importPreview && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">엑셀 가져오기 미리보기</h2>
            <p className="mb-2">
              <span className="font-semibold text-blue-600">{importPreview.updateCount}개</span> 수정,{' '}
              <span className="font-semibold text-green-600">{importPreview.createCount}개</span> 추가
              {importPreview.errors.length > 0 && (
                <>, <span className="font-semibold text-red-600">{importPreview.errors.length}개</span> 오류</>
              )}
            </p>
            {importPreview.unchangedCount > 0 && (
              <p className="mb-2 text-sm text-gray-500">
                변경사항 없어 건너뜀: {importPreview.unchangedCount}개
              </p>
            )}
            {importPreview.errors.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto bg-red-50 border border-red-200 rounded p-3 text-sm">
                {importPreview.errors.map((err, i) => (
                  <p key={i} className="text-red-700">
                    행 {err.rowNum}: {err.reason}
                  </p>
                ))}
              </div>
            )}

            {importing && importProgress && (
              <div className="mb-4">
                <p className="text-sm text-blue-600 mb-1">
                  적용 중... {importProgress.processed} / {importProgress.total}
                  {importProgress.etaSeconds !== null && importProgress.etaSeconds > 0 && (
                    <> (약 {importProgress.etaSeconds}초 남음)</>
                  )}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? '적용 중...' : '적용하기'}
              </button>
              <button
                onClick={handleImportCancel}
                disabled={importing}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {importResult && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-2">가져오기 완료</h2>
            <p>
              {importResult.updated}개 수정, {importResult.created}개 추가
              {importResult.skipped > 0 && `, ${importResult.skipped}개 건너뜀`}
            </p>
            <button
              onClick={() => setImportResult(null)}
              className="mt-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              닫기
            </button>
          </div>
        )}

        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">새 베어브릭 추가</h2>
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
                <label className="block font-semibold mb-1">시리즈 *</label>
                <select
                  value={formData.seriesId}
                  onChange={(e) => handleSeriesSelect(e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                  disabled={creatingSeries}
                  required
                >
                  <option value="">시리즈 선택</option>
                  <option value="__new__">
                    {creatingSeries ? '생성 중...' : `+ 새 시리즈 (Series ${nextSeriesNumber})`}
                  </option>
                  {seriesList.map((series) => (
                    <option key={series.id} value={series.id}>
                      {series.name}
                    </option>
                  ))}
                </select>
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
              <div>
                <label className="block font-semibold mb-1">이미지</label>
                <label className="block w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt=""
                      className="w-24 h-24 object-cover rounded mx-auto"
                    />
                  ) : (
                    <div>
                      <p className="text-gray-600">클릭하여 이미지 선택</p>
                      <p className="text-sm text-gray-400 mt-1">비워두면 기본 이미지가 표시됩니다</p>
                    </div>
                  )}
                </label>
                {uploading && (
                  <div className="mt-2">
                    <p className="text-sm text-blue-600 mb-1">이미지 업로드 중... {uploadProgress}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? '업로드 중...' : '추가하기'}
              </button>
            </form>
          </div>
        )}

        {!showAddForm && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이미지</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시리즈</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사이즈</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bearbricks.map((bearbrick) => {
                const primaryImage = bearbrick.images.find(img => img.isPrimary)
                return (
                  <tr key={bearbrick.id}>
                    <td className="px-6 py-4">
                      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                        <img
                          src={primaryImage?.url || bearbrick.images[0]?.url || '/bearbrick-placeholder.svg'}
                          alt={bearbrick.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{bearbrick.name}</td>
                    <td className="px-6 py-4 text-gray-600">{bearbrick.series?.name || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{bearbrick.size}%</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/bearbricks/${bearbrick.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        수정
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
