import fs from 'node:fs'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'

const avatarBuffer = fs.readFileSync(path.resolve('./src/assets/avatar.png'))
const avatarDataUrl = `data:image/png;base64,${avatarBuffer.toString('base64')}`

const SITE = 'joyehuang.me'
const PRIMARY = '#527D94'
const INK = '#151A23'
const MUTED = '#5F6C7B'
const SOFT = '#F2F7F9'
const BORDER = '#D7E1E7'
const PANEL = '#FFFFFF'
const CODE = '#26323F'
const WARM = '#D88D72'
const MINT = '#86B9A7'
const LATIN_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?@#$%&*()[]{}<>/\\|-_=+"\'` ·⭐'

type OgNode = {
  type: string
  props: {
    style?: Record<string, unknown>
    children?: OgNode | OgNode[] | string
    [k: string]: unknown
  }
}

type RenderSize = {
  width: number
  height: number
}

async function loadGoogleFont(family: string, textForSubset: string, weight: number) {
  const uniq = Array.from(new Set(textForSubset)).join('')
  if (!uniq) return null
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(uniq)}`
  const css = await fetch(cssUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15'
    }
  }).then((r) => r.text())
  const fontUrl =
    css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/)?.[1] ??
    css.match(/src:\s*url\(([^)]+)\)/)?.[1]
  if (!fontUrl) throw new Error(`Google font CSS parse failed for ${family}`)
  return await fetch(fontUrl).then((r) => r.arrayBuffer())
}

async function renderPng(tree: OgNode, textForSubset: string, size: RenderSize) {
  const subset = LATIN_CHARS + textForSubset
  const fonts: NonNullable<Parameters<typeof satori>[1]['fonts']> = []

  const [regular, bold] = await Promise.all([
    loadGoogleFont('Noto Sans SC', subset, 500),
    loadGoogleFont('Noto Sans SC', subset, 700)
  ])
  if (regular) fonts.push({ name: 'Noto Sans SC', data: regular, weight: 500, style: 'normal' })
  if (bold) fonts.push({ name: 'Noto Sans SC', data: bold, weight: 700, style: 'normal' })

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: size.width,
    height: size.height,
    fonts
  })
  return new Resvg(svg, { fitTo: { mode: 'width', value: size.width } }).render().asPng()
}

function div(style: Record<string, unknown>, children: OgNode['props']['children']): OgNode {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children } }
}

function text(style: Record<string, unknown>, children: string): OgNode {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children } }
}

function dot(color: string): OgNode {
  return div({ width: 13, height: 13, borderRadius: 999, background: color }, '')
}

function siteMark(size = 68): OgNode {
  return div({ alignItems: 'center', gap: 16 }, [
    {
      type: 'img',
      props: {
        src: avatarDataUrl,
        width: size,
        height: size,
        style: {
          borderRadius: 999,
          border: `1px solid ${BORDER}`,
          background: PANEL
        }
      }
    },
    div({ flexDirection: 'column', gap: 3 }, [
      text(
        {
          fontSize: Math.round(size * 0.38),
          color: INK,
          fontFamily: 'Noto Sans SC',
          fontWeight: 700,
          letterSpacing: 0
        },
        'Joye'
      ),
      text(
        {
          fontSize: Math.round(size * 0.24),
          color: MUTED,
          fontFamily: 'Noto Sans SC',
          fontWeight: 500,
          letterSpacing: 0
        },
        SITE
      )
    ])
  ])
}

function terminalHeader(label: string): OgNode {
  return div(
    {
      height: 54,
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 22px',
      borderBottom: `1px solid ${BORDER}`,
      background: '#F7FAFB'
    },
    [
      div({ alignItems: 'center', gap: 9 }, [dot('#F26D6D'), dot('#F4C35C'), dot('#59C37A')]),
      text(
        {
          color: MUTED,
          fontSize: 18,
          fontFamily: 'Noto Sans SC',
          fontWeight: 700,
          letterSpacing: 0
        },
        label
      )
    ]
  )
}

function chip(label: string, filled = false): OgNode {
  return text(
    {
      padding: '8px 14px',
      borderRadius: 999,
      border: `1px solid ${filled ? PRIMARY : BORDER}`,
      background: filled ? PRIMARY : PANEL,
      color: filled ? '#FFFFFF' : MUTED,
      fontSize: 21,
      fontFamily: 'Noto Sans SC',
      fontWeight: 700,
      letterSpacing: 0
    },
    label
  )
}

function smallLabel(label: string, color = MUTED): OgNode {
  return text(
    {
      color,
      fontSize: 18,
      fontFamily: 'Noto Sans SC',
      fontWeight: 700,
      letterSpacing: 0
    },
    label
  )
}

function abs(style: Record<string, unknown>, children: OgNode['props']['children']): OgNode {
  return div({ position: 'absolute', ...style }, children)
}

function line(style: Record<string, unknown>): OgNode {
  return abs(
    {
      height: 2,
      background: BORDER,
      borderRadius: 999,
      ...style
    },
    ''
  )
}

function node(x: number, y: number, label: string, color = PRIMARY): OgNode {
  return abs(
    {
      left: x,
      top: y,
      width: 78,
      height: 78,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      border: `2px solid ${color}`,
      background: '#FFFFFF',
      boxShadow: '0 16px 34px rgba(35, 52, 66, 0.08)'
    },
    smallLabel(label, color)
  )
}

function miniCard(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  color = PRIMARY
): OgNode {
  return abs(
    {
      left: x,
      top: y,
      width,
      height,
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 18,
      borderRadius: 22,
      border: `1px solid ${BORDER}`,
      background: '#FFFFFF',
      boxShadow: '0 18px 40px rgba(35, 52, 66, 0.08)'
    },
    [
      smallLabel(label, color),
      div(
        { flexDirection: 'column', gap: 7 },
        [0, 1, 2].map((i) =>
          div(
            {
              width: i === 1 ? '74%' : '100%',
              height: 8,
              borderRadius: 999,
              background: i === 0 ? `${color}33` : '#E8EEF2'
            },
            ''
          )
        )
      )
    ]
  )
}

function motifFor(title: string, tags: string[]) {
  const text = `${title} ${tags.join(' ')}`.toLowerCase()
  if (/(interview|mock|面试|候选|求职|internship|实习)/.test(text)) return 'interview'
  if (
    /(transformer|attention|rope|feedforward|swiglu|normalization|rmsnorm|minimind|deep learning|llm)/.test(
      text
    )
  ) {
    return 'transformer'
  }
  if (/(rag|retrieval|search|memory|vector|embedding|检索|记忆|向量)/.test(text)) return 'retrieval'
  if (/(harness|source|code|python|open source|openharness|源码|开源)/.test(text)) return 'system'
  return 'agent'
}

function visualPanel(opts: {
  title: string
  tags: string[]
  width: number
  height: number
}): OgNode {
  const motif = motifFor(opts.title, opts.tags)

  const base = [
    abs(
      {
        left: 22,
        top: 22,
        right: 22,
        bottom: 22,
        border: `1px solid ${BORDER}`,
        borderRadius: 28
      },
      ''
    ),
    line({ left: 66, top: 86, width: opts.width - 132 }),
    line({ left: 66, bottom: 82, width: opts.width - 132 })
  ]

  const motifs: Record<string, OgNode[]> = {
    interview: [
      miniCard(68, 116, 238, 112, 'QUESTION', PRIMARY),
      miniCard(174, 250, 248, 112, 'ANSWER', WARM),
      line({ left: 274, top: 222, width: 88, background: `${PRIMARY}66` }),
      node(354, 94, '1:1', PRIMARY),
      node(66, 288, 'EVAL', WARM)
    ],
    transformer: [
      ...[0, 1, 2, 3].map((i) =>
        abs(
          {
            left: 86 + i * 44,
            top: 105 + i * 38,
            width: 230,
            height: 58,
            borderRadius: 18,
            border: `2px solid ${i % 2 ? WARM : PRIMARY}`,
            background: '#FFFFFF',
            boxShadow: '0 16px 34px rgba(35, 52, 66, 0.07)'
          },
          smallLabel(i === 0 ? 'Q K V' : i === 1 ? 'ATTN' : i === 2 ? 'NORM' : 'FFN')
        )
      ),
      node(70, 326, 'TOK', MINT),
      node(336, 74, 'OUT', PRIMARY),
      line({ left: 132, top: 365, width: 218, background: `${MINT}88` })
    ],
    retrieval: [
      miniCard(58, 120, 174, 106, 'QUERY', PRIMARY),
      miniCard(284, 120, 174, 106, 'INDEX', MINT),
      miniCard(170, 286, 184, 106, 'RERANK', WARM),
      line({ left: 224, top: 172, width: 76, background: `${PRIMARY}88` }),
      line({ left: 236, top: 230, width: 76, background: `${MINT}88` }),
      node(70, 302, 'DOC', PRIMARY),
      node(382, 302, 'ANS', WARM)
    ],
    system: [
      miniCard(58, 96, 172, 102, 'CLI', PRIMARY),
      miniCard(286, 96, 172, 102, 'TOOLS', MINT),
      miniCard(58, 278, 172, 102, 'HOOKS', WARM),
      miniCard(286, 278, 172, 102, 'LOOP', PRIMARY),
      line({ left: 226, top: 146, width: 70, background: `${PRIMARY}88` }),
      line({ left: 226, top: 328, width: 70, background: `${WARM}88` }),
      line({ left: 144, top: 196, width: 2, height: 84, background: `${BORDER}` }),
      line({ left: 372, top: 196, width: 2, height: 84, background: `${BORDER}` })
    ],
    agent: [
      node(70, 156, 'PLAN', PRIMARY),
      node(224, 88, 'ACT', WARM),
      node(364, 164, 'OBS', MINT),
      node(222, 302, 'MEM', PRIMARY),
      line({ left: 142, top: 188, width: 104, background: `${PRIMARY}88` }),
      line({ left: 298, top: 126, width: 90, background: `${WARM}88` }),
      line({ left: 292, top: 338, width: 96, background: `${MINT}88` }),
      line({ left: 136, top: 224, width: 116, background: `${PRIMARY}55` })
    ]
  }

  return div(
    {
      width: opts.width,
      height: opts.height,
      borderRadius: 34,
      border: `1px solid ${BORDER}`,
      background: `linear-gradient(135deg, #FFFFFF 0%, ${SOFT} 100%)`,
      position: 'relative',
      overflow: 'hidden'
    },
    [...base, ...motifs[motif]]
  )
}

