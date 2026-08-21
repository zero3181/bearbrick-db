'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
      {children}
    </Link>
  )
}

export default function TopMenu() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
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

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/bearbricks/export')
      if (!res.ok) {
        alert('Export failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bearbricks-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export:', error)
      alert('Export failed')
    } finally {
      setExporting(false)
      setOpen(false)
    }
  }

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
        aria-label="Menu"
        className="relative p-2.5 rounded-full hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700 transition-colors"
      >
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
          <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {isAdmin && pendingCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 dark:bg-gray-900 dark:border-gray-800">
          {session && (
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 dark:border-gray-800">
              {session.user.image && (
                <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate dark:text-gray-100">{session.user.name}</p>
                <p className="text-xs text-gray-500 truncate dark:text-gray-400">{session.user.email}</p>
              </div>
            </div>
          )}

          {isAdmin && (
            <>
              <MenuLink href="/admin/manage" onClick={() => setOpen(false)}>Admin Home</MenuLink>
              <MenuLink href="/admin/requests" onClick={() => setOpen(false)}>Approve Edit Requests</MenuLink>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full text-left px-4 py-2 text-base text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {exporting ? 'Exporting...' : 'Export to Excel'}
              </button>
              <MenuLink href="/admin/manage?action=import" onClick={() => setOpen(false)}>Import from Excel</MenuLink>
              <MenuLink href="/admin/manage?action=add" onClick={() => setOpen(false)}>Add Bearbrick</MenuLink>
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            </>
          )}

          <MenuLink href="/about" onClick={() => setOpen(false)}>About</MenuLink>

          {session ? (
            <button
              onClick={() => {
                signOut()
                setOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-base text-red-600 hover:bg-gray-50 dark:text-red-400 dark:hover:bg-gray-800"
            >
              Log out
            </button>
          ) : (
            <button
              onClick={() => {
                signIn('google')
                setOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-base text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Log in
            </button>
          )}
        </div>
      )}
    </div>
  )
}
