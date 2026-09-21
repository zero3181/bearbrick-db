'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import TopMenu from '@/components/TopMenu'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { signOutFromGoogle } from '@/lib/nativeAuth'

export default function AccountPage() {
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'
  const router = useRouter()
  const t = useTranslations('account')
  const tc = useTranslations('common')
  const [nickname, setNickname] = useState('')
  const [showCredit, setShowCredit] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    fetch('/api/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setNickname(data.nickname || '')
        setShowCredit(Boolean(data.showCredit))
      })
      .catch((error) => console.error('Failed to fetch profile:', error))
    return () => {
      cancelled = true
    }
  }, [status])

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

  const handleLogOut = async () => {
    // Drop the device's Google session first; signOut() navigates away and
    // would cut this short if it ran the other way round.
    await signOutFromGoogle()
    // The offline cache holds this account's collection.
    navigator.serviceWorker?.controller?.postMessage('clear-user-data')
    signOut()
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('deleteAccountConfirm'))) return
    setDeletingAccount(true)
    try {
      const res = await fetch('/api/profile', { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed with status ${res.status}`)
      // Same teardown as logging out - the account is already gone server-side.
      await signOutFromGoogle()
      navigator.serviceWorker?.controller?.postMessage('clear-user-data')
      signOut()
    } catch (error) {
      console.error('Failed to delete account:', error)
      window.alert(t('deleteAccountFailed'))
      setDeletingAccount(false)
    }
  }

  if (status !== 'authenticated' || !session) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/" aria-label={tc('back')} className="p-1 -ml-1 text-gray-900 hover:text-gray-500 shrink-0">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900 truncate">{t('pageTitle')}</h1>
          <div className="ml-auto shrink-0">
            <TopMenu />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          {session.user.image && (
            <img src={session.user.image} alt="" className="w-14 h-14 rounded-full shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 truncate">{session.user.name}</p>
            <p className="text-sm text-gray-500 truncate">{session.user.email}</p>
          </div>
        </div>

        <section className="rounded-2xl border border-gray-100 p-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onBlur={() => saveProfile({ nickname, showCredit: nickname ? showCredit : false })}
            placeholder={t('nicknamePlaceholder')}
            maxLength={30}
            disabled={savingProfile}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md mb-2"
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
        </section>

        <section className="rounded-2xl border border-gray-100 overflow-hidden">
          <LanguageSwitcher />
        </section>

        <section className="rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          <button
            onClick={handleLogOut}
            className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {tc('logOut')}
          </button>
          {/* Admins and the owner keep the catalogue running - losing one
              would leave submissions with nobody to approve them - and the
              owner is promoted back by email on the next sign-in anyway, so
              deleting it would not even stick. */}
          {!isAdmin && (
            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {t('deleteAccount')}
            </button>
          )}
        </section>
      </main>
    </div>
  )
}
