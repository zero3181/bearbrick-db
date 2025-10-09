'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Bearbrick {
  id: string
  name: string
  series: string | null
  size: number
  images: { url: string; isPrimary: boolean }[]
}

export default function AdminManagePage() {
  const router = useRouter()
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    series: '',
    size: '100',
    releaseDate: '',
    description: '',
  })

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true'
    if (!isAdmin) {
      router.push('/')
      return
    }
    fetchBearbricks()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/admin/bearbricks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          size: parseInt(formData.size),
          releaseDate: formData.releaseDate || null,
        }),
      })

      if (res.ok) {
        alert('추가되었습니다')
        setShowAddForm(false)
        setFormData({ name: '', series: '', size: '100', releaseDate: '', description: '' })
        fetchBearbricks()
      } else {
        alert('추가 실패')
      }
    } catch (error) {
      console.error('Failed to add:', error)
      alert('추가 실패')
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
                <label className="block font-semibold mb-1">시리즈</label>
                <input
                  type="text"
                  value={formData.series}
                  onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                  placeholder="예: Series 50"
                />
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
                          src={primaryImage?.url || bearbrick.images[0]?.url || '/placeholder.png'}
                          alt={bearbrick.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{bearbrick.name}</td>
                    <td className="px-6 py-4 text-gray-600">{bearbrick.series || '-'}</td>
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
