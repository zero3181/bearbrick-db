'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SetupAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; user?: any } | null>(null)

  const handleMakeAdmin = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/quick-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        // Refresh the page after 2 seconds to update session
        setTimeout(() => {
          window.location.href = '/admin/dashboard'
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to set admin:', error)
      setResult({
        success: false,
        message: '관리자 설정 중 오류가 발생했습니다.'
      })
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            로그인이 필요합니다
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            관리자 권한을 설정하려면 먼저 로그인해주세요.
          </p>
          <a 
            href="/auth/signin"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            로그인하기
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              관리자 권한 설정
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              베어브릭 데이터베이스의 관리자가 되어보세요
            </p>
          </div>

          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    현재 로그인: <strong>{session.user.name}</strong><br />
                    이메일: <strong>{session.user.email}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {result && (
            <div className={`mb-6 p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <p className={`text-sm ${
                result.success 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {result.message}
              </p>
              {result.success && result.user && (
                <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                  권한: {result.user.role} | 관리자 대시보드로 이동 중...
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleMakeAdmin}
              disabled={loading || (result && result.success)}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  설정 중...
                </div>
              ) : result && result.success ? (
                '관리자 설정 완료!'
              ) : (
                '나를 관리자로 설정하기'
              )}
            </button>

            <div className="text-center">
              <a 
                href="/"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                메인으로 돌아가기
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p><strong>관리자 권한으로 할 수 있는 것:</strong></p>
              <p>• 베어브릭 정보 즉시 수정</p>
              <p>• 이미지 즉시 업로드</p>
              <p>• 다른 사용자 권한 관리</p>
              <p>• 사용자 기여 요청 승인/거절</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}