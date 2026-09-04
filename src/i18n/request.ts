import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from './locales'

function resolveLocale(cookieLocale: string | undefined, acceptLanguage: string | null): Locale {
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale
  }

  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')
      .map((part) => part.split(';')[0].trim().toLowerCase())

    for (const tag of preferred) {
      const base = tag.split('-')[0]
      if ((locales as readonly string[]).includes(base)) {
        return base as Locale
      }
    }
  }

  return defaultLocale
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerStore.get('accept-language')
  )

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
