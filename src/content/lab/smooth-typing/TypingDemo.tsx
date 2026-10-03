/**
 * TypingDemo.tsx
 *
 * 观点：角色说话时逐字出现的文字，别让每个字“硬跳”出来。两种做法并排：
 * 1. 定时器 + 整句替换：setInterval 每 42ms 让“已显示”的字数加一，新字从无到有
 *    只用一帧；定时器和屏幕刷新不同步，间隔忽长忽短，看着一顿一顿的。
 * 2. 按帧点亮 + 逐字淡入（本站 Jojo 的做法）：每个字一个 span，在
 *    requestAnimationFrame 里按经过的时间算出该亮到第几个字，再用 CSS 做 160ms
 *    淡入。前后几个字的淡入叠在一起，节奏的不均匀被抹平。
 *
 * 两边各自可以重播，也可以一起重播；“速度”滑块调每秒出几个字（本站约 24 字/秒），
 * 淡入时长跟着变成大约四个字的时间（最少 160ms）。
 * 有 Jojo 包的构建（__JOJO__）用真正的 Jojo 说话，没有时退回一个通用头像。
 * 系统开启减少动态效果时，淡入关闭，字照样逐个出现。
 */
import type { JojoProps } from '@jojo-web/runtime'
import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react'

import { loadJojoRuntime } from '@/components/jojo/LazyJojo'

const LINE =
  '嗨，我是 Jojo，欢迎来到 Joye 的博客。这段话是一个字一个字打出来的：先看左边，每个字都是一下子跳出来的；再看右边，每个字都是慢慢浮现出来的。把上面的速度往快调一点，或者往慢调一点，两边的差别会更明显。'
const CHARS = Array.from(LINE)
/** characters per second: the site's tour types one every ~42ms */
const SITE_CPS = 24
const MIN_CPS = 6
const MAX_CPS = 60
/** each character fades in over about four characters' time, never under 160ms */
const fadeMs = (step: number) => Math.max(160, step * 4)

type JojoComponent = ComponentType<JojoProps>
// 'off': no Jojo in this build → generic avatar. null: still loading → empty seat.
type JojoState = JojoComponent | 'off' | null

function useJojo(): JojoState {
  const [jojo, setJojo] = useState<JojoState>(__JOJO__ ? null : 'off')
  useEffect(() => {
    if (!__JOJO__) return
    let alive = true
    loadJojoRuntime()
      .then((C) => alive && setJojo(() => C))
      .catch(() => alive && setJojo('off'))
    return () => {
      alive = false
    }
  }, [])
  return jojo
}

function Avatar() {
  return (
    <svg className='st-avatar' viewBox='0 0 64 64' aria-hidden='true'>
      <rect x='8' y='10' width='48' height='46' rx='14' />
      <circle cx='25' cy='31' r='3' />
      <circle cx='39' cy='31' r='3' />
      <path d='M25 41q7 5 14 0' />
    </svg>
  )
}

/** ✕: a timer adds one character to the shown string; the rest is laid out but hidden */
function PopLine({ run, step }: { run: number; step: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const id = window.setInterval(() => setN((v) => (v >= CHARS.length ? v : v + 1)), step)
    return () => window.clearInterval(id)
  }, [run, step])
  return (
    <p className='st-line'>
      <span>{CHARS.slice(0, n).join('')}</span>
      <span className='st-off' aria-hidden='true'>
        {CHARS.slice(n).join('')}
      </span>
    </p>
  )
}

/** ✓: one span per character, lit on the frame clock, each fading in by CSS */
function FadeLine({ run, step }: { run: number; step: number }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const p = ref.current
    if (!p) return
    const spans = p.children
    // reset without fading out
    p.classList.add('is-reset')
    for (let i = 0; i < spans.length; i++) spans[i].classList.remove('is-on')
    void p.offsetWidth
    p.classList.remove('is-reset')
    const t0 = performance.now()
    let lit = 0
    let raf = 0
    const tick = (now: number) => {
      const n = Math.min(CHARS.length, Math.floor((now - t0) / step) + 1)
      for (; lit < n; lit++) spans[lit].classList.add('is-on')
      if (n < CHARS.length) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, step])
  return (
    <p ref={ref} className='st-line'>
      {CHARS.map((c, i) => (
        <span key={i} className='st-ch'>
          {c}
        </span>
      ))}
    </p>
  )
}

type Variant = 'pop' | 'fade'

const VARIANTS: { id: Variant; tag: string; tone: 'bad' | 'good'; caption: string }[] = [
  {
    id: 'pop',
    tag: '✕ 定时器 + 整句替换',
    tone: 'bad',
    caption:
      '定时器每隔一段时间往句子里加一个字，新字从无到有只用一帧。定时器和屏幕刷新对不上，实际间隔在相邻的两个整帧之间来回跳（每字 42ms 时是 33ms 和 50ms），看着一顿一顿的。'
  },
  {
    id: 'fade',
    tag: '✓ 按帧点亮 + 逐字淡入（本站）',
    tone: 'good',
    caption:
      '每个字是独立的一小块，按经过的时间在每一帧算出该亮到哪，再用大约四个字的时间淡入（最少 160ms）。前后几个字的淡入叠在一起，节奏的不均匀被抹平了。'
  }
]

