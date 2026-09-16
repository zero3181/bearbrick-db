'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { capturePhoto, isNative, CameraPermissionDeniedError } from '@/lib/native'

/**
 * Picks a photo to attach. On a phone that means the camera or the photo
 * library through the OS pickers; in a browser it stays an ordinary file
 * input. Which one is decided after mount, because the server has no idea
 * which platform is asking and rendering the wrong one would break hydration.
 */
export default function PhotoInput({
  onSelect,
  label,
  className = '',
}: {
  onSelect: (file: File) => void
  label: string
  className?: string
}) {
  const tc = useTranslations('common')
  const [native, setNative] = useState(false)

  useEffect(() => {
    setNative(isNative())
  }, [])

  if (!native) {
    return (
      <label className={className || 'inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 text-sm font-medium text-gray-700 transition-colors'}>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onSelect(file)
          }}
        />
        {label}
      </label>
    )
  }

  const pick = async (source: 'camera' | 'photos') => {
    try {
      const file = await capturePhoto(source)
      if (file) onSelect(file)
    } catch (error) {
      if (error instanceof CameraPermissionDeniedError) {
        alert(source === 'camera' ? tc('cameraPermissionDenied') : tc('photoLibraryPermissionDenied'))
      }
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => pick('camera')}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700"
      >
        {tc('takePhoto')}
      </button>
      <button
        type="button"
        onClick={() => pick('photos')}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700"
      >
        {tc('chooseFromLibrary')}
      </button>
    </div>
  )
}
