import { afterEach, describe, expect, it, vi } from 'vitest'
import { ABOUT_SIGN_OFF, openSourcePage, packagedAppVersion, readAppVersion, SOURCE_URL } from './appVersion'

describe('installed version', () => {
  afterEach(() => {
    delete (globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  })

  it('uses the packaged version when the page is not inside a native shell', async () => {
    expect(packagedAppVersion()).toMatch(/^\d+\.\d+\.\d+$/)
    expect(await readAppVersion()).toBe(packagedAppVersion())
  })

  it('reads the desktop shell version at runtime', async () => {
    const invoke = vi.fn(async (command: string) => (command === 'plugin:app|version' ? '9.9.9' : null))
    ;(globalThis as { __TAURI_INTERNALS__?: { invoke: typeof invoke } }).__TAURI_INTERNALS__ = { invoke }
    expect(await readAppVersion()).toBe('9.9.9')
    expect(invoke).toHaveBeenCalledWith('plugin:app|version', {})
  })

  it('asks the desktop shell to open the fixed source page', async () => {
    const invoke = vi.fn(async () => undefined)
    ;(globalThis as { __TAURI_INTERNALS__?: { invoke: typeof invoke } }).__TAURI_INTERNALS__ = { invoke }
    const event = { preventDefault: vi.fn() }
    await openSourcePage(event)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('open_source_page', {})
    expect(ABOUT_SIGN_OFF).toBe('"Hope this helps" - Ahmi')
    expect(SOURCE_URL).toBe('https://github.com/AhmiDarrow/VoiceRemedy')
  })
})
