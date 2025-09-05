'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function AdminSetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    email: '',
    role: 'ADMIN'
  })

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin?callbackUrl=/admin/setup')
      return
    }

    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      const [userResponse, usersResponse] = await Promise.all([
        fetch('/api/user/me'),
        fetch('/api/admin/users')
      ])

      if (userResponse.ok) {
        const userData = await userResponse.json()
        setCurrentUser(userData)
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/set-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`${data.user.name}님의 권한이 ${data.user.role}로 변경되었습니다.`)
        setForm({ email: '', role: 'ADMIN' })
        fetchData() // Refresh data
      } else {
        setError(data.error || '권한 변경에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
      setError('권한 변경 중 오류가 발생했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'text-red-600 bg-red-100'
      case 'CONTRIBUTOR': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return '관리자'
      case 'CONTRIBUTOR': return '기여자'
      default: return '사용자'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="bg-gray-300 rounded-lg h-96"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const isAdmin = currentUser?.role === 'ADMIN'
  const isFirstUser = users.length === 1

  if (!isAdmin && !isFirstUser) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            접근 권한이 없습니다
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            관리자만 사용자 권한을 변경할 수 있습니다.
          </p>
          <a 
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            메인으로 돌아가기
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                사용자 권한 관리
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                사용자의 권한을 변경하고 관리자를 지정하세요
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                현재 권한: <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(currentUser?.role || 'USER')}`}>
                  {getRoleLabel(currentUser?.role || 'USER')}
                </span>
              </span>
              <a
                href="/admin/dashboard"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                대시보드로
              </a>
            </div>
          </div>
        </div>

        {isFirstUser && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  첫 번째 사용자
                </h3>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  당신은 첫 번째 사용자입니다. 자신을 관리자로 설정하거나 다른 사용자에게 권한을 부여할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Role Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              사용자 권한 변경
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                <p className="text-green-700 dark:text-green-300 text-sm">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  사용자 이메일
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  권한을 변경할 사용자의 이메일을 입력하세요
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  권한
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({...form, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="USER">사용자 (USER)</option>
                  <option value="CONTRIBUTOR">기여자 (CONTRIBUTOR)</option>
                  <option value="ADMIN">관리자 (ADMIN)</option>
                </select>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                  <p>• USER: 기본 사용자, 조회만 가능</p>
                  <p>• CONTRIBUTOR: 기여 요청 가능</p>
                  <p>• ADMIN: 모든 권한, 즉시 편집 가능</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? '변경 중...' : '권한 변경'}
              </button>
            </form>
          </div>

          {/* Current Users */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              현재 사용자 목록
            </h2>

            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.name}
                      {user.email === currentUser?.email && (
                        <span className="text-blue-600 text-sm ml-1">(본인)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              ))}

              {users.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  사용자 목록을 불러올 수 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}