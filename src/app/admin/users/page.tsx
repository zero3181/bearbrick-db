'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserCircleIcon, ShieldCheckIcon, UserIcon, StarIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role: 'USER' | 'CONTRIBUTOR' | 'ADMIN' | 'OWNER'
  createdAt: string
  updatedAt: string
  _count: {
    createdBearbricks: number
    uploadedImages: number
    editRequests: number
    recommendations: number
  }
}

const roleLabels = {
  USER: '사용자',
  CONTRIBUTOR: '기여자',
  ADMIN: '관리자',
  OWNER: '오너'
}

const roleColors = {
  USER: 'bg-gray-100 text-gray-800',
  CONTRIBUTOR: 'bg-blue-100 text-blue-800',
  ADMIN: 'bg-orange-100 text-orange-800',
  OWNER: 'bg-purple-100 text-purple-800'
}

const roleIcons = {
  USER: UserIcon,
  CONTRIBUTOR: UserCircleIcon,
  ADMIN: ShieldCheckIcon,
  OWNER: StarIcon
}

export default function UsersManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'OWNER') {
      router.push('/')
      return
    }

    fetchUsers()
  }, [session, status, router])

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

  const updateUserRole = async (userId: string, newRole: string) => {
    if (updating) return

    setUpdating(userId)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user role')
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, role: newRole as User['role'], updatedAt: new Date().toISOString() }
          : user
      ))
    } catch (error) {
      console.error('Update role error:', error)
      alert(error instanceof Error ? error.message : 'Failed to update user role')
    } finally {
      setUpdating(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="sm:flex sm:items-center">
                  <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">회원 관리</h1>
                    <p className="mt-2 text-sm text-gray-700">
                      시스템의 모든 사용자를 관리하고 역할을 변경할 수 있습니다.
                    </p>
                  </div>
                </div>

                <div className="mt-8 flow-root">
                  <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              사용자
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              역할
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              활동
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              가입일
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              관리
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((user) => {
                            const IconComponent = roleIcons[user.role]
                            return (
                              <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      {user.image ? (
                                        <img 
                                          className="h-10 w-10 rounded-full" 
                                          src={user.image} 
                                          alt="" 
                                        />
                                      ) : (
                                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                          <UserCircleIcon className="h-6 w-6 text-gray-600" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">
                                        {user.name || 'Unknown'}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {user.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                                    <IconComponent className="h-3 w-3 mr-1" />
                                    {roleLabels[user.role]}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="space-y-1">
                                    <div>베어브릭: {user._count.createdBearbricks}개</div>
                                    <div>이미지: {user._count.uploadedImages}개</div>
                                    <div>수정요청: {user._count.editRequests}개</div>
                                    <div>추천: {user._count.recommendations}개</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {user.role !== 'OWNER' && (
                                    <select
                                      value={user.role}
                                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                                      disabled={updating === user.id}
                                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    >
                                      <option value="USER">사용자</option>
                                      <option value="CONTRIBUTOR">기여자</option>
                                      <option value="ADMIN">관리자</option>
                                    </select>
                                  )}
                                  {user.role === 'OWNER' && (
                                    <span className="text-gray-500">변경 불가</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

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
                          <li><strong>사용자:</strong> 베어브릭 정보 조회, 수정 요청</li>
                          <li><strong>기여자:</strong> 사용자 권한 + 베어브릭 정보 기여</li>
                          <li><strong>관리자:</strong> 기여자 권한 + 직접 편집, 이미지 업로드, 수정 요청 승인</li>
                          <li><strong>오너:</strong> 관리자 권한 + 사용자 역할 관리</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}