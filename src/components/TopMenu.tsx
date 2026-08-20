'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
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
        alert('내보내기 실패')
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
      alert('내보내기 실패')
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
        aria-label="메뉴"
        className="relative p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {isAdmin && pendingCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {session && (
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              {session.user.image && (
                <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{session.user.name}</p>
                <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
              </div>
            </div>
          )}

          {isAdmin && (
            <>
              <MenuLink href="/admin/manage" onClick={() => setOpen(false)}>관리자 홈</MenuLink>
              <MenuLink href="/admin/requests" onClick={() => setOpen(false)}>수정 요청 승인</MenuLink>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {exporting ? '내보내는 중...' : '엑셀 내보내기'}
              </button>
              <MenuLink href="/admin/manage?action=import" onClick={() => setOpen(false)}>엑셀 가져오기</MenuLink>
              <MenuLink href="/admin/manage?action=add" onClick={() => setOpen(false)}>베어브릭 추가</MenuLink>
              <div className="my-1 border-t border-gray-100" />
            </>
          )}

          <MenuLink href="/about" onClick={() => setOpen(false)}>About</MenuLink>

          {session ? (
            <button
              onClick={() => {
                signOut()
                setOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
            >
              로그아웃
            </button>
          ) : (
            <button
              onClick={() => {
                signIn('google')
                setOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              로그인
            </button>
          )}
        </div>
      )}
    </div>
  )
}
