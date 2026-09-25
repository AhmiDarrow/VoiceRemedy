import { useEffect, useRef, useState } from 'react'
import { Check, Mic, Volume2, X } from 'lucide-react'
import { comfortableNote } from './coaching'
import { microphoneError, openMicrophone, playNotes, stopPlayback, speak, type Microphone } from './audio'
import { octaveNumber } from './voicePlacement'
import { midiNumber, noteName } from './pitch'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
export function PitchFinder({ onSelect, onClose, onBusy, spoken=false }: { onSelect: (note: number) => void; onClose: () => void; onBusy: (value: boolean) => void; spoken?:boolean }) {
  const [state, setState] = useState<'ready'|'explaining'|'opening'|'listening'|'done'>('ready'), [seconds, setSeconds] = useState(0)
  const [candidate, setCandidate] = useState<number | null>(null), [error, setError] = useState(''), [live, setLive] = useState<number | null>(null)
  const resource = useRef<{ mic: Microphone | null; timer: number }>({ mic: null, timer: 0 }), generation = useRef(0), opening = useRef(false), values = useRef<number[]>([])
  const pending = useRef<AbortController|null>(null)
  function stop() { stopPlayback(); generation.current++; opening.current = false; pending.current?.abort(); pending.current=null; resource.current.mic?.stop(); clearInterval(resource.current.timer); resource.current = { mic: null, timer: 0 }; onBusy(false) }
  useEffect(() => {
    const hide = () => { if (document.hidden) { stop(); setState('ready') } }
    document.addEventListener('visibilitychange', hide)
    const listener = Capacitor.isNativePlatform() ? NativeApp.addListener('appStateChange', s => { if (!s.isActive) { stop(); setState('ready') } }) : null
    return () => { document.removeEventListener('visibilitychange', hide); void listener?.then(l => l.remove()); stop(); stopPlayback() }
  }, [])
  async function start() {
    if (opening.current) return
    opening.current = true; const gen = ++generation.current; onBusy(true); setState('opening'); setError(''); setCandidate(null); setSeconds(0); values.current = []; stopPlayback()
    try {
      if(spoken){setState('explaining');const done=await speak('findoctave');if(gen!==generation.current)return;if(!done){stop();setState('ready');return};setState('opening')}
      const controller = new AbortController(); pending.current=controller
      const handle = await openMicrophone(pitch => { if (gen !== generation.current) return; const note = pitch.hz && pitch.clarity >= .84 ? midiNumber(pitch.hz) : null; setLive(note); if (note !== null) values.current.push(note) }, () => { if (gen !== generation.current) return; stop(); setState('ready'); setError('The microphone disconnected. Please try again.') },controller.signal)
      if (gen !== generation.current) { handle.stop(); return }
      resource.current.mic = handle; setState('listening'); const began = performance.now()
      resource.current.timer = window.setInterval(() => {
        const elapsed = (performance.now() - began) / 1000; setSeconds(Math.min(5, elapsed))
        if (elapsed >= 5) { const note = comfortableNote(values.current); stop(); setCandidate(note); setState('done') }
      }, 80)
    } catch (error) { if (gen === generation.current) { stop(); setState('ready'); setError(microphoneError(error)) } }
  }
  return <section className="finder-card" aria-labelledby="finder-title"><button className="icon-button finder-close" aria-label="Close note finder" onClick={onClose}><X size={17}/></button><span className="eyebrow">START WHERE YOUR VOICE FEELS AT HOME</span><h2 id="finder-title">Find your note and octave.</h2><p>No note names to know and no target to chase. Hum a relaxed “mm” near your normal speaking voice for a few seconds. We will find a starting point, not your full vocal range or voice type.</p>
    {state==='explaining'&&<p role="status">Listen first. The microphone opens after the explanation. Then hum gently for a few seconds.</p>}
    {error && <p role="alert" className="finder-error">{error}</p>}
    {state === 'listening' && <div className="finder-listening" aria-live="polite"><strong>{live === null ? 'Listening…' : noteName(live)}</strong><span>Keep it easy · {Math.ceil(5 - seconds)} seconds</span><progress max={5} value={seconds}/></div>}
    {state === 'done' && <div className="finder-answer"><strong>{candidate === null ? 'Let’s try one steady hum.' : `I heard ${noteName(candidate)} · octave ${octaveNumber(candidate)}.`}</strong><p>{candidate === null ? 'We need a few seconds of a clear, steady note. You can also choose a starting note in your session settings.' : 'The letter names the note; the number tells you which octave it is in. An octave repeats the same note names higher or lower. This is the note you hummed today, not a label for your voice. Hear it, check it feels easy, then use it to adjust the lesson.'}</p></div>}
    <div className="inline-actions">{state === 'explaining'||state === 'opening' || state === 'listening' ? <button className="secondary" onClick={() => { stop(); stopPlayback();setState('ready') }}>Cancel note finder</button> : candidate !== null ? <><button className="primary" onClick={() => onSelect(candidate)}><Check size={17}/> Use {noteName(candidate)}</button><button className="secondary" onClick={() => void playNotes([candidate]).catch(e => setError(microphoneError(e)))}><Volume2 size={16}/> Hear it</button><button className="text-button" onClick={() => void start()}>Try another hum</button></> : <button className="primary" onClick={() => void start()}><Mic size={17}/> {state === 'done' ? 'Try the hum again' : 'Find my note'}</button>}</div>
  </section>
}
