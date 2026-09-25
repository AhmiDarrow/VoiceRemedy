import type { Result } from './pitch'
export function loadResults(): Result[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('voiceremedy.sessions.v1') || '[]')
    return Array.isArray(data) ? data.filter((r): r is Result => {
      if (!r || typeof r.id !== 'string' || typeof r.date !== 'string' || !Number.isFinite(Date.parse(r.date)) || typeof r.exercise !== 'string') return false
      if (!Number.isFinite(r.seconds) || r.seconds < 0 || !Number.isInteger(r.samples) || r.samples < 0) return false
      if (!['accuracy','offset','steadiness','low','high'].every(k => r[k] === null || Number.isFinite(r[k]))) return false
      if (r.accuracy !== null && (r.accuracy < 0 || r.accuracy > 100)) return false
      if (!['coverage','participation'].every(k => r[k] === undefined || (typeof r[k] === 'number' && r[k] >= 0 && r[k] <= 1))) return false
      return true
    }).slice(0, 200) : []
  } catch { return [] }
}
export function saveResults(results: Result[]) { localStorage.setItem('voiceremedy.sessions.v1', JSON.stringify(results.slice(0, 200))) }
export type Preferences = { liveHints?: boolean; base: number; voice: boolean; gentle: boolean; mode: 'echo' | 'phrase'; lessonId?: string }
export function loadPreferences(): Preferences {
  const fallback: Preferences = { base: 60, voice: true, gentle: false, mode: 'echo' }
  try {
    const value = JSON.parse(localStorage.getItem('voiceremedy.preferences.v1') || 'null')
    if (!value || typeof value !== 'object') return fallback
    return { ...(typeof value.liveHints==='boolean'?{liveHints:value.liveHints}:{}), base: Number.isInteger(value.base) && value.base >= 36 && value.base <= 83 ? value.base : fallback.base, voice: typeof value.voice === 'boolean' ? value.voice : true, gentle: value.gentle === true, mode: value.mode === 'phrase' ? 'phrase' : 'echo', ...(typeof value.lessonId === 'string' && value.lessonId.length < 80 ? {lessonId:value.lessonId} : {}) }
  } catch { return fallback }
}
export function savePreferences(value: Preferences) { localStorage.setItem('voiceremedy.preferences.v1', JSON.stringify(value)) }

