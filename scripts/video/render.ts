/**
 * Render scenes.html into PNG frames (and optionally an mp4 via ffmpeg).
 *
 *   bun run render.ts --stills            one mid-scene frame per scene → out/stills/
 *   bun run render.ts --scene sc-digest   frames for a single scene → out/frames-<id>/
 *   bun run render.ts                     full video → out/frames/ + out/video.mp4
 *
 * Options: --fps 24 (default) · --no-mp4 · --out <dir>
 */
import { chromium } from 'playwright'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const argv = process.argv.slice(2)
const flag = (n: string) => argv.includes(`--${n}`)
const opt = (n: string, d?: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d }

const here = path.dirname(fileURLToPath(import.meta.url))
const outRoot = path.resolve(here, opt('out', 'out')!)
const fps = Number(opt('fps', '24'))
const htmlUrl = 'file://' + path.join(here, 'scenes.html')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
await page.goto(htmlUrl, { waitUntil: 'networkidle' })
await page.evaluate(() => (document as any).fonts.ready)
const scenes: { id: string; start: number; dur: number }[] = await page.evaluate(() => (window as any).SCENE_STARTS)
const total: number = await page.evaluate(() => (window as any).TOTAL)

async function shot(T: number, file: string) {
  await page.evaluate((t) => (window as any).seek(t), T)
  await page.screenshot({ path: file, type: 'png' })
}

function fresh(dir: string) { if (existsSync(dir)) rmSync(dir, { recursive: true }); mkdirSync(dir, { recursive: true }) }

if (flag('stills')) {
  const dir = path.join(outRoot, 'stills'); fresh(dir)
  for (const [i, s] of scenes.entries()) {
    await shot(s.start + s.dur * 0.85, path.join(dir, `${String(i + 1).padStart(2, '0')}-${s.id}.png`))
  }
  console.log(`stills → ${dir}`)
} else {
  const one = opt('scene')
  const sel = one ? scenes.filter((s) => s.id === one) : null
  if (one && !sel?.length) throw new Error(`unknown scene ${one}; known: ${scenes.map((s) => s.id).join(', ')}`)
  const from = sel ? sel[0].start : 0
  const to = sel ? sel[0].start + sel[0].dur : total
  const dir = path.join(outRoot, sel ? `frames-${one}` : 'frames'); fresh(dir)
  const n = Math.round((to - from) * fps)
  const t0 = Date.now()
  for (let f = 0; f < n; f++) {
    await shot(from + f / fps, path.join(dir, `${String(f).padStart(5, '0')}.png`))
    if (f % 240 === 0) console.log(`${f}/${n} frames · ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  }
  console.log(`${n} frames → ${dir} in ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  if (!flag('no-mp4')) {
    const mp4 = path.join(outRoot, sel ? `scene-${one}.mp4` : 'video.mp4')
    const r = spawnSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', path.join(dir, '%05d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'inherit' })
    if (r.status !== 0) throw new Error('ffmpeg failed')
    console.log(`mp4 → ${mp4}`)
  }
}
await browser.close()
