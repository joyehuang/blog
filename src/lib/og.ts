import { Resvg } from '@resvg/resvg-js'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import satori from 'satori'

const avatarBuffer = fs.readFileSync(path.resolve('./src/assets/avatar.png'))
const avatarDataUrl = `data:image/png;base64,${avatarBuffer.toString('base64')}`

// Rendered PNGs are cached across builds: each one costs two Google Fonts
// round trips plus a satori/resvg render (~0.5s), and Vercel restores
// node_modules from its build cache. The key covers the card's inputs and
// everything that shapes the render (this file, the avatar, renderer
// versions), so any change there re-renders.
const CACHE_DIR = path.resolve('./node_modules/.cache/og-png')
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

const rendererHash = (() => {
  const h = createHash('sha256')
  h.update(fs.readFileSync(path.resolve('./src/lib/og.ts')))
  h.update(avatarBuffer)
  for (const pkg of ['satori', '@resvg/resvg-js']) {
    try {
      h.update(fs.readFileSync(path.resolve(`./node_modules/${pkg}/package.json`)))
    } catch {
      h.update(pkg)
    }
  }
  return h.digest('hex')
})()

// Hits refresh mtime, so anything untouched for a month is stale input.
try {
  for (const name of fs.readdirSync(CACHE_DIR)) {
    const file = path.join(CACHE_DIR, name)
    if (Date.now() - fs.statSync(file).mtimeMs > CACHE_TTL_MS) fs.rmSync(file)
  }
} catch {}

async function cachedPng(input: unknown, render: () => Promise<Buffer>) {
  const key = createHash('sha256').update(rendererHash).update(JSON.stringify(input)).digest('hex')
  const file = path.join(CACHE_DIR, `${key.slice(0, 32)}.png`)
  try {
    const png = fs.readFileSync(file)
    const now = new Date()
    fs.utimesSync(file, now, now)
    return png
  } catch {}

  const png = await render()
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(tmp, png)
    fs.renameSync(tmp, file)
  } catch {}
  return png
}

const PRIMARY = '#659EB9'
const SITE = 'joyehuang.me'
const LATIN_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?@#$%&*()[]{}<>/\\|-_=+"\'` ·⭐'

async function loadGoogleFont(family: string, text: string, weight: number) {
  const uniq = Array.from(new Set(text)).join('')
  if (!uniq) return null
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(uniq)}`
  const css = await fetch(cssUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15'
    }
  }).then((r) => r.text())
  const fontUrl = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/)?.[1]
    ?? css.match(/src:\s*url\(([^)]+)\)/)?.[1]
  if (!fontUrl) throw new Error(`Google font CSS parse failed for ${family}`)
  return await fetch(fontUrl).then((r) => r.arrayBuffer())
}

type OgNode = {
  type: string
  props: { style?: Record<string, unknown>; children?: OgNode | OgNode[] | string; [k: string]: unknown }
}

async function renderPng(tree: OgNode, textForSubset: string, opts: { mono?: boolean } = {}) {
  const subset = LATIN_CHARS + textForSubset
  const fonts: NonNullable<Parameters<typeof satori>[1]['fonts']> = []

  const [regular, bold, mono] = await Promise.all([
    loadGoogleFont('Noto Sans SC', subset, 500),
    loadGoogleFont('Noto Sans SC', subset, 700),
    opts.mono ? loadGoogleFont('Geist Mono', subset, 500) : null
  ])
  if (regular) fonts.push({ name: 'Noto Sans SC', data: regular, weight: 500, style: 'normal' })
  if (bold) fonts.push({ name: 'Noto Sans SC', data: bold, weight: 700, style: 'normal' })
  if (mono) fonts.push({ name: 'Geist Mono', data: mono, weight: 500, style: 'normal' })

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts
  })
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
}

function div(style: Record<string, unknown>, children: OgNode['props']['children']): OgNode {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children } }
}

function text(style: Record<string, unknown>, children: string): OgNode {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children } }
}

function header(): OgNode {
  return div(
    { alignItems: 'center', gap: 20 },
    [
      {
        type: 'img',
        props: {
          src: avatarDataUrl,
          width: 72,
          height: 72,
          style: { borderRadius: 999, border: `2px solid ${PRIMARY}` }
        }
      },
      text(
        {
          fontSize: 32,
          color: '#e5e7eb',
          fontFamily: "Noto Sans SC",
          fontWeight: 500,
          letterSpacing: '-0.01em'
        },
        SITE
      )
    ]
  )
}

function footerLine(left: string, right?: string): OgNode {
  return div(
    {
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 26,
      color: '#94a3b8',
      fontFamily: "Noto Sans SC",
      fontWeight: 500
    },
    [text({}, left), ...(right ? [text({ color: PRIMARY }, right)] : [])]
  )
}

function shell(inner: OgNode[]): OgNode {
  return div(
    {
      width: 1200,
      height: 630,
      padding: 72,
      flexDirection: 'column',
      justifyContent: 'space-between',
      background:
        'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0b1220 100%)',
      color: '#f8fafc',
      position: 'relative'
    },
    [
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 6,
            background: `linear-gradient(90deg, ${PRIMARY} 0%, #a78bfa 100%)`
          }
        }
      },
      ...inner
    ]
  )
}

