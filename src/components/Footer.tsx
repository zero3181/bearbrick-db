import { getTranslations } from 'next-intl/server'

export default async function Footer() {
  const t = await getTranslations('footer')

  return (
    <footer className="border-t border-gray-100 mt-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
        <p>{t('tagline')}</p>
        <p className="mt-1">{t('disclaimer')}</p>
      </div>
    </footer>
  )
}
