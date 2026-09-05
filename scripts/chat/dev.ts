// Explicit local runner. Secrets stay in a mode-0600 JSON file under ~/.config.
import { spawn } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const file = resolve(process.argv[2] ?? '')
if (
  !file.startsWith(resolve(homedir(), '.config') + '/') ||
  ((await stat(file)).mode & 0o777) !== 0o600
)
  throw Error('Use a mode-0600 config file under ~/.config')
const config = JSON.parse(await readFile(file, 'utf8'))
if (!Object.keys(config).every((k) => k.startsWith('CHAT_')))
  throw Error('Only CHAT_ configuration is allowed')
// Read the existing authorized search credential into the child environment only;
// do not duplicate it into another configuration file. This launcher is local-only.
if (!config.CHAT_TINYFISH_KEY) {
  const searchKeyFile = resolve(homedir(), '.config/tinyfish/key')
  if (((await stat(searchKeyFile)).mode & 0o777) !== 0o600)
    throw Error('Search key must be mode0600')
  config.CHAT_TINYFISH_KEY = (await readFile(searchKeyFile, 'utf8')).trim()
}
const origin = new URL(config.CHAT_ORIGIN)
if (!['localhost', '127.0.0.1'].includes(origin.hostname)) throw Error('Local runner only')
const child = spawn('bun', ['dev', '--host', origin.hostname, '--port', origin.port], {
  stdio: 'inherit',
  env: { ...process.env, ...config }
})
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal))
child.on('exit', (code) => process.exit(code ?? 0))
