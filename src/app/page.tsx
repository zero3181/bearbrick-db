'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Bearbrick {
  id: string
  name: string
  series: string | null
  size: number
  images: {
    url: string
    isPrimary: boolean
  }[]
}

export default function HomePage() {
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')

  useEffect(() => {
    fetchBearbricks()
    const adminStatus = localStorage.getItem('isAdmin') === 'true'
    setIsAdmin(adminStatus)
  }, [])

  const fetchBearbricks = async () => {
    try {
      const res = await fetch('/api/bearbricks')
      const data = await res.json()
      // Ensure data is an array before setting state
      setBearbricks(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch bearbricks:', error)
      setBearbricks([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = () => {
    if (password === '4321') {
      localStorage.setItem('isAdmin', 'true')
      setIsAdmin(true)
      setShowPasswordModal(false)
      setPassword('')
    } else {
      alert('잘못된 비밀번호입니다')
      setPassword('')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('isAdmin')
    setIsAdmin(false)
  }

  const getPrimaryImage = (bearbrick: Bearbrick) => {
    const primary = bearbrick.images.find(img => img.isPrimary)
    return primary?.url || bearbrick.images[0]?.url || '/placeholder.png'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Bearbrick DB</h1>
          <div>
            {isAdmin ? (
              <div className="flex gap-3">
                <Link
                  href="/admin/manage"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  관리
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">베어브릭 컬렉션</h2>

        {bearbricks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">등록된 베어브릭이 없습니다</p>
            {isAdmin && (
              <Link
                href="/admin/manage"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                베어브릭 추가하기
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {bearbricks.map((bearbrick) => (
              <Link
                key={bearbrick.id}
                href={`/bearbricks/${bearbrick.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <img
                    src={getPrimaryImage(bearbrick)}
                    alt={bearbrick.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{bearbrick.name}</h3>
                  <p className="text-sm text-gray-600">
                    {bearbrick.series && `${bearbrick.series} · `}
                    {bearbrick.size}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">관리자 로그인</h3>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="비밀번호 입력"
              className="w-full px-4 py-2 border rounded mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleAdminLogin}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                확인
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPassword('')
                }}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
