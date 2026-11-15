import { octaveAdjustment, placeStartingNote } from './voicePlacement'
import { useEffect, useRef, useState } from 'react'
import { AudioLines, ArrowRight, Headphones, Mic, Music2, Settings2, Square, Volume2, VolumeX } from 'lucide-react'
import { lessons, recommendedLesson, type Lesson } from './course'
import { speak, stopPlayback, microphoneError, playNotes } from './audio'
import { assessment, MIN_SAMPLES, type SingingResult, type PracticeMode } from './coaching'
import { loadPreferences, loadResults, savePreferences, saveResults } from './storage'
import { midiNumber, noteName } from './pitch'
import { usePractice } from './usePractice'
import { PitchFinder } from './PitchFinder'
import './coach.css'
import { SongImport } from './SongImport'
import { loadSongs, saveSongs, startingBounds } from './song'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { songLineToReview } from './songbook'
import { Songbook } from './SongbookPanel'
import { ABOUT_SIGN_OFF, openSourcePage, packagedAppVersion, readAppVersion, SOURCE_URL, sourceLinkOpensInNewTab } from './appVersion'
import { LanguageField } from './i18n/LanguageField'
import { presentLesson } from './i18n/content'
import { coachLine, formatInteger, formatPercentPoints, localizeKnown } from './i18n/translate'
import { useI18n } from './i18n/useI18n'

type Placement = null | { kind: 'moved'; direction: 'lower' | 'higher' } | { kind: 'hum'; note: string; exact: boolean; nearest: string }

