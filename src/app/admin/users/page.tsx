'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  UserIcon,
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role: 'USER' | 'ADMIN' | 'OWNER'
  active: boolean
  createdAt: string
  updatedAt: string
  _count: {
    createdBearbricks: number
    uploadedImages: number
    editRequests: number
    recommendations: number
    submittedImages: number
  }
}

const roleNames = {
  USER: '사용자',
  ADMIN: '관리자',
  OWNER: '오너'
}

const roleColors = {
  USER: 'bg-gray-100 text-gray-800',
  ADMIN: 'bg-purple-100 text-purple-800',
  OWNER: 'bg-yellow-100 text-yellow-800'
}

const roleEmojis = {
  USER: '👤',
  ADMIN: '👑',
  OWNER: '🏆'
}

const roleIcons = {
  USER: UserIcon,
  ADMIN: ShieldCheckIcon,
  OWNER: StarIcon
}

export default function UsersManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN' | 'OWNER'>('ALL')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<'USER' | 'ADMIN' | 'OWNER'>('USER')
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'createdAt'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [confirmDeactivation, setConfirmDeactivation] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'OWNER') {
      setError('OWNER 권한이 필요합니다.')
      setTimeout(() => {
        router.push('/')
      }, 3000)
      return
    }

    fetchUsers()
  }, [session, status, router])

  useEffect(() => {
    filterAndSortUsers()
  }, [users, searchTerm, roleFilter, sortBy, sortOrder])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users)
    } catch (error) {
      console.error('Fetch users error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => {
      const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
      return matchesSearch && matchesRole
    })

    filtered = filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'email':
          comparison = a.email.localeCompare(b.email)
          break
        case 'role':
          comparison = a.role.localeCompare(b.role)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredUsers(filtered)
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        await fetchUsers()
        setEditingUser(null)
        alert('사용자 역할이 성공적으로 변경되었습니다.')
      } else {
        const error = await response.json()
        alert(`역할 변경 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Role change failed:', error)
      alert('역할 변경 중 오류가 발생했습니다.')
    } finally {
      setUpdating(null)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setUpdating(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive })
      })

      if (response.ok) {
        await fetchUsers()
        alert(`사용자가 ${!currentActive ? '활성화' : '비활성화'}되었습니다.`)
      } else {
        const error = await response.json()
        alert(`상태 변경 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Status change failed:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    } finally {
      setUpdating(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const totalUsers = users.length
  const adminCount = users.filter(u => u.role === 'ADMIN').length
  const ownerCount = users.filter(u => u.role === 'OWNER').length
  const userCount = users.filter(u => u.role === 'USER').length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
          <p className="mt-2 text-gray-600">사용자들의 정보와 권한을 관리하세요.</p>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">{totalUsers}</h3>
                <p className="text-gray-600">총 사용자</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <span className="text-2xl">👑</span>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">{adminCount}</h3>
                <p className="text-gray-600">관리자</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <span className="text-2xl">🏆</span>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">{ownerCount}</h3>
                <p className="text-gray-600">오너</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <span className="text-2xl">👤</span>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">{userCount}</h3>
                <p className="text-gray-600">일반 사용자</p>
              </div>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="이름 또는 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">모든 역할</option>
                <option value="USER">사용자</option>
                <option value="ADMIN">관리자</option>
                <option value="OWNER">오너</option>
              </select>
            </div>
          </div>
        </div>

        {/* 사용자 테이블 */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center">
                      이메일
                      <ChevronUpDownIcon className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center">
                      역할
                      <ChevronUpDownIcon className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    활동 통계
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      가입일
                      <ChevronUpDownIcon className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt={user.name || user.email}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-gray-600" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || '이름 없음'}
                          </div>
                          <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as any)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                            disabled={user.role === 'OWNER'}
                          >
                            <option value="USER">사용자</option>
                            {session?.user?.role === 'OWNER' && (
                              <option value="ADMIN">관리자</option>
                            )}
                          </select>
                          <button
                            onClick={() => handleRoleChange(user.id, newRole)}
                            disabled={updating === user.id}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            disabled={updating === user.id}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                          <span className="mr-1">{roleEmojis[user.role]}</span>
                          {roleNames[user.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>베어브릭: {user._count.createdBearbricks}</div>
                        <div>이미지: {user._count.uploadedImages}</div>
                        <div>제출이미지: {user._count.submittedImages}</div>
                        <div>수정요청: {user._count.editRequests}</div>
                        <div>추천: {user._count.recommendations}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {user.role !== 'OWNER' && editingUser !== user.id && (
                          <>
                            <button
                              onClick={() => {
                                setEditingUser(user.id)
                                setNewRole(user.role)
                              }}
                              className="text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <PencilIcon className="h-4 w-4 mr-1" />
                              편집
                            </button>
                            <button
                              onClick={() => handleToggleActive(user.id, user.active)}
                              disabled={updating === user.id}
                              className={`${
                                user.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                              } disabled:opacity-50 text-sm`}
                            >
                              {user.active ? '비활성화' : '활성화'}
                            </button>
                          </>
                        )}
                        {user.role === 'OWNER' && (
                          <span className="text-gray-400">편집 불가</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              검색 조건에 맞는 사용자가 없습니다.
            </div>
          )}
        </div>

        {/* 결과 카운트 */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          총 {totalUsers}명 중 {filteredUsers.length}명 표시
        </div>

        {/* 권한 안내 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                역할 권한 안내
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>사용자:</strong> 베어브릭 정보 조회, 이미지 제출</li>
                  <li><strong>기여자:</strong> 사용자 권한 + 베어브릭 정보 기여</li>
                  <li><strong>관리자:</strong> 기여자 권한 + 직접 편집, 이미지 승인, 수정 요청 승인</li>
                  <li><strong>오너:</strong> 관리자 권한 + 사용자 역할 관리</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}