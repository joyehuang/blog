// Source-level guard: SEO work must not change the existing Astro template/body.
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const base = process.argv[2] || 'HEAD'
const files = execFileSync('git', ['diff', '--name-only', base], { encoding: 'utf8' })
  .trim()
  .split('\n')
const changed = []
for (const file of files.filter(
  (f) => f.endsWith('.astro') && f !== 'src/components/BaseHead.astro'
)) {
  const before = execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' })
  const after = await readFile(file, 'utf8')
  const body = (s) => s.slice(s.indexOf('\n---', 4) + 4)
  if (body(before) !== body(after)) changed.push(file)
}
for (const file of files.filter((f) => f.startsWith('public/') && f.endsWith('.html'))) {
  const before = execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' })
  const after = await readFile(file, 'utf8')
  if (before.slice(before.indexOf('<body')) !== after.slice(after.indexOf('<body')))
    changed.push(file)
}
console.log(JSON.stringify({ changedBodyTemplates: changed }))
if (changed.length) process.exitCode = 1