function codePanel(tags: string[], kind: 'default' | 'post'): OgNode {
  const rows =
    kind === 'default'
      ? [
          ['now', 'Agent systems'],
          ['learning', 'Agentic RL'],
          ['studying', 'harness design'],
          ['writing', 'LLM infra notes'],
          ['base', 'Melbourne']
        ]
      : [
          ['const author', '"Joye"'],
          ['focus', tags[0] ?? 'AI Agent'],
          ['ship', 'post.read()'],
          ['stack', tags[1] ?? 'Full-stack']
        ]

  return div(
    {
      width: 390,
      flexDirection: 'column',
      border: `1px solid ${BORDER}`,
      borderRadius: 24,
      background: PANEL,
      overflow: 'hidden'
    },
    [
      terminalHeader(kind === 'default' ? 'profile' : 'blog'),
      div(
        {
          flexDirection: 'column',
          gap: 12,
          padding: 24,
          background: `linear-gradient(180deg, ${PANEL} 0%, #F9FCFD 100%)`
        },
        rows.map(([key, value], index) =>
          div({ alignItems: 'center', gap: 13 }, [
            text(
              {
                width: 30,
                color: '#A0ACB8',
                fontSize: 18,
                fontFamily: 'Noto Sans SC',
                fontWeight: 500
              },
              String(index + 1).padStart(2, '0')
            ),
            text(
              {
                color: index === 1 ? PRIMARY : CODE,
                fontSize: 21,
                fontFamily: 'Noto Sans SC',
                fontWeight: 700,
                letterSpacing: 0
              },
              `${key}:`
            ),
            text(
              {
                color: MUTED,
                fontSize: 21,
                fontFamily: 'Noto Sans SC',
                fontWeight: 500,
                letterSpacing: 0
              },
              value
            )
          ])
        )
      )
    ]
  )
}

