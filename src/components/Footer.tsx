import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function Footer() {
  const t = await getTranslations('footer')
  const tp = await getTranslations('privacy')

  return (
    <footer className="border-t border-gray-100 mt-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
        <p>{t('tagline')}</p>
        <p className="mt-1">{t('disclaimer')}</p>
        <p className="mt-2">
          <Link href="/privacy" className="hover:text-gray-600 hover:underline">
            {tp('title')}
          </Link>
        </p>
      </div>
    </footer>
  )
}
