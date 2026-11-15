import { coachText } from '../lessons'
import { detectLocale, intlTag, isLocale, type LocaleId } from './locales'
import de from './de.json'
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import it from './it.json'
import ja from './ja.json'
import ko from './ko.json'
import pl from './pl.json'
import ptBR from './pt-BR.json'
import ru from './ru.json'
import zhCN from './zh-CN.json'

export type Catalog = Record<string, string>

const catalogs: Record<LocaleId, Catalog> = {
  en: en as Catalog,
  es: es as Catalog,
  fr: fr as Catalog,
  de: de as Catalog,
  'pt-BR': ptBR as Catalog,
  it: it as Catalog,
  ru: ru as Catalog,
  pl: pl as Catalog,
  ja: ja as Catalog,
  ko: ko as Catalog,
  'zh-CN': zhCN as Catalog,
}

const knownErrors = new Map<string, string>()
for (const [key, value] of Object.entries(catalogs.en)) {
  if (key.startsWith('err.') && typeof value === 'string') knownErrors.set(value, key)
}

let current: LocaleId = 'en'
let ready = false
const listeners = new Set<() => void>()

export function pickText(value: unknown, fallback: unknown, key: string): string {
  if (typeof value === 'string' && value.trim() !== '') return value
  if (typeof fallback === 'string' && fallback.trim() !== '') return fallback
  return key
}

export function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name]
    return value === undefined ? match : String(value)
  })
}

export function text(locale: LocaleId, key: string): string {
  return pickText(catalogs[locale]?.[key], catalogs.en[key], key)
}

export function catalog(locale: LocaleId = 'en'): Catalog {
  return catalogs[locale] ?? catalogs.en
}

function readQuery(): LocaleId | null {
  if (typeof location === 'undefined' || !location.search) return null
  try {
    const value = new URLSearchParams(location.search).get('lang')
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

function readStored(): LocaleId | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const value = JSON.parse(localStorage.getItem('voiceremedy.preferences.v1') || 'null') as { locale?: unknown } | null
    return value && isLocale(value.locale) ? value.locale : null
  } catch {
    return null
  }
}

function readSystem(): LocaleId {
  if (typeof navigator === 'undefined') return 'en'
  const list = navigator.languages?.length ? navigator.languages : [navigator.language || 'en']
  return detectLocale(list)
}

export function applyDocument(locale: LocaleId) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  const title = text(locale, 'doc.title')
  const description = text(locale, 'doc.description')
  if (title && title !== 'doc.title') document.title = title
  const meta = document.querySelector('meta[name="description"]')
  if (meta && description && description !== 'doc.description') meta.setAttribute('content', description)
}

function resolveLocale(): LocaleId {
  return readQuery() ?? readStored() ?? readSystem()
}

export function getLocale(): LocaleId {
  if (!ready) {
    ready = true
    current = resolveLocale()
    applyDocument(current)
  }
  return current
}

export function setLocale(next: string) {
  if (!isLocale(next)) return
  if (!ready) getLocale()
  if (next === current) return
  current = next
  ready = true
  applyDocument(current)
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function resetLocaleForTests() {
  ready = false
  current = 'en'
  for (const listener of listeners) listener()
}

export function translate(key: string, vars?: Record<string, string | number>): string {
  return fill(text(getLocale(), key), vars)
}

export function localizeKnown(message: string): string {
  const key = knownErrors.get(message)
  return key ? translate(key) : message
}

export function coachLine(key: string): string {
  const line = translate('coach.' + key)
  if (getLocale() === 'en') return coachText[key] ?? line
  return line === 'coach.' + key ? (coachText[key] ?? line) : line
}

export function formatInteger(value: number, locale: LocaleId = getLocale()): string {
  if (locale === 'en') return String(value)
  try { return new Intl.NumberFormat(intlTag(locale)).format(value) } catch { return String(value) }
}

export function formatPercentPoints(value: number, locale: LocaleId = getLocale()): string {
  if (locale === 'en') return String(value) + '%'
  try {
    return new Intl.NumberFormat(intlTag(locale), { style: 'percent', maximumFractionDigits: 0 }).format(value / 100)
  } catch {
    return String(value) + '%'
  }
}

export function formatDecimal(value: number, locale: LocaleId = getLocale()): string {
  if (locale === 'en') return String(value)
  try { return new Intl.NumberFormat(intlTag(locale), { maximumFractionDigits: 1 }).format(value) } catch { return String(value) }
}

export function formatDate(iso: string, locale: LocaleId = getLocale()): string {
  const date = new Date(iso)
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (locale === 'en') return date.toLocaleDateString(undefined, options)
  try { return date.toLocaleDateString(intlTag(locale), options) } catch { return date.toLocaleDateString(undefined, options) }
}

export function pluralCategory(count: number, locale: LocaleId = getLocale()): 'one' | 'few' | 'many' | 'other' {
  const n = Math.abs(Math.trunc(count))
  if (locale === 'ru' || locale === 'pl') {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return 'one'
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few'
    return 'many'
  }
  return n === 1 ? 'one' : 'other'
}
