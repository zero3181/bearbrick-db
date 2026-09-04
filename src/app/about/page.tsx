import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function AboutPage() {
  const t = await getTranslations('about')

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
            {t('backHome')}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <img src="/logo-gombrick.png" alt="GomBrick" className="h-12 w-auto mb-4" />
        <p className="text-gray-600 leading-relaxed">{t('intro')}</p>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('featuresTitle')}</h2>
          <ul className="space-y-2 text-gray-600 leading-relaxed list-disc list-inside">
            <li>{t('feature1')}</li>
            <li>{t('feature2')}</li>
            <li>{t('feature3')}</li>
            <li>{t('feature4')}</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('foundWrongTitle')}</h2>
          <p className="text-gray-600 leading-relaxed">{t('foundWrongBody')}</p>
        </section>

        <section className="mt-8 pt-8 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('contactTitle')}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t.rich('contactBody', {
              email: (chunks) => (
                <a href="mailto:my@favorite.kr" className="text-blue-600 hover:underline">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>
      </main>
    </div>
  )
}
