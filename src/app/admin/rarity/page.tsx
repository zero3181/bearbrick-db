'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import TopMenu from '@/components/TopMenu'
import LoadingSpinner from '@/components/LoadingSpinner'
import { sortBearbricks } from '@/lib/sortBearbricks'
import { isSuperSecretRarity } from '@/lib/rarity'

interface Bearbrick {
  id: string
  name: string
  isSecret: boolean
  rarityPercentage: number | null
  category: { id: string; name: string } | null
}

interface Series {
  id: string
  name: string
  number: number
}

export default function AdminRarityPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('')
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    const role = session?.user?.role
    if (role !== 'ADMIN' && role !== 'OWNER') {
      router.push('/')
      return
    }
    fetch('/api/series')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Series[]) => {
        setSeriesList(data)
        if (data.length > 0) setSelectedSeries(data[0].name)
      })
      .catch(() => setSeriesList([]))
  }, [status, session])

  useEffect(() => {
    if (!selectedSeries) return
    setLoading(true)
    fetch(`/api/bearbricks?series=${encodeURIComponent(selectedSeries)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Bearbrick[]) => {
        setBearbricks(Array.isArray(data) ? data : [])
        const initialEdits: Record<string, string> = {}
        for (const b of data) {
          initialEdits[b.id] = b.rarityPercentage != null ? String(b.rarityPercentage) : ''
        }
        setEdits(initialEdits)
      })
      .finally(() => setLoading(false))
  }, [selectedSeries])

  const grouped = useMemo(() => {
    const sorted = sortBearbricks(bearbricks)
    const groups: { category: string; items: Bearbrick[] }[] = []
    for (const item of sorted) {
      const categoryName = item.category?.name ?? 'Uncategorized'
      const last = groups[groups.length - 1]
      if (last && last.category === categoryName) {
        last.items.push(item)
      } else {
        groups.push({ category: categoryName, items: [item] })
      }
    }
    return groups
  }, [bearbricks])

  const dirty = bearbricks.some((b) => {
    const original = b.rarityPercentage != null ? String(b.rarityPercentage) : ''
    return (edits[b.id] ?? '') !== original
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = bearbricks
        .filter((b) => {
          const original = b.rarityPercentage != null ? String(b.rarityPercentage) : ''
          return (edits[b.id] ?? '') !== original
        })
        .map((b) => ({
          id: b.id,
          rarityPercentage: edits[b.id] === '' || edits[b.id] === undefined ? null : parseFloat(edits[b.id]),
        }))

      const res = await fetch('/api/admin/bearbricks/update-rarity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) throw new Error('Save failed')

      setBearbricks((prev) =>
        prev.map((b) => {
          const update = updates.find((u) => u.id === b.id)
          return update ? { ...b, rarityPercentage: update.rarityPercentage } : b
        })
      )
    } catch (error) {
      console.error('Failed to save rarity changes:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <img src="/logo-gombrick.png" alt="GomBrick" className="h-9 md:h-[42px] w-auto" />
          </Link>
          <TopMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <Link href="/admin/manage" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to admin
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6 mt-2">
          <h1 className="text-2xl font-bold text-gray-900">Manage Rarity</h1>
          <div className="flex items-center gap-3">
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              {seriesList.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Each row is the sourced pull-rate percentage for that specific figure (e.g. a 24-piece
          case has ~4.16% per figure). Leave blank when no sourced number exists for it — don&apos;t
          guess. The Secret badge turns yellow only at the community&apos;s &quot;Super Secret&quot;
          tier (1/192 ≈ 0.52%); anything else stays blue.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.category}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {group.category}
                </h2>
                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {group.items.map((item) => {
                    const value = edits[item.id] ?? ''
                    const parsed = value === '' ? null : parseFloat(value)
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.isSecret && (
                            <span
                              className={`shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full ${
                                isSuperSecretRarity(parsed) ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              Secret
                            </span>
                          )}
                          <span className="truncate text-sm text-gray-900">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={value}
                            onChange={(e) => setEdits({ ...edits, [item.id]: e.target.value })}
                            placeholder="—"
                            className="w-20 px-2 py-1 border border-gray-200 rounded text-sm text-right"
                          />
                          <span className="text-sm text-gray-400">%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
