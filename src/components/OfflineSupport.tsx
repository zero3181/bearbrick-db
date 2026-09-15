'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Registers the service worker and shows a line across the top while the
 * device has no connection. Without the worker the app - a WebView pointed at
 * this site - cannot start at all when offline.
 */
export default function OfflineSupport() {
  const tc = useTranslations('common')
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error)
      })
    }

    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="sticky top-0 z-50 bg-gray-900 px-4 py-1.5 text-center text-xs text-white">
      {tc('offlineNotice')}
    </div>
  )
}
