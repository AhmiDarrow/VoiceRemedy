import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, AudioLines, Check, ChevronRight, CircleHelp, Headphones, Heart, Home, Leaf, Mic, Music2, ShieldCheck, Sparkles, Square, TrendingUp, Volume2, VolumeX, Wind, X } from 'lucide-react'
import { coachText } from './lessons'
import { lessons, chapters, readyForNext, recommendedLesson, type Lesson } from './course'
import { midiNumber, noteName, type Result } from './pitch'
import { microphoneError, playNotes, speak, stopPlayback } from './audio'
import { loadResults, saveResults, loadPreferences, savePreferences } from './storage'
import { assessment, comparablePrevious, MIN_SAMPLES, type SingingResult, type PracticeMode } from './coaching'
import { usePractice } from './usePractice'
import { PitchFinder } from './PitchFinder'
import { Warmup } from './Warmup'
import { CourseMap } from './CourseMap'
import { SessionReport } from './SessionReport'
import { PracticeGuide } from './PracticeGuide'
type Page = 'home' | 'lessons' | 'studio' | 'progress'
const clock = (seconds: number) => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
export default function App() {
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
    try { savePreferences({ base, voice, mode, gentle }) } catch { setError('Preferences could not be saved on this device.') }
  }, [base, voice, mode, gentle])
  useEffect(() => { if (result) resultPanel.current?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }) }, [result])
  useEffect(() => { if (status === 'listening') document.querySelector('.pitch-card')?.scrollIntoView?.({ block: 'start', behavior: 'instant' }) }, [status])
  useEffect(() => { if (help) return () => helpReturnFocus.current?.focus() }, [help])
  useEffect(() => { const hidden = () => { if (document.hidden) stopSound() }; document.addEventListener('visibilitychange', hidden); return () => { document.removeEventListener('visibilitychange', hidden); stopPlayback() } }, [])
  return <div className="app"><a className="skip-link" href="#main-content">Skip to your studio</a>
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('home')} aria-label="VoiceRemedy home"><span className="brand-mark"><AudioLines size={26}/></span><span>voice<span className="brand-light">remedy</span><small>A LITTLE SPACE TO GROW</small></span></button>
      <div className="nav-label">YOUR STUDIO</div>
      <nav aria-label="Main navigation">{([['home', Home, 'My space'], ['lessons', Music2, 'Learn to sing'], ['studio', Mic, 'Practice studio'], ['progress', TrendingUp, 'My progress']] as const).map(([id, Icon, label]) => <button key={id} aria-current={page === id ? 'page' : undefined} className={page === id ? 'nav active' : 'nav'} onClick={() => navigate(id)}><Icon size={19}/><span>{label}</span>{page === id && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-note"><Leaf size={22}/><p>Your voice is already yours.<br/><strong>Let’s help you feel at home in it.</strong></p></div>
      <button className="help-button" onClick={e => { helpReturnFocus.current = e.currentTarget; setHelp(true) }}><CircleHelp size={18}/> A few things to know</button>
      <div className="local"><span/> On your device. Just for you.</div>
    </aside>
    <main id="main-content" tabIndex={-1}>
      <header className="topbar"><span>YOUR VOICE. YOUR PACE.</span><div><span className="private"><ShieldCheck size={15}/> Private by nature</span><button className="icon-button mobile-help" aria-label="How to use VoiceRemedy" onClick={e => { helpReturnFocus.current = e.currentTarget; setHelp(true) }}><CircleHelp size={18}/></button><button className="icon-button" aria-label={voice ? 'Turn spoken feedback off' : 'Turn spoken feedback on'} title={voice ? 'Spoken feedback on' : 'Spoken feedback off'} onClick={() => { setVoice(!voice); stopSound() }}>{voice ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button></div></header>
      {error && <div className="error" role="alert">{error}<button className="icon-button" aria-label="Dismiss message" onClick={() => setError('')}><X size={17}/></button></div>}
      {page === 'home' && <div className="page enter">
        <div className="greeting"><span className="eyebrow"><span className="tiny-sun"/> A FRESH NOTE, A FRESH START</span><h1>Make room for<br/><em>your voice.</em></h1><p>You don’t need to be a “natural.” Just a little curiosity,<br className="desktop-break"/> a quiet moment, and somewhere to begin.</p></div>
        <section className="hero-card">
          <div className="hero-copy"><span className="pill"><Sparkles size={13}/> {results.length ? 'YOUR NEXT LITTLE STEP' : 'LET’S START SOMETHING GOOD'}</span><h2>{results.length ? nextLesson.title : 'Your first note is enough.'}</h2><p>Meet your voice with a gentle, guided practice.<br/>Listen to a note, sing it back, and we’ll help you find it.</p><button className="primary" onClick={() => choose(nextLesson)}> {results.length ? 'Continue my practice' : 'Let’s find my voice'} <ArrowRight size={18}/></button><div className="hero-meta"><span><Headphones size={14}/> Spoken guidance</span><span>Beginner friendly</span><span>No account needed</span></div></div>
          <div className="voice-art" aria-hidden="true"><div className="orbit o1"/><div className="orbit o2"/><div className="orbit o3"/><div className="orbit o4"/><div className="art-center"><AudioLines size={66} strokeWidth={1.2}/></div><span className="art-note n1">♪</span><span className="art-note n2">♫</span><span className="art-dot d1"/><span className="art-dot d2"/><span className="art-caption">a little softer. a little braver.</span></div>
        </section>
        <Warmup voice={voice} onDone={() => choose(nextLesson)}/><section className="journey-strip"><div><span className="eyebrow">FROM YOUR FIRST HUM TO YOUR FIRST SONG</span><h3>A real path. One skill at a time.</h3></div><span>{readyCount} / {lessons.length} milestones</span><button className="text-button" onClick={() => navigate('lessons')}>See my path <ArrowRight size={16}/></button></section><div className="section-heading"><h2>A good place to begin</h2><button className="text-button" onClick={() => navigate('lessons')}>Explore your lessons <ArrowRight size={16}/></button></div>
        <div className="lesson-grid">{lessons.slice(0, 3).map((l, i) => <button className={'lesson-card tone-' + i} key={l.id} onClick={() => choose(l)}><div className="card-top"><span className="lesson-symbol">{i === 0 ? <Headphones/> : i === 1 ? <Wind/> : <Music2/>}</span><span className="duration">{l.minutes}</span></div><span className="eyebrow">0{i + 1} / {l.label}</span><h3>{l.title}</h3><p>{l.description}</p><span className="card-link">{completed.has(l.id) ? 'Practice again' : 'Try this practice'} <ArrowRight size={17}/></span></button>)}</div>
        <section className="coach-strip"><div className="coach-avatar"><AudioLines size={23}/></div><div><span className="eyebrow">A KIND VOICE IN YOUR CORNER</span><h3>Guidance you can hear. Encouragement you can feel.</h3><p>A calm female coach walks you through each practice, then responds to what she hears.</p></div><button className="secondary" onClick={() => playing ? stopSound() : void sound('welcome')}>{playing ? <Square size={15}/> : <Volume2 size={16}/>} {playing ? 'Stop audio' : 'Meet your coach'}</button></section>
        <PracticeGuide/><p className="footer-note"><Heart size={14}/> A few comfortable minutes count. You’re not behind.</p>
      </div>}
      {page === 'lessons' && <div className="page enter"><span className="eyebrow">YOUR PATH FROM FIRST SOUND TO FIRST SONG</span><h1>You can learn <em>this.</em></h1><p className="intro">Learn a small skill, give it some practice, and bring it into music.<br/>Your next step adapts to your recent results. You can explore any lesson.</p><CourseMap results={results} onChoose={choose}/><div className="gentle-note"><Leaf/><p>Practice often in short, comfortable sessions. If your voice is hoarse, tired, or uncomfortable, choose rest. This app teaches and measures pitch skills; a qualified singing teacher can help with technique it cannot assess.</p></div></div>}
      {page === 'studio' && <div className="page enter"><button className="text-button back" onClick={() => navigate('lessons')}><ArrowLeft size={15}/> All lessons</button><div className="studio-heading"><div><span className="eyebrow">YOUR PRACTICE STUDIO / {lesson.label}</span><h1>{lesson.title}</h1><p className="intro">{lesson.description}</p></div><span className={'status ' + (status === 'listening' ? 'is-live' : '')}><span/>{status === 'listening' ? 'Listening to you' : status === 'opening' ? 'Opening microphone…' : 'Microphone off'}</span></div>
        <section className="practice-settings" aria-label="Practice preferences"><div><span className="settings-label">HOW WE PRACTICE</span><div className="segmented"><button disabled={busy} aria-pressed={mode === 'echo'} onClick={() => { stopSound(); setMode('echo'); setResult(null) }}><Headphones size={15}/> Echo each note</button><button disabled={busy} aria-pressed={mode === 'phrase'} onClick={() => { stopSound(); setMode('phrase'); setResult(null) }}><Music2 size={15}/> Sing a phrase</button></div></div><label className="gentle-toggle"><input type="checkbox" checked={gentle} disabled={busy} onChange={e => { setGentle(e.target.checked); setResult(null) }}/><span>Gentle pace<small>Shorter echoes · more breathing space</small></span></label><button className="text-button" disabled={busy} onClick={() => { stopSound(); setFinder(!finder) }}><Mic size={15}/> Find my comfortable note</button></section>
        {finder && <PitchFinder onBusy={setFinding} onClose={() => setFinder(false)} onSelect={note => { setBase(note); setFinder(false); setResult(null) }}/>}<div className="studio-layout"><section className="pitch-card"><div className="pitch-top"><span className="eyebrow">{lesson.lyrics ? 'FOLLOW THE WORDS, ONE NOTE AT A TIME' : 'LISTEN, THEN SING “' + lesson.syllable.toUpperCase() + '”'}</span><span className="timer">{clock(elapsed)} / {clock(practice.duration)}</span></div>
          <div className="target-picker"><button className="icon-button" aria-label="Lower starting note" disabled={busy || base <= 45} onClick={() => { stopSound(); setBase(base - 1); setResult(null) }}>−</button><div><span>Starting note</span><strong>{noteName(base)}</strong></div><button className="icon-button" aria-label="Raise starting note" disabled={busy || base >= 74} onClick={() => { stopSound(); setBase(base + 1); setResult(null) }}>+</button><button className="hear-note" disabled={busy} onClick={() => playing ? stopSound() : void sound('notes')}>{playing ? <Square size={16}/> : <Volume2 size={17}/>} {playing ? 'Stop' : 'Hear ' + (lesson.intervals.length > 1 ? 'pattern' : 'note')}</button></div>
          <div className="practice-actions">{status === 'listening' ? <button className="primary" onClick={finish}><Square size={16}/> Finish & hear feedback</button> : status === 'opening' ? <button className="secondary" onClick={cancelSession}>Cancel microphone request</button> : <button className="primary" disabled={finding} onClick={start}><Mic size={18}/> {result ? 'Try again, gently' : 'Start listening'}</button>}</div><div className={'turn-cue ' + (phase?.kind ?? 'idle')} aria-live="polite"><span className="turn-icon">{phase?.kind === 'listen' ? <Headphones size={19}/> : phase?.kind === 'sing' ? <Mic size={19}/> : <Wind size={19}/>}</span><div><strong>{phase?.kind === 'listen' ? 'Listen to this note' : phase?.kind === 'sing' ? 'Your turn' : phase?.kind === 'rest' ? 'Rest & breathe' : phase ? 'Get comfortable' : mode === 'echo' ? 'I play a note. You sing it back.' : 'Hear the phrase. Then make it yours.'}</strong><span>{phase?.kind === 'sing' ? 'Sing ' + (lesson.lyrics?.[step] ?? '“' + lesson.syllable + '”') + ' · aim for ' + noteName(target) : phase?.kind === 'listen' ? noteName(target) + (lesson.lyrics?.[step] ? ' · ' + lesson.lyrics[step] : '') + ' · no need to sing yet' : 'An easy sound is enough.'}</span></div>{phase && <small>{Math.max(1, Math.ceil(phase.end - elapsed))}s</small>}</div>
          <div className="turn-progress" role="progressbar" aria-label="Current turn" aria-valuemin={0} aria-valuemax={100} aria-valuenow={phase ? Math.round((elapsed - phase.start) / (phase.end - phase.start) * 100) : 0}><i style={{ width: phase ? Math.min(100, (elapsed - phase.start) / (phase.end - phase.start) * 100) + '%' : '0%' }}/></div>
          <div className="pitch-readout"><span>{phase?.kind === 'sing' ? 'Your voice · target ' + noteName(target) : phase?.kind === 'listen' ? 'Reference note' : 'A little listening goes a long way'}</span><strong>{phase?.kind === 'listen' ? noteName(target) : phase?.kind === 'sing' && pitch.hz ? noteName(midiNumber(pitch.hz)) : '—'}<small>{phase?.kind === 'sing' && pitch.hz ? Math.round(pitch.hz) + ' Hz' : 'Only your singing turns are measured'}</small></strong><p>{liveCents === null ? (phase?.kind === 'sing' ? 'Hum softly when you’re ready' : 'Listen first. There is no rush.') : Math.abs(liveCents) <= 35 ? 'You’re close to the center. Keep it easy.' : Math.abs(liveCents) > 700 ? 'A different octave? Try an easier starting note.' : liveCents < 0 ? 'A little low · gently move up' : 'A little high · gently settle down'}</p></div>
          <div className="pitch-chart"><div className="pitch-zone"/><div className="center-line"/><span className="chart-label high">HIGHER</span><span className="chart-label center">{noteName(target)}</span><span className="chart-label low">LOWER</span><svg viewBox="0 0 600 150" preserveAspectRatio="none" role="img" aria-label="Your pitch over the last eight seconds, relative to the target note"><path d={trace.map((c, i) => c === null ? '' : `${i === 0 || trace[i - 1] === null ? 'M' : 'L'} ${i * 600 / 89} ${75 - Math.max(-150, Math.min(150, c)) / 150 * 65}`).join(' ')} fill="none" stroke="#baddae" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg></div>
          <div className="chart-legend"><span><i/> Your pitch</span><span>Center = target note · shaded area ±35 cents</span></div>
          {lesson.intervals.length > 1 && <div className="pattern" aria-label="Exercise notes">{lesson.intervals.map((n, i) => <span key={i} className={i === step ? 'current' : ''}>{noteName(base + n)}{lesson.lyrics?.[i] && <small>{lesson.lyrics[i]}</small>}</span>)}</div>}
          <div className="mic-level"><Mic size={13}/><span>Input</span><div><i style={{ width: `${Math.min(100, pitch.level * 650)}%` }}/></div><span>{status === 'listening' ? pitch.level < 0.008 ? 'Quiet' : pitch.hz ? 'Voice detected' : 'Sound, no clear pitch' : 'Off'}</span></div>
          <p className="micro-copy">Your audio stays here. Nothing is recorded or uploaded.</p>
        </section><aside className="instruction-card"><div className="eyebrow"><Leaf size={15}/> YOUR GENTLE GUIDE</div><h2>One thing at a time.</h2><ol>{lesson.steps.map(s => <li key={s}>{s}</li>)}</ol><button className="secondary full" disabled={busy} onClick={() => playing ? stopSound() : void sound('coach')}>{playing ? <Square size={16}/> : <Volume2 size={16}/>} {playing ? 'Stop guidance' : 'Talk me through it'}</button><div className="teaching-note"><span className="eyebrow">WHY WE PRACTICE THIS</span><p>{lesson.why}</p><span className="eyebrow">LISTEN FOR</span><p>{lesson.listenFor}</p></div><div className="tip"><Sparkles size={18}/><p>{lesson.tip}</p></div><p className="small">The reference and your singing have separate turns. A quiet room helps. The app does not score its own notes.</p></aside></div>
        {result && <SessionReport result={result} results={results} lesson={lesson} playing={playing} panelRef={resultPanel} onSpeak={() => playing ? stopSound() : void sound('feedback')} onNote={note => void sound('notes', note)} onAction={actOnFeedback} onNext={() => choose(lessons[(lessons.findIndex(l => l.id === lesson.id) + 1) % lessons.length])}/>}
      </div>}
      {page === 'progress' && <div className="page enter"><span className="eyebrow">NOT PERFECTION. POSSIBILITY.</span><h1>Look how you’re <em>growing.</em></h1><p className="intro">A record of showing up for your voice. Saved only on this device.</p><div className="progress-stats"><div><strong>{results.length}</strong><span>practices with clear singing</span></div><div><strong>{Math.round(results.reduce((a, r) => a + r.seconds, 0) / 60)}</strong><span>minutes of practice</span></div><div><strong>{readyCount}<small> / {lessons.length}</small></strong><span>practice milestones</span></div></div>{!results.length ? <div className="empty"><Leaf size={36}/><h2>Your story starts with a sound.</h2><p>Finish a practice with a little clear singing and it will appear here.</p><button className="primary" onClick={() => choose(lessons[0])}>Take the first step <ArrowRight size={17}/></button></div> : <div className="history">{results.map(r => <div className="history-row" key={r.id}><span className="history-icon"><Music2 size={18}/></span><div><h3>{lessons.find(l => l.id === r.exercise)?.title ?? 'Vocal practice'}</h3><p>{new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {r.seconds} seconds</p></div><span><strong>{r.accuracy}%</strong><small>close to target</small></span></div>)}</div>}<div className="gentle-note"><Heart/><p>Numbers are a small part of the picture. Feeling more comfortable, listening more closely, and wanting to try again are progress, too.</p></div></div>}
    </main>
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setHelp(false); if (e.key === 'Tab') { const buttons = e.currentTarget.querySelectorAll('button'); const first = buttons[0], last = buttons[buttons.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() } } }}><button autoFocus className="icon-button modal-close" aria-label="Close help" onClick={() => setHelp(false)}><X/></button><span className="eyebrow">WELCOME TO YOUR SPACE</span><h2 id="help-title">Simple by design.</h2><p><strong>1. Listen.</strong> Begin with the comfortable-note finder, or move the starting note up or down by ear. In Echo mode, the app plays each note before your turn.</p><p><strong>2. Sing.</strong> Wait for “Your turn,” then hum or sing the displayed syllable. Reference notes and rests are never scored. Phrase mode connects notes into music.</p><p><strong>3. Reflect.</strong> Finish to get spoken feedback. Each practice ends automatically after its planned turns. Repeat whenever you’re ready.</p><p>The female coach is bundled audio, available offline. The speaker button turns automatic feedback on or off. Pitch detection works best with one voice in a quiet room.</p><p className="small">VoiceRemedy 0.2.0 · No account, audio storage, analytics, or cloud processing. Session summaries stay on this device. Pitch feedback cannot assess vocal health, breath technique, or tone quality.</p><button className="primary full" onClick={() => setHelp(false)}>That sounds good <Check size={17}/></button></section></div>}
  </div>
}




