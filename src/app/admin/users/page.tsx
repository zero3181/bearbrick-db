'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import TopMenu from '@/components/TopMenu'
import LoadingSpinner from '@/components/LoadingSpinner'

interface UserRow {
  id: string
  name: string | null
  email: string
  image: string | null
  role: 'USER' | 'ADMIN' | 'OWNER'
  createdAt: string
  collectionCount: number
  suggestionCount: number
  correctionCount: number
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (session?.user?.role !== 'OWNER') {
      router.push('/')
      return
    }
    fetchUsers()
  }, [status, session])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (user: UserRow, role: string) => {
    if (!confirm(`Change ${user.name || user.email}'s role to ${role}?`)) return

    setSavingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: role as UserRow['role'] } : u)))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Failed to update role:', error)
      alert('Failed to update role')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin/manage" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to admin
          </Link>
          <TopMenu />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-baseline gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <span className="text-sm text-gray-500">{users.length} total</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggestions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Corrections</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const isSelf = user.id === session?.user?.id
                const isOwner = user.role === 'OWNER'
                return (
                  <tr key={user.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.image && (
                          <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{user.name || '(no name)'}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isOwner ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-50 text-yellow-700">
                          OWNER
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          disabled={isSelf || savingId === user.id}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className="px-2 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )}
                      {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{user.collectionCount}</td>
                    <td className="px-6 py-4 text-gray-700">{user.suggestionCount}</td>
                    <td className="px-6 py-4 text-gray-700">{user.correctionCount}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(user.createdAt).toLocaleDateString('en-US')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
