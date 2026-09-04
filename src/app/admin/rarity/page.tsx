'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import TopMenu from '@/components/TopMenu'
import LoadingSpinner from '@/components/LoadingSpinner'
import { sortBearbricks, sortCategoriesOfficial, SECRET_BASIC_REPRESENTATIVE_NAMES } from '@/lib/sortBearbricks'
import { toFraction } from '@/lib/rarity'

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
  season: string
  releaseYear: number
  _count?: { bearbricks: number }
}

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter']
const SEASON_LABELS_KO: Record<string, string> = { Spring: '봄', Summer: '여름', Fall: '가을', Winter: '겨울' }

function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'Spring'
  if (month >= 6 && month <= 8) return 'Summer'
  if (month >= 9 && month <= 11) return 'Fall'
  return 'Winter'
}

export default function AdminRarityPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('')
  const [bearbricks, setBearbricks] = useState<Bearbrick[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({})
  const [secretEdits, setSecretEdits] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creatingSeries, setCreatingSeries] = useState(false)
  const [deletingSeries, setDeletingSeries] = useState(false)
  const [seasonEdit, setSeasonEdit] = useState('')
  const [yearEdit, setYearEdit] = useState('')

  const fetchSeriesList = async () => {
    const res = await fetch('/api/series')
    const data = res.ok ? await res.json() : []
    setSeriesList(Array.isArray(data) ? data : [])
    return Array.isArray(data) ? data : []
  }

  useEffect(() => {
    if (status === 'loading') return
    const role = session?.user?.role
    if (role !== 'ADMIN' && role !== 'OWNER') {
      router.push('/')
      return
    }
    fetchSeriesList().then((data) => {
      if (data.length > 0) setSelectedSeries(data[0].name)
    })
  }, [status, session])

  useEffect(() => {
    if (!selectedSeries) return
    setLoading(true)
    fetch(`/api/bearbricks?series=${encodeURIComponent(selectedSeries)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Bearbrick[]) => {
        setBearbricks(Array.isArray(data) ? data : [])
        const initialEdits: Record<string, string> = {}
        const initialNameEdits: Record<string, string> = {}
        const initialSecretEdits: Record<string, boolean> = {}
        for (const b of data) {
          initialEdits[b.id] = b.rarityPercentage != null ? String(b.rarityPercentage) : ''
          initialNameEdits[b.id] = b.name
          initialSecretEdits[b.id] = b.isSecret
        }
        setEdits(initialEdits)
        setNameEdits(initialNameEdits)
        setSecretEdits(initialSecretEdits)
      })
      .finally(() => setLoading(false))
  }, [selectedSeries])

  // Grouped by category alone (not category+secret), so e.g. a regular SF
  // figure and a secret SF figure show up together under one "SF" heading
  // instead of being split into a separate section at the end.
  const grouped = useMemo(() => {
    const byCategory = new Map<string, Bearbrick[]>()
    for (const item of bearbricks) {
      const categoryName = item.category?.name ?? 'Uncategorized'
      if (!byCategory.has(categoryName)) byCategory.set(categoryName, [])
      byCategory.get(categoryName)!.push(item)
    }
    const orderedNames = sortCategoriesOfficial(
      Array.from(byCategory.keys()).map((name) => ({ name }))
    ).map((c) => c.name)
    return orderedNames.map((name) => ({
      category: name,
      items: sortBearbricks(byCategory.get(name)!),
    }))
  }, [bearbricks])

  const dirty =
    bearbricks.some((b) => {
      const original = b.rarityPercentage != null ? String(b.rarityPercentage) : ''
      return (edits[b.id] ?? '') !== original
    }) ||
    bearbricks.some((b) => (nameEdits[b.id] ?? b.name) !== b.name) ||
    bearbricks.some((b) => (secretEdits[b.id] ?? b.isSecret) !== b.isSecret)

  const currentSeriesInfo = seriesList.find((s) => s.name === selectedSeries)
  const canDeleteCurrentSeries = !loading && bearbricks.length === 0 && !!currentSeriesInfo

  useEffect(() => {
    if (!currentSeriesInfo) return
    setSeasonEdit(currentSeriesInfo.season)
    setYearEdit(String(currentSeriesInfo.releaseYear))
  }, [currentSeriesInfo?.id])

  const seriesInfoDirty =
    !!currentSeriesInfo &&
    (seasonEdit !== currentSeriesInfo.season || yearEdit !== String(currentSeriesInfo.releaseYear))

  const anyDirty = dirty || seriesInfoDirty

  const grandTotalPercent = bearbricks.reduce((sum, b) => {
    const value = edits[b.id]
    return sum + (value ? parseFloat(value) || 0 : 0)
  }, 0)
  const grandTotal192 = Math.round((grandTotalPercent / 100) * 192)

  const handleCancel = () => {
    const initialEdits: Record<string, string> = {}
    const initialNameEdits: Record<string, string> = {}
    const initialSecretEdits: Record<string, boolean> = {}
    for (const b of bearbricks) {
      initialEdits[b.id] = b.rarityPercentage != null ? String(b.rarityPercentage) : ''
      initialNameEdits[b.id] = b.name
      initialSecretEdits[b.id] = b.isSecret
    }
    setEdits(initialEdits)
    setNameEdits(initialNameEdits)
    setSecretEdits(initialSecretEdits)
    if (currentSeriesInfo) {
      setSeasonEdit(currentSeriesInfo.season)
      setYearEdit(String(currentSeriesInfo.releaseYear))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (dirty) {
        const updates = bearbricks
          .map((b) => {
            const originalRarity = b.rarityPercentage != null ? String(b.rarityPercentage) : ''
            const rarityChanged = (edits[b.id] ?? '') !== originalRarity
            const nameChanged = (nameEdits[b.id] ?? b.name) !== b.name
            const secretChanged = (secretEdits[b.id] ?? b.isSecret) !== b.isSecret
            if (!rarityChanged && !nameChanged && !secretChanged) return null
            const update: { id: string; rarityPercentage?: number | null; name?: string; isSecret?: boolean } = { id: b.id }
            if (rarityChanged) {
              update.rarityPercentage = edits[b.id] === '' || edits[b.id] === undefined ? null : parseFloat(edits[b.id])
            }
            if (nameChanged) {
              update.name = nameEdits[b.id]
            }
            if (secretChanged) {
              update.isSecret = secretEdits[b.id] ?? b.isSecret
            }
            return update
          })
          .filter((u): u is { id: string; rarityPercentage?: number | null; name?: string; isSecret?: boolean } => u !== null)

        if (updates.length > 0) {
          const res = await fetch('/api/admin/bearbricks/update-rarity', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates }),
          })
          if (!res.ok) throw new Error('저장 실패')

          setBearbricks((prev) =>
            prev.map((b) => {
              const update = updates.find((u) => u.id === b.id)
              if (!update) return b
              return {
                ...b,
                rarityPercentage: 'rarityPercentage' in update ? update.rarityPercentage! : b.rarityPercentage,
                name: update.name ?? b.name,
                isSecret: update.isSecret ?? b.isSecret,
              }
            })
          )
        }
      }

      if (seriesInfoDirty && currentSeriesInfo) {
        const res = await fetch(`/api/series/${currentSeriesInfo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ season: seasonEdit, releaseYear: parseInt(yearEdit, 10) }),
        })
        if (!res.ok) throw new Error('저장 실패')
        await fetchSeriesList()
      }
    } catch (error) {
      console.error('Failed to save changes:', error)
      alert('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSeries = async () => {
    setCreatingSeries(true)
    try {
      const nextNumber = seriesList.length > 0 ? Math.max(...seriesList.map((s) => s.number)) + 1 : 1
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: nextNumber,
          name: `Series ${nextNumber}`,
          season: getCurrentSeason(),
          releaseYear: new Date().getFullYear(),
        }),
      })
      if (!res.ok) {
        alert('시리즈 추가 실패')
        return
      }
      const newSeries = await res.json()
      await fetchSeriesList()
      setSelectedSeries(newSeries.name)
    } catch (error) {
      console.error('Failed to add series:', error)
      alert('시리즈 추가 실패')
    } finally {
      setCreatingSeries(false)
    }
  }

  const handleDeleteSeries = async () => {
    if (!currentSeriesInfo) return
    if (!confirm(`"${currentSeriesInfo.name}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return
    setDeletingSeries(true)
    try {
      const res = await fetch(`/api/series/${currentSeriesInfo.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error || '시리즈 삭제 실패')
        return
      }
      const data = await fetchSeriesList()
      setSelectedSeries(data.length > 0 ? data[0].name : '')
    } catch (error) {
      console.error('Failed to delete series:', error)
      alert('시리즈 삭제 실패')
    } finally {
      setDeletingSeries(false)
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

      <main className="max-w-4xl mx-auto px-4 py-8 pb-28">
        <div className="flex items-center justify-between mb-2">
          <Link href="/admin/manage" className="text-sm text-gray-500 hover:text-gray-900">
            ← 관리자 홈으로
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6 mt-2 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">시리즈 관리</h1>
          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={handleAddSeries}
              disabled={creatingSeries}
              className="px-3 py-1.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {creatingSeries ? '추가하는 중...' : '+ 시리즈 추가'}
            </button>
            <button
              onClick={handleDeleteSeries}
              disabled={!canDeleteCurrentSeries || deletingSeries}
              title={!canDeleteCurrentSeries ? '베어브릭이 없는 시리즈만 삭제할 수 있습니다' : undefined}
              className="px-3 py-1.5 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deletingSeries ? '삭제하는 중...' : '시리즈 삭제'}
            </button>
          </div>
        </div>

        {currentSeriesInfo && (
          <div className="flex items-center gap-2 mb-6 -mt-2 flex-wrap">
            <span className="text-sm text-gray-500">출시:</span>
            <select
              value={seasonEdit}
              onChange={(e) => setSeasonEdit(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              {SEASONS.map((s) => (
                <option key={s} value={s}>{SEASON_LABELS_KO[s]}</option>
              ))}
            </select>
            <input
              type="number"
              value={yearEdit}
              onChange={(e) => setYearEdit(e.target.value)}
              className="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
            />
          </div>
        )}

        {!loading && bearbricks.length > 0 && (
          <div className="flex justify-end mb-1">
            <span className="text-xs text-gray-400">☑ 시크릿</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : bearbricks.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">
            이 시리즈에는 아직 베어브릭이 없습니다.
          </p>
        ) : (
          <div className="space-y-8">
            {grouped.map((group, groupIdx) => (
              <div key={`${group.category}-${groupIdx}`}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {group.category}
                </h2>
                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {group.category === 'Basic' ? (
                    // A series can have both a regular Basic set (9 letters) and a
                    // secret Basic sub-set (e.g. Series 5's GOODENOUGH) - partition by
                    // their original isSecret so each still gets its own combined-total
                    // row, just grouped under the same "Basic" heading.
                    Array.from(
                      group.items.reduce((map, it) => {
                        const key = it.isSecret ? 'secret' : 'regular'
                        if (!map.has(key)) map.set(key, [])
                        map.get(key)!.push(it)
                        return map
                      }, new Map<string, Bearbrick[]>())
                    ).map(([partitionKey, items]) => {
                      const values = items.map((it) => edits[it.id] ?? '')
                      const allBlank = values.every((v) => v === '')
                      const total = values.reduce((sum, v) => sum + (v === '' ? 0 : parseFloat(v)), 0)
                      const totalValue = allBlank ? '' : String(Math.round(total * 100) / 100)
                      const isSecretPartition = secretEdits[items[0].id] ?? items[0].isSecret
                      const representative = items.find((it) => SECRET_BASIC_REPRESENTATIVE_NAMES.includes(it.name))
                      const editTargetId = representative?.id ?? items[0]?.id
                      const displayName = representative
                        ? (nameEdits[representative.id] ?? representative.name)
                        : 'BE@RBRICK'
                      return (
                        <div key={partitionKey} className="flex items-center gap-3 px-4 py-2.5">
                          {editTargetId ? (
                            <Link
                              href={`/admin/bearbricks/${editTargetId}/edit`}
                              className="shrink-0 text-gray-300 hover:text-blue-600"
                              title="수정 페이지 열기"
                            >
                              ↗
                            </Link>
                          ) : (
                            <span className="shrink-0 w-[1em]" />
                          )}
                          {representative ? (
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setNameEdits({ ...nameEdits, [representative.id]: e.target.value })}
                              className="min-w-0 flex-1 text-sm text-gray-900 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none bg-transparent"
                            />
                          ) : (
                            <span className="min-w-0 flex-1 truncate text-sm text-gray-900" title="Shown as BE@RBRICK on the collection page for every non-secret Basic set">
                              {displayName}
                            </span>
                          )}
                          <div className="flex items-center gap-3 shrink-0">
                            {!allBlank && <span className="text-xs text-gray-400 tabular-nums">{toFraction(total)}</span>}
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={totalValue}
                              onChange={(e) => {
                                const raw = e.target.value
                                const nextEdits = { ...edits }
                                if (raw === '') {
                                  for (const it of items) nextEdits[it.id] = ''
                                } else {
                                  const parsedTotal = parseFloat(raw)
                                  const perItem = Number.isNaN(parsedTotal) ? 0 : parsedTotal / items.length
                                  for (const it of items) nextEdits[it.id] = String(Math.round(perItem * 10000) / 10000)
                                }
                                setEdits(nextEdits)
                              }}
                              placeholder="—"
                              className="w-14 px-1.5 py-1 border border-gray-200 rounded text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-sm text-gray-400">%</span>
                            <input
                              type="checkbox"
                              checked={isSecretPartition}
                              onChange={(e) => {
                                const next = { ...secretEdits }
                                for (const it of items) next[it.id] = e.target.checked
                                setSecretEdits(next)
                              }}
                              aria-label="시크릿"
                              className="w-3.5 h-3.5"
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    group.items.map((item) => {
                      const value = edits[item.id] ?? ''
                      const parsed = value === '' ? null : parseFloat(value)
                      const isSecretNow = secretEdits[item.id] ?? item.isSecret
                      const displayName = nameEdits[item.id] ?? item.name
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                          <Link
                            href={`/admin/bearbricks/${item.id}/edit`}
                            className="shrink-0 text-gray-300 hover:text-blue-600"
                            title="수정 페이지 열기"
                          >
                            ↗
                          </Link>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setNameEdits({ ...nameEdits, [item.id]: e.target.value })}
                            className="min-w-0 flex-1 text-sm text-gray-900 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none bg-transparent"
                          />
                          <div className="flex items-center gap-3 shrink-0">
                            {parsed != null && !Number.isNaN(parsed) && <span className="text-xs text-gray-400 tabular-nums">{toFraction(parsed)}</span>}
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={value}
                              onChange={(e) => setEdits({ ...edits, [item.id]: e.target.value })}
                              placeholder="—"
                              className="w-14 px-1.5 py-1 border border-gray-200 rounded text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-sm text-gray-400">%</span>
                            <input
                              type="checkbox"
                              checked={isSecretNow}
                              onChange={(e) => setSecretEdits({ ...secretEdits, [item.id]: e.target.checked })}
                              aria-label="시크릿"
                              className="w-3.5 h-3.5"
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-500">합계:</span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {grandTotal192}/192 {Math.round(grandTotalPercent * 100) / 100}%
              </span>
            </div>
          </div>
        )}
      </main>

      {anyDirty && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-5 py-2 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              {saving ? '저장하는 중...' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