function Column({
  variant,
  jojo,
  step,
  all
}: {
  variant: (typeof VARIANTS)[number]
  jojo: JojoState
  step: number
  all: number
}) {
  const [own, setOwn] = useState(0)
  const run = own + all * 1000
  const Line = variant.id === 'pop' ? PopLine : FadeLine
  const Jojo = jojo && jojo !== 'off' ? jojo : null

  return (
    <div className='st-col'>
      <span className={`st-tag st-tag--${variant.tone}`}>{variant.tag}</span>
      <div className='st-frame'>
        <div className='st-stage'>
          <span className='st-seat'>
            {jojo === 'off' ? (
              <Avatar />
            ) : Jojo ? (
              <Jojo
                emotion='happy'
                motion='auto'
                size={72}
                framing='tight'
                gaze={{ x: 0.8, y: -0.1 }}
                decorative
                idPrefix={`lab-typing-${variant.id}-`}
              />
            ) : null}
          </span>
          <div className='st-bubble'>
            <Line run={run} step={step} />
          </div>
        </div>
        <div className='st-foot'>
          <button type='button' className='st-btn' onClick={() => setOwn((v) => v + 1)}>
            ↻ 重播
          </button>
        </div>
      </div>
      <p className='st-caption'>{variant.caption}</p>
    </div>
  )
}

