import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Leaf, Play, Square } from 'lucide-react'
import { speak, stopPlayback } from './audio'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
const stages = [
  { label: 'Settle in', hint: 'Let your jaw and shoulders soften. Sit or stand comfortably.', seconds: 8, kind: 'rest' },
  { label: 'An easy breath in', hint: 'Let the air arrive naturally. No need for a big breath.', seconds: 3, kind: 'in' },
  { label: 'Let it flow out', hint: 'Release the air gently. Skip the timing if it feels uncomfortable.', seconds: 4, kind: 'out' },
  { label: 'An easy breath in', hint: 'Stay comfortable. There is no breath-holding here.', seconds: 3, kind: 'in' },
  { label: 'Let it flow out', hint: 'Think of an easy sigh, without forcing the air.', seconds: 4, kind: 'out' },
  { label: 'Ready for a soft sound', hint: 'Take a normal breath. Bring this easy feeling into your first hum.', seconds: 6, kind: 'rest' },
]
export function Warmup({ voice, onDone }: { voice: boolean; onDone: () => void }) {
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
  return <section className="warmup-card"><div><span className="eyebrow"><Leaf size={14}/> BEFORE THE FIRST NOTE</span><h2>{complete ? 'A little more space to sing.' : 'Arrive, breathe, begin.'}</h2><p>{running ? intro ? 'Listen to your coach, then follow the circle.' : stage.hint : complete ? 'Carry that comfortable feeling into a gentle hum.' : 'A short, unscored moment to settle your body before using your voice.'}</p><div className="inline-actions">{running ? <button className="secondary" onClick={stop}><Square size={14}/> Stop warm-up</button> : complete ? <button className="primary" onClick={onDone}>Ready to sing <ArrowRight size={16}/></button> : <button className="secondary" onClick={() => void start()}><Play size={14}/> Begin a gentle warm-up</button>}<span className="small">No microphone · about 40 seconds</span></div>{error && <p className="small" role="status">{error}</p>}</div><div className={'breath-orb ' + (running && !intro ? stage.kind : '')} style={{ '--breath-seconds': `${stage.seconds}s` } as CSSProperties}><span>{complete ? 'Ready' : running ? intro ? 'Listen' : stage.label : 'A moment for you'}</span>{running && !intro && <small>{Math.ceil(total - time)}s</small>}</div></section>
}
