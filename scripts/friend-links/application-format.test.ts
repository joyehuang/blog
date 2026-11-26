import { expect, test } from 'bun:test'

import { canonicalApplication, htmlApplication, jsonApplication } from './application-fixtures'
import { eligible, parseApplication, safeGet, validateReachability } from './data.mjs'

const fields = [
  ['Name', 'HZH'],
  ['Desc', 'Welcome to HZH'],
  ['Link', 'https://clannad.top'],
  ['Avatar', 'https://clannad.top/favicon.png']
]
const asHtml = (text: string) => `<p>${text.replaceAll('\n', '<br>')}</p>`
const formats: [string, string][] = []
for (const wrapper of [false, true])
  for (const [keyOpen, keyClose] of [
    ['', ''],
    ['"', '"'],
    ['“', '”']
  ])
    for (const [valueOpen, valueClose] of [
      ['', ''],
      ['"', '"'],
      ['“', '”']
    ])
      for (const colon of [':', '：'])
        for (const comma of ['', ',']) {
          const body = fields
            .map(
              ([key, value]) =>
                `${keyOpen}${key}${keyClose}${colon} ${valueOpen}${value}${valueClose}${comma}`
            )
            .join('\n')
          formats.push([
            `wrapper=${wrapper} key=${keyOpen || 'bare'} value=${valueOpen || 'bare'} colon=${colon} comma=${!!comma}`,
            wrapper ? `{\n${body}\n}` : body
          ])
        }

test.each(formats)('format normalization: %s', (_label, text) => {
  const expected = parseApplication(canonicalApplication)
  expect(parseApplication(text)).toEqual(expected)
  expect(parseApplication(asHtml(text))).toEqual(expected)
  expect(
    parseApplication(
      text
        .split('\n')
        .map((line) => `<p>${line}</p>`)
        .join('')
    )
  ).toEqual(expected)
})

test.each([
  ['CRLF', jsonApplication.replaceAll('\n', '\r\n')],
  ['space before colon', jsonApplication.replaceAll('”:', '” ：')],
  ['braces beside fields', jsonApplication.replace('{\n', '{').replace('\n}', '}')],
  ['HTML entities', htmlApplication.replaceAll('“', '&quot;').replaceAll('”', '&#34;')],
  ['blank lines', `\n  ${jsonApplication.replaceAll('\n', '\n\n  ')}  \n`],
  ['case-insensitive keys', jsonApplication.replace('Name', 'nAmE').replace('Avatar', 'AVATAR')],
  ['no final comma', jsonApplication.replace('.png”,', '.png”')]
])('stored format variation: %s', (_label, text) => {
  expect(parseApplication(text)).toEqual(parseApplication(canonicalApplication))
})

const invalid: [string, string][] = [
  ['duplicate key', jsonApplication.replace('“Desc”', '“Name”')],
  ['duplicate case variant', jsonApplication.replace('“Desc”', '“nAmE”')],
  ['extra key', jsonApplication.replace('\n}', '\n“Extra”: “x”,\n}')],
  ['unknown key replacing required key', jsonApplication.replace('“Desc”', '“Extra”')],
  ['prototype key', jsonApplication.replace('“Desc”', '“__proto__”')],
  ['missing key', jsonApplication.replace('“Desc”: “Welcome to HZH”,\n', '')],
  ['empty value', jsonApplication.replace('“HZH”', '“”')],
  ['whitespace value', jsonApplication.replace('“HZH”', '“   ”')],
  ['multiple quoted values', jsonApplication.replace('“HZH”', '“HZH”, “other”')],
  ['inline extra field', jsonApplication.replace('“HZH”', '“HZH”, “Extra”: “x”')],
  ['bare inline extra field', canonicalApplication.replace('Name: HZH', 'Name: HZH, Extra: x')],
  [
    'multiple URL values',
    jsonApplication.replace('“https://clannad.top”', '“https://clannad.top https://other.com”')
  ],
  ['nested object', jsonApplication.replace('“HZH”', '{“Name”: “HZH”}')],
  ['nested array', jsonApplication.replace('“HZH”', '[“HZH”, “other”]')],
  ['nested wrapper', `{${jsonApplication}}`],
  ['unclosed wrapper', jsonApplication.slice(0, -1)],
  ['unopened wrapper', jsonApplication.slice(1)],
  ['extra wrapper suffix', `${jsonApplication},`],
  ['extra comma', jsonApplication.replace('“HZH”,', '“HZH”,,')],
  ['mismatched key quotes', jsonApplication.replace('“Name”', '“Name"')],
  ['mismatched value quotes', jsonApplication.replace('“HZH”', '“HZH"')],
  ['unclosed value', jsonApplication.replace('“HZH”', '“HZH')],
  ['unexpected closing quote', canonicalApplication.replace('Name: HZH', 'Name: HZH”')],
  ['escaped quoted value', jsonApplication.replace('“HZH”', '"HZH\\"other"')],
  ['compact object', jsonApplication.replaceAll('\n', '')],
  ['embedded line', jsonApplication.replace('“HZH”', '“HZH\nother”')],
  ['script element', jsonApplication.replace('“HZH”', '“<script>alert(1)</script>”')],
  ['image handler', jsonApplication.replace('“HZH”', '“<img src=x onerror=alert(1)>”')],
  ['HTML comment hiding input', jsonApplication.replace('“HZH”', '“HZH<!--hidden-->”')],
  ['paragraph handler', `<p onclick="alert(1)">${jsonApplication}</p>`],
  ['break handler', jsonApplication.replace('\n', '<br onmouseover="alert(1)">')],
  ['anchor handler', htmlApplication.replace('target="_blank"', 'onclick="alert(1)"')],
  [
    'anchor style injection',
    htmlApplication.replace('target="_blank"', 'style="background:url(javascript:bad())"')
  ],
  [
    'ambiguous anchor',
    htmlApplication.replace('href="https://clannad.top"', 'href="https://other.com"')
  ],
  [
    'duplicate href',
    htmlApplication.replace(
      'href="https://clannad.top"',
      'href="https://clannad.top" href="https://other.com"'
    )
  ],
  [
    'dangerous anchor href',
    htmlApplication.replace('href="https://clannad.top"', 'href="javascript:alert(1)"')
  ]
]
for (const [key] of fields)
  if (key === 'Name' || key === 'Desc') {
    const original = key === 'Name' ? 'HZH' : 'Welcome to HZH'
    invalid.push([
      `${key} length exceeded`,
      jsonApplication.replace(`“${original}”`, `“${'x'.repeat(key === 'Name' ? 121 : 301)}”`)
    ])
    for (const control of ['\u0001', '\u007f'])
      invalid.push([
        `${key} control ${control.charCodeAt(0)}`,
        jsonApplication.replace(`“${original}”`, `“x${control}y”`)
      ])
  }
