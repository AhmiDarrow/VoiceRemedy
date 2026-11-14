import { describe, it, expect } from 'vitest'
import { analysisFactor, decimate, detectPitch, frequency, midiNumber, summarize, feedback, noteName } from './pitch'
describe('real signal pitch detection', () => {
  for (const rate of [44100, 48000]) for (const hz of [82.41, 130.81, 220, 261.63, 440, 880]) {
    it(`detects ${hz}Hz at ${rate}Hz without octave errors`, () => {
      const signal = Float32Array.from({length: 2048}, (_, i) => 0.3 * Math.sin(2 * Math.PI * hz * i / rate) + 0.1 * Math.sin(4 * Math.PI * hz * i / rate))
      const result = detectPitch(signal, rate)
      expect(Math.abs(1200 * Math.log2(result.hz / hz))).toBeLessThan(12)
      expect(result.clarity).toBeGreaterThan(.84)
    })
  }
  for (const rate of [88200, 96000, 192000]) for (const hz of [82.41, 130.81, 440, 880]) {
    it(`keeps low and high voices in range on a ${rate}Hz device (${hz}Hz)`, () => {
      const factor = analysisFactor(rate)
      const signal = Float32Array.from({length: 2048 * factor}, (_, i) => 0.3 * Math.sin(2 * Math.PI * hz * i / rate) + 0.1 * Math.sin(4 * Math.PI * hz * i / rate))
      const result = detectPitch(decimate(signal, factor), rate / factor)
      expect(Math.abs(1200 * Math.log2(result.hz / hz))).toBeLessThan(12)
      expect(result.clarity).toBeGreaterThan(.84)
    })
  }
  it('uses valid analyser sizes for any device rate', () => {
    for (const rate of [8000, 44100, 48000, 64000, 88200, 96000, 144000, 176400, 192000, 384000, 768000]) {
      const size = 2048 * analysisFactor(rate)
      expect(Math.log2(size) % 1).toBe(0); expect(size).toBeLessThanOrEqual(32768)
      if (rate > 48000) expect(rate / analysisFactor(rate)).toBeGreaterThanOrEqual(36000)
    }
  })
  it('does not grade silence or DC offset as singing', () => {
    expect(detectPitch(new Float32Array(2048), 48000).hz).toBe(0)
    expect(detectPitch(new Float32Array(2048).fill(.2), 48000).hz).toBe(0)
  })
  it('rejects deterministic broadband noise', () => {
    let seed = 19
    const noise = Float32Array.from({ length: 2048 }, () => { seed = (seed * 1664525 + 1013904223) >>> 0; return ((seed / 4294967296) - .5) * .4 })
    expect(detectPitch(noise, 48000).hz).toBe(0)
  })
})
describe('honest practice feedback', () => {
  it('does not award a score without voiced samples', () => {
    const result = summarize([], [])
    expect(result.accuracy).toBeNull(); expect(feedback(result)).toBe('no-signal')
  })
  it('counts actual target cents, including octave mistakes', () => {
    expect(summarize([0, 20, -20, 1200], [60, 60.2, 59.8, 72]).accuracy).toBe(75)
  })
  it('gives useful feedback about direction', () => {
    expect(feedback(summarize(Array(10).fill(-60), Array(10).fill(59.4)))).toBe('low')
    expect(feedback(summarize(Array(10).fill(60), Array(10).fill(60.6)))).toBe('high')
    expect(feedback(summarize(Array(10).fill(10), Array(10).fill(60.1)))).toBe('great')
  })
  it('uses concert A and labels octaves', () => {
    expect(frequency(69)).toBe(440); expect(midiNumber(440)).toBe(69); expect(noteName(60)).toBe('C4')
  })
})
