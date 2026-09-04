'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { locales, LOCALE_COOKIE, type Locale } from '@/i18n/locales'

const LANGUAGE_LABELS: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
  zh: '中文',
  ja: '日本語',
}

export default function LanguageSwitcher() {
  const locale = useLocale()
  const t = useTranslations('topMenu')
  const router = useRouter()

  const handleChange = (next: Locale) => {
    if (next === locale) return
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`
    router.refresh()
  }

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-gray-400">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2.5 10h15M10 2.5c2 2.2 3 4.9 3 7.5s-1 5.3-3 7.5c-2-2.2-3-4.9-3-7.5s1-5.3 3-7.5z" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        {t('language')}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {locales.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => handleChange(code)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              locale === code ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {LANGUAGE_LABELS[code]}
          </button>
        ))}
      </div>
    </div>
  )
}