function canvas(size: RenderSize, inner: OgNode): OgNode {
  return div(
    {
      width: size.width,
      height: size.height,
      padding: 42,
      boxSizing: 'border-box',
      background: `radial-gradient(circle at 14% 12%, ${SOFT} 0%, rgba(238, 245, 248, 0) 34%),
        linear-gradient(135deg, #FBFCFE 0%, #F6FAFC 100%)`,
      color: INK,
      position: 'relative',
      fontFamily: 'Noto Sans SC'
    },
    [
      div(
        {
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 360,
          height: 360,
          background:
            'radial-gradient(circle at 100% 100%, rgba(82, 125, 148, 0.14) 0%, rgba(82, 125, 148, 0) 68%)'
        },
        ''
      ),
      inner
    ]
  )
}

function card(size: RenderSize, children: OgNode['props']['children']): OgNode {
  return canvas(
    size,
    div(
      {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 46,
        boxSizing: 'border-box',
        border: `1px solid ${BORDER}`,
        borderRadius: 32,
        background: 'rgba(255, 255, 255, 0.86)',
        boxShadow: '0 24px 72px rgba(25, 38, 52, 0.10)'
      },
      children
    )
  )
}

function footer(left: string, tags: string[]): OgNode {
  return div(
    {
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 18
    },
    [
      text(
        {
          color: MUTED,
          fontSize: 24,
          fontFamily: 'Noto Sans SC',
          fontWeight: 500,
          letterSpacing: 0
        },
        left
      ),
      div(
        { gap: 10 },
        tags.slice(0, 3).map((tag) => chip(tag))
      )
    ]
  )
}

