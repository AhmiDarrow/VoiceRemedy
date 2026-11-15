import { useSyncExternalStore } from 'react'
import { getLocale, setLocale, subscribe, translate } from './translate'

export function useI18n() {
  const locale = useSyncExternalStore(subscribe, getLocale, getLocale)
  return { locale, t: translate, setLocale }
}
