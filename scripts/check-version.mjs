// Fails when the app version differs between the files that ship it, or from an expected tag.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const read = path => readFileSync(root + path, 'utf8')
const pkg = JSON.parse(read('package.json')).version
const found = {
  'package.json': pkg,
  'package-lock.json': JSON.parse(read('package-lock.json')).packages[''].version,
  'src-tauri/tauri.conf.json': JSON.parse(read('src-tauri/tauri.conf.json')).version,
  'src-tauri/Cargo.toml': read('src-tauri/Cargo.toml').match(/^version\s*=\s*"([^"]+)"/m)?.[1],
  'src-tauri/Cargo.lock': read('src-tauri/Cargo.lock').match(/name = "voice-remedy"\nversion = "([^"]+)"/)?.[1],
  'android/app/build.gradle': read('android/app/build.gradle').match(/versionName\s+"([^"]+)"/)?.[1],
}
const tag = process.argv[2]
if (tag) found[`tag ${tag}`] = tag.replace(/^v/, '')
const wrong = Object.entries(found).filter(([, v]) => v !== pkg)
if (wrong.length) {
  console.error(`Version mismatch (package.json is ${pkg}):`)
  for (const [file, v] of wrong) console.error(`  ${file}: ${v ?? 'not found'}`)
  process.exit(1)
}
for (const file of ['releases/RELEASE-NOTES-' + pkg + '.md', 'INSTALL.md']) {
  if (file === 'INSTALL.md' ? !read(file).includes(`VoiceRemedy-${pkg}-`) : !read(file)) { console.error(`${file} does not describe ${pkg}`); process.exit(1) }
}
console.log(`Version ${pkg} is consistent.`)
