'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { PencilIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Bearbrick {
  id: string
  name: string
  sizePercentage: number
  releaseDate: string | null
  rarityPercentage: number | null
  estimatedQuantity: number | null
  materialType: string | null
  description: string | null
  seriesId: string
  categoryId: string
  collaborationId: string | null
  series: {
    id: string
    name: string
  }
  category: {
    id: string
    name: string
  }
  collaboration?: {
    id: string
    brandName: string
    artistName: string | null
  } | null
}

interface EditRequestFormProps {
  bearbrick: Bearbrick
  onSuccess?: () => void
  onCancel?: () => void
}

const editRequestTypes = {
  INFO_UPDATE: '정보 수정',
  CATEGORY_CHANGE: '카테고리 변경',
  SERIES_CORRECTION: '시리즈 수정',
  OTHER: '기타'
}

export default function EditRequestForm({ bearbrick, onSuccess, onCancel }: EditRequestFormProps) {
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    type: 'INFO_UPDATE',
    description: '',
    newData: {
      name: bearbrick.name,
      sizePercentage: bearbrick.sizePercentage,
      releaseDate: bearbrick.releaseDate ? bearbrick.releaseDate.split('T')[0] : '',
      rarityPercentage: bearbrick.rarityPercentage || '',
      estimatedQuantity: bearbrick.estimatedQuantity || '',
      materialType: bearbrick.materialType || 'ABS Plastic',
      description: bearbrick.description || '',
    }
  })

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  // If user is admin, they can edit directly (this form should not be shown)
  if (isAdmin) {
    return null
  }

  if (!session) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              수정을 요청하려면 로그인이 필요합니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/edit-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bearbrickId: bearbrick.id,
          type: formData.type,
          description: formData.description,
          newData: {
            ...formData.newData,
            rarityPercentage: formData.newData.rarityPercentage ? parseFloat(formData.newData.rarityPercentage.toString()) : null,
            estimatedQuantity: formData.newData.estimatedQuantity ? parseInt(formData.newData.estimatedQuantity.toString()) : null,
            releaseDate: formData.newData.releaseDate || null,
          }
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit edit request')
      }

      onSuccess?.()
    } catch (error) {
      console.error('Submit edit request error:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit edit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      newData: {
        ...prev.newData,
        [field]: value
      }
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <PencilIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">수정 요청</h3>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          베어브릭 정보 수정을 요청하세요. 관리자가 검토 후 반영합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            수정 유형
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(editRequestTypes).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            수정 사유 및 설명
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="수정이 필요한 이유나 추가 설명을 입력하세요..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              베어브릭 이름
            </label>
            <input
              type="text"
              value={formData.newData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              크기 (%)
            </label>
            <select
              value={formData.newData.sizePercentage}
              onChange={(e) => handleInputChange('sizePercentage', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={50}>50%</option>
              <option value={70}>70%</option>
              <option value={100}>100%</option>
              <option value={200}>200%</option>
              <option value={400}>400%</option>
              <option value={1000}>1000%</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              출시일
            </label>
            <input
              type="date"
              value={formData.newData.releaseDate}
              onChange={(e) => handleInputChange('releaseDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              희귀도 (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.newData.rarityPercentage}
              onChange={(e) => handleInputChange('rarityPercentage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 16.67"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              예상 수량
            </label>
            <input
              type="number"
              value={formData.newData.estimatedQuantity}
              onChange={(e) => handleInputChange('estimatedQuantity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              소재
            </label>
            <input
              type="text"
              value={formData.newData.materialType}
              onChange={(e) => handleInputChange('materialType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            설명
          </label>
          <textarea
            value={formData.newData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="베어브릭에 대한 자세한 설명..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !formData.description.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '제출 중...' : '수정 요청'}
          </button>
        </div>
      </form>
    </div>
  )
}