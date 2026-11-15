import { ArrowRight, Headphones, Volume2, Square } from 'lucide-react'
import type { RefObject } from 'react'
import { assessment, comparablePrevious, MIN_SAMPLES, type SingingResult } from './coaching'
import { noteName, type Result } from './pitch'
import type { Lesson } from './course'
import { presentLesson } from './i18n/content'
import { formatDecimal, formatInteger, formatPercentPoints } from './i18n/translate'
import { useI18n } from './i18n/useI18n'
export function SessionReport({ result, results, lesson, playing, panelRef, onSpeak, onNote, onAction, onNext }: { result: SingingResult; results: Result[]; lesson: Lesson; playing: boolean; panelRef: RefObject<HTMLElement | null>; onSpeak: () => void; onNote: (midi: number) => void; onAction: () => void; onNext: () => void }) {
  const { t, locale } = useI18n()
  const review = assessment(result), previous = comparablePrevious(result, results)
  const enough = result.samples >= MIN_SAMPLES
  const delta = previous && result.accuracy !== null && previous.accuracy !== null && result.coverage >= .6 ? result.accuracy - previous.accuracy : null
  const shown = presentLesson(lesson)
  const points = (value: number) => locale === 'en' ? String(value) : formatInteger(Math.round(value))
  const percentText = (value: number | null) => typeof value === 'number' ? formatPercentPoints(value) : String(value) + '%'
  return <section ref={panelRef} className="result-card" aria-labelledby="feedback-title"><div className="report-heading"><span className="eyebrow">{t('report.eyebrow')}</span><span className="report-saved">{enough ? t('report.saved') : t('report.none')}</span></div><h2 id="feedback-title" aria-live="polite">{review.title}</h2><p>{review.detail}</p>
    <div className="next-try"><div><span className="eyebrow">{t('report.nextEyebrow')}</span><strong>{review.action}</strong></div><button className="primary" onClick={onAction}>{review.key === 'great' ? t('report.take') : t('report.try')}<ArrowRight size={16}/></button></div>
    {enough && <><div className="result-stats"><div><strong>{percentText(result.accuracy)}</strong><span>{t('report.stat.near')}</span></div><div><strong>{formatPercentPoints(Math.round(result.coverage * 100))}</strong><span>{t('report.stat.pattern')}</span></div><div><strong>{formatDecimal(result.voicedSeconds)}<small>s</small></strong><span>{t('report.stat.seconds')}</span></div></div>{delta !== null && <p className="comparison">{delta > 0 ? t('report.delta.up', { n: points(delta) }) : delta < 0 ? t('report.delta.down') : t('report.delta.same')}<span>{delta > 0 ? t('report.delta.since') : t('report.delta.only')}</span></p>}
      <div className="note-review-heading"><h3>{t('report.notes')}</h3><span><Headphones size={13}/> {t('report.tap')}</span></div><div className="note-review">{result.notes.map((note, i) => <button className={'review-note ' + (note.accuracy === null ? 'unheard' : note.accuracy >= 75 ? 'centered' : 'working')} key={i} onClick={() => onNote(note.midi)} aria-label={t('report.hear', { n: formatInteger(i + 1), note: noteName(note.midi), detail: note.accuracy === null ? t('report.notEnough') : t('report.percentClose', { percent: formatInteger(note.accuracy) }) })}><span>{shown.lyrics?.[i] ?? t('report.noteLabel', { n: formatInteger(i + 1) })}</span><strong>{noteName(note.midi)}</strong><div className="note-bar"><i style={{ height: (note.accuracy ?? 0) + '%' }}/></div><small>{note.accuracy === null ? t('report.unheard') : percentText(note.accuracy)}</small><span className="note-direction">{note.accuracy === null ? t('report.tryNote') : note.accuracy >= 75 ? t('report.center') : (note.offset ?? 0) < -35 ? t('report.lower') : (note.offset ?? 0) > 35 ? t('report.higher') : t('report.keepNote')}</span></button>)}</div>
      <details className="measurement-details"><summary>{t('report.measure')}</summary><p>{t('report.measure.body', { sign: (result.offset ?? 0) > 0 ? '+' : '', offset: points(result.offset ?? 0), spread: points(result.steadiness ?? 0) })}</p><p>{t('report.measure.feel')}</p></details>
    </>}
    <div className="inline-actions"><button className="secondary" onClick={onSpeak}>{playing ? <Square size={15}/> : <Volume2 size={16}/>} {playing ? t('report.stop') : t('report.hearFeedback')}</button><button className="text-button" onClick={onNext}>{t('report.another')} <ArrowRight size={16}/></button></div>
  </section>
}
