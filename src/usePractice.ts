import { useCallback, useEffect, useRef, useState } from 'react'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { createReferencePlayer, microphoneError, openMicrophone, speak, stopPlayback, type Microphone, type ReferencePlayer } from './audio'
import { canMeasure, makePlan, phaseAt, participation, reviewNotes, singingSummary, type Phase, type PracticeMode, type SingingResult } from './coaching'
import { midiNumber, type Pitch } from './pitch'
import type { Lesson } from './course'
const silence: Pitch = { hz: 0, level: 0, clarity: 0 }
export function usePractice(lesson: Lesson, base: number, mode: PracticeMode, gentle: boolean, onComplete: (result: SingingResult) => void, onError: (message: string) => void, spokenCues = false) {
  const [status, setStatus] = useState<'idle'|'opening'|'listening'>('idle')
  const [pitch, setPitch] = useState(silence), [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState<Phase | null>(null), [trace, setTrace] = useState<(number|null)[]>([])
  const resources = useRef<{ mic: Microphone | null; player: ReferencePlayer | null; timer: number }>({ mic: null, player: null, timer: 0 })
  const generation = useRef(0), active = useRef(false), started = useRef(0), plan = useRef<Phase[]>([])
  const pendingMicrophone = useRef<AbortController|null>(null)
  const values = useRef<{ cents: number; midi: number; step: number }[]>([])
  const lastSampleAt = useRef(-1), lastPhase = useRef<Phase | null>(null)
  const cuePlaying = useRef(false), cueEndedAt = useRef(-1)
  const onCompleteRef = useRef(onComplete), onErrorRef = useRef(onError)
  onCompleteRef.current = onComplete; onErrorRef.current = onError
  const cancel = useCallback(() => {
    generation.current++; active.current = false
    pendingMicrophone.current?.abort(); pendingMicrophone.current = null
    window.clearInterval(resources.current.timer); resources.current.mic?.stop(); resources.current.player?.stop()
    resources.current = { mic: null, player: null, timer: 0 }; stopPlayback()
    setStatus('idle'); setPitch(silence); setPhase(null)
  }, [])
  function finish() {
    if (!active.current || !resources.current.mic) return
    const seconds = Math.min((performance.now() - started.current) / 1000, plan.current[plan.current.length - 1]?.end ?? Infinity)
    const notes = reviewNotes(lesson.intervals, base, values.current)
    const summary: SingingResult = { id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, date: new Date().toISOString(), exercise: lesson.id, seconds: Math.round(seconds), ...singingSummary(values.current.map(v => v.cents), values.current.map(v => v.midi)), base, mode, gentle, notes, coverage: notes.filter(n => n.samples >= 4).length / notes.length, voicedSeconds: Math.round(values.current.length * .09 * 10) / 10, participation: participation(plan.current, values.current.length) }
    cancel(); onCompleteRef.current(summary)
  }
  const finishRef = useRef(finish); finishRef.current = finish
  async function start() {
    if (active.current) return
    active.current = true; const gen = ++generation.current
    stopPlayback(); setStatus('opening'); setTrace([]); setElapsed(0); setPitch(silence)
    values.current = []; lastSampleAt.current = -1; lastPhase.current = null; cuePlaying.current = false; cueEndedAt.current = -1
    plan.current = makePlan(lesson.intervals, base, mode, gentle, { ...lesson, cueSeconds: spokenCues ? 2.5 : undefined })
    try {
      // Unlock reference audio during the initiating user gesture, before permission awaits.
      const player = createReferencePlayer(); resources.current.player = player
      await player.ready
      if (gen !== generation.current) { player.stop(); return }
      const controller = new AbortController(); pendingMicrophone.current = controller
      const microphone = await openMicrophone(reading => {
        if (gen !== generation.current || !resources.current.mic) return
        const seconds = (performance.now() - started.current) / 1000
        const current = phaseAt(plan.current, seconds)
        setPitch(reading)
        const cents = reading.hz && current ? (midiNumber(reading.hz) - current.midi) * 100 : null
        const eligible = canMeasure(current, seconds) && !cuePlaying.current && seconds >= cueEndedAt.current + .25 && reading.clarity >= .84 && cents !== null
        setTrace(t => [...t.slice(-89), eligible ? cents : null])
        // A frame can contribute only once per analysis interval, including under timer jitter.
        if (eligible && seconds - lastSampleAt.current >= .075) {
          values.current.push({ cents: cents!, midi: midiNumber(reading.hz), step: current!.step }); lastSampleAt.current = seconds
        }
      }, () => { if (gen === generation.current) { cancel(); onErrorRef.current('The microphone disconnected. Reconnect it and start again.') } }, controller.signal)
      if (gen !== generation.current) { microphone.stop(); return }
      resources.current.mic = microphone; started.current = performance.now(); setStatus('listening')
      let lastTick = performance.now()
      const tick = () => {
        if (gen !== generation.current) return
        if (performance.now() - lastTick > 1000) { cancel(); onErrorRef.current('Practice paused because the audio timing was interrupted. Start again when your device is ready.'); return }
        lastTick = performance.now()
        const seconds = (performance.now() - started.current) / 1000, current = phaseAt(plan.current, seconds)
        setElapsed(seconds)
        if (!current) { finishRef.current(); return }
        if (current !== lastPhase.current) {
          const previousKind = lastPhase.current?.kind
          setPhase(current); lastPhase.current = current
          if (spokenCues && current.kind === 'settle') {
            cuePlaying.current = true
            void speak('getready').then(() => { if(gen === generation.current) { cuePlaying.current = false; cueEndedAt.current = (performance.now()-started.current)/1000 } }).catch(error => { if(gen === generation.current) { cancel(); onErrorRef.current(microphoneError(error)) } })
          }
          try {
            if (current.kind === 'sing' && previousKind === 'settle') player.play(84, .1)
            if (current.kind === 'listen') player.play(current.midi, Math.max(.1, current.end - seconds - .08))
          } catch (error) { cancel(); onErrorRef.current(microphoneError(error)) }
        }
      }
      tick(); if (gen === generation.current) resources.current.timer = window.setInterval(tick, 40)
    } catch (error) { if (gen === generation.current) { cancel(); onErrorRef.current(microphoneError(error)) } }
  }
  useEffect(() => {
    const hidden = () => { if (document.hidden) cancel() }
    document.addEventListener('visibilitychange', hidden)
    const listener = Capacitor.isNativePlatform() ? NativeApp.addListener('appStateChange', s => { if (!s.isActive) cancel() }) : null
    return () => { document.removeEventListener('visibilitychange', hidden); void listener?.then(l => l.remove()); cancel() }
  }, [cancel])
  const previewPlan = makePlan(lesson.intervals, base, mode, gentle, { ...lesson, cueSeconds: spokenCues ? 2.5 : undefined })
  return { status, pitch, elapsed, phase, trace, start, finish, cancel, duration: previewPlan[previewPlan.length - 1].end }
}
