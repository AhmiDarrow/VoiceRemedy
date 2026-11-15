import { translate } from './i18n/translate'
import { summarize, type Result } from './pitch'
export type PracticeMode = 'echo' | 'phrase'
export type Phase = { kind: 'prepare' | 'listen' | 'settle' | 'sing' | 'rest'; start: number; end: number; step: number; round: number; midi: number }
export type NoteReview = { step: number; midi: number; samples: number; accuracy: number | null; offset: number | null }
export type SingingResult = Result & { base: number; mode: PracticeMode; gentle: boolean; notes: NoteReview[]; coverage: number; voicedSeconds: number; participation?: number }
export const MIN_SAMPLES = 20
export const CLOSE_CENTS = 35
export function makePlan(intervals: readonly number[], base: number, mode: PracticeMode, gentle: boolean, timing: { beats?: readonly number[]; bpm?: number; phraseBreaks?: readonly number[]; cueSeconds?: number } = {}): Phase[] {
  const plan: Phase[] = []
  let time = 0
  const add = (kind: Phase['kind'], duration: number, step: number, round: number) => {
    plan.push({ kind, start: time, end: time + duration, step, round, midi: base + intervals[step] }); time += duration
  }
  const rounds = intervals.length === 1 ? 5 : intervals.length <= 5 ? 2 : 1
  add('prepare', 2, 0, 0)
  for (let round = 0; round < rounds; round++) {
    if (mode === 'echo') {
      intervals.forEach((_, step) => { add('listen', .9, step, round); add('settle', timing.cueSeconds ?? .65, step, round); add('sing', gentle ? 2 : 3, step, round); add('rest', gentle ? 1.4 : 1, step, round) })
    } else {
      const beat = 60 / (timing.bpm ?? (gentle ? 50 : 60))
      const duration = (step: number) => (timing.beats?.[step] ?? 1) * beat
      intervals.forEach((_, step) => { add('listen', duration(step), step, round); if (timing.phraseBreaks?.includes(step)) add('rest', 1.5, step, round) })
      add('settle', timing.cueSeconds ?? 1.2, 0, round)
      intervals.forEach((_, step) => { add('sing', duration(step), step, round); if (timing.phraseBreaks?.includes(step)) add('rest', gentle ? 2.5 : 1.5, step, round) })
      add('rest', 2.5, intervals.length - 1, round)
    }
  }
  return plan
}
export function phaseAt(plan: Phase[], seconds: number) { return plan.find(p => seconds >= p.start && seconds < p.end) ?? null }
export function canMeasure(phase: Phase | null, seconds: number) { return phase?.kind === 'sing' && seconds >= phase.start + .25 }
export function participation(plan: Phase[], samples: number) {
  const available = plan.filter(p => p.kind === 'sing').reduce((sum, p) => sum + Math.max(0, p.end - p.start - .25), 0)
  return available ? Math.min(1, samples * .09 / available) : 0
}
export function median(values: number[]) {
  const sorted = [...values].sort((a,b) => a-b), m = Math.floor(sorted.length / 2)
  return sorted.length ? sorted.length % 2 ? sorted[m] : (sorted[m-1] + sorted[m]) / 2 : 0
}
export function comfortableNote(midis: number[]): number | null {
  if (midis.length < MIN_SAMPLES) return null
  const sorted = [...midis].sort((a,b) => a-b)
  if (sorted[Math.floor(sorted.length * .75)] - sorted[Math.floor(sorted.length * .25)] > 1.5) return null
  const note = Math.round(median(midis))
  return note >= 36 && note <= 83 ? note : null
}
export function reviewNotes(intervals: readonly number[], base: number, values: { cents: number; step: number }[]): NoteReview[] {
  return intervals.map((interval, step) => {
    const cents = values.filter(v => v.step === step).map(v => v.cents)
    return { step, midi: base + interval, samples: cents.length, accuracy: cents.length >= 4 ? Math.round(100 * cents.filter(c => Math.abs(c) <= CLOSE_CENTS).length / cents.length) : null, offset: cents.length >= 4 ? Math.round(median(cents)) : null }
  })
}
export function assessment(result: Result & Partial<SingingResult>): { key: string; title: string; action: string; detail: string } {
  const tr = translate
  if (result.samples < MIN_SAMPLES) return { key: 'no-signal', title: tr('assess.nosignal.title'), action: tr('assess.nosignal.action'), detail: tr('assess.nosignal.detail') }
  const r = result as Partial<SingingResult>
  if ((r.coverage !== undefined && r.coverage < .6) || (r.participation !== undefined && r.participation < .45)) return { key: 'coverage', title: tr('assess.coverage.title'), action: tr('assess.coverage.action'), detail: tr('assess.coverage.detail') }
  if (Math.abs(result.offset ?? 0) > 700) return { key: 'octave', title: tr('assess.octave.title'), action: tr('assess.octave.action'), detail: tr('assess.octave.detail') }
  if ((result.accuracy ?? 0) >= 75) return { key: 'great', title: tr('assess.great.title'), action: tr(r.mode === 'echo' ? 'assess.great.action.echo' : 'assess.great.action.phrase'), detail: tr('assess.great.detail') }
  if ((result.offset ?? 0) < -35) return { key: 'low', title: tr('assess.low.title'), action: tr('assess.low.action'), detail: tr('assess.low.detail') }
  if ((result.offset ?? 0) > 35) return { key: 'high', title: tr('assess.high.title'), action: tr('assess.high.action'), detail: tr('assess.high.detail') }
  return { key: 'steady', title: tr('assess.steady.title'), action: tr('assess.steady.action'), detail: tr('assess.steady.detail') }
}
export function nextLessonId(results: Result[], ids: readonly string[]): string {
  return ids.find(id => {
    const latest = results.find(r => r.exercise === id)
    return !latest || latest.samples < MIN_SAMPLES || (latest.accuracy ?? 0) < 75 || ((latest as Partial<SingingResult>).coverage ?? 1) < .6
  }) ?? ids[0]
}
export function comparablePrevious(result: SingingResult, history: (Result & Partial<SingingResult>)[]) {
  return history.find((r) => {
    const prior = r as Partial<SingingResult>
    return r.id !== result.id && r.exercise === result.exercise && prior.base === result.base && prior.mode === result.mode && prior.gentle === result.gentle && r.samples >= MIN_SAMPLES && (prior.coverage ?? 0) >= .6
  })
}
export function singingSummary(cents: number[], midis: number[]) {
  const stats = summarize(cents, midis)
  return { ...stats, offset: cents.length ? Math.round(median(cents)) : null }
}
