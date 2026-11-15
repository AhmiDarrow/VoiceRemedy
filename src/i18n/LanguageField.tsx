import { LOCALES, isLocale } from './locales'
import { useI18n } from './useI18n'
import { loadPreferences, savePreferences } from '../storage'

export function LanguageField({ disabled }: { disabled?: boolean }) {
  const { locale, setLocale, t } = useI18n()
  return (
    <label className="coach-language language-field">
      {t('app.language')}{' '}
      <select value={locale} disabled={disabled} onChange={event => {
        const value = event.target.value
        if (!isLocale(value)) return
        setLocale(value)
        try { savePreferences({ ...loadPreferences(), locale: value }) } catch { /* the screen that owns the other settings reports storage errors */ }
      }}>
        {LOCALES.map(item => <option key={item.id} value={item.id}>{item.native}</option>)}
      </select>
    </label>
  )
}
