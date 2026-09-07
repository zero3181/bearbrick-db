'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import LanguageSwitcher from './LanguageSwitcher'

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
  const [nickname, setNickname] = useState('')
  const [showCredit, setShowCredit] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
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

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setNickname(data.nickname || '')
        setShowCredit(Boolean(data.showCredit))
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  const saveProfile = async (next: { nickname: string; showCredit: boolean }) => {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (res.ok) {
        const data = await res.json()
        setNickname(data.nickname || '')
        setShowCredit(Boolean(data.showCredit))
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setSavingProfile(false)
    }
  }

  useEffect(() => {
    if (isAdmin) fetchPendingCount()
  }, [isAdmin])

  useEffect(() => {
    if (session) fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

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
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                {session.user.image && (
                  <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{session.user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                </div>
              </div>

              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onBlur={() => saveProfile({ nickname, showCredit: nickname ? showCredit : false })}
                placeholder={t('nicknamePlaceholder')}
                maxLength={30}
                disabled={savingProfile}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md mb-1.5"
              />
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={showCredit}
                  disabled={!nickname || savingProfile}
                  onChange={(e) => saveProfile({ nickname, showCredit: e.target.checked })}
                />
                {t('showCreditOnSubmissions')}
              </label>
            </div>
          )}

          <LanguageSwitcher />

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

          {session ? (
            <button
              onClick={() => {
                signOut()
                setOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-base text-red-600 hover:bg-gray-50"
            >
              {tc('logOut')}
            </button>
          ) : (
            <button
              onClick={() => {
                signIn('google')
                setOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-base text-gray-700 hover:bg-gray-50"
            >
              {tc('logIn')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
