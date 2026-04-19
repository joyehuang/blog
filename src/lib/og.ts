import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs'
import path from 'node:path'
import satori from 'satori'

const avatarBuffer = fs.readFileSync(path.resolve('./src/assets/avatar.png'))
const avatarDataUrl = `data:image/png;base64,${avatarBuffer.toString('base64')}`

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

async function renderPng(tree: OgNode, textForSubset: string) {
  const subset = LATIN_CHARS + textForSubset
  const fonts: NonNullable<Parameters<typeof satori>[1]['fonts']> = []

  const [regular, bold] = await Promise.all([
    loadGoogleFont('Noto Sans SC', subset, 500),
    loadGoogleFont('Noto Sans SC', subset, 700)
  ])
  if (regular) fonts.push({ name: 'Noto Sans SC', data: regular, weight: 500, style: 'normal' })
  if (bold) fonts.push({ name: 'Noto Sans SC', data: bold, weight: 700, style: 'normal' })

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
  return renderPng(tree, opts.name + opts.tagline + 'Melbourne · Build fast, learn faster')
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
  return renderPng(tree, subset)
}
