import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Leaf, Play, Square } from 'lucide-react'
import { speak, stopPlayback } from './audio'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { formatInteger, localizeKnown } from './i18n/translate'
import { useI18n } from './i18n/useI18n'

export function Warmup({ voice, onDone }: { voice: boolean; onDone: () => void }) {
  const { t } = useI18n()
  const stages = [
    { label: t('warm.s0.label'), hint: t('warm.s0.hint'), seconds: 8, kind: 'rest' },
    { label: t('warm.s1.label'), hint: t('warm.s1.hint'), seconds: 3, kind: 'in' },
    { label: t('warm.s2.label'), hint: t('warm.s2.hint'), seconds: 4, kind: 'out' },
    { label: t('warm.s1.label'), hint: t('warm.s3.hint'), seconds: 3, kind: 'in' },
    { label: t('warm.s2.label'), hint: t('warm.s4.hint'), seconds: 4, kind: 'out' },
    { label: t('warm.s5.label'), hint: t('warm.s5.hint'), seconds: 6, kind: 'rest' },
  ]
  const [running, setRunning] = useState(false), [time, setTime] = useState(0), [intro, setIntro] = useState(false), [error, setError] = useState('')
  const token = useRef(0), timer = useRef(0), total = stages.reduce((s, stage) => s + stage.seconds, 0)
  function stop() { token.current++; clearInterval(timer.current); stopPlayback(); setRunning(false); setIntro(false) }
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', hidden)
    const listener = Capacitor.isNativePlatform() ? NativeApp.addListener('appStateChange', s => { if (!s.isActive) stop() }) : null
    return () => { document.removeEventListener('visibilitychange', hidden); void listener?.then(l => l.remove()); stop() }
  }, [])
  async function start() {
    stop(); const gen = token.current; setTime(0); setRunning(true); setError('')
    if (voice) { setIntro(true); try { const completed = await speak('warmup'); if (completed === false) { if (gen === token.current) { setRunning(false); setIntro(false) }; return } } catch { if (gen === token.current) setError('Audio was unavailable. Follow the guide below.') } }
    if (gen !== token.current) return
    setIntro(false); const began = performance.now()
    timer.current = window.setInterval(() => { const elapsed = (performance.now() - began) / 1000; setTime(Math.min(total, elapsed)); if (elapsed >= total) { clearInterval(timer.current); setRunning(false) } }, 100)
  }
  let boundary = 0
  const stage = stages.find(s => { boundary += s.seconds; return time < boundary }) ?? stages[stages.length - 1]
  const complete = time >= total
  return <section className="warmup-card"><div><span className="eyebrow"><Leaf size={14}/> {t('warm.eyebrow')}</span><h2>{complete ? t('warm.title.done') : t('warm.title.arrive')}</h2><p>{running ? intro ? t('warm.body.listen') : stage.hint : complete ? t('warm.body.done') : t('warm.body.idle')}</p><div className="inline-actions">{running ? <button className="secondary" onClick={stop}><Square size={14}/> {t('warm.stop')}</button> : complete ? <button className="primary" onClick={onDone}>{t('warm.ready')} <ArrowRight size={16}/></button> : <button className="secondary" onClick={() => void start()}><Play size={14}/> {t('warm.begin')}</button>}<span className="small">{t('warm.meta')}</span></div>{error && <p className="small" role="status">{localizeKnown(error)}</p>}</div><div className={'breath-orb ' + (running && !intro ? stage.kind : '')} style={{ '--breath-seconds': `${stage.seconds}s` } as CSSProperties}><span>{complete ? t('warm.orb.ready') : running ? intro ? t('warm.orb.listen') : stage.label : t('warm.orb.moment')}</span>{running && !intro && <small>{t('studio.seconds', { n: formatInteger(Math.ceil(total - time)) })}</small>}</div></section>
}
