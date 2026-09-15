import { expect, test } from 'bun:test'

import { normalizeUrl, parseApplication, publicAddress, renderFiles, safeGet } from './data.mjs'

const raw = `Name: Home · Zaixi\nDesc: All in AI Agent\nLink: https://lizaixi01.github.io/\nAvatar: https://lizaixi01.github.io/assets/zaixi.jpg`
test('plain and Waline HTML applications are equivalent', () => {
  expect(parseApplication(raw).name).toBe('Home · Zaixi')
  expect(
    parseApplication(
      raw
        .replaceAll('\n', '<br>')
        .replace(
          'Link: https://lizaixi01.github.io/',
          'Link: <a href="https://lizaixi01.github.io/">https://lizaixi01.github.io/</a>'
        )
    )
  ).toEqual(parseApplication(raw))
})
test('reject missing, extra, duplicate and ambiguous fields/links', () => {
  for (const text of [
    raw + '\nName: x',
    raw.replace('Desc:', 'Name:'),
    raw.split('\n').slice(1).join('\n'),
    raw + '\nRun: rm -rf /',
    raw.replace('Home · Zaixi', '<script>alert(1)</script>'),
    raw.replace(
      'Link: https://lizaixi01.github.io/',
      'Link: <a href="https://evil.com">https://lizaixi01.github.io/</a>'
    ),
    raw.replace(
      'Link: https://lizaixi01.github.io/',
      'Link: <a href="https://lizaixi01.github.io/" href="https://evil.com">https://lizaixi01.github.io/</a>'
    )
  ])
    expect(() => parseApplication(text)).toThrow()
})
test('source, shell, Markdown and HTML characters stay data', () => {
  const app = parseApplication(
    raw.replace('Home · Zaixi', "&quot;'); $(touch /tmp/PWN) `code` &lt;img onerror=x&gt;")
  )
  const files = {
    'public/links.json': '{"friends":[{"id_name":"friend-links","link_list":[]}]}',
    'src/site.config.ts':
      'export const x = {logbook: [ { date: "x" }\n    ],\n    // Yourself link info\n}'
  }
  const rendered = renderFiles(files, app, '2026-09-15')!
  expect(rendered['src/site.config.ts']).toContain('&lt;img onerror=x&gt;')
  expect(rendered['src/site.config.ts']).not.toContain('<img')
  expect(JSON.parse(rendered['public/links.json']).friends[0].link_list[0].name).toBe(app.name)
  expect(
    new Bun.Transpiler({ loader: 'ts' }).transformSync(rendered['src/site.config.ts'])
  ).toContain('export')
  expect(renderFiles(rendered, app, '2026-09-15')).toBeNull()
})
test('unsafe URLs and private DNS are rejected', async () => {
  for (const url of [
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://u:p@example.com',
    'http://127.1',
    'http://2130706433',
    'http://[::1]',
    'http://169.254.169.254',
    'https://localhost',
    'https://x.local',
    'https://example.com\\@evil.com'
  ])
    expect(() => normalizeUrl(url)).toThrow()
  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'fe80::1',
    'fc00::1',
    '2001:db8::1'
  ])
    expect(publicAddress(address)).toBe(false)
  let calls = 0
  await expect(
    safeGet('https://example.com', {
      resolve: async () => [{ address: '10.0.0.1', family: 4 }],
      transport: async () => {
        calls++
        return {}
      }
    })
  ).rejects.toThrow('non-public DNS')
  expect(calls).toBe(0)
})
test('redirect hop revalidates DNS; requests receive pinned address and resource limits', async () => {
  let resolutions = 0,
    requests = 0
  await expect(
    safeGet('https://example.com', {
      resolve: async () => [
        { address: ++resolutions === 1 ? '93.184.216.34' : '127.0.0.1', family: 4 }
      ],
      transport: async (_u: any, address: any, max: number, timeout: number) => {
        requests++
        expect(address.address).toBe('93.184.216.34')
        expect(max).toBeLessThanOrEqual(2097152)
        expect(timeout).toBeLessThanOrEqual(15000)
        return { status: 302, headers: { location: '/rebind' } }
      }
    })
  ).rejects.toThrow('non-public DNS')
  expect(requests).toBe(1)
  await expect(
    safeGet('https://example.com', {
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      transport: async () => ({ status: 302, headers: { location: 'http://169.254.169.254/' } })
    })
  ).rejects.toThrow()
})
