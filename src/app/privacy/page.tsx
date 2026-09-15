import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function PrivacyPage() {
  const t = await getTranslations('privacy')

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-sm text-gray-400 mb-8">{t('effectiveDate')}</p>
        <p className="text-gray-600 leading-relaxed">{t('intro')}</p>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('section1Title')}</h2>
          <p className="text-gray-600 leading-relaxed">{t('section1Body')}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('section2Title')}</h2>
          <p className="text-gray-600 leading-relaxed">{t('section2Body')}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('section3Title')}</h2>
          <p className="text-gray-600 leading-relaxed">{t('section3Body')}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('section4Title')}</h2>
          <p className="text-gray-600 leading-relaxed">{t('section4Body')}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('section5Title')}</h2>
          <p className="text-gray-600 leading-relaxed">{t('section5Body')}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('section6Title')}</h2>
          <p className="text-gray-600 leading-relaxed">{t('section6Body')}</p>
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
