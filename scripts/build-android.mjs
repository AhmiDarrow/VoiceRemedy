import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = fileURLToPath(new URL('../', import.meta.url))
const temp = fileURLToPath(new URL('../.build-tmp', import.meta.url))
mkdirSync(temp, { recursive: true })
// Windows Java 21 selectors need a short path for their local Unix-domain socket.
const env = { ...process.env, JAVA_TOOL_OPTIONS: `${process.env.JAVA_TOOL_OPTIONS || ''} -Djdk.net.unixdomain.tmpdir=${temp}` }
const result = spawnSync(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['assembleDebug', '--no-daemon'], { cwd: `${root}android`, env, stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(result.status ?? 1)