export default function TypingDemo() {
  const [cps, setCps] = useState(SITE_CPS)
  const [all, setAll] = useState(0)
  const jojo = useJojo()
  const step = Math.round(1000 / cps)

  return (
    <div className='st-root' style={{ '--st-fade': `${fadeMs(step)}ms` } as CSSProperties}>
      <style>{`
        .st-root {
          --bg: #F1F3EE;
          --ink: #171B1A;
          --ink-soft: rgba(23,27,26,0.82);
          --muted: #6B7570;
          --faint: #B7BDB6;
          --good: #1F6F4A;
          --bad: #B8402C;
          --card: #FFFFFF;
          --rule: rgba(23,27,26,0.1);
          --dot: rgba(23,27,26,0.05);
          --btn-line: rgba(23,27,26,0.14);
          --btn-hover: rgba(23,27,26,0.05);
          --accent: #3B6E8C;
          --indigo: #2D3272;
          --bubble: #FFFFFF;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .st-root {
          --bg: #15171B;
          --ink: #E8EAE6;
          --ink-soft: rgba(232,234,230,0.82);
          --muted: #9BA39D;
          --faint: #565C57;
          --good: #4ADE80;
          --bad: #F17A6B;
          --card: #1E2128;
          --rule: rgba(255,255,255,0.1);
          --dot: rgba(255,255,255,0.045);
          --btn-line: rgba(255,255,255,0.16);
          --btn-hover: rgba(255,255,255,0.06);
          --accent: #86AEC6;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .st-root *, .st-root *::before, .st-root *::after { box-sizing: border-box; }

        .st-bar {
          max-width: 920px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 16px;
        }
        .st-hint { font-size: 13px; color: var(--muted); }
        .st-bar-actions { display: flex; gap: 10px; margin-left: auto; }
        .st-btn, .st-speed {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--ink-soft);
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          padding: 6px 12px;
          box-shadow: var(--shadow);
        }
        .st-btn {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .st-btn:hover { background: var(--btn-hover); }
        }
        .st-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }
        .st-speed { padding: 4px 14px; gap: 10px; }
        .st-speed-name { color: var(--muted); }
        .st-speed-value {
          min-width: 19ch;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .st-speed input {
          -webkit-appearance: none;
          appearance: none;
          width: 150px;
          height: 24px;
          margin: 0;
          background: transparent;
          cursor: pointer;
        }
        .st-speed input::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 999px;
          background: var(--faint);
        }
        .st-speed input::-moz-range-track {
          height: 4px;
          border-radius: 999px;
          background: var(--faint);
        }
        .st-speed input::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          margin-top: -6px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--card);
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        }
        .st-speed input::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--card);
        }
        .st-speed input:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: 999px;
        }
        @media (max-width: 520px) {
          .st-bar-actions { margin-left: 0; flex-wrap: wrap; }
          .st-speed { width: 100%; }
          .st-speed input { flex: 1; width: auto; min-width: 0; }
          .st-speed-value { min-width: 0; }
        }

        .st-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          max-width: 920px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .st-compare { grid-template-columns: 1fr; max-width: 440px; }
        }
        .st-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .st-tag {
          font: 500 12px/1.4 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
        }
        .st-tag--bad { color: var(--bad); }
        .st-tag--good { color: var(--good); }

        .st-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .st-stage {
          display: flex;
          align-items: flex-end;
          gap: 14px;
          padding: 28px 22px 18px;
          min-height: 210px;
        }
        .st-seat {
          flex: none;
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
        }
        .st-avatar { width: 64px; height: 64px; }
        .st-avatar rect { fill: var(--indigo); }
        .st-avatar circle { fill: #D8F3EA; }
        .st-avatar path { fill: none; stroke: #D8F3EA; stroke-width: 3; stroke-linecap: round; }

        /* Jojo's speech bubble: white, indigo border, tail toward Jojo */
        .st-bubble {
          position: relative;
          flex: 1;
          min-width: 0;
          margin-bottom: 26px;
          padding: 10px 14px;
          border: 2px solid var(--indigo);
          border-radius: 14px;
          background: var(--bubble);
          color: var(--indigo);
          box-shadow: 0 10px 28px rgba(20,24,60,0.12);
        }
        .st-bubble::after {
          content: '';
          position: absolute;
          left: -7px;
          bottom: 16px;
          width: 12px;
          height: 12px;
          border-left: 2px solid var(--indigo);
          border-bottom: 2px solid var(--indigo);
          background: var(--bubble);
          transform: rotate(45deg);
        }
        /* narrow: the bubble takes the full width, Jojo sits under its tail */
        @media (max-width: 520px) {
          .st-stage {
            flex-direction: column-reverse;
            align-items: flex-start;
            gap: 10px;
            padding: 20px 16px 14px;
          }
          .st-bubble { width: 100%; margin-bottom: 0; }
          .st-bubble::after {
            left: 30px;
            bottom: -7px;
            border-left: none;
            border-right: 2px solid var(--indigo);
            transform: rotate(45deg);
          }
        }
        .st-line {
          margin: 0;
          font-size: 15px;
          font-weight: 500;
          line-height: 23px;
        }
        .st-off { visibility: hidden; }
        .st-ch {
          opacity: 0;
          transition: opacity var(--st-fade) ease-out;
        }
        .st-ch.is-on { opacity: 1; }
        .st-line.is-reset .st-ch { transition: none; }

        .st-foot {
          display: flex;
          justify-content: flex-end;
          padding: 10px 12px;
          border-top: 1px solid var(--rule);
        }
        .st-foot .st-btn { box-shadow: none; }

        .st-caption {
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--muted);
          margin: 2px 2px 0;
        }

        .st-takeaways {
          max-width: 920px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .st-takeaways { grid-template-columns: 1fr; max-width: 440px; }
        }
        .st-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .st-num {
          font: 11px 'JetBrains Mono', monospace;
          color: var(--faint);
          display: block;
          margin-bottom: 6px;
        }

        @media (prefers-reduced-motion: reduce) {
          .st-root .st-ch, .st-btn { transition: none !important; }
        }
      `}</style>

      <div className='st-bar'>
        <span className='st-hint'>同一段话、同样的速度，盯着正在出现的那几个字看。</span>
        <div className='st-bar-actions'>
          <button type='button' className='st-btn' onClick={() => setAll((v) => v + 1)}>
            ↻ 两边一起重播
          </button>
          <label className='st-speed'>
            <span className='st-speed-name'>速度</span>
            <input
              type='range'
              min={MIN_CPS}
              max={MAX_CPS}
              step={1}
              value={cps}
              onChange={(e) => setCps(Number(e.currentTarget.value))}
              aria-valuetext={`每秒 ${cps} 个字`}
            />
            <span className='st-speed-value'>
              {cps} 字/秒 · 每字 {step}ms{cps === SITE_CPS ? ' · 本站' : ''}
            </span>
          </label>
        </div>
      </div>

      <div className='st-compare'>
        {VARIANTS.map((v) => (
          <Column key={v.id} variant={v} jojo={jojo} step={step} all={all} />
        ))}
      </div>

      <div className='st-takeaways'>
        <div className='st-takeaway'>
          <span className='st-num'>01</span>
          让每个字有一小段淡入，时长是打字间隔的好几倍。前后几个字的淡入叠在一起，读起来是一条往前流动的边，而不是一下一下地跳。
        </div>
        <div className='st-takeaway'>
          <span className='st-num'>02</span>
          “现在该亮到第几个字”按经过的时间算，在每一帧开始时更新。定时器和屏幕刷新不同步，间隔会忽长忽短，页面一忙还会整体晚到。
        </div>
        <div className='st-takeaway'>
          <span className='st-num'>03</span>
          出一个字只改这个字自己的样式，别让整个组件跟着重新渲染。角色、按钮、位置计算都不用动，主线程才有空把每一帧画完。
        </div>
      </div>
    </div>
  )
}
