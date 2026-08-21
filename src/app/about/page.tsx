import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            ← Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <img src="/logo-gombrick.png" alt="GomBrick" className="h-12 w-auto mb-4 dark:invert" />
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          A personal database for organizing and managing a Bearbrick collection by series and
          category.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Features</h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-300 leading-relaxed list-disc list-inside">
            <li>Browse bearbricks organized by series and category</li>
            <li>View product details (release date, description, images)</li>
            <li>Sign in to submit a correction request for any listing</li>
            <li>Admin bulk add/update support via Excel</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Found something wrong?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Anyone can sign in and request a correction from a product's detail page. Requests
            are reviewed by an admin before they take effect.
          </p>
        </section>

        <section className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Contact</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            For bug reports, suggestions, or anything else, reach out at{' '}
            <a href="mailto:my@favorite.kr" className="text-blue-600 dark:text-blue-400 hover:underline">
              my@favorite.kr
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  )
}
