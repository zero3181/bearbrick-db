'use client'

import { useState, useRef } from 'react'
import { CameraIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
import { upload } from '@vercel/blob/client'

interface ImageUploadProps {
  bearbrickId: string
  onUploadSuccess?: (imageUrl: string) => void
  className?: string
}

export default function ImageUpload({ bearbrickId, onUploadSuccess, className = '' }: ImageUploadProps) {
  const { data: session } = useSession()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  if (!isAdmin) {
    return null
  }

  const handleFileSelect = (file: File) => {
    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    uploadImage(file)
  }

  const uploadImage = async (file: File) => {
    setIsUploading(true)
    setUploadError('')
    setUploadProgress(0)

    try {
      // Generate unique filename
      const timestamp = Date.now()
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `bearbrick-${bearbrickId}-${timestamp}.${ext}`

      // Upload directly to Vercel Blob
      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: '/api/upload/presigned',
        onUploadProgress: (progress) => {
          setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
        },
      })

      // Save metadata to database
      const response = await fetch(`/api/admin/bearbricks/${bearbrickId}/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: blob.url,
          altText: file.name,
          isPrimary: false,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save image metadata')
      }

      onUploadSuccess?.(blob.url)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleGalleryClick = () => {
    fileInputRef.current?.click()
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const clearPreview = () => {
    setPreview(null)
    setUploadError('')
    setUploadProgress(0)
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">이미지 업로드</h3>
      
      {preview && (
        <div className="mb-4 relative">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full max-w-xs h-48 object-cover rounded-lg mx-auto"
          />
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-50"
          >
            <XMarkIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      )}

      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Gallery Upload */}
        <button
          onClick={handleGalleryClick}
          disabled={isUploading}
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PhotoIcon className="h-8 w-8 text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-700">갤러리</span>
          <span className="text-xs text-gray-500">파일 선택</span>
        </button>

        {/* Camera Upload (mobile) */}
        <button
          onClick={handleCameraClick}
          disabled={isUploading}
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CameraIcon className="h-8 w-8 text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-700">카메라</span>
          <span className="text-xs text-gray-500">사진 촬영</span>
        </button>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">업로드 중...</span>
            <span className="text-sm font-medium text-gray-900">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="mt-4 text-xs text-gray-500">
        <p>• 최대 5MB까지 업로드 가능</p>
        <p>• JPG, PNG, GIF 형식 지원</p>
        <p>• 모바일에서는 카메라로 직접 촬영 가능</p>
      </div>
    </div>
  )
}