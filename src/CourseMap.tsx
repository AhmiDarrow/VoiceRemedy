import { Check, ChevronRight, Leaf } from 'lucide-react'
import { chapters, lessons, readyForNext, recommendedLesson, type Lesson } from './course'
import type { Result } from './pitch'
import { presentChapter, presentLesson } from './i18n/content'
import { formatInteger } from './i18n/translate'
import { useI18n } from './i18n/useI18n'

export function CourseMap({ results, onChoose }: { results: Result[]; onChoose: (lesson: Lesson) => void }) {
  const { t } = useI18n()
  const next = recommendedLesson(results)
  return <>{chapters.map((chapter, index) => {
    const view = presentChapter(index) ?? chapter
    return <section className="course-chapter" key={index}><div className="chapter-heading"><span className="chapter-number">0{index + 1}</span><div><span className="eyebrow">{index === 3 ? t('map.recovery') : t('map.chapter', { n: formatInteger(index + 1) })}</span><h2>{view.title}</h2><p>{view.subtitle}</p></div></div><p className="chapter-goal"><Leaf size={14}/><span>{t('map.learning', { skill: view.skill })}</span></p><div className="all-lessons">{lessons.filter(l => l.chapter === index).map(l => { const ready = readyForNext(l.id, results); const shown = presentLesson(l); return <button key={l.id} className={'lesson-row ' + (l.id === next.id ? 'recommended' : '')} onClick={() => onChoose(l)}><span className={'lesson-number ' + (ready ? 'ready' : '')}>{ready ? <Check size={20}/> : String(lessons.indexOf(l) + 1).padStart(2, '0')}</span><span><span className="eyebrow">{shown.label} · {shown.minutes}</span><h3>{shown.title}</h3><p>{shown.description}</p></span><span className={'skill-state ' + (ready ? 'ready' : '')}>{ready ? t('map.ready') : l.id === next.id ? t('map.next') : results.some(r => r.exercise === l.id) ? t('map.keep') : t('map.explore')}</span><ChevronRight size={19}/></button> })}</div></section>
  })}<p className="small">{t('map.footnote')}</p></>
}
