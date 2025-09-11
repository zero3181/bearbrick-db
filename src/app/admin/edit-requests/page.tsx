'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  UserCircleIcon,
  PencilSquareIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface EditRequest {
  id: string
  type: 'INFO_UPDATE' | 'CATEGORY_CHANGE' | 'SERIES_CORRECTION' | 'OTHER'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  description: string | null
  oldData: any
  newData: any
  createdAt: string
  updatedAt: string
  reviewedAt: string | null
  bearbrick: {
    id: string
    name: string
    series: {
      name: string
    }
    category: {
      name: string
    }
  }
  requestedBy: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

const statusLabels = {
  PENDING: '검토 대기',
  APPROVED: '승인됨',
  REJECTED: '거절됨'
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
}

const typeLabels = {
  INFO_UPDATE: '정보 수정',
  CATEGORY_CHANGE: '카테고리 변경',
  SERIES_CORRECTION: '시리즈 수정',
  OTHER: '기타'
}

export default function EditRequestsManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [editRequests, setEditRequests] = useState<EditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      router.push('/')
      return
    }

    fetchEditRequests()
  }, [session, status, router])

  const fetchEditRequests = async () => {
    try {
      const url = statusFilter === 'ALL' ? '/api/edit-requests' : `/api/edit-requests?status=${statusFilter}`
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch edit requests')
      }

      setEditRequests(data.editRequests)
    } catch (error) {
      console.error('Fetch edit requests error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load edit requests')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    if (reviewing) return

    setReviewing(requestId)
    try {
      const response = await fetch(`/api/edit-requests/${requestId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to review edit request')
      }

      // Update local state
      setEditRequests(editRequests.map(req => 
        req.id === requestId 
          ? { ...req, status, reviewedAt: new Date().toISOString() }
          : req
      ))

      setSelectedRequest(null)
    } catch (error) {
      console.error('Review error:', error)
      alert(error instanceof Error ? error.message : 'Failed to review edit request')
    } finally {
      setReviewing(null)
    }
  }

  const renderDataComparison = (oldData: any, newData: any) => {
    const fields = [
      { key: 'name', label: '이름' },
      { key: 'sizePercentage', label: '크기 (%)' },
      { key: 'releaseDate', label: '출시일' },
      { key: 'rarityPercentage', label: '희귀도 (%)' },
      { key: 'estimatedQuantity', label: '예상 수량' },
      { key: 'materialType', label: '소재' },
      { key: 'description', label: '설명' }
    ]

    return (
      <div className="space-y-4">
        {fields.map(({ key, label }) => {
          const oldValue = oldData?.[key]
          const newValue = newData?.[key]
          const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue)

          if (!hasChanged && !newValue) return null

          return (
            <div key={key} className={`p-3 rounded-md ${hasChanged ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
              <h4 className="font-medium text-gray-900 mb-2">{label}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">현재:</span>
                  <p className="mt-1 text-gray-900">{oldValue || '없음'}</p>
                </div>
                <div>
                  <span className="text-gray-500">변경 후:</span>
                  <p className={`mt-1 ${hasChanged ? 'text-blue-600 font-medium' : 'text-gray-900'}`}>
                    {newValue || '없음'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
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
            onClick={fetchEditRequests}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const filteredRequests = statusFilter === 'ALL' 
    ? editRequests 
    : editRequests.filter(req => req.status === statusFilter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">수정 요청 관리</h1>
            <p className="mt-2 text-sm text-gray-600">
              사용자들의 베어브릭 정보 수정 요청을 검토하고 승인/거절할 수 있습니다.
            </p>
          </div>

          <div className="mb-6">
            <div className="flex space-x-1">
              {[
                { value: 'ALL', label: '전체' },
                { value: 'PENDING', label: '검토 대기' },
                { value: 'APPROVED', label: '승인됨' },
                { value: 'REJECTED', label: '거절됨' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    statusFilter === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <PencilSquareIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">수정 요청이 없습니다</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    아직 검토할 수정 요청이 없습니다.
                  </p>
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <div key={request.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {request.requestedBy.image ? (
                            <img 
                              className="h-10 w-10 rounded-full" 
                              src={request.requestedBy.image} 
                              alt="" 
                            />
                          ) : (
                            <UserCircleIcon className="h-10 w-10 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {request.bearbrick.name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                              {statusLabels[request.status]}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {request.requestedBy.name || request.requestedBy.email} • 
                            {typeLabels[request.type]} • 
                            {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                          </p>
                          {request.description && (
                            <p className="mt-2 text-sm text-gray-700">
                              {request.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          상세보기
                        </button>
                        {request.status === 'PENDING' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleReview(request.id, 'APPROVED')}
                              disabled={reviewing === request.id}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              승인
                            </button>
                            <button
                              onClick={() => handleReview(request.id, 'REJECTED')}
                              disabled={reviewing === request.id}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                            >
                              <XCircleIcon className="h-4 w-4 mr-1" />
                              거절
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for detailed view */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setSelectedRequest(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  수정 요청 상세 정보
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {selectedRequest.requestedBy.name || selectedRequest.requestedBy.email}님의 
                  "{selectedRequest.bearbrick.name}" 수정 요청
                </p>
              </div>

              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">변경 내용</h4>
                {renderDataComparison(selectedRequest.oldData, selectedRequest.newData)}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  닫기
                </button>
                {selectedRequest.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleReview(selectedRequest.id, 'REJECTED')}
                      disabled={reviewing === selectedRequest.id}
                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      거절
                    </button>
                    <button
                      onClick={() => handleReview(selectedRequest.id, 'APPROVED')}
                      disabled={reviewing === selectedRequest.id}
                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      승인
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}