'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface PendingRequest {
  id: string
  type: string
  status: string
  createdAt: string
  bearbrick: {
    id: string
    name: string
  }
  requestedBy: {
    id: string
    name: string
  }
  description?: string
  reason?: string
  newImageUrl?: string
  newData?: any
  oldData?: any
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [editRequests, setEditRequests] = useState<PendingRequest[]>([])
  const [imageRequests, setImageRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    // Check if user is admin (you might want to add role check here)
    const fetchPendingRequests = async () => {
      try {
        const [editRes, imageRes] = await Promise.all([
          fetch('/api/admin/edit-requests?status=PENDING'),
          fetch('/api/admin/image-requests?status=PENDING')
        ])

        if (editRes.ok) {
          const editData = await editRes.json()
          setEditRequests(editData)
        }

        if (imageRes.ok) {
          const imageData = await imageRes.json()
          setImageRequests(imageData)
        }
      } catch (error) {
        console.error('Failed to fetch pending requests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPendingRequests()
  }, [session, status, router])

  const handleApprove = async (type: 'edit' | 'image', requestId: string) => {
    try {
      const endpoint = type === 'edit' ? 'edit-requests' : 'image-requests'
      const response = await fetch(`/api/admin/${endpoint}/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'approve' })
      })

      if (response.ok) {
        // Remove from list
        if (type === 'edit') {
          setEditRequests(prev => prev.filter(r => r.id !== requestId))
        } else {
          setImageRequests(prev => prev.filter(r => r.id !== requestId))
        }
      }
    } catch (error) {
      console.error('Failed to approve request:', error)
    }
  }

  const handleReject = async (type: 'edit' | 'image', requestId: string) => {
    try {
      const endpoint = type === 'edit' ? 'edit-requests' : 'image-requests'
      const response = await fetch(`/api/admin/${endpoint}/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reject' })
      })

      if (response.ok) {
        // Remove from list
        if (type === 'edit') {
          setEditRequests(prev => prev.filter(r => r.id !== requestId))
        } else {
          setImageRequests(prev => prev.filter(r => r.id !== requestId))
        }
      }
    } catch (error) {
      console.error('Failed to reject request:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-300 rounded-lg h-96"></div>
              <div className="bg-gray-300 rounded-lg h-96"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                관리자 대시보드
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                사용자 기여 요청을 검토하고 승인하세요
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {session.user.name} (관리자)
              </span>
              <a
                href="/"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                메인으로
              </a>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              정보 수정 요청
            </h3>
            <p className="text-3xl font-bold text-blue-600">
              {editRequests.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              이미지 교체 요청
            </h3>
            <p className="text-3xl font-bold text-green-600">
              {imageRequests.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              총 대기 요청
            </h3>
            <p className="text-3xl font-bold text-orange-600">
              {editRequests.length + imageRequests.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              활성 사용자
            </h3>
            <p className="text-3xl font-bold text-purple-600">
              {new Set([...editRequests.map(r => r.requestedBy.id), ...imageRequests.map(r => r.requestedBy.id)]).size}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Edit Requests */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                📝 정보 수정 요청 ({editRequests.length})
              </h2>
            </div>
            <div className="p-6">
              {editRequests.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  대기 중인 정보 수정 요청이 없습니다.
                </p>
              ) : (
                <div className="space-y-4">
                  {editRequests.map((request) => (
                    <div key={request.id} className="border dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {request.bearbrick.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            요청자: {request.requestedBy.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          {request.type}
                        </span>
                      </div>
                      
                      {request.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          {request.description}
                        </p>
                      )}
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove('edit', request.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleReject('edit', request.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          거절
                        </button>
                        <a
                          href={`/bearbricks/${request.bearbrick.id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          상세보기
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Image Requests */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                🖼️ 이미지 교체 요청 ({imageRequests.length})
              </h2>
            </div>
            <div className="p-6">
              {imageRequests.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  대기 중인 이미지 교체 요청이 없습니다.
                </p>
              ) : (
                <div className="space-y-4">
                  {imageRequests.map((request) => (
                    <div key={request.id} className="border dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {request.bearbrick.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            요청자: {request.requestedBy.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      
                      {request.reason && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          사유: {request.reason}
                        </p>
                      )}
                      
                      {request.newImageUrl && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">새로운 이미지:</p>
                          <img 
                            src={request.newImageUrl} 
                            alt="New image"
                            className="w-32 h-32 object-cover rounded border"
                          />
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove('image', request.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleReject('image', request.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          거절
                        </button>
                        <a
                          href={`/bearbricks/${request.bearbrick.id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          상세보기
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}