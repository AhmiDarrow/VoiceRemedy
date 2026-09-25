import { detectPitch, frequency, type Pitch } from './pitch'
let coach: HTMLAudioElement | null = null
let cancelCoach: (() => void) | null = null
let toneContext: AudioContext | null = null
export function stopPlayback() {
  cancelCoach?.()
  if (toneContext) { void toneContext.close(); toneContext = null }
}
export async function speak(key: string) {
  stopPlayback()
  const audio = new Audio(`/coach/${key}.wav`)
  coach = audio
  return await new Promise<boolean>((resolve, reject) => {
    let settled = false
    const finish = (completed: boolean, error?: unknown) => {
      if (settled) return
      settled = true; window.clearTimeout(timeout)
      audio.onended = null; audio.onerror = null; audio.pause(); audio.removeAttribute('src')
      if (coach === audio) { coach = null; cancelCoach = null }
      if (error) reject(error); else resolve(completed)
    }
    const timeout = window.setTimeout(() => finish(false, new Error('The coach audio stopped responding. You can continue with the written instructions.')), 120000)
    cancelCoach = () => finish(false)
    audio.onended = () => finish(true)
    audio.onerror = () => finish(false, new Error('The coach audio could not play. The full instructions are available on screen.'))
    try { void audio.play().catch(error => finish(false, error)) } catch(error) { finish(false, error) }
  })
}
export async function playNotes(midis: readonly number[], timing: { beats?: readonly number[]; bpm?: number; phraseBreaks?: readonly number[] } = {}) {
  stopPlayback()
  const ctx = new AudioContext(); toneContext = ctx
  try {
  await ctx.resume()
  if (toneContext !== ctx) return
  let elapsed = 0
  midis.forEach((midi, i) => {
    const duration = (timing.beats?.[i] ?? 1) * 60 / (timing.bpm ?? 75)
    const osc = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime + elapsed
    osc.type = 'sine'; osc.frequency.value = frequency(midi)
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.18, start + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration - .08)
    osc.connect(gain); gain.connect(ctx.destination); osc.start(start); osc.stop(start + duration - .04)
    osc.onended = () => { osc.disconnect(); gain.disconnect() }
    elapsed += duration + (timing.phraseBreaks?.includes(i) ? 1.5 : 0)
  })
  await new Promise(r => setTimeout(r, elapsed * 1000 + 100))
  } finally {
    if (toneContext === ctx) { toneContext = null; await ctx.close() }
  }
}
export type ReferencePlayer = { ready: Promise<void>; play: (midi: number, seconds?: number) => void; stop: () => void }
export function createReferencePlayer(): ReferencePlayer {
  const ctx = new AudioContext()
  let stopped = false
  return {
    ready: ctx.resume(),
    play(midi, seconds = .72) {
      if (stopped) return
      const osc = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime
      osc.type = 'triangle'; osc.frequency.value = frequency(midi)
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.1, start + .035)
      gain.gain.exponentialRampToValueAtTime(.001, start + seconds - .04)
      osc.connect(gain); gain.connect(ctx.destination); osc.start(start); osc.stop(start + seconds)
      osc.onended = () => { osc.disconnect(); gain.disconnect() }
    },
    stop() { if (!stopped) { stopped = true; void ctx.close() } },
  }
}
export type Microphone = { stop: () => void }
export async function openMicrophone(onPitch: (pitch: Pitch) => void, onLost: () => void, signal?: AbortSignal): Promise<Microphone> {
  const aborted = () => new DOMException('Microphone request cancelled', 'AbortError')
  if (signal?.aborted) throw aborted()
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is unavailable here. Use the installed app or open VoiceRemedy on localhost or HTTPS.')
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false })
  if (signal?.aborted) { stream.getTracks().forEach(t => t.stop()); throw aborted() }
  let ctx: AudioContext | undefined
  let onAbort: (()=>void) | undefined
  try {
    ctx = new AudioContext()
    const interrupted = new Promise<never>((_,reject) => {
      onAbort = () => { stream.getTracks().forEach(t => t.stop()); reject(aborted()) }
      signal?.addEventListener('abort',onAbort,{once:true})
    })
    await Promise.race([ctx.resume(),interrupted])
    if (onAbort) signal?.removeEventListener('abort',onAbort)
    if (signal?.aborted) throw aborted()
    const source = ctx.createMediaStreamSource(stream), analyser = ctx.createAnalyser()
    analyser.fftSize = 2048; source.connect(analyser)
    const buffer = new Float32Array(analyser.fftSize)
    let stopped = false
    const timer = window.setInterval(() => { if (!stopped) { analyser.getFloatTimeDomainData(buffer); onPitch(detectPitch(buffer, ctx!.sampleRate)) } }, 90)
    const stop = () => { if (stopped) return; stopped = true; clearInterval(timer); source.disconnect(); stream.getTracks().forEach(t => { t.onended = null; t.stop() }); void ctx!.close() }
    stream.getTracks().forEach(t => { t.onended = () => { stop(); onLost() } })
    return { stop }
  } catch (error) { if(onAbort) signal?.removeEventListener('abort',onAbort); stream.getTracks().forEach(t => t.stop()); if (ctx) void ctx.close(); throw error }
}
export function microphoneError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Microphone access was declined. Allow the microphone in your app or browser settings, then try again.'
    if (error.name === 'NotFoundError') return 'No microphone was found. Connect a microphone, then try again.'
    if (error.name === 'NotReadableError') return 'The microphone is busy or unavailable. Close other recording apps and try again.'
  }
  return error instanceof Error ? error.message : 'We could not start the microphone. Please try again.'
}
