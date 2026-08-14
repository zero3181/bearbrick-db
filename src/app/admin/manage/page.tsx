'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [newSeriesSeason, setNewSeriesSeason] = useState('')
  const [newSeriesYear, setNewSeriesYear] = useState(new Date().getFullYear().toString())
  const [creatingSeries, setCreatingSeries] = useState(false)

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

      if (res.ok) {
        alert('추가되었습니다')
        setShowAddForm(false)
        setFormData({ name: '', seriesId: '', size: '100', releaseDate: '', description: '' })
        fetchBearbricks()
      } else {
        alert('추가 실패')
      }
    } catch (error) {
      console.error('Failed to add:', error)
      alert('추가 실패')
    }
  }

  const handleSeriesSelect = (value: string) => {
    if (value === '__new__') {
      setNewSeriesYear(new Date().getFullYear().toString())
      setNewSeriesSeason('')
    }
    setFormData({ ...formData, seriesId: value })
  }

  const handleCreateSeries = async () => {
    if (!newSeriesSeason) {
      alert('시즌을 입력해주세요')
      return
    }

    const nextNumber = seriesList.length > 0
      ? Math.max(...seriesList.map((s) => s.number)) + 1
      : 1

    setCreatingSeries(true)
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 4321',
        },
        body: JSON.stringify({
          number: nextNumber,
          name: `Series ${nextNumber}`,
          season: newSeriesSeason,
          releaseYear: parseInt(newSeriesYear),
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
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showAddForm ? '취소' : '+ 추가'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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
                  required
                >
                  <option value="">시리즈 선택</option>
                  {seriesList.map((series) => (
                    <option key={series.id} value={series.id}>
                      {series.name}
                    </option>
                  ))}
                  <option value="__new__">+ 새 시리즈 추가</option>
                </select>
                {formData.seriesId === '__new__' && (
                  <div className="mt-2 p-3 bg-gray-50 border rounded space-y-2">
                    <p className="text-sm text-gray-600">
                      다음 시리즈 번호로 자동 생성됩니다: Series{' '}
                      {seriesList.length > 0 ? Math.max(...seriesList.map((s) => s.number)) + 1 : 1}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSeriesSeason}
                        onChange={(e) => setNewSeriesSeason(e.target.value)}
                        placeholder="시즌 (예: Summer)"
                        className="flex-1 px-3 py-2 border rounded text-sm"
                      />
                      <input
                        type="number"
                        value={newSeriesYear}
                        onChange={(e) => setNewSeriesYear(e.target.value)}
                        placeholder="출시 연도"
                        className="w-28 px-3 py-2 border rounded text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleCreateSeries}
                        disabled={creatingSeries}
                        className="px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50"
                      >
                        {creatingSeries ? '생성 중...' : '생성'}
                      </button>
                    </div>
                  </div>
                )}
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
                추가하기
              </button>
            </form>
          </div>
        )}

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
      </main>
    </div>
  )
}