export async function defaultOgPng(opts: {
  name: string
  tagline: string
}) {
  const tree = shell([
    header(),
    div(
      { flexDirection: 'column', gap: 24 },
      [
        text(
          {
            fontSize: 96,
            fontFamily: 'Noto Sans SC',
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '-0.02em',
            lineHeight: 1.05
          },
          opts.name
        ),
        text(
          {
            fontSize: 40,
            fontFamily: 'Noto Sans SC',
            fontWeight: 500,
            color: '#cbd5e1',
            letterSpacing: '-0.01em'
          },
          opts.tagline
        )
      ]
    ),
    footerLine('Melbourne · Build fast, learn faster')
  ])
  return cachedPng({ kind: 'default', ...opts }, () =>
    renderPng(tree, opts.name + opts.tagline + 'Melbourne · Build fast, learn faster')
  )
}

export async function postOgPng(opts: {
  title: string
  description?: string
  date: string
  tags?: string[]
}) {
  const desc = (opts.description ?? '').trim()
  const truncDesc = desc.length > 110 ? desc.slice(0, 108) + '…' : desc
  const tags = (opts.tags ?? []).slice(0, 4)

  const tree = shell([
    header(),
    div(
      { flexDirection: 'column', gap: 22, flexGrow: 1, justifyContent: 'center' },
      [
        text(
          {
            fontSize: opts.title.length > 24 ? 62 : 78,
            fontFamily: "Noto Sans SC",
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            maxWidth: 1060
          },
          opts.title
        ),
        ...(truncDesc
          ? [
              text(
                {
                  fontSize: 28,
                  fontFamily: "Noto Sans SC",
                  fontWeight: 500,
                  color: '#94a3b8',
                  lineHeight: 1.4,
                  maxWidth: 1060
                },
                truncDesc
              )
            ]
          : [])
      ]
    ),
    div(
      {
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 24,
        color: '#94a3b8',
        fontFamily: "Noto Sans SC",
        fontWeight: 500
      },
      [
        text({}, opts.date),
        div(
          { gap: 12 },
          tags.map(
            (t) =>
              ({
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    padding: '6px 14px',
                    borderRadius: 999,
                    border: `1px solid ${PRIMARY}`,
                    color: PRIMARY,
                    fontSize: 22
                  },
                  children: t
                }
              }) as OgNode
          )
        )
      ]
    )
  ])

  const subset = [opts.title, truncDesc, tags.join(''), opts.date].join('')
  return cachedPng({ kind: 'post', ...opts }, () => renderPng(tree, subset))
}

// Talks cards mirror the slide decks' terminal cover (cyan on near-black,
// mono prompt lines), since the deck links are what get shared.
const TERM = {
  bg: '#0B0B10',
  panel: '#14151F',
  text: '#FAFAFA',
  dim: '#BCBCC2',
  faint: '#74768A',
  border: '#2C2D39',
  cyan: '#B4EBFD',
  teal: '#517E94',
  teal2: '#6FA3B8'
}
const MONO = 'Geist Mono'

