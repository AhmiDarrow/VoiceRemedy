import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, AudioLines, Check, CircleHelp, Headphones, Heart, Home, Leaf, Mic, Music2, ShieldCheck, Sparkles, Square, TrendingUp, Volume2, VolumeX, Wind, X } from 'lucide-react'
import { lessons, readyForNext, recommendedLesson, type Lesson } from './course'
import { midiNumber, noteName, type Result } from './pitch'
import { microphoneError, playNotes, speak, stopPlayback } from './audio'
import { loadResults, saveResults, loadPreferences, savePreferences } from './storage'
import { assessment, MIN_SAMPLES, type SingingResult, type PracticeMode } from './coaching'
import { usePractice } from './usePractice'
import { PitchFinder } from './PitchFinder'
import { Warmup } from './Warmup'
import { CourseMap } from './CourseMap'
import { SessionReport } from './SessionReport'
import { PracticeGuide } from './PracticeGuide'
import { LanguageField } from './i18n/LanguageField'
import { presentLesson } from './i18n/content'
import { formatDate, formatInteger, formatPercentPoints, localizeKnown } from './i18n/translate'
import { useI18n } from './i18n/useI18n'
type Page = 'home' | 'lessons' | 'studio' | 'progress'
const clock = (seconds: number) => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
export default function App() {
  const { locale, t } = useI18n()
  const [preferences] = useState(loadPreferences)
  const [page, setPage] = useState<Page>('home'), [lesson, setLesson] = useState<Lesson>(lessons[0])
  const [base, setBase] = useState(preferences.base), [voice, setVoice] = useState(preferences.voice), [help, setHelp] = useState(false)
  const [mode, setMode] = useState<PracticeMode>(preferences.mode), [gentle, setGentle] = useState(preferences.gentle)
  const [finder, setFinder] = useState(false), [finding, setFinding] = useState(false)
  const [error, setError] = useState(''), [playing, setPlaying] = useState(false)
  const [results, setResults] = useState<Result[]>(loadResults), [result, setResult] = useState<SingingResult | null>(null)
  const playbackGeneration = useRef(0), resultPanel = useRef<HTMLElement | null>(null), helpReturnFocus = useRef<HTMLElement | null>(null)
  const preferenceReady = useRef(false)
  const practice = usePractice(lesson, base, mode, gentle, complete, setError)
  const { status, pitch, elapsed, phase, trace, finish, cancel: cancelSession } = practice
  const step = phase?.step ?? 0, target = phase?.midi ?? base + lesson.intervals[0]
  const busy = status !== 'idle' || finding
  const liveCents = phase?.kind === 'sing' && pitch.hz ? (midiNumber(pitch.hz) - target) * 100 : null
  const completed = new Set(results.filter(r => r.samples >= MIN_SAMPLES).map(r => r.exercise))
  const nextLesson = recommendedLesson(results)
  const readyCount = lessons.filter(l => readyForNext(l.id, results)).length
  const review = result ? assessment(result) : null
  const shown = presentLesson(lesson)
  const nav: { id: Page; icon: typeof Home; label: string }[] = [
    { id: 'home', icon: Home, label: t('studio.nav.home') },
    { id: 'lessons', icon: Music2, label: t('studio.nav.lessons') },
    { id: 'studio', icon: Mic, label: t('studio.nav.studio') },
    { id: 'progress', icon: TrendingUp, label: t('studio.nav.progress') },
  ]

  function stopSound() { playbackGeneration.current++; stopPlayback(); setPlaying(false) }
  function navigate(next: Page) { cancelSession(); stopSound(); setFinder(false); setFinding(false); setPage(next); setError(''); setResult(null); window.scrollTo?.({ top: 0, behavior: 'instant' }) }
  function choose(next: Lesson) { navigate('studio'); setLesson(next) }
  async function sound(kind: 'coach' | 'notes' | 'welcome' | 'feedback', note?: number) {
    stopSound(); const gen = playbackGeneration.current; setPlaying(true); setError('')
    try {
      if (kind === 'notes') await playNotes(note === undefined ? lesson.intervals.map(i => base + i) : [note], note === undefined ? lesson : {})
      else await speak(kind === 'welcome' ? 'welcome' : kind === 'feedback' && result ? assessment(result).key : lesson.id)
    } catch (e) { if (gen === playbackGeneration.current) setError(microphoneError(e)) }
    finally { if (gen === playbackGeneration.current) setPlaying(false) }
  }
  function start() { if (busy) return; stopSound(); setError(''); setResult(null); setFinder(false); void practice.start() }
  function complete(summary: SingingResult) {
    setResult(summary)
    if (summary.samples >= MIN_SAMPLES) {
      const next = [summary, ...results].slice(0, 200); setResults(next)
      try { saveResults(next) } catch { setError('Your practice is complete, but this device could not save it. Storage may be full or disabled.') }
    }
    if (voice) {
      const gen = ++playbackGeneration.current; setPlaying(true)
      void speak(assessment(summary).key).catch(e => { if (gen === playbackGeneration.current) setError(microphoneError(e)) }).finally(() => { if (gen === playbackGeneration.current) setPlaying(false) })
    }
  }
  function actOnFeedback() {
    stopSound()
    if (!review) return
    if (review.key === 'no-signal' || review.key === 'octave') { setFinder(true); resultPanel.current?.closest('main')?.scrollIntoView?.(); return }
    if (review.key === 'coverage') { setMode('echo'); setResult(null); return }
    if (review.key === 'steady') { setGentle(true); setResult(null); return }
    if (review.key === 'great') { if (mode === 'echo') { setMode('phrase'); setResult(null) } else choose(lessons[(lessons.findIndex(l => l.id === lesson.id) + 1) % lessons.length]); return }
    const weakest = result?.notes.filter(n => n.accuracy !== null).sort((a,b) => a.accuracy! - b.accuracy!)[0]
    if (weakest) void sound('notes', weakest.midi)
  }
  useEffect(() => {
    if (!preferenceReady.current) { preferenceReady.current = true; return }
    try { savePreferences({ ...loadPreferences(), base, voice, mode, gentle, locale }) } catch { setError('Preferences could not be saved on this device.') }
  }, [base, voice, mode, gentle, locale])
  useEffect(() => { if (result) resultPanel.current?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }) }, [result])
  useEffect(() => { if (status === 'listening') document.querySelector('.pitch-card')?.scrollIntoView?.({ block: 'start', behavior: 'instant' }) }, [status])
  useEffect(() => { if (help) return () => helpReturnFocus.current?.focus() }, [help])
  useEffect(() => { const hidden = () => { if (document.hidden) stopSound() }; document.addEventListener('visibilitychange', hidden); return () => { document.removeEventListener('visibilitychange', hidden); stopPlayback() } }, [])
  const turnDetail = phase?.kind === 'sing'
    ? t('studio.turn.sing', { sound: shown.lyrics?.[step] ?? `“${shown.syllable}”`, note: noteName(target) })
    : phase?.kind === 'listen'
      ? (shown.lyrics?.[step] ? t('studio.turn.listenLyric', { note: noteName(target), word: shown.lyrics[step] }) : t('studio.turn.listenHint', { note: noteName(target) }))
      : t('studio.turn.easy')
  return <div className="app"><a className="skip-link" href="#main-content">{t('studio.skip')}</a>
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('home')} aria-label={t('studio.homeAria')}><span className="brand-mark"><AudioLines size={26}/></span><span>voice<span className="brand-light">remedy</span><small>{t('studio.tagline')}</small></span></button>
      <div className="nav-label">{t('studio.navLabel')}</div>
      <nav aria-label={t('studio.navAria')}>{nav.map(({ id, icon: Icon, label }) => <button key={id} aria-current={page === id ? 'page' : undefined} className={page === id ? 'nav active' : 'nav'} onClick={() => navigate(id)}><Icon size={19}/><span>{label}</span>{page === id && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-note"><Leaf size={22}/><p>{t('studio.sidebar')}<br/><strong>{t('studio.sidebarStrong')}</strong></p></div>
      <button className="help-button" onClick={e => { helpReturnFocus.current = e.currentTarget; setHelp(true) }}><CircleHelp size={18}/> {t('studio.helpButton')}</button>
      <div className="local"><span/> {t('studio.local')}</div>
    </aside>
    <main id="main-content" tabIndex={-1}>
      <header className="topbar"><span>{t('studio.topbar')}</span><div><span className="private"><ShieldCheck size={15}/> {t('studio.private')}</span><button className="icon-button mobile-help" aria-label={t('studio.helpAria')} onClick={e => { helpReturnFocus.current = e.currentTarget; setHelp(true) }}><CircleHelp size={18}/></button><button className="icon-button" aria-label={voice ? t('studio.voiceOff') : t('studio.voiceOn')} title={voice ? t('studio.voiceTitleOn') : t('studio.voiceTitleOff')} onClick={() => { setVoice(!voice); stopSound() }}>{voice ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button></div></header>
      {error && <div className="error" role="alert">{localizeKnown(error)}<button className="icon-button" aria-label={t('studio.dismiss')} onClick={() => setError('')}><X size={17}/></button></div>}
      {page === 'home' && <div className="page enter">
        <div className="greeting"><span className="eyebrow"><span className="tiny-sun"/> {t('studio.home.eyebrow')}</span><h1>{t('studio.home.h1')}<br/><em>{t('studio.home.h1em')}</em></h1><p>{t('studio.home.lead1')}<br className="desktop-break"/>{t('studio.home.lead2')}</p></div>
        <section className="hero-card">
          <div className="hero-copy"><span className="pill"><Sparkles size={13}/> {results.length ? t('studio.pill.next') : t('studio.pill.start')}</span><h2>{results.length ? presentLesson(nextLesson).title : t('studio.hero.first')}</h2><p>{t('studio.hero.p1')}<br/>{t('studio.hero.p2')}</p><button className="primary" onClick={() => choose(nextLesson)}> {results.length ? t('studio.continue') : t('studio.find')} <ArrowRight size={18}/></button><div className="hero-meta"><span><Headphones size={14}/> {t('studio.meta.spoken')}</span><span>{t('studio.meta.beginner')}</span><span>{t('studio.meta.account')}</span></div></div>
          <div className="voice-art" aria-hidden="true"><div className="orbit o1"/><div className="orbit o2"/><div className="orbit o3"/><div className="orbit o4"/><div className="art-center"><AudioLines size={66} strokeWidth={1.2}/></div><span className="art-note n1">♪</span><span className="art-note n2">♫</span><span className="art-dot d1"/><span className="art-dot d2"/><span className="art-caption">{t('studio.art')}</span></div>
        </section>
        <Warmup voice={voice} onDone={() => choose(nextLesson)}/><section className="journey-strip"><div><span className="eyebrow">{t('studio.journey.eyebrow')}</span><h3>{t('studio.journey.title')}</h3></div><span>{t('studio.milestones', { ready: formatInteger(readyCount), total: formatInteger(lessons.length) })}</span><button className="text-button" onClick={() => navigate('lessons')}>{t('studio.seePath')} <ArrowRight size={16}/></button></section><div className="section-heading"><h2>{t('studio.beginHeading')}</h2><button className="text-button" onClick={() => navigate('lessons')}>{t('studio.explore')} <ArrowRight size={16}/></button></div>
        <div className="lesson-grid">{lessons.slice(0, 3).map((l, i) => { const card = presentLesson(l); return <button className={'lesson-card tone-' + i} key={l.id} onClick={() => choose(l)}><div className="card-top"><span className="lesson-symbol">{i === 0 ? <Headphones/> : i === 1 ? <Wind/> : <Music2/>}</span><span className="duration">{card.minutes}</span></div><span className="eyebrow">0{i + 1} / {card.label}</span><h3>{card.title}</h3><p>{card.description}</p><span className="card-link">{completed.has(l.id) ? t('studio.card.again') : t('studio.card.try')} <ArrowRight size={17}/></span></button> })}</div>
        <section className="coach-strip"><div className="coach-avatar"><AudioLines size={23}/></div><div><span className="eyebrow">{t('studio.coach.eyebrow')}</span><h3>{t('studio.coach.title')}</h3><p>{t('studio.coach.body')}</p></div><button className="secondary" onClick={() => playing ? stopSound() : void sound('welcome')}>{playing ? <Square size={15}/> : <Volume2 size={16}/>} {playing ? t('studio.stopAudio') : t('studio.meet')}</button></section>
        <PracticeGuide/><p className="footer-note"><Heart size={14}/> {t('studio.footer')}</p>
      </div>}
      {page === 'lessons' && <div className="page enter"><span className="eyebrow">{t('studio.lessons.eyebrow')}</span><h1>{t('studio.lessons.h1')} <em>{t('studio.lessons.h1em')}</em></h1><p className="intro">{t('studio.lessons.p1')}<br/>{t('studio.lessons.p2')}</p><CourseMap results={results} onChoose={choose}/><div className="gentle-note"><Leaf/><p>{t('studio.gentle')}</p></div></div>}
      {page === 'studio' && <div className="page enter"><button className="text-button back" onClick={() => navigate('lessons')}><ArrowLeft size={15}/> {t('studio.allLessons')}</button><div className="studio-heading"><div><span className="eyebrow">{t('studio.studioEyebrow', { label: shown.label })}</span><h1>{shown.title}</h1><p className="intro">{shown.description}</p></div><span className={'status ' + (status === 'listening' ? 'is-live' : '')}><span/>{status === 'listening' ? t('studio.status.listening') : status === 'opening' ? t('studio.status.opening') : t('studio.status.off')}</span></div>
        <section className="practice-settings" aria-label={t('studio.settings')}><LanguageField disabled={busy}/><div><span className="settings-label">{t('studio.how')}</span><div className="segmented"><button disabled={busy} aria-pressed={mode === 'echo'} onClick={() => { stopSound(); setMode('echo'); setResult(null) }}><Headphones size={15}/> {t('studio.echo')}</button><button disabled={busy} aria-pressed={mode === 'phrase'} onClick={() => { stopSound(); setMode('phrase'); setResult(null) }}><Music2 size={15}/> {t('studio.phrase')}</button></div></div><label className="gentle-toggle"><input type="checkbox" checked={gentle} disabled={busy} onChange={e => { setGentle(e.target.checked); setResult(null) }}/><span>{t('studio.gentlePace')}<small>{t('studio.gentleSmall')}</small></span></label><button className="text-button" disabled={busy} onClick={() => { stopSound(); setFinder(!finder) }}><Mic size={15}/> {t('studio.findNote')}</button></section>
        {finder && <PitchFinder onBusy={setFinding} onClose={() => setFinder(false)} onSelect={note => { setBase(note); setFinder(false); setResult(null) }}/>}<div className="studio-layout"><section className="pitch-card"><div className="pitch-top"><span className="eyebrow">{shown.lyrics ? t('studio.eyebrow.words') : t('studio.eyebrow.syllable', { syllable: shown.syllable.toUpperCase() })}</span><span className="timer">{clock(elapsed)} / {clock(practice.duration)}</span></div>
          <div className="target-picker"><button className="icon-button" aria-label={t('studio.lower')} disabled={busy || base <= 45} onClick={() => { stopSound(); setBase(base - 1); setResult(null) }}>−</button><div><span>{t('studio.starting')}</span><strong>{noteName(base)}</strong></div><button className="icon-button" aria-label={t('studio.raise')} disabled={busy || base >= 74} onClick={() => { stopSound(); setBase(base + 1); setResult(null) }}>+</button><button className="hear-note" disabled={busy} onClick={() => playing ? stopSound() : void sound('notes')}>{playing ? <Square size={16}/> : <Volume2 size={17}/>} {playing ? t('studio.stop') : lesson.intervals.length > 1 ? t('studio.hearPattern') : t('studio.hearNote')}</button></div>
          <div className="practice-actions">{status === 'listening' ? <button className="primary" onClick={finish}><Square size={16}/> {t('studio.finish')}</button> : status === 'opening' ? <button className="secondary" onClick={cancelSession}>{t('studio.cancelMic')}</button> : <button className="primary" disabled={finding} onClick={start}><Mic size={18}/> {result ? t('studio.tryAgain') : t('studio.startListening')}</button>}</div><div className={'turn-cue ' + (phase?.kind ?? 'idle')} aria-live="polite"><span className="turn-icon">{phase?.kind === 'listen' ? <Headphones size={19}/> : phase?.kind === 'sing' ? <Mic size={19}/> : <Wind size={19}/>}</span><div><strong>{phase?.kind === 'listen' ? t('studio.turn.listen') : phase?.kind === 'sing' ? t('studio.turn.yours') : phase?.kind === 'rest' ? t('studio.turn.rest') : phase ? t('studio.turn.comfort') : mode === 'echo' ? t('studio.turn.echo') : t('studio.turn.phrase')}</strong><span>{turnDetail}</span></div>{phase && <small>{t('studio.seconds', { n: formatInteger(Math.max(1, Math.ceil(phase.end - elapsed))) })}</small>}</div>
          <div className="turn-progress" role="progressbar" aria-label={t('studio.progressAria')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={phase ? Math.round((elapsed - phase.start) / (phase.end - phase.start) * 100) : 0}><i style={{ width: phase ? Math.min(100, (elapsed - phase.start) / (phase.end - phase.start) * 100) + '%' : '0%' }}/></div>
          <div className="pitch-readout"><span>{phase?.kind === 'sing' ? t('studio.readout.voice', { note: noteName(target) }) : phase?.kind === 'listen' ? t('studio.readout.reference') : t('studio.readout.listening')}</span><strong>{phase?.kind === 'listen' ? noteName(target) : phase?.kind === 'sing' && pitch.hz ? noteName(midiNumber(pitch.hz)) : '—'}<small>{phase?.kind === 'sing' && pitch.hz ? t('studio.hz', { n: formatInteger(Math.round(pitch.hz)) }) : t('studio.readout.only')}</small></strong><p>{liveCents === null ? (phase?.kind === 'sing' ? t('studio.humReady') : t('studio.noRush')) : Math.abs(liveCents) <= 35 ? t('studio.closeCenter') : Math.abs(liveCents) > 700 ? t('studio.octaveHint') : liveCents < 0 ? t('studio.littleLow') : t('studio.littleHigh')}</p></div>
          <div className="pitch-chart"><div className="pitch-zone"/><div className="center-line"/><span className="chart-label high">{t('studio.chart.higher')}</span><span className="chart-label center">{noteName(target)}</span><span className="chart-label low">{t('studio.chart.lower')}</span><svg viewBox="0 0 600 150" preserveAspectRatio="none" role="img" aria-label={t('studio.chart.aria')}><path d={trace.map((c, i) => c === null ? '' : `${i === 0 || trace[i - 1] === null ? 'M' : 'L'} ${i * 600 / 89} ${75 - Math.max(-150, Math.min(150, c)) / 150 * 65}`).join(' ')} fill="none" stroke="#baddae" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg></div>
          <div className="chart-legend"><span><i/> {t('studio.legend.pitch')}</span><span>{t('studio.legend.center')}</span></div>
          {lesson.intervals.length > 1 && <div className="pattern" aria-label={t('studio.pattern')}>{lesson.intervals.map((n, i) => <span key={i} className={i === step ? 'current' : ''}>{noteName(base + n)}{shown.lyrics?.[i] && <small>{shown.lyrics[i]}</small>}</span>)}</div>}
          <div className="mic-level"><Mic size={13}/><span>{t('studio.input')}</span><div><i style={{ width: `${Math.min(100, pitch.level * 650)}%` }}/></div><span>{status === 'listening' ? pitch.level < 0.008 ? t('studio.quiet') : pitch.hz ? t('studio.detected') : t('studio.noPitch') : t('studio.off')}</span></div>
          <p className="micro-copy">{t('studio.privacy')}</p>
        </section><aside className="instruction-card"><div className="eyebrow"><Leaf size={15}/> {t('studio.guide.eyebrow')}</div><h2>{t('studio.guide.title')}</h2><ol>{shown.steps.map((s, i) => <li key={i}>{s}</li>)}</ol><button className="secondary full" disabled={busy} onClick={() => playing ? stopSound() : void sound('coach')}>{playing ? <Square size={16}/> : <Volume2 size={16}/>} {playing ? t('studio.stopGuidance') : t('studio.talk')}</button><div className="teaching-note"><span className="eyebrow">{t('studio.why')}</span><p>{shown.why}</p><span className="eyebrow">{t('studio.listenFor')}</span><p>{shown.listenFor}</p></div><div className="tip"><Sparkles size={18}/><p>{shown.tip}</p></div><p className="small">{t('studio.aside')}</p></aside></div>
        {result && <SessionReport result={result} results={results} lesson={lesson} playing={playing} panelRef={resultPanel} onSpeak={() => playing ? stopSound() : void sound('feedback')} onNote={note => void sound('notes', note)} onAction={actOnFeedback} onNext={() => choose(lessons[(lessons.findIndex(l => l.id === lesson.id) + 1) % lessons.length])}/>}
      </div>}
      {page === 'progress' && <div className="page enter"><span className="eyebrow">{t('progress.eyebrow')}</span><h1>{t('progress.h1')} <em>{t('progress.h1em')}</em></h1><p className="intro">{t('progress.lead')}</p><div className="progress-stats"><div><strong>{formatInteger(results.length)}</strong><span>{t('progress.practices')}</span></div><div><strong>{formatInteger(Math.round(results.reduce((a, r) => a + r.seconds, 0) / 60))}</strong><span>{t('progress.minutes')}</span></div><div><strong>{formatInteger(readyCount)}<small> / {formatInteger(lessons.length)}</small></strong><span>{t('progress.milestones')}</span></div></div>{!results.length ? <div className="empty"><Leaf size={36}/><h2>{t('progress.empty.title')}</h2><p>{t('progress.empty.body')}</p><button className="primary" onClick={() => choose(lessons[0])}>{t('progress.first')} <ArrowRight size={17}/></button></div> : <div className="history">{results.map(r => { const found = lessons.find(l => l.id === r.exercise); return <div className="history-row" key={r.id}><span className="history-icon"><Music2 size={18}/></span><div><h3>{found ? presentLesson(found).title : t('progress.fallback')}</h3><p>{t('progress.when', { date: formatDate(r.date), seconds: formatInteger(r.seconds) })}</p></div><span><strong>{typeof r.accuracy === 'number' ? formatPercentPoints(r.accuracy) : String(r.accuracy) + '%'}</strong><small>{t('progress.close')}</small></span></div> })}</div>}<div className="gentle-note"><Heart/><p>{t('progress.note')}</p></div></div>}
    </main>
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setHelp(false); if (e.key === 'Tab') { const buttons = e.currentTarget.querySelectorAll('button'); const first = buttons[0], last = buttons[buttons.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() } } }}><button autoFocus className="icon-button modal-close" aria-label={t('help.close')} onClick={() => setHelp(false)}><X/></button><span className="eyebrow">{t('help.eyebrow')}</span><h2 id="help-title">{t('help.title')}</h2><p><strong>{t('help.s1')}</strong> {t('help.b1')}</p><p><strong>{t('help.s2')}</strong> {t('help.b2')}</p><p><strong>{t('help.s3')}</strong> {t('help.b3')}</p><p>{t('help.more')}</p><p>{t('app.spoken')}</p><p className="small">{t('help.footer')}</p><button className="primary full" onClick={() => setHelp(false)}>{t('help.ok')} <Check size={17}/></button></section></div>}
  </div>
}