export default function App() {
  const { t, locale } = useI18n()
  const [songbook,setSongbook]=useState(false)
  const [liveHints,setLiveHints]=useState(()=>loadPreferences().liveHints!==false)
  const [previewing,setPreviewing]=useState(false)
  const [placement,setPlacement]=useState<Placement>(null)
  const [songs, setSongs] = useState(loadSongs)
  const [importer, setImporter] = useState(false)
  const library = [...lessons, ...songs]
  const [prefs] = useState(loadPreferences), [history, setHistory] = useState(loadResults)
  const [lesson, setLesson] = useState<Lesson>(() => library.find(l=>l.id===prefs.lessonId) ?? recommendedLesson(loadResults()))
  const [base, setBase] = useState(prefs.base), [voice, setVoice] = useState(prefs.voice), [gentle, setGentle] = useState(prefs.gentle)
  const [mode, setMode] = useState<PracticeMode>(prefs.mode)
  const [stage, setStage] = useState<'ready'|'teaching'|'practice'|'feedback'|'paused'>('ready')
  const [speaking, setSpeaking] = useState(false), [error, setError] = useState(''), [finder, setFinder] = useState(false), [finding, setFinding] = useState(false)
  const [appVersion, setAppVersion] = useState(packagedAppVersion)
  const [result, setResult] = useState<SingingResult|null>(null)
  const [queued, setQueued] = useState(false)
  const token = useRef(0), locked = useRef(false)
  const practice = usePractice(lesson, base, mode, gentle, complete, fail, voice)
  const bounds = startingBounds(lesson.intervals)
  useEffect(()=>{setBase(b=>Math.max(bounds.min,Math.min(bounds.max,b)))},[bounds.min,bounds.max])
  const adjustedBase=result?octaveAdjustment(result,lesson.intervals):null
  const phase = practice.phase, review = result ? assessment(result) : null
  const active = stage === 'teaching' || stage === 'practice' || speaking || finding || previewing
  const target = phase?.midi ?? base, cents = phase?.kind === 'sing' && practice.pitch.hz ? (midiNumber(practice.pitch.hz)-target)*100 : null
  const shown = presentLesson(lesson)
  const placementText = !placement ? '' : placement.kind === 'moved'
    ? t('app.place.moved', { direction: t(placement.direction === 'lower' ? 'app.place.lower' : 'app.place.higher') })
    : t('app.place.hummed', { note: placement.note }) + (placement.exact ? t('app.place.exact') : t('app.place.nearest', { note: placement.nearest }))
  const caption = previewing ? t('app.caption.preview') : stage === 'teaching' ? (voice ? coachLine(lesson.coachKey ?? lesson.id) : t('app.caption.voiceoff', { description: shown.description, tip: shown.tip })) : stage === 'feedback' && review ? coachLine(adjustedBase!==null?(result!.offset!<0?'octavelower':'octavehigher'):review.key) : stage === 'paused' ? t('app.caption.paused') : stage === 'practice' ? phase?.kind === 'listen' ? t('app.caption.listen') : phase?.kind === 'sing' ? t('app.caption.turn', { sound: shown.lyrics?.[phase.step] ?? shown.syllable }) : phase?.kind === 'settle' ? t('app.caption.settle') : phase?.kind === 'rest' ? t('app.caption.rest') : t('app.caption.practice') : t('app.caption.ready')
  function fail(message: string) { locked.current = false; setSpeaking(false); setStage('paused'); setError(message) }
  // Stopping a melody preview should not pause or discard the current session state.
  function stopPreview() { token.current++; locked.current = false; setPreviewing(false); stopPlayback() }
  function stop() { setPreviewing(false); token.current++; locked.current = false; setQueued(false); setFinder(false); setFinding(false); practice.cancel(); stopPlayback(); setSpeaking(false); setStage('paused') }
  async function begin() {
    if (locked.current || finding) return
    locked.current = true; const gen = ++token.current
    stopPlayback(); setSongbook(false); setResult(null); setError(''); setFinder(false); setImporter(false); setStage('teaching'); setSpeaking(voice)
    try {
      if (!voice) return
      const done = await speak(lesson.coachKey ?? lesson.id)
      if (gen !== token.current) return
      if (!done) { fail('The instruction was interrupted. Start again when you are ready.'); return }
      if (gen !== token.current) return
      setSpeaking(false); setStage('practice'); await practice.start()
    } catch(e) { if (gen === token.current) { setVoice(false); setSpeaking(false); setError(microphoneError(e)); setStage('teaching') } }
  }
  function readyToSing() { setError(''); setStage('practice'); void practice.start() }
  async function previewMelody() {
    if(locked.current||active)return
    locked.current=true; const gen=++token.current
    setPreviewing(true);setError('');setSongbook(false);setImporter(false);setFinder(false)
    try {await playNotes(lesson.intervals.map(i=>base+i),lesson)}
    catch(e){if(gen===token.current)setError(microphoneError(e))}
    finally{if(gen===token.current){setPreviewing(false);locked.current=false}}
  }
  function resetFeedback() { setPlacement(null); setResult(null); setStage('ready'); setError('') }
  function complete(summary: SingingResult) {
    locked.current = false; setResult(summary); setStage('feedback')
    if (summary.samples >= MIN_SAMPLES) {
      const next = [summary,...history].slice(0,200); setHistory(next)
      try { saveResults(next) } catch { setError('Your feedback is ready, but this device could not save the practice.') }
    }
    if (voice) {
      const gen = ++token.current; setSpeaking(true)
      void speak((octaveAdjustment(summary,lesson.intervals)!==null?(summary.offset!<0?'octavelower':'octavehigher'):assessment(summary).key)).catch(e => { if(gen === token.current) setError(microphoneError(e)) }).finally(() => {if(gen === token.current) setSpeaking(false)})
    }
  }
  function choose(next: Lesson) { stop(); setPlacement(null); setSongbook(false); setImporter(false); if(next.suggestedBase!==undefined)setBase(next.suggestedBase); setLesson(next); setMode(next.wholeSong?'phrase':'echo'); setResult(null); setError(''); setStage('ready'); setFinder(false) }
  function nextStep() {
    if (!review) return
    setPlacement(null)
    if (review.key === 'octave' || review.key === 'no-signal') { setFinder(true); return }
    if (review.key === 'great' && mode === 'echo' && lesson.intervals.length > 1) setMode('phrase')
    else if (review.key === 'great' && lesson.wholeSong) { setSongbook(true); return }
    else if (review.key === 'great' && lesson.coachKey === 'imported') { setImporter(true); return }
    else if (review.key === 'great') { const index = lessons.findIndex(l=>l.id===lesson.id); const next=lessons[Math.min(index+1,lessons.length-1)]; setLesson(next); setMode(next.wholeSong?'phrase':'echo') }
    else if (lesson.wholeSong&&lesson.songId) { setLesson(songLineToReview(lesson.songId,result?.notes??[])); setMode('echo'); setGentle(true) }
    else if (review.key === 'coverage') { setMode('echo'); setGentle(true) }
    else if (review.key === 'steady') setGentle(true)
    setResult(null); setStage('ready'); setQueued(true)
  }
  useEffect(() => { if(queued) { setQueued(false); void begin() } },[queued])
  useEffect(() => { try { savePreferences({ ...loadPreferences(), base, voice, gentle, mode, liveHints, lessonId: lesson.id, locale }) } catch { setError('Your session is ready, but its settings could not be saved on this device.') } },[base,voice,gentle,mode,liveHints,lesson.id,locale])
  useEffect(() => { let live = true; void readAppVersion().then(version => { if (live) setAppVersion(version) }); return () => { live = false } }, [])
  useEffect(() => {
    const pause = () => { setPreviewing(false); token.current++; locked.current=false; setQueued(false); stopPlayback(); setSpeaking(false); setStage(s=>s==='teaching'||s==='practice'?'paused':s) }
    const hide = () => { if(document.hidden) pause() }
    document.addEventListener('visibilitychange',hide)
    const listener = Capacitor.isNativePlatform() ? NativeApp.addListener('appStateChange',s=>{if(!s.isActive) pause()}) : null
    return () => { token.current++; stopPlayback(); document.removeEventListener('visibilitychange',hide); void listener?.then(l=>l.remove()) }
  },[])
  const heard = result && (adjustedBase!==null
    ? t('app.heard.octave', { side: t(adjustedBase<base ? 'app.side.below' : 'app.side.above') })
    : result.samples<MIN_SAMPLES
      ? t('app.heard.short')
      : t('app.heard.score', { percent: typeof result.accuracy === 'number' ? formatPercentPoints(result.accuracy) : String(result.accuracy)+'%' }) + (review?.detail ?? ''))
  return <div className="coach-app">
    <header className="coach-header"><a href="#coach-main" className="coach-brand"><AudioLines size={24}/> VoiceRemedy</a><span>{t('app.tagline')}</span><button aria-label={voice?t('app.voiceOff'):t('app.voiceOn')} disabled={active} onClick={()=>setVoice(!voice)}>{voice?<Volume2 size={21}/>:<VolumeX size={21}/>}</button></header>
    <main id="coach-main" className="coach-main">
      <div className="coach-intro"><span className="coach-kicker">{t('app.kicker')}</span><h1>{stage==='ready'?t('app.h1.ready'):stage==='feedback'?t('app.h1.feedback'):stage==='paused'?t('app.h1.paused'):t('app.h1.active')}</h1><p>{t('app.intro')}</p></div>
      <section className="conversation" aria-label={t('app.sessionLabel')}>
        <div className={'coach-presence '+(speaking?'talking':phase?.kind==='sing'?'hearing':'')} aria-hidden="true"><AudioLines size={48} strokeWidth={1.4}/></div>
        <div className="teacher-label">{t('app.coach')} <span>{previewing?t('app.presence.playing'):(speaking||(voice&&phase?.kind==='settle'))?t('app.presence.speaking'):phase?.kind==='sing'?t('app.presence.listening'):phase?.kind==='listen'?t('app.presence.playing'):t('app.presence.here')}</span></div>
        <p className="teacher-caption" aria-live={voice?'off':'polite'}>{caption}</p>
        <div className="coach-session-state" role="status">{finding?t('app.state.finding'):practice.status==='opening'?t('app.state.opening'):practice.status==='listening'?t('app.state.listening'):t('app.state.micOff')}</div><div className="session-topic"><Music2 size={15}/>{shown.title}{lesson.coachKey==='imported'&&<small>{shown.label}</small>}<span>{mode==='echo'?t('app.mode.echo'):t('app.mode.phrase')}</span></div>
        {placement&&<p className="coach-session-state" role="status">{placementText}</p>}{error && <p className="coach-error" role="alert">{localizeKnown(error)}</p>}
        {stage==='practice' && <div className="listening-area">
          <div className="voice-bars" aria-hidden="true">{Array.from({length:17},(_,i)=><i key={i} style={{height: 8+Math.min(42,practice.pitch.level*400)*(1-Math.abs(i-8)/10)+'px'}}/>)}</div>
          <strong>{practice.status==='opening'?t('app.strong.opening'):phase?.kind==='sing'?shown.lyrics?.[phase.step]??t('app.strong.sing',{syllable:shown.syllable}):phase?.kind==='listen'?(shown.lyrics?.[phase.step] ?? t('app.strong.listen')):phase?.kind==='settle'?t('app.strong.settle'):t('app.strong.rest')}</strong>
          <p>{!liveHints?t('app.hint.off'):cents===null?t('app.hint.wait'):Math.abs(cents)<35?t('app.hint.close'):Math.abs(cents)>700?t('app.hint.octave'):cents<0?t('app.hint.low'):t('app.hint.high')}</p>
          <span className="coach-time">{t('app.time',{n:formatInteger(Math.max(0,Math.ceil(practice.duration-practice.elapsed)))})}</span><progress aria-label={t('app.progress')} value={practice.elapsed} max={practice.duration}/>
        </div>}
        {stage==='feedback' && result && <div className="heard-note"><Mic size={18}/><p>{heard}</p></div>}
        {shown.lyrics && <div className="coach-lyrics" aria-label={t('app.lyrics')}>{shown.lyrics.map((word,i)=><span key={i} aria-current={stage==='practice' && phase?.step===i?'step':undefined}>{word}</span>)}</div>}<div className="coach-actions">{stage==='teaching' && !voice?<><button className='coach-primary' onClick={readyToSing}><Mic size={18}/>{t('app.ready')}</button><button className='coach-secondary' onClick={stop}>{t('app.pause')}</button></>:speaking && stage==='feedback'?<button className='coach-primary' onClick={()=>{token.current++;stopPlayback();setSpeaking(false)}}><Square size={17}/>{t('app.stopVoice')}</button>:active?<button className='coach-primary' onClick={previewing?stopPreview:stop}><Square size={17}/>{previewing?t('app.stopMelody'):t('app.pause')}</button>:stage==='feedback'?<><button className="coach-primary" onClick={nextStep}>{review?.key==='great'?t('app.next.great'):review?.key==='no-signal'||review?.key==='octave'?t('app.next.find'):t('app.next.help')}<ArrowRight size={18}/></button>{adjustedBase!==null&&<button className="coach-secondary" onClick={()=>{const direction: 'lower' | 'higher' = adjustedBase<base?'lower':'higher';setBase(adjustedBase);setResult(null);setStage('ready');setError('');setPlacement({kind:'moved',direction});setQueued(true)}}>{t('app.matchOctave')}</button>}<button className="coach-secondary" onClick={()=>void begin()}>{t('app.again')}</button></>:<button className="coach-primary" onClick={()=>void begin()}><Mic size={19}/>{stage==='paused'?t('app.resume'):t('app.start')}</button>}</div>
        {!active&&<div className="melody-tools"><button className="coach-secondary" onClick={()=>void previewMelody()}><Headphones size={16}/> {t('app.hearMelody')}</button><div role="group" aria-label={t('app.comfort')}><button className="coach-secondary" disabled={base<=bounds.min} onClick={()=>{setBase(b=>b-1);resetFeedback()}}>{t('app.lower')}</button><button className="coach-secondary" disabled={base>=bounds.max} onClick={()=>{setBase(b=>b+1);resetFeedback()}}>{t('app.higher')}</button></div></div>}<p className="coach-privacy">{active?t('app.privacy.active'):t('app.privacy.idle')} {t('app.privacy.device')}</p>
      </section>
      {songbook&&!active&&<Songbook history={history} onChoose={choose} onClose={()=>setSongbook(false)}/>}
      <div hidden={!importer || active}><SongImport open={importer && !active} onClose={()=>setImporter(false)} onChoose={next=>{const updated=[next,...songs].slice(0,12);setSongs(updated);choose(next);try{saveSongs(updated)}catch{setError('You can practise this melody now, but it could not be saved on this device.')}}}/></div>
      {finder && <PitchFinder spoken={voice} onBusy={setFinding} onClose={()=>setFinder(false)} onSelect={note=>{const fit=placeStartingNote(note,lesson.intervals);setBase(fit.base);setPlacement({kind:'hum',note:noteName(note),exact:fit.exact,nearest:noteName(fit.first)});setFinder(false);setResult(null);setStage('ready')}}/>}
      {!active && <div className="coach-requests"><span>{t('app.choose')}</span><div><button onClick={()=>choose(lessons[0])}><Mic size={16}/>{t('app.new')}</button><button onClick={()=>{setFinder(false);setImporter(false);setSongbook(!songbook)}}><Music2 size={16}/>{t('app.teachSong')}</button><button onClick={()=>{setSongbook(false);setFinder(false);setImporter(!importer)}}><Music2 size={16}/>{t('app.upload')}</button><button onClick={()=>{setSongbook(false);setImporter(false);setFinder(!finder)}}><Headphones size={16}/>{t('app.findNote')}</button></div></div>}
      <details className="coach-options"><summary><Settings2 size={16}/>{t('app.adjust')}</summary><div className="coach-option-fields"><label>{t('app.starting')} <select value={base} disabled={active} onChange={e=>{setBase(Number(e.target.value));resetFeedback()}}>{Array.from({length:bounds.max-bounds.min+1},(_,i)=>i+bounds.min).map(n=><option value={n} key={n}>{noteName(n)}</option>)}</select></label><LanguageField disabled={active}/><label><input type="checkbox" checked={gentle} disabled={active} onChange={e=>{setGentle(e.target.checked);resetFeedback()}}/> {t('app.shorter')}</label><label><input type="checkbox" checked={liveHints} disabled={active} onChange={e=>setLiveHints(e.target.checked)}/> {t('app.hints')}</label><label>{t('app.style')} <select value={mode} disabled={active} onChange={e=>{setMode(e.target.value as PracticeMode);resetFeedback()}}><option value="echo">{t('app.style.echo')}</option><option value="phrase">{t('app.style.phrase')}</option></select></label><label>{t('app.work')} <select value={lesson.id} disabled={active} onChange={e=>choose(library.find(l=>l.id===e.target.value)!)}>{library.map(l=>{const view=presentLesson(l);return <option key={l.id} value={l.id}>{view.title}{l.coachKey==='imported'?' · '+view.label:''}</option>})}</select></label></div><p>{t('app.options.hints')}</p><p>{t('app.options.score')}</p></details>
    <details className="coach-options"><summary>{t('app.how')}</summary><p>{t('app.how.p1')}</p><p>{t('app.how.p2')}</p><p>{t('app.how.p3')}</p><p>{t('app.spoken')}</p></details>
      <details className="coach-options coach-about"><summary>{t('app.about')}</summary><div className="coach-about-card"><p className="coach-about-name">VoiceRemedy</p><p>{t('app.about.version')} <span className="coach-about-version">{appVersion}</span></p><p><a href={SOURCE_URL} rel="noreferrer" target={sourceLinkOpensInNewTab() ? '_blank' : undefined} onClick={event => { void openSourcePage(event) }}>{t('app.about.source')}</a></p><p className="coach-about-sign">{ABOUT_SIGN_OFF}</p></div></details>
    </main><footer className="coach-footer">{t('app.footer')}</footer>
  </div>
}
