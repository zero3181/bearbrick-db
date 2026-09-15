'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </Link>
  )
}

export default function AdminTabs() {
  const t = useTranslations('topMenu')
  const pathname = usePathname()
  const { data: session } = useSession()
  const isOwner = session?.user?.role === 'OWNER'

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6">
      <Tab href="/admin/manage" active={pathname === '/admin/manage'}>
        {t('adminHome')}
      </Tab>
      <Tab href="/admin/rarity" active={pathname === '/admin/rarity'}>
        {t('manageSeries')}
      </Tab>
      <Tab href="/admin/requests" active={pathname === '/admin/requests'}>
        {t('approveEditRequests')}
      </Tab>
      {isOwner && (
        <Tab href="/admin/users" active={pathname === '/admin/users'}>
          {t('manageUsers')}
        </Tab>
      )}
    </div>
  )
}
