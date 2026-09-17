import { Suspense } from 'react'
import HomeClient from './HomeClient'
import HomeSkeleton from '@/components/HomeSkeleton'
import { listBearbricks, listCategories, listSeriesWithCounts } from '@/lib/queries'

/**
 * The home screen used to mount empty and then fetch the series list, wait for
 * it, and only then fetch that series' bearbricks - two round trips that could
 * not even start until the JS bundle had loaded. In the app's WebView that
 * left the screen blank for most of a cold launch. Querying here puts the
 * first screen in the HTML instead; the client still refetches when the reader
 * picks a different series.
 *
 * Rendered per request rather than cached: reading the locale cookie makes
 * this route dynamic anyway, and an admin's edit should show up immediately
 * rather than after a revalidation window.
 *
 * The queries themselves still take a moment (cold Vercel function, a couple
 * of DB round trips) - wrapping them in Suspense lets Next stream the shell
 * below immediately instead of holding the whole response until they finish,
 * so a cold launch shows the skeleton instead of a blank screen.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeData />
    </Suspense>
  )
}

async function HomeData() {
  const [series, categories] = await Promise.all([listSeriesWithCounts(), listCategories()])
  // The client defaults to the newest series unless the URL or this session's
  // last choice says otherwise, so that's what gets rendered ahead of time.
  const seriesName = series[0]?.name ?? 'all'
  const bearbricks = await listBearbricks(seriesName === 'all' ? undefined : seriesName)

  return (
    <HomeClient initial={{ series, categories, bearbricks, seriesName }} />
  )
}
