import { version as packagedVersion } from '../package.json'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/** Exact sign-off. It is not translated. */
export const ABOUT_SIGN_OFF = '"Hope this helps" - Ahmi'

export const SOURCE_URL = 'https://github.com/AhmiDarrow/VoiceRemedy'

export function packagedAppVersion(): string {
  return packagedVersion
}

type TauriInternals = {
  invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>
}

function tauriInternals(): TauriInternals | null {
  const host = globalThis as { __TAURI_INTERNALS__?: TauriInternals }
  return host.__TAURI_INTERNALS__ ?? null
}

export function isDesktopShell(): boolean {
  return tauriInternals()?.invoke != null
}

/** Installed app version. Native shells report their own version; the web build uses package.json. */
export async function readAppVersion(): Promise<string> {
  const tauri = tauriInternals()
  if (tauri?.invoke) {
    try {
      const version = await tauri.invoke('plugin:app|version', {})
      if (typeof version === 'string' && version.trim()) return version.trim()
    } catch { /* the packaged version still identifies this build */ }
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await NativeApp.getInfo()
      if (info.version?.trim()) return info.version.trim()
    } catch { /* fall through */ }
  }
  return packagedVersion
}

/** Web builds open a new tab. Android lets the WebView hand the link to the system browser. Desktop opens it from Rust. */
export function sourceLinkOpensInNewTab(): boolean {
  return !isDesktopShell() && !Capacitor.isNativePlatform()
}

/** Desktop opens the fixed project URL from Rust so the page cannot be redirected. */
export async function openSourcePage(event?: { preventDefault(): void }): Promise<void> {
  const tauri = tauriInternals()
  if (!tauri?.invoke) return
  event?.preventDefault()
  try {
    await tauri.invoke('open_source_page', {})
  } catch {
    window.open(SOURCE_URL, '_blank', 'noopener,noreferrer')
  }
}