function tagFooter(tags: string[]): OgNode {
  return div(
    {
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10
    },
    tags.slice(0, 3).map((tag) => chip(tag))
  )
}

function postTitleSize(title: string, base: number) {
  if (title.length > 48) return Math.round(base * 0.74)
  if (title.length > 30) return Math.round(base * 0.84)
  return base
}

export async function defaultOgPng(opts: { name: string; tagline: string }) {
  const size = { width: 1200, height: 630 }
  const tags = ['AI Agent', 'Full-stack', 'Melbourne']
  const tree = card(size, [
    div({ alignItems: 'center', justifyContent: 'space-between' }, [
      siteMark(),
      chip('PERSONAL WEBSITE', true)
    ]),
    div({ alignItems: 'center', justifyContent: 'space-between', gap: 44 }, [
      div({ flexDirection: 'column', gap: 22, maxWidth: 650 }, [
        text(
          {
            color: INK,
            fontSize: 88,
            fontFamily: 'Noto Sans SC',
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: 0
          },
          opts.name
        ),
        text(
          {
            color: MUTED,
            fontSize: 35,
            fontFamily: 'Noto Sans SC',
            fontWeight: 500,
            lineHeight: 1.28,
            letterSpacing: 0
          },
          opts.tagline
        )
      ]),
      codePanel(tags, 'default')
    ]),
    footer('Build fast, learn faster', tags)
  ])

  return renderPng(tree, opts.name + opts.tagline + tags.join(''), size)
}

export async function postOgPng(opts: {
  title: string
  description?: string
  date: string
  tags?: string[]
}) {
  const size = { width: 1200, height: 630 }
  const tags = (opts.tags ?? []).slice(0, 3)

  const tree = card(size, [
    div({ alignItems: 'center', justifyContent: 'space-between' }, [
      siteMark(),
      chip(opts.date, true)
    ]),
    div({ alignItems: 'center', justifyContent: 'space-between', gap: 48 }, [
      visualPanel({ title: opts.title, tags, width: 500, height: 390 }),
      div({ flexDirection: 'column', gap: 24, flexGrow: 1, maxWidth: 500 }, [
        chip(tags[0] ?? 'POST'),
        text(
          {
            color: INK,
            fontSize: postTitleSize(opts.title, 62),
            fontFamily: 'Noto Sans SC',
            fontWeight: 700,
            lineHeight: 1.14,
            letterSpacing: 0
          },
          opts.title
        )
      ])
    ]),
    tagFooter(tags)
  ])

  const subset = [opts.title, tags.join(''), opts.date, SITE].join('')
  return renderPng(tree, subset, size)
}

export async function postHeroPng(opts: {
  title: string
  description?: string
  date: string
  tags?: string[]
}) {
  const size = { width: 1200, height: 675 }
  const tags = (opts.tags ?? []).slice(0, 3)

  const tree = card(size, [
    div({ alignItems: 'center', justifyContent: 'space-between' }, [
      siteMark(76),
      div({ gap: 10 }, [chip('POST', true), chip(opts.date)])
    ]),
    div({ alignItems: 'center', justifyContent: 'space-between', gap: 46 }, [
      visualPanel({ title: opts.title, tags, width: 492, height: 410 }),
      div({ flexDirection: 'column', gap: 24, maxWidth: 520 }, [
        chip(tags[0] ?? 'POST'),
        text(
          {
            color: INK,
            fontSize: postTitleSize(opts.title, 62),
            fontFamily: 'Noto Sans SC',
            fontWeight: 700,
            lineHeight: 1.14,
            letterSpacing: 0
          },
          opts.title
        )
      ])
    ]),
    footer('Joye Personal Blog', tags)
  ])

  const subset = [opts.title, tags.join(''), opts.date, SITE].join('')
  return renderPng(tree, subset, size)
}
