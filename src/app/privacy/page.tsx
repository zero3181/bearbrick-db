import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import TopMenu from '@/components/TopMenu'

export default async function PrivacyPage() {
  const t = await getTranslations('privacy')

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
            {t('backHome')}
          </Link>
          <TopMenu />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-sm text-gray-400 mb-10">{t('lastUpdated')}</p>

        <p className="text-gray-600 leading-relaxed">{t('intro')}</p>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('collectTitle')}</h2>
          <ul className="space-y-2 text-gray-600 leading-relaxed list-disc list-inside">
            <li>{t('collect1')}</li>
            <li>{t('collect2')}</li>
            <li>{t('collect3')}</li>
            <li>{t('collect4')}</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('useTitle')}</h2>
          <ul className="space-y-2 text-gray-600 leading-relaxed list-disc list-inside">
            <li>{t('use1')}</li>
            <li>{t('use2')}</li>
            <li>{t('use3')}</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('thirdPartyTitle')}</h2>
          <p className="text-gray-600 leading-relaxed mb-2">{t('thirdPartyIntro')}</p>
          <ul className="space-y-2 text-gray-600 leading-relaxed list-disc list-inside">
            <li>{t('thirdParty1')}</li>
            <li>{t('thirdParty2')}</li>
            <li>{t('thirdParty3')}</li>
            <li>{t('thirdParty4')}</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-2">{t('noSale')}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('retentionTitle')}</h2>
          <p className="text-gray-600 leading-relaxed">{t('retentionBody')}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('childrenTitle')}</h2>
          <p className="text-gray-600 leading-relaxed">{t('childrenBody')}</p>
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
