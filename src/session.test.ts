// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './StudioLibrary'
import { openMicrophone, speak, createReferencePlayer } from './audio'
import type { Pitch } from './pitch'
import { canMeasure, makePlan, phaseAt } from './coaching'
vi.mock('./audio', () => ({ createReferencePlayer: vi.fn(), openMicrophone: vi.fn(), stopPlayback: vi.fn(), playNotes: vi.fn().mockResolvedValue(undefined), speak: vi.fn().mockResolvedValue(undefined), microphoneError: (e: Error) => e.message }))
let root: Root, host: HTMLDivElement
async function click(name: string) {
  const button = [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === name || b.getAttribute('aria-label') === name)
  expect(button, `Button ${name} exists`).toBeTruthy()
  await act(async () => { button!.click() })
}
beforeEach(async () => {
  vi.clearAllMocks(); localStorage.clear(); vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date', 'performance'] }); vi.stubGlobal('scrollTo', vi.fn()); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); vi.mocked(createReferencePlayer).mockReturnValue({ ready: Promise.resolve(), play: vi.fn(), stop: vi.fn() })
  vi.mocked(speak).mockResolvedValue(true)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => root.render(createElement(App)))
  await click('Let’s find my voice')
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals() })
describe('practice lifecycle', () => {
  it('ignores the reference, settling time, and breathing spaces even when the microphone hears pitch', async () => {
    let callback!: (p: Pitch) => void
    vi.mocked(openMicrophone).mockImplementation(async cb => { callback = cb; return { stop: vi.fn() } })
    await click('Start listening')
    const plan = makePlan([0],60,'echo',false)
    await act(async () => {
      for (let milliseconds = 90; milliseconds < 29000; milliseconds += 90) {
        vi.advanceTimersByTime(90)
        if (!canMeasure(phaseAt(plan,milliseconds/1000),milliseconds/1000)) callback({hz:261.625565,level:.2,clarity:.99})
      }
      vi.advanceTimersByTime(1000)
    })
    expect(localStorage.getItem('voiceremedy.sessions.v1')).toBeNull()
    expect(host.textContent).toContain('We need a little more clear singing.')
  })
  it('automatically finishes a complete practice and rewards sustained participation', async () => {
    let callback!: (p: Pitch) => void
    const stop = vi.fn()
    vi.mocked(openMicrophone).mockImplementation(async cb => { callback = cb; return { stop } })
    await click('Start listening')
    await act(async () => {
      for (let milliseconds = 90; milliseconds < 30500; milliseconds += 90) {
        vi.advanceTimersByTime(90); callback({hz:261.625565,level:.2,clarity:.99})
      }
    })
    const result = JSON.parse(localStorage.getItem('voiceremedy.sessions.v1')!)[0]
    expect(result.accuracy).toBe(100); expect(result.participation).toBeGreaterThan(.85)
    expect(stop).toHaveBeenCalledOnce(); expect(speak).toHaveBeenCalledWith('great')
    expect(host.textContent).toContain('You’re finding your center.')
  })
  it('does not count repeated callbacks as extra singing', async () => {
    let callback!: (p: Pitch) => void
    vi.mocked(openMicrophone).mockImplementation(async cb => { callback = cb; return { stop: vi.fn() } })
    await click('Start listening')
    await act(async () => { vi.advanceTimersByTime(3850); for(let i=0;i<100;i++) callback({hz:261.625565,level:.2,clarity:.99}) })
    await click('Finish & hear feedback')
    expect(localStorage.getItem('voiceremedy.sessions.v1')).toBeNull()
  })
  it('releases a microphone which resolves after the user leaves', async () => {
    let resolve!: (m: { stop: () => void }) => void
    const stop = vi.fn()
    vi.mocked(openMicrophone).mockImplementation(() => new Promise(r => { resolve = r }))
    await click('Start listening'); await click('My space')
    await act(async () => resolve({ stop }))
    expect(stop).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('Make room for')
  })
  it('releases a pending microphone on cancellation', async () => {
    let resolve!: (m: { stop: () => void }) => void
    const stop = vi.fn()
    vi.mocked(openMicrophone).mockImplementation(() => new Promise(r => { resolve = r }))
    await click('Start listening'); await click('Cancel microphone request')
    await act(async () => resolve({ stop }))
    expect(stop).toHaveBeenCalledOnce()
    expect(host.textContent).toContain('Microphone off')
  })
  it('shows a retryable microphone failure without inventing progress', async () => {
    vi.mocked(openMicrophone).mockRejectedValueOnce(new Error('Microphone permission declined'))
    await click('Start listening')
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Microphone permission declined')
    expect(host.textContent).toContain('Start listening')
    expect(localStorage.getItem('voiceremedy.sessions.v1')).toBeNull()
  })
  it('does not save or score silence', async () => {
    const stop = vi.fn()
    vi.mocked(openMicrophone).mockResolvedValue({ stop })
    await click('Start listening'); await click('Finish & hear feedback')
    expect(stop).toHaveBeenCalledOnce()
    expect(host.textContent).toContain('We need a little more clear singing.')
    expect(speak).toHaveBeenCalledWith('no-signal')
    expect(localStorage.getItem('voiceremedy.sessions.v1')).toBeNull()
  })
  it('grades real pitch samples and persists their result', async () => {
    let callback!: (p: Pitch) => void
    vi.mocked(openMicrophone).mockImplementation(async cb => { callback = cb; return { stop: vi.fn() } })
    await click('Start listening')
    await act(async () => { vi.advanceTimersByTime(3850); for (let i = 0; i < 24; i++) { callback({ hz: 261.625565, level: .2, clarity: .99 }); vi.advanceTimersByTime(90) } })
    await click('Finish & hear feedback')
    const result = JSON.parse(localStorage.getItem('voiceremedy.sessions.v1')!)[0]
    expect(result.accuracy).toBe(100); expect(result.samples).toBe(24)
    expect(speak).toHaveBeenCalledWith('coverage')
  })
})

