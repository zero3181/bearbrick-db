import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
            ← 홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-4">GomBrick</h1>
        <p className="text-gray-600 leading-relaxed">
          베어브릭 컬렉션을 정리하고 관리하는 데이터베이스입니다.
        </p>
      </main>
    </div>
  )
}
