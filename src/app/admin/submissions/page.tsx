'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline'

interface UserSubmittedImage {
  id: string
  imageUrl: string
  title: string | null
  description: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  submittedBy: {
    name: string | null
    email: string
  }
}

interface Bearbrick {
  id: string
  name: string
  series: { name: string }
}

export default function AdminSubmissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [submissions, setSubmissions] = useState<UserSubmittedImage[]>([])
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [selectedSubmission, setSelectedSubmission] = useState<UserSubmittedImage | null>(null)
  const [selectedBearbrick, setSelectedBearbrick] = useState<string>('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      router.push('/')
      return
    }

    fetchSubmissions()
    fetchBearbricks()
  }, [session, status, router, selectedStatus])

  const fetchSubmissions = async () => {
    try {
      const statusParam = selectedStatus === 'ALL' ? '' : `status=${selectedStatus}`
      const response = await fetch(`/api/images/submit?${statusParam}`)

      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.images || [])
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBearbricks = async () => {
    try {
      const response = await fetch('/api/bearbricks?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setBearbricks(data.bearbricks || [])
      }
    } catch (error) {
      console.error('Failed to fetch bearbricks:', error)
    }
  }

  const handleApprove = async (submissionId: string, bearbrickId?: string) => {
    if (!bearbrickId) {
      alert('베어브릭을 선택해주세요.')
      return
    }

    setProcessing(submissionId)
    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          bearbrickId
        })
      })

      if (response.ok) {
        await fetchSubmissions()
        setSelectedSubmission(null)
        setSelectedBearbrick('')
        alert('이미지가 승인되었습니다!')
      } else {
        const error = await response.json()
        alert(`승인 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Approval failed:', error)
      alert('승인 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (submissionId: string, reason?: string) => {
    setProcessing(submissionId)
    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          reason
        })
      })

      if (response.ok) {
        await fetchSubmissions()
        setSelectedSubmission(null)
        alert('이미지가 거부되었습니다.')
      } else {
        const error = await response.json()
        alert(`거부 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Rejection failed:', error)
      alert('거부 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">이미지 제출 관리</h1>
          <p className="mt-2 text-gray-600">사용자가 제출한 이미지를 검토하고 승인/거부하세요.</p>
        </div>

        {/* 필터 탭 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedStatus === status
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {status === 'ALL' ? '전체' :
                   status === 'PENDING' ? '대기중' :
                   status === 'APPROVED' ? '승인됨' : '거부됨'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 제출 목록 */}
        <div className="bg-white shadow rounded-lg">
          {submissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {selectedStatus === 'PENDING' ? '대기 중인 제출이 없습니다.' : '제출이 없습니다.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {submissions.map((submission) => (
                <div key={submission.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <Image
                        src={submission.imageUrl}
                        alt={submission.title || '제출된 이미지'}
                        width={120}
                        height={120}
                        className="rounded-lg object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {submission.title || '제목 없음'}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            제출자: {submission.submittedBy.name || submission.submittedBy.email}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            제출일: {new Date(submission.createdAt).toLocaleDateString('ko-KR')}
                          </p>
                          {submission.description && (
                            <p className="text-sm text-gray-700 mt-2">{submission.description}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            submission.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : submission.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {submission.status === 'PENDING' ? '대기중' :
                             submission.status === 'APPROVED' ? '승인됨' : '거부됨'}
                          </span>

                          {submission.status === 'PENDING' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedSubmission(submission)}
                                disabled={processing === submission.id}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                              >
                                <EyeIcon className="h-4 w-4 mr-1" />
                                검토
                              </button>
                              <button
                                onClick={() => handleReject(submission.id)}
                                disabled={processing === submission.id}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                              >
                                <XMarkIcon className="h-4 w-4 mr-1" />
                                거부
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 승인 모달 */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">이미지 승인</h3>

                <div className="mb-6">
                  <Image
                    src={selectedSubmission.imageUrl}
                    alt={selectedSubmission.title || '제출된 이미지'}
                    width={400}
                    height={400}
                    className="rounded-lg object-cover mx-auto"
                  />
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900">{selectedSubmission.title || '제목 없음'}</h4>
                  {selectedSubmission.description && (
                    <p className="text-gray-600 mt-1">{selectedSubmission.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    제출자: {selectedSubmission.submittedBy.name || selectedSubmission.submittedBy.email}
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    베어브릭 선택 (필수)
                  </label>
                  <select
                    value={selectedBearbrick}
                    onChange={(e) => setSelectedBearbrick(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">베어브릭을 선택하세요</option>
                    {bearbricks.map((bearbrick) => (
                      <option key={bearbrick.id} value={bearbrick.id}>
                        {bearbrick.series.name} - {bearbrick.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedSubmission(null)
                      setSelectedBearbrick('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleReject(selectedSubmission.id)}
                    disabled={processing === selectedSubmission.id}
                    className="px-4 py-2 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    거부
                  </button>
                  <button
                    onClick={() => handleApprove(selectedSubmission.id, selectedBearbrick)}
                    disabled={!selectedBearbrick || processing === selectedSubmission.id}
                    className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckIcon className="h-4 w-4 inline mr-1" />
                    승인
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}