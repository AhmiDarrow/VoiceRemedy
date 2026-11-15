import { Headphones, Mic, Leaf } from 'lucide-react'
import { useI18n } from './i18n/useI18n'

export function PracticeGuide() {
  const { t } = useI18n()
  return <section className="practice-guide" aria-labelledby="practice-guide-title">
    <span className="eyebrow">{t('guide.eyebrow')}</span>
    <h2 id="practice-guide-title">{t('guide.title')}</h2>
    <div className="routine-steps">
      <div><Headphones size={19}/><h3>{t('guide.hear.title')}</h3><p>{t('guide.hear.body')}</p></div>
      <div><Mic size={19}/><h3>{t('guide.try.title')}</h3><p>{t('guide.try.body')}</p></div>
      <div><Leaf size={19}/><h3>{t('guide.rest.title')}</h3><p>{t('guide.rest.body')}</p></div>
    </div>
    <details><summary>{t('guide.q.match')}</summary><p>{t('guide.a.match')}</p></details>
    <details><summary>{t('guide.q.lessons')}</summary><p>{t('guide.a.lessons')}</p></details>
    <details><summary>{t('guide.q.learn')}</summary><p>{t('guide.a.learn')}</p></details>
  </section>
}
