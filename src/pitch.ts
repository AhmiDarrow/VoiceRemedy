export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
export const midiNumber = (hz: number) => 69 + 12 * Math.log2(hz / 440)
export const noteName = (midi: number) => ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][((Math.round(midi) % 12) + 12) % 12] + (Math.floor(Math.round(midi) / 12) - 1)
export type Pitch = { hz: number; clarity: number; level: number }
// YIN's cumulative normalized difference rejects harmonics and silence.
export function detectPitch(buffer: Float32Array, sampleRate: number): Pitch {
  let energy = 0, mean = 0
  for (const v of buffer) mean += v
  mean /= buffer.length
  for (const v of buffer) energy += (v - mean) ** 2
  const level = Math.sqrt(energy / buffer.length)
  const none = { hz: 0, clarity: 0, level }
  if (level < 0.008) return none
  const min = Math.floor(sampleRate / 1100), max = Math.min(Math.ceil(sampleRate / 65), Math.floor(buffer.length / 2) - 1)
  const size = buffer.length - max, diff = new Float32Array(max + 1)
  let cumulative = 0
  for (let tau = 1; tau <= max; tau++) {
    let sum = 0
    for (let i = 0; i < size; i++) sum += (buffer[i] - buffer[i + tau]) ** 2
    cumulative += sum
    diff[tau] = cumulative ? sum * tau / cumulative : 1
  }
  for (let tau = min; tau < max - 1; tau++) {
    if (diff[tau] > 0.16) continue
    while (tau + 1 < max && diff[tau + 1] < diff[tau]) tau++
    const a = diff[tau - 1], b = diff[tau], c = diff[tau + 1]
    const shift = (a - c) / (2 * (a - 2 * b + c)) || 0
    const hz = sampleRate / (tau + shift)
    return hz >= 65 && hz <= 1100 ? { hz, clarity: 1 - b, level } : none
  }
  return none
}
export type Result = { id: string; date: string; exercise: string; seconds: number; samples: number; accuracy: number | null; offset: number | null; steadiness: number | null; low: number | null; high: number | null }
export function summarize(cents: number[], midis: number[]) {
  if (!cents.length) return { samples: 0, accuracy: null, offset: null, steadiness: null, low: null, high: null }
  const offset = cents.reduce((a, b) => a + b, 0) / cents.length
  return { samples: cents.length, accuracy: Math.round(cents.filter(c => Math.abs(c) <= 35).length / cents.length * 100), offset: Math.round(offset), steadiness: Math.round(Math.sqrt(cents.reduce((s, c) => s + (c - offset) ** 2, 0) / cents.length)), low: Math.min(...midis), high: Math.max(...midis) }
}
export function feedback(result: Pick<Result, 'samples' | 'accuracy' | 'offset'>): string {
  if (result.samples < 8) return 'no-signal'
  if ((result.accuracy ?? 0) >= 75) return 'great'
  if ((result.offset ?? 0) < -35) return 'low'
  if ((result.offset ?? 0) > 35) return 'high'
  return 'steady'
}
