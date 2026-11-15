export const LOCALES = [
  { id: 'en', native: 'English', intl: 'en' },
  { id: 'es', native: 'Español', intl: 'es' },
  { id: 'fr', native: 'Français', intl: 'fr' },
  { id: 'de', native: 'Deutsch', intl: 'de' },
  { id: 'pt-BR', native: 'Português (Brasil)', intl: 'pt-BR' },
  { id: 'it', native: 'Italiano', intl: 'it' },
  { id: 'ru', native: 'Русский', intl: 'ru' },
  { id: 'pl', native: 'Polski', intl: 'pl' },
  { id: 'ja', native: '日本語', intl: 'ja' },
  { id: 'ko', native: '한국어', intl: 'ko' },
  { id: 'zh-CN', native: '简体中文', intl: 'zh-CN' },
] as const

export type LocaleId = (typeof LOCALES)[number]['id']

const IDS = new Set<string>(LOCALES.map(locale => locale.id))

export function isLocale(value: unknown): value is LocaleId {
  return typeof value === 'string' && IDS.has(value)
}

export function intlTag(locale: LocaleId): string {
  return LOCALES.find(item => item.id === locale)?.intl ?? 'en'
}

export function detectLocale(languages: readonly string[] | undefined): LocaleId {
  const list = languages?.length ? languages : ['en']
  for (const raw of list) {
    const tag = String(raw || '').trim().toLowerCase().replace(/_/g, '-')
    if (!tag) continue
    if (tag === 'zh-tw' || tag === 'zh-hk' || tag === 'zh-mo' || tag.startsWith('zh-hant')) continue
    if (tag.startsWith('zh')) return 'zh-CN'
    if (tag.startsWith('pt')) return 'pt-BR'
    const base = tag.split('-')[0]
    if (base === 'es' || base === 'fr' || base === 'de' || base === 'it' || base === 'ru' || base === 'pl' || base === 'ja' || base === 'ko' || base === 'en') return base
  }
  return 'en'
}
