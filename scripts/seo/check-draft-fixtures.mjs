// Real production and Preview builds with temporary, never-committed content.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises'

import { readPages } from './html.mjs'

const root = 'artifacts/seo/draft-fixtures'
await mkdir(root, { recursive: true })
const files = []
const paths = []
try {
  for (const kind of ['notes', 'blog']) {
    for (const en of [false, true]) {
      const id = kind === 'notes' ? 'seo-temporary-fixture' : 'seo-temporary-fixture/post'
      const file = `src/content/${kind}/${id}${en ? '.en' : ''}.md`
      await mkdir(file.slice(0, file.lastIndexOf('/')), { recursive: true })
      paths.push(`/${en ? 'en/' : ''}${kind}/${id}`)
      await writeFile(
        file,
        `---\ntitle: SEO temporary draft fixture\ndescription: Temporary regression fixture never published\n${kind === 'notes' ? 'date' : 'publishDate'}: 2026-09-01\ndraft: true\n${en ? `translationKey: ${id}\n` : ''}---\nTemporary draft body.\n`,
        { flag: 'wx' }
      )
      files.push(file)
    }
  }
  const result = {}
  for (const environment of ['production', 'preview']) {
    const built = spawnSync('bun', ['--bun', 'run', 'build'], {
      env: { ...process.env, VERCEL_ENV: environment, INDEXNOW_KEY: '' },
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024
    })
    await writeFile(`${root}/${environment}.log`, built.stdout + built.stderr)
    assert.equal(built.status, 0, `${environment} build failed`)
    const pages = await readPages('.vercel/output/static')
    const sitemap = await readFile('.vercel/output/static/sitemap.xml', 'utf8')
    const manifest = await readFile(
      '.vercel/output/static/.well-known/indexnow-manifest.json',
      'utf8'
    )
    for (const path of paths) {
      const page = pages.find((p) => p.path === path)
      if (environment === 'production') assert.equal(page, undefined)
      else {
        assert.ok(page?.noindex)
        assert.deepEqual(page.alternates, [])
      }
      assert.ok(!sitemap.includes(path))
      assert.ok(!manifest.includes(path))
    }
    for (const page of pages.filter((p) => !paths.includes(p.path))) {
      assert.ok(!page.alternates.some((a) => paths.includes(new URL(a.url).pathname)))
      const file = `.vercel/output/static${page.path === '/404' ? '/404.html' : page.path.endsWith('.html') ? page.path : `${page.path}/index.html`}`
      const html = await readFile(file, 'utf8')
      assert.ok(
        !/href=["'][^"']*seo-temporary-fixture/.test(html),
        `Draft linked from ${page.path}`
      )
    }
    result[environment] = {
      pages: pages.length,
      draftDetails: paths.filter((path) => pages.some((p) => p.path === path)),
      sitemapExcluded: true,
      manifestExcluded: true,
      noRecommendationsOrHreflang: true
    }
  }
  await writeFile(`${root}/result.json`, JSON.stringify(result, null, 2))
} finally {
  for (const file of files) await rm(file, { force: true })
  await rmdir('src/content/blog/seo-temporary-fixture').catch(() => {})
}
