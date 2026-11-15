import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n')
const names = ['en', 'es', 'fr', 'de', 'pt-BR', 'it', 'ru', 'pl', 'ja', 'ko', 'zh-CN']

function load(name) {
  const text = readFileSync(join(dir, `${name}.json`), 'utf8')
  const data = JSON.parse(text)
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${name}.json is not an object`)
  return data
}

function placeholders(value) {
  return [...String(value).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join('\0')
}

const catalogs = Object.fromEntries(names.map(name => [name, load(name)]))
const english = catalogs.en
const englishKeys = Object.keys(english).sort()
let failed = false
function fail(message) {
  failed = true
  console.error(message)
}

for (const [key, value] of Object.entries(english)) {
  if (typeof value !== 'string' || value.trim() === '') fail(`en empty ${key}`)
}

for (const name of names) {
  if (name === 'en') continue
  const data = catalogs[name]
  const keys = Object.keys(data).sort()
  const missing = englishKeys.filter(key => !(key in data))
  const extra = keys.filter(key => !(key in english))
  if (missing.length || extra.length) fail(`${name} key mismatch missing=${missing.slice(0, 8).join(',')} extra=${extra.slice(0, 8).join(',')}`)
  for (const key of englishKeys) {
    const value = data[key]
    if (typeof value !== 'string' || value.trim() === '') {
      fail(`${name} empty ${key}`)
      continue
    }
    if (placeholders(value) !== placeholders(english[key])) fail(`${name} placeholders ${key}`)
    if (key.startsWith('lyric.') && value.split(' ').length !== english[key].split(' ').length) fail(`${name} lyric tokens ${key}`)
    if (english[key].includes('VoiceRemedy') && !value.includes('VoiceRemedy')) fail(`${name} dropped VoiceRemedy in ${key}`)
    if (english[key].includes('Voice Remedy') && !value.includes('Voice Remedy')) fail(`${name} dropped Voice Remedy in ${key}`)
  }
}

if (failed) process.exit(1)
console.log(`i18n ok ${englishKeys.length} keys ${names.length} locales`)