function clip(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function span(color: string, children: string): OgNode {
  return { type: 'span', props: { style: { color }, children } }
}

function termLine(children: OgNode[], cursor = false): OgNode {
  return div({ alignItems: 'center', whiteSpace: 'pre' }, [
    ...children,
    ...(cursor
      ? [{ type: 'div', props: { style: { width: 13, height: 26, marginLeft: 6, background: TERM.cyan } } }]
      : [])
  ])
}

function terminalShell(eyebrow: string, title: string, subtitle: string, lines: OgNode[]): OgNode {
  return div(
    {
      width: 1200,
      height: 630,
      padding: '56px 64px',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: TERM.bg,
      backgroundImage: 'radial-gradient(circle at 88% 0%, rgba(180,235,253,0.13) 0%, rgba(11,11,16,0) 55%)',
      color: TERM.text,
      fontFamily: 'Noto Sans SC'
    },
    [
      div({ justifyContent: 'space-between', fontFamily: MONO, fontSize: 24, fontWeight: 500 }, [
        text({ color: TERM.teal2 }, eyebrow),
        text({ color: TERM.faint }, 'joyehuang.me/talks')
      ]),
      div({ flexDirection: 'column', gap: 18 }, [
        text(
          {
            fontSize: title.length > 16 ? 60 : 72,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            maxWidth: 1072
          },
          title
        ),
        text({ fontSize: 28, fontWeight: 500, color: TERM.dim, lineHeight: 1.45, maxWidth: 1072 }, subtitle)
      ]),
      div(
        {
          flexDirection: 'column',
          border: `1px solid ${TERM.border}`,
          borderRadius: 14,
          backgroundColor: TERM.panel
        },
        [
          div(
            {
              alignItems: 'center',
              gap: 8,
              padding: '12px 18px',
              borderBottom: `1px solid ${TERM.border}`
            },
            [
              ...[TERM.faint, TERM.teal, TERM.cyan].map(
                (c): OgNode => ({
                  type: 'div',
                  props: { style: { width: 12, height: 12, borderRadius: 999, background: c } }
                })
              ),
              text({ marginLeft: 8, fontFamily: MONO, fontSize: 17, color: TERM.faint }, 'joye@2026: ~/talks')
            ]
          ),
          div(
            {
              flexDirection: 'column',
              gap: 10,
              padding: '18px 24px',
              fontFamily: MONO,
              fontSize: 22,
              fontWeight: 500,
              color: TERM.dim
            },
            lines
          )
        ]
      )
    ]
  )
}

function prompt(cmd: string): OgNode {
  return termLine([span(TERM.cyan, 'joye@2026'), span(TERM.faint, ' ~/talks'), span(TERM.text, ` $ ${cmd}`)])
}

export async function talkOgPng(opts: {
  episode: number
  title: string
  subtitle?: string
  date: string
  durationMinutes?: number
  attendees?: string
  topics?: string[]
  upcoming?: boolean
}) {
  const version = 'v' + String(opts.episode).padStart(2, '0')
  const eyebrow = `// 分享会 · 第 ${opts.episode} 期`
  const subtitle = clip((opts.subtitle ?? '').trim(), 44)
  const meta = [
    opts.date,
    opts.upcoming ? '即将开讲' : null,
    opts.durationMinutes ? `${opts.durationMinutes} min` : null,
    opts.attendees
  ]
    .filter(Boolean)
    .join(' · ')
  // Whole topics only, as many as fit on the terminal line.
  const topics = (opts.topics ?? []).reduce(
    (line, t) => (!line ? clip(t, 40) : line.length + t.length + 3 <= 40 ? `${line} · ${t}` : line),
    ''
  )

  const lines = [
    prompt(`./${version}`),
    termLine([span(TERM.dim, `> ${meta}`)], !topics),
    ...(topics ? [termLine([span(TERM.dim, `> ${topics}`)], true)] : [])
  ]
  const tree = terminalShell(eyebrow, opts.title, subtitle, lines)

  return cachedPng({ kind: 'talk', ...opts }, () =>
    renderPng(tree, [eyebrow, opts.title, subtitle, meta, topics, 'joye@2026 ~/talks $ ./' + version].join(''), {
      mono: true
    })
  )
}

export async function talksOgPng(opts: {
  description: string
  episodes: { episode: number; date: string; title: string; upcoming?: boolean }[]
}) {
  const eyebrow = '// 分享会 · Talks'
  const title = '分享会 · Talks'
  const subtitle = clip(opts.description, 44)
  const shown = opts.episodes.slice(0, 3)
  const rows = shown.map((e, i) =>
    termLine(
      [
        span(TERM.cyan, 'v' + String(e.episode).padStart(2, '0')),
        span(TERM.faint, `  ${e.upcoming ? 'upcoming  ' : e.date}  `),
        span(TERM.dim, clip(e.title, 24))
      ],
      i === shown.length - 1
    )
  )
  const tree = terminalShell(eyebrow, title, subtitle, [prompt('ls'), ...rows])

  return cachedPng({ kind: 'talks', ...opts }, () =>
    renderPng(
      tree,
      [eyebrow, title, subtitle, 'joye@2026 ~/talks $ ls upcoming', ...shown.map((e) => e.date + e.title)].join(''),
      { mono: true }
    )
  )
}
