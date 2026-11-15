// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createReferencePlayer, openMicrophone, playNotes, speak } from './audio'
import App from './App'
import { lessons } from './course'
import { coachText } from './lessons'
import { songLessons } from './songbook'
import { loadPreferences, savePreferences } from './storage'
import { formatLesson } from './i18n/content'
import { detectLocale } from './i18n/locales'
import { packagedAppVersion } from './appVersion'
import { catalog, getLocale, localizeKnown, pickText, resetLocaleForTests, setLocale, translate } from './i18n/translate'

vi.mock('./audio', () => ({
  openMicrophone: vi.fn(),
  speak: vi.fn(),
  createReferencePlayer: vi.fn(),
  stopPlayback: vi.fn(),
  playNotes: vi.fn(),
  microphoneError: (e: Error) => e.message,
}))

describe('locale catalogs', () => {
  afterEach(() => { resetLocaleForTests() })

  it('detects a supported language and falls back to English', () => {
    expect(detectLocale(['de-AT', 'en'])).toBe('de')
    expect(detectLocale(['zh-TW', 'fr-CA'])).toBe('fr')
    expect(detectLocale(['zh-Hans-CN'])).toBe('zh-CN')
    expect(detectLocale(['pt-PT'])).toBe('pt-BR')
    expect(detectLocale(['xx'])).toBe('en')
  })

  it('falls back when a translation is missing or blank', () => {
    expect(pickText('  ', 'English', 'key')).toBe('English')
    expect(pickText('', '', 'key')).toBe('key')
    setLocale('de')
    expect(translate('app.start')).toBe(catalog('de')['app.start'])
    expect(translate('missing.key')).toBe('missing.key')
    expect(localizeKnown('not a known error')).toBe('not a known error')
  })

  it('keeps English coach lines and lesson lyrics identical to the source', () => {
    const en = catalog('en')
    for (const key of Object.keys(coachText)) expect(en['coach.' + key]).toBe(coachText[key as keyof typeof coachText])
    const mary = songLessons.find(lesson => lesson.id === 'mary-1')!
    expect(formatLesson(mary, 'en').title).toBe(mary.title)
    expect(formatLesson(mary, 'en').lyrics).toEqual(mary.lyrics)
    expect(formatLesson(mary, 'de').lyrics?.length).toBe(mary.lyrics?.length)
    const melody = lessons.find(lesson => lesson.id === 'melody')!
    expect(formatLesson(melody, 'en').title).toBe(melody.title)
    expect(formatLesson(melody, 'en').lyrics).toEqual(melody.lyrics)
  })
})

describe('saved language', () => {
  beforeEach(() => { localStorage.clear(); resetLocaleForTests() })

  it('round-trips the locale without dropping the other preferences', () => {
    savePreferences({ base: 57, voice: false, gentle: true, mode: 'phrase', locale: 'ja' })
    resetLocaleForTests()
    expect(getLocale()).toBe('ja')
    expect(loadPreferences()).toEqual({ base: 57, voice: false, gentle: true, mode: 'phrase', locale: 'ja' })
  })
})

describe('the coach screen', () => {
  let root: Root
  let host: HTMLDivElement

  beforeEach(() => {
    localStorage.clear()
    resetLocaleForTests()
    vi.mocked(createReferencePlayer).mockReturnValue({ ready: Promise.resolve(), play: vi.fn(), stop: vi.fn() })
    vi.mocked(playNotes).mockResolvedValue(undefined)
    vi.mocked(speak).mockResolvedValue(true)
    vi.mocked(openMicrophone).mockResolvedValue({ stop: vi.fn() })
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    resetLocaleForTests()
  })

  it('renders German, then Japanese, from the saved preference', async () => {
    localStorage.setItem('voiceremedy.preferences.v1', JSON.stringify({ base: 60, voice: true, gentle: false, mode: 'echo', locale: 'de' }))
    resetLocaleForTests()
    await act(async () => { root.render(createElement(App)) })
    expect(host.textContent).toContain(catalog('de')['app.start'])
    expect(document.documentElement.lang).toBe('de')
    const saved = JSON.parse(localStorage.getItem('voiceremedy.preferences.v1') || '{}') as { locale?: string }
    localStorage.setItem('voiceremedy.preferences.v1', JSON.stringify({ ...saved, locale: 'ja' }))
    await act(async () => { resetLocaleForTests() })
    expect(document.documentElement.lang).toBe('ja')
    expect(host.textContent).toContain(catalog('ja')['app.start'])
  })

  it('shows About with the installed version and the untranslated sign-off', async () => {
    const signOff = '"Hope this helps" - Ahmi'
    localStorage.setItem('voiceremedy.preferences.v1', JSON.stringify({ base: 60, voice: true, gentle: false, mode: 'echo', locale: 'de' }))
    resetLocaleForTests()
    await act(async () => { root.render(createElement(App)) })
    expect(host.textContent).toContain(catalog('de')['app.about'])
    expect(host.textContent).toContain(catalog('de')['app.about.version'])
    expect(host.textContent).toContain(signOff)
    expect(host.querySelector('.coach-about-name')?.textContent).toBe('VoiceRemedy')
    expect(host.querySelector('.coach-about-version')?.textContent).toBe(packagedAppVersion())
    const link = host.querySelector('.coach-about-card a')
    expect(link?.getAttribute('href')).toBe('https://github.com/AhmiDarrow/VoiceRemedy')
    expect(link?.textContent).toBe(catalog('de')['app.about.source'])
    const saved = JSON.parse(localStorage.getItem('voiceremedy.preferences.v1') || '{}') as { locale?: string }
    localStorage.setItem('voiceremedy.preferences.v1', JSON.stringify({ ...saved, locale: 'ja' }))
    await act(async () => { resetLocaleForTests() })
    expect(host.textContent).toContain(catalog('ja')['app.about'])
    expect(host.textContent).toContain(catalog('ja')['app.about.source'])
    expect(host.textContent).toContain(signOff)
  })
})
