'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { useTranslations, useLocale } from 'next-intl'
import TopMenu from '@/components/TopMenu'
import BearbrickThumb from '@/components/BearbrickThumb'
import Skeleton from '@/components/Skeleton'
import { isSuperSecretRarity } from '@/lib/rarity'

interface SeriesStat {
  id: string
  name: string
  number: number
  owned: number
  total: number
  color: string | null
}

interface CategoryStat {
  id: string
  name: string
  owned: number
  total: number
}

interface ActivityItem {
  id: string
  createdAt: string
  bearbrick: {
    id: string
    name: string
    isSecret: boolean
    rarityPercentage: number | null
    seriesName: string | null
    categoryName: string | null
    image: string | null
  }
}

interface OwnedItem {
  id: string
  name: string
  isSecret: boolean
  rarityPercentage: number | null
  seriesName: string | null
  seriesNumber: number | null
  categoryName: string | null
  image: string | null
}

type OwnedSortKey = 'name' | 'series' | 'category' | 'secret'

interface StatsResponse {
  overall: { owned: number; total: number }
  perSeries: SeriesStat[]
  perCategory: CategoryStat[]
  secrets: { owned: number; total: number; superSecretOwned: number; superSecretTotal: number }
  recentActivity: ActivityItem[]
  ownedItems: OwnedItem[]
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-600 rounded-full transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

// Fallback only, for a series whose Basic photo color couldn't be extracted
// (see extract_series_colors.js) - keeps the badge grid from going back to
// a wall of identical rings for those few series instead of erroring out.
const SERIES_COLOR_PALETTE = [
  '#0891b2', // cyan
  '#7c3aed', // violet
  '#db2777', // pink
  '#059669', // emerald
  '#ea580c', // orange
  '#4f46e5', // indigo
  '#65a30d', // lime
  '#e11d48', // rose
  '#0d9488', // teal
  '#9333ea', // purple
]

function seriesColor(number: number): string {
  return SERIES_COLOR_PALETTE[((number % SERIES_COLOR_PALETTE.length) + SERIES_COLOR_PALETTE.length) % SERIES_COLOR_PALETTE.length]
}

// One series = one compact donut badge (number in the middle, ring shows
// % collected) instead of a full-width row - with 50+ series a row-per-series
// list turns into an unreasonably long scroll, a badge grid doesn't.
function SeriesBadge({
  caption,
  title,
  percent,
  owned,
  total,
  complete,
  color,
}: {
  caption: string
  title: string
  percent: number
  owned: number
  total: number
  complete: boolean
  color: string
}) {
  const RADIUS = 26
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const offset = CIRCUMFERENCE * (1 - percent / 100)
  return (
    <div className="flex flex-col items-center gap-1" title={`${title}: ${owned}/${total}`}>
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
          <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900 tabular-nums">{percent}%</span>
        </div>
      </div>
      <span
        className={`text-[10px] tabular-nums ${complete ? 'font-semibold' : 'text-gray-500'}`}
        style={complete ? { color } : undefined}
      >
        {caption}
      </span>
    </div>
  )
}

function OwnedListSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
            <Skeleton className="h-3.5 rounded flex-1 max-w-[140px]" />
            <Skeleton className="h-3.5 rounded w-16 hidden sm:block" />
            <Skeleton className="h-3.5 rounded w-20 hidden sm:block" />
            <Skeleton className="h-3.5 rounded w-10" />
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="max-w-3xl space-y-6">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  )
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <th
      onClick={onClick}
      className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none whitespace-nowrap hover:text-gray-900"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <svg width="9" height="9" viewBox="0 0 10 10" className={active ? 'opacity-100' : 'opacity-0'}>
          {dir === 'asc' ? <path d="M5 2l3.5 5h-7z" fill="currentColor" /> : <path d="M5 8L1.5 3h7z" fill="currentColor" />}
        </svg>
      </span>
    </th>
  )
}