for (const url of [
  'javascript:alert(1)',
  'data:text/html,bad',
  'file:///etc/passwd',
  'ftp://example.com/a',
  'http://127.0.0.1',
  'http://127.1',
  'http://2130706433',
  'http://[::1]',
  'http://10.0.0.1',
  'http://172.16.0.1',
  'http://192.168.1.1',
  'http://169.254.169.254',
  'https://localhost',
  'https://x.local',
  'https://x.internal',
  'https://user:pass@example.com',
  'https://example.com:8443',
  'https://example.com\\@evil.com'
])
  for (const field of ['Link', 'Avatar']) {
    const original = field === 'Link' ? 'https://clannad.top' : 'https://clannad.top/favicon.png'
    invalid.push([
      `${field} unsafe URL ${url}`,
      jsonApplication.replace(`“${original}”`, `“${url}”`)
    ])
  }

test.each(invalid)('reject invalid application: %s', (_label, text) => {
  expect(() => parseApplication(text)).toThrow()
  expect(() => parseApplication(asHtml(text))).toThrow()
})

test.each([
  ['Name', 120],
  ['Desc', 300],
  ['Link', 2048],
  ['Avatar', 2048]
] as const)('unchanged field length boundary: %s', (key, limit) => {
  const application = (length: number) => `{
${fields
  .map(([field, value]) => {
    const replacement =
      key === 'Link' || key === 'Avatar'
        ? `https://example.com/${'a'.repeat(length - 'https://example.com/'.length)}`
        : 'a'.repeat(length)
    return `“${field}”: “${field === key ? replacement : value}”,`
  })
  .join('\n')}
}`
  expect(() => parseApplication(application(limit))).not.toThrow()
  expect(() => parseApplication(application(limit + 1))).toThrow()
})

test('unchanged raw comment byte limit includes HTML and multibyte quotes', () => {
  for (const text of [jsonApplication, htmlApplication]) {
    const atLimit = text + ' '.repeat(16384 - Buffer.byteLength(text))
    expect(Buffer.byteLength(atLimit)).toBe(16384)
    expect(parseApplication(atLimit)).toEqual(parseApplication(canonicalApplication))
    expect(() => parseApplication(atLimit + ' ')).toThrow('comment too large')
  }
})

test('punctuation within a quoted value stays data', () => {
  const app = parseApplication(
    jsonApplication.replace('“Welcome to HZH”', '“Hello, HZH: 欢迎：friends”')
  )
  expect(app.intro).toBe('Hello, HZH: 欢迎：friends')
})

test.each([undefined, null, '', 'parent', 0, false])(
  'retain installed worker parent-ID policy: %j',
  (parent) => {
    const comment = { objectId: '123', url: '/links', status: 'approved' }
    const expected = parent === undefined || parent === null || parent === ''
    expect(eligible({ ...comment, pid: parent })).toBe(expected)
    expect(eligible({ ...comment, rid: parent })).toBe(expected)
  }
)

test.each([
  '127.0.0.1',
  '10.0.0.1',
  '172.16.0.1',
  '192.168.1.1',
  '169.254.169.254',
  '::1',
  'fc00::1'
])('JSON-style application still rejects private DNS: %s', async (address) => {
  let requests = 0
  await expect(
    validateReachability(parseApplication(jsonApplication), (url) =>
      safeGet(url, {
        resolve: async () => [{ address, family: address.includes(':') ? 6 : 4 }],
        transport: async () => {
          requests++
          throw Error('must not contact private address')
        }
      })
    )
  ).rejects.toThrow('non-public DNS')
  expect(requests).toBe(0)
})
