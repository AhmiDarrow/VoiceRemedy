import { octaveAdjustment, placeStartingNote } from './voicePlacement'
import { useEffect, useRef, useState } from 'react'
import { AudioLines, ArrowRight, Headphones, Mic, Music2, Settings2, Square, Volume2, VolumeX } from 'lucide-react'
import { lessons, recommendedLesson, type Lesson } from './course'
import { coachText } from './lessons'
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

export default function App() {
  const [songbook,setSongbook]=useState(false)
  const [liveHints,setLiveHints]=useState(()=>loadPreferences().liveHints!==false)
  const [previewing,setPreviewing]=useState(false)
  const [placement,setPlacement]=useState('')
  const [songs, setSongs] = useState(loadSongs)
  const [importer, setImporter] = useState(false)
  const library = [...lessons, ...songs]
  const [prefs] = useState(loadPreferences), [history, setHistory] = useState(loadResults)
  const [lesson, setLesson] = useState<Lesson>(() => library.find(l=>l.id===prefs.lessonId) ?? recommendedLesson(loadResults()))
  const [base, setBase] = useState(prefs.base), [voice, setVoice] = useState(prefs.voice), [gentle, setGentle] = useState(prefs.gentle)
  const [mode, setMode] = useState<PracticeMode>(prefs.mode)
  const [stage, setStage] = useState<'ready'|'teaching'|'practice'|'feedback'|'paused'>('ready')
  const [speaking, setSpeaking] = useState(false), [error, setError] = useState(''), [finder, setFinder] = useState(false), [finding, setFinding] = useState(false)
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
  const caption = previewing ? 'Listen to the melody. There is no singing test and your microphone stays off.' : stage === 'teaching' ? (voice ? coachText[lesson.coachKey ?? lesson.id] : lesson.description+' Listen to the reference, then sing after the soft chime. '+lesson.tip) : stage === 'feedback' && review ? coachText[adjustedBase!==null?(result!.offset!<0?'octavelower':'octavehigher'):review.key] : stage === 'paused' ? 'We can take a break. When you are ready, I will guide you through it again.' : stage === 'practice' ? phase?.kind === 'listen' ? 'Listen to my note. Then it is your turn.' : phase?.kind === 'sing' ? 'Your turn. Sing '+(lesson.lyrics?.[phase.step] ?? lesson.syllable)+' gently.' : phase?.kind === 'settle' ? 'Get ready to sing. Begin after the soft chime.' : phase?.kind === 'rest' ? 'Take an easy breath. We have time.' : 'Get comfortable. Listen first, then sing it back.' : 'I will guide you one step at a time. First I will explain and play a note. Then I will listen to you sing and help you with your next try.'
  function fail(message: string) { locked.current = false; setSpeaking(false); setStage('paused'); setError(message) }
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
  function resetFeedback() { setPlacement(''); setResult(null); setStage('ready'); setError('') }
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
  function choose(next: Lesson) { stop(); setPlacement(''); setSongbook(false); setImporter(false); if(next.suggestedBase!==undefined)setBase(next.suggestedBase); setLesson(next); setMode(next.wholeSong?'phrase':'echo'); setResult(null); setError(''); setStage('ready'); setFinder(false) }
  function nextStep() {
    if (!review) return
    setPlacement('')
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
  useEffect(() => { try { savePreferences({base,voice,gentle,mode,liveHints,lessonId:lesson.id}) } catch { setError('Your session is ready, but its settings could not be saved on this device.') } },[base,voice,gentle,mode,liveHints,lesson.id])
  useEffect(() => {
    const pause = () => { setPreviewing(false); token.current++; locked.current=false; setQueued(false); stopPlayback(); setSpeaking(false); setStage(s=>s==='teaching'||s==='practice'?'paused':s) }
    const hide = () => { if(document.hidden) pause() }
    document.addEventListener('visibilitychange',hide)
    const listener = Capacitor.isNativePlatform() ? NativeApp.addListener('appStateChange',s=>{if(!s.isActive) pause()}) : null
    return () => { token.current++; stopPlayback(); document.removeEventListener('visibilitychange',hide); void listener?.then(l=>l.remove()) }
  },[])
  return <div className="coach-app">
    <header className="coach-header"><a href="#coach-main" className="coach-brand"><AudioLines size={24}/> VoiceRemedy</a><span>Your personal singing coach</span><button aria-label={voice?'Turn voice off':'Turn voice on'} disabled={active} onClick={()=>setVoice(!voice)}>{voice?<Volume2 size={21}/>:<VolumeX size={21}/>}</button></header>
    <main id="coach-main" className="coach-main">
      <div className="coach-intro"><span className="coach-kicker">LET’S SING TOGETHER</span><h1>{stage==='ready'?'You sing. I’ll guide you.':stage==='feedback'?'Here’s what I heard.':stage==='paused'?'At your pace.':'One sound at a time.'}</h1><p>No musical knowledge needed. Just your voice and a little practice.</p></div>
      <section className="conversation" aria-label="Your coaching session">
        <div className={'coach-presence '+(speaking?'talking':phase?.kind==='sing'?'hearing':'')} aria-hidden="true"><AudioLines size={48} strokeWidth={1.4}/></div>
        <div className="teacher-label">YOUR COACH <span>{previewing?'Playing your reference':(speaking||(voice&&phase?.kind==='settle'))?'Speaking':phase?.kind==='sing'?'Listening to you':phase?.kind==='listen'?'Playing your reference':'Here with you'}</span></div>
        <p className="teacher-caption" aria-live={voice?'off':'polite'}>{caption}</p>
        <div className="coach-session-state" role="status">{finding?'Voice check active · follow the instructions below':practice.status==='opening'?'Waiting for microphone permission':practice.status==='listening'?'Microphone on · singing turns only':'Microphone off'}</div><div className="session-topic"><Music2 size={15}/>{lesson.title}{lesson.coachKey==='imported'&&<small>{lesson.label}</small>}<span>{mode==='echo'?'Listen & repeat':'Sing the phrase'}</span></div>
        {placement&&<p className="coach-session-state" role="status">{placement}</p>}{error && <p className="coach-error" role="alert">{error}</p>}
        {stage==='practice' && <div className="listening-area">
          <div className="voice-bars" aria-hidden="true">{Array.from({length:17},(_,i)=><i key={i} style={{height: 8+Math.min(42,practice.pitch.level*400)*(1-Math.abs(i-8)/10)+'px'}}/>)}</div>
          <strong>{practice.status==='opening'?'Allow your microphone to begin':phase?.kind==='sing'?lesson.lyrics?.[phase.step]??'Sing “'+lesson.syllable+'”':phase?.kind==='listen'?(lesson.lyrics?.[phase.step] ?? 'Listen…'):phase?.kind==='settle'?'Get ready…':'Breathe…'}</strong>
          <p>{!liveHints?'Listen to your voice. Pitch feedback comes after the round.':cents===null?'I only measure your singing turns.':Math.abs(cents)<35?'That’s close. Keep it easy.':Math.abs(cents)>700?'Try a more comfortable starting note.':cents<0?'A little higher, gently.':'Let it settle a little lower.'}</p>
          <span className="coach-time">{Math.max(0,Math.ceil(practice.duration-practice.elapsed))} seconds left · stop whenever you need to</span><progress aria-label="Practice progress" value={practice.elapsed} max={practice.duration}/>
        </div>}
        {stage==='feedback' && result && <div className="heard-note"><Mic size={18}/><p>{adjustedBase!==null?'Your notes seem to be an octave '+(adjustedBase<base?'below':'above')+' the reference. Match the lesson to that octave, then check that it feels comfortable.':result.samples<MIN_SAMPLES?'I need a little more clear singing before I can give useful feedback.':result.accuracy+'% of the clear singing I heard was close to the note. '+review?.detail}</p></div>}
        {lesson.lyrics && <div className="coach-lyrics" aria-label="Words for this lesson">{lesson.lyrics.map((word,i)=><span key={i} aria-current={stage==='practice' && phase?.step===i?'step':undefined}>{word}</span>)}</div>}<div className="coach-actions">{stage==='teaching' && !voice?<><button className='coach-primary' onClick={readyToSing}><Mic size={18}/>I’m ready to sing</button><button className='coach-secondary' onClick={stop}>Pause session</button></>:speaking && stage==='feedback'?<button className='coach-primary' onClick={()=>{token.current++;stopPlayback();setSpeaking(false)}}><Square size={17}/>Stop coach voice</button>:active?<button className='coach-primary' onClick={stop}><Square size={17}/>{previewing?'Stop melody':'Pause session'}</button>:stage==='feedback'?<><button className="coach-primary" onClick={nextStep}>{review?.key==='great'?'What’s next?':review?.key==='no-signal'||review?.key==='octave'?'Help me find my note':'Help me with that'}<ArrowRight size={18}/></button>{adjustedBase!==null&&<button className="coach-secondary" onClick={()=>{setBase(adjustedBase);resetFeedback();setPlacement("Lesson moved one octave "+(adjustedBase<base?"lower.":"higher."));setQueued(true)}}>Match my octave</button>}<button className="coach-secondary" onClick={()=>void begin()}>Try that again</button></>:<button className="coach-primary" onClick={()=>void begin()}><Mic size={19}/>{stage==='paused'?'Resume with my coach':'Start my lesson'}</button>}</div>
        {!active&&<div className="melody-tools"><button className="coach-secondary" onClick={()=>void previewMelody()}><Headphones size={16}/> Hear the melody</button><div role="group" aria-label="Make the melody comfortable"><button className="coach-secondary" disabled={base<=bounds.min} onClick={()=>{setBase(b=>b-1);resetFeedback()}}>A little lower</button><button className="coach-secondary" disabled={base>=bounds.max} onClick={()=>{setBase(b=>b+1);resetFeedback()}}>A little higher</button></div></div>}<p className="coach-privacy">{active?'You can pause at any time.':'I’ll explain, demonstrate, listen, and give feedback.'} Audio is processed on this device.</p>
      </section>
      {songbook&&!active&&<Songbook history={history} onChoose={choose} onClose={()=>setSongbook(false)}/>}
      <div hidden={!importer || active}><SongImport open={importer && !active} onClose={()=>setImporter(false)} onChoose={next=>{const updated=[next,...songs].slice(0,12);setSongs(updated);choose(next);try{saveSongs(updated)}catch{setError('You can practise this melody now, but it could not be saved on this device.')}}}/></div>
      {finder && <PitchFinder spoken={voice} onBusy={setFinding} onClose={()=>setFinder(false)} onSelect={note=>{const fit=placeStartingNote(note,lesson.intervals);setBase(fit.base);setPlacement('You hummed '+noteName(note)+'. '+(fit.exact?'The lesson now starts on that note.':'The nearest supported start for this melody is '+noteName(fit.first)+'. Try a shorter melody if this feels uncomfortable.'));setFinder(false);setResult(null);setStage('ready')}}/>}
      {!active && <div className="coach-requests"><span>Choose what you’d like help with</span><div><button onClick={()=>choose(lessons[0])}><Mic size={16}/>I’m new to singing</button><button onClick={()=>{setFinder(false);setImporter(false);setSongbook(!songbook)}}><Music2 size={16}/>Teach me a song</button><button onClick={()=>{setSongbook(false);setFinder(false);setImporter(!importer)}}><Music2 size={16}/>Upload a song</button><button onClick={()=>{setSongbook(false);setImporter(false);setFinder(!finder)}}><Headphones size={16}/>Find my note and octave</button></div></div>}
      <details className="coach-options"><summary><Settings2 size={16}/>Adjust my session</summary><div className="coach-option-fields"><label>Starting note <select value={base} disabled={active} onChange={e=>{setBase(Number(e.target.value));resetFeedback()}}>{Array.from({length:bounds.max-bounds.min+1},(_,i)=>i+bounds.min).map(n=><option value={n} key={n}>{noteName(n)}</option>)}</select></label><label><input type="checkbox" checked={gentle} disabled={active} onChange={e=>{setGentle(e.target.checked);resetFeedback()}}/> Shorter singing turns</label><label><input type="checkbox" checked={liveHints} disabled={active} onChange={e=>setLiveHints(e.target.checked)}/> Show live pitch hints</label><label>Practice style <select value={mode} disabled={active} onChange={e=>{setMode(e.target.value as PracticeMode);resetFeedback()}}><option value="echo">One note at a time</option><option value="phrase">Connect the phrase</option></select></label><label>Work on <select value={lesson.id} disabled={active} onChange={e=>choose(library.find(l=>l.id===e.target.value)!)}>{library.map(l=><option key={l.id} value={l.id}>{l.title}{l.coachKey==='imported'?' · '+l.label:''}</option>)}</select></label></div><p>After a comfortable round, try switching off live hints and listen to your own voice. You still receive feedback afterward.</p><p>The score measures closeness to the reference pitch, not tone quality, expression, rhythm accuracy, or vocal health.</p></details>
    <details className="coach-options"><summary>How to practise well</summary><p>Listen, imagine the next note, then sing comfortably. Learn a short line before joining the song. Try a little practice regularly, and revisit a familiar line on another day.</p><p>Pitch hints can help you find notes. They are a guide, not a grade for your voice. Try without them sometimes. If your voice is hoarse or tired, rest instead of singing; never push for a note.</p><p>This approach is informed by singing research. VoiceRemedy itself has not been tested in a learning-outcomes study, and a microphone cannot replace a teacher who can hear and observe your technique.</p></details></main><footer className="coach-footer">One voice. One small step. No pressure.</footer>
  </div>
}
