import Skeleton from './Skeleton'

// Mirrors HomeClient's header/grid layout so swapping in the real content
// doesn't jump the page around. Rendered as the Suspense fallback in
// src/app/page.tsx while the series/category/bearbrick queries are still in
// flight, so the first thing painted - on a cold Vercel function or a slow
// connection - is this instead of a blank screen.
export default function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-4">
          <div className="flex items-center flex-nowrap gap-3">
            <Skeleton className="h-9 md:h-[42px] w-28 rounded" />
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Skeleton className="w-9 h-9 rounded-full" />
              <Skeleton className="w-9 h-9 rounded-full" />
              <Skeleton className="w-9 h-9 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4">
        <div className="mt-3 mb-3">
          <Skeleton className="h-8 sm:h-10 w-24 rounded" />
        </div>
        <div className="mb-8">
          <Skeleton className="h-7 w-32 rounded-lg" />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 pt-1 pb-8">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-6">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[3/4] rounded-2xl" />
              <div className="pt-2 px-1 space-y-1.5">
                <Skeleton className="h-3 rounded w-4/5" />
                <Skeleton className="h-3 rounded w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
