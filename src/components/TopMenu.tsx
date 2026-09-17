'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { signInWithGoogle } from '@/lib/nativeAuth'

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50">
      {children}
    </Link>
  )
}

export default function TopMenu() {
  const { data: session } = useSession()
  const t = useTranslations('topMenu')
  const tc = useTranslations('common')
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'
  const [open, setOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/admin/edit-requests')
      if (res.ok) {
        const data = await res.json()
        setPendingCount(Array.isArray(data) ? data.length : 0)
      }
    } catch (error) {
      console.error('Failed to fetch pending edit requests:', error)
    }
  }

  useEffect(() => {
    if (isAdmin) fetchPendingCount()
  }, [isAdmin])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setOpen((v) => {
            const next = !v
            if (next && isAdmin) fetchPendingCount()
            return next
          })
        }}
        aria-label={t('menu')}
        className="relative p-2.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
          <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {isAdmin && pendingCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {session && (
            // Nickname, language, account deletion, and logout all live one
            // level down on /account - this row is the only entry point, so
            // it needs to look and act like a real button, not decoration.
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              {session.user.image && (
                <img src={session.user.image} alt="" className="w-8 h-8 rounded-full shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{session.user.name}</p>
                <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="shrink-0 text-gray-300">
                <path d="M7.5 4.5L13 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}

          {session && (
            <MenuLink href="/my-collection" onClick={() => setOpen(false)}>
              {t('myCollectionStats')}
            </MenuLink>
          )}

          {isAdmin && (
            <>
              <MenuLink href="/admin/manage" onClick={() => setOpen(false)}>{t('adminHome')}</MenuLink>
              <div className="my-1 border-t border-gray-100" />
            </>
          )}

          {!isAdmin && (
            <MenuLink href="/suggest" onClick={() => setOpen(false)}>{t('suggestABearbrick')}</MenuLink>
          )}
          <MenuLink href="/about" onClick={() => setOpen(false)}>{t('about')}</MenuLink>

          {!session && (
            <>
              <button
                onClick={() => {
                  signInWithGoogle()
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-base text-gray-700 hover:bg-gray-50"
              >
                {tc('logIn')}
              </button>
              {/* Only while an app store is reviewing the build: their testers
                  cannot complete Google's OAuth from a review device, and the
                  WebView gives them no address bar to reach this page with.
                  Unset NEXT_PUBLIC_REVIEW_LOGIN once the build is approved. */}
              {process.env.NEXT_PUBLIC_REVIEW_LOGIN === '1' && (
                <MenuLink href="/review-signin" onClick={() => setOpen(false)}>
                  App Review sign-in
                </MenuLink>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