export default function MyCollectionPage() {
  const t = useTranslations('myCollectionStats')
  const tc = useTranslations('common')
  const locale = useLocale()
  const { status: sessionStatus } = useSession()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [tab, setTab] = useState<'owned' | 'stats'>('owned')
  const [breakdownMode, setBreakdownMode] = useState<'series' | 'category'>('series')
  const [sortKey, setSortKey] = useState<OwnedSortKey>('series')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      setStatsLoading(false)
      return
    }
    let cancelled = false
    setStatsLoading(true)
    fetch('/api/collection/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((error) => {
        console.error('Failed to fetch collection stats:', error)
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sessionStatus])

  const overallPercent =
    stats && stats.overall.total > 0 ? Math.round((stats.overall.owned / stats.overall.total) * 100) : 0
  const secretPercent =
    stats && stats.secrets.total > 0 ? Math.round((stats.secrets.owned / stats.secrets.total) * 100) : 0

  const sortedOwnedItems = useMemo(() => {
    if (!stats) return []
    const items = [...stats.ownedItems]
    items.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'series') cmp = (a.seriesNumber ?? -1) - (b.seriesNumber ?? -1)
      else if (sortKey === 'category') cmp = (a.categoryName ?? '').localeCompare(b.categoryName ?? '')
      else if (sortKey === 'secret') cmp = Number(a.isSecret) - Number(b.isSecret)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return items
  }, [stats, sortKey, sortDir])

  const toggleSort = (key: OwnedSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2">
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

      <main className="max-w-5xl mx-auto px-4 py-6 pb-24">
        {sessionStatus === 'loading' ? (
          <OwnedListSkeleton />
        ) : sessionStatus === 'unauthenticated' ? (
          <div className="rounded-2xl bg-gray-50 p-8 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-1">{t('signedOutTitle')}</p>
            <p className="text-sm text-gray-500 mb-5">{t('signedOutBody')}</p>
            <button
              onClick={() => signIn('google')}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700"
            >
              {t('signInCta')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-1 mb-6 border-b border-gray-100">
              <button
                onClick={() => setTab('owned')}
                className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  tab === 'owned' ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-900'
                }`}
              >
                {t('tabOwnedList')}
              </button>
              <button
                onClick={() => setTab('stats')}
                className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  tab === 'stats' ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-900'
                }`}
              >
                {t('tabStats')}
              </button>
            </div>

            {statsLoading || !stats ? (
              tab === 'owned' ? <OwnedListSkeleton /> : <StatsSkeleton />
            ) : tab === 'owned' ? (
              stats.ownedItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-16">{t('ownedListEmpty')}</p>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-14 px-3 py-2.5" />
                        <SortableHeader
                          label={t('colName')}
                          active={sortKey === 'name'}
                          dir={sortDir}
                          onClick={() => toggleSort('name')}
                        />
                        <SortableHeader
                          label={t('colSeries')}
                          active={sortKey === 'series'}
                          dir={sortDir}
                          onClick={() => toggleSort('series')}
                        />
                        <SortableHeader
                          label={t('colCategory')}
                          active={sortKey === 'category'}
                          dir={sortDir}
                          onClick={() => toggleSort('category')}
                        />
                        <SortableHeader
                          label={t('colSecret')}
                          active={sortKey === 'secret'}
                          dir={sortDir}
                          onClick={() => toggleSort('secret')}
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedOwnedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <Link href={`/bearbricks/${item.id}`} className="block w-11 h-11 rounded-lg overflow-hidden bg-gray-50">
                              <BearbrickThumb src={item.image} alt={item.name} />
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/bearbricks/${item.id}`} className="font-medium text-gray-900 hover:underline">
                              {item.name}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{item.seriesName ?? '-'}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{item.categoryName ?? '-'}</td>
                          <td className="px-3 py-2">
                            {item.isSecret ? (
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                                  isSuperSecretRarity(item.rarityPercentage) ? 'bg-yellow-400 text-gray-900' : 'bg-blue-600 text-white'
                                }`}
                              >
                                {tc('secret')}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="max-w-3xl space-y-6">
                {/* Overall collection rate */}
                <section className="rounded-2xl bg-gray-50 p-6">
                  <h2 className="text-sm font-semibold text-gray-500 mb-3">{t('overallTitle')}</h2>
                  <div className="flex items-end gap-3 mb-3">
                    <span className="text-5xl font-bold text-gray-900 tabular-nums">{overallPercent}%</span>
                    <span className="text-sm text-gray-500 mb-1.5">
                      {t('overallSubtitle', { owned: stats.overall.owned, total: stats.overall.total })}
                    </span>
                  </div>
                  <ProgressBar percent={overallPercent} />
                </section>

                {/* Breakdown - by series (badge grid) or by category (bar list) */}
                <section className="rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <h2 className="text-sm font-semibold text-gray-500">
                      {breakdownMode === 'series' ? t('perSeriesTitle') : t('perCategoryTitle')}
                    </h2>
                    <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5 shrink-0">
                      <button
                        onClick={() => setBreakdownMode('series')}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          breakdownMode === 'series' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                        }`}
                      >
                        {t('bySeries')}
                      </button>
                      <button
                        onClick={() => setBreakdownMode('category')}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          breakdownMode === 'category' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                        }`}
                      >
                        {t('byCategory')}
                      </button>
                    </div>
                  </div>

                  {breakdownMode === 'series' ? (
                    stats.perSeries.length === 0 ? (
                      <p className="text-sm text-gray-400">{t('perSeriesEmpty')}</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-2 gap-y-4">
                        {stats.perSeries.map((s) => {
                          const percent = s.total > 0 ? Math.round((s.owned / s.total) * 100) : 0
                          const complete = s.total > 0 && s.owned === s.total
                          return (
                            <Link
                              key={s.id}
                              href={`/?my=1&series=${encodeURIComponent(s.name)}`}
                              className="hover:opacity-70 transition-opacity"
                            >
                              <SeriesBadge
                                caption={t('seriesCaption', { number: s.number })}
                                title={s.name}
                                percent={percent}
                                owned={s.owned}
                                total={s.total}
                                complete={complete}
                                color={s.color ?? seriesColor(s.number)}
                              />
                            </Link>
                          )
                        })}
                      </div>
                    )
                  ) : stats.perCategory.length === 0 ? (
                    <p className="text-sm text-gray-400">{t('perCategoryEmpty')}</p>
                  ) : (
                    <ul className="space-y-4">
                      {stats.perCategory.map((c) => {
                        const percent = c.total > 0 ? Math.round((c.owned / c.total) * 100) : 0
                        return (
                          <li key={c.id}>
                            <Link
                              href={`/?my=1&series=all&category=${encodeURIComponent(c.name)}`}
                              className="block hover:opacity-70 transition-opacity"
                            >
                              <div className="flex items-center justify-between mb-1.5 gap-2">
                                <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                                <span className="text-xs text-gray-500 tabular-nums shrink-0">
                                  {c.owned}/{c.total}
                                </span>
                              </div>
                              <ProgressBar percent={percent} />
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>

                {/* Secret / rare items owned */}
                <section className="rounded-2xl bg-gray-50 p-6">
                  <h2 className="text-sm font-semibold text-gray-500 mb-3">{t('secretItemsTitle')}</h2>
                  <div className="flex items-end gap-3 mb-3">
                    <span className="text-4xl font-bold text-gray-900 tabular-nums">
                      {stats.secrets.owned}/{stats.secrets.total}
                    </span>
                  </div>
                  <ProgressBar percent={secretPercent} />
                  {stats.secrets.superSecretTotal > 0 && (
                    <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-yellow-400 text-gray-900 shrink-0">
                        {tc('secret')}
                      </span>
                      {t('superSecretLabel', {
                        owned: stats.secrets.superSecretOwned,
                        total: stats.secrets.superSecretTotal,
                      })}
                    </p>
                  )}
                </section>

                {/* Recent activity */}
                <section className="rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-sm font-semibold text-gray-500 mb-4">{t('activityTitle')}</h2>
                  {stats.recentActivity.length === 0 ? (
                    <p className="text-sm text-gray-400">{t('activityEmpty')}</p>
                  ) : (
                    <ul className="space-y-3">
                      {stats.recentActivity.map((item) => (
                        <li key={item.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden shrink-0">
                            <BearbrickThumb src={item.bearbrick.image} alt={item.bearbrick.name} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-gray-900 truncate">{item.bearbrick.name}</span>
                              {item.bearbrick.isSecret && (
                                <span
                                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full shrink-0 ${
                                    isSuperSecretRarity(item.bearbrick.rarityPercentage)
                                      ? 'bg-yellow-400 text-gray-900'
                                      : 'bg-blue-600 text-white'
                                  }`}
                                >
                                  {tc('secret')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">
                              {[item.bearbrick.seriesName, item.bearbrick.categoryName].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">
                            {t('activityAddedOn', {
                              date: new Date(item.createdAt).toLocaleDateString(locale, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }),
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
