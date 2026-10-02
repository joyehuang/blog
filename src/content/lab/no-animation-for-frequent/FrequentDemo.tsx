/**
 * FrequentDemo.tsx
 *
 * 观点：一天要触发几百次的操作（命令面板、快捷键、切标签）应该立刻响应。
 * 第一次看很舒服的 0.3 秒开场动画，到第一百次就只剩等待。
 * - 左：命令面板每次打开都播一段缩放 + 淡入 + 模糊的开场（300ms）。
 * - 右：同一个面板，按下就出现。
 * 每个窗口可以点按钮，也可以聚焦后按 K 打开 / 关闭（Esc 关闭）。
 * “连按 10 次”会让两边同时按同样的节奏开关十次，下面的计数把等待累加起来。
 * 系统开启减少动态效果时，开场动画关闭。
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

type Variant = 'anim' | 'instant'

const WAIT_MS = 300
const BURST = 10
const HOLD_MS = 450
const GAP_MS = 150

const COMMANDS: { label: string; key: string }[] = [
  { label: '新建笔记', key: 'N' },
  { label: '搜索全部文件', key: 'F' },
  { label: '切换深色模式', key: 'D' },
  { label: '打开设置', key: ',' }
]

const VARIANTS: { id: Variant; tag: string; tone: 'bad' | 'good'; caption: string }[] = [
  {
    id: 'anim',
    tag: '✕ 每次都播开场动画',
    tone: 'bad',
    caption:
      '第一次打开，面板缩放、淡入、从模糊变清楚，挺好看。连按几次再看：你已经想好要选哪一项了，面板还在慢慢落位。'
  },
  {
    id: 'instant',
    tag: '✓ 按下就出现',
    tone: 'good',
    caption:
      '没有任何过场，手指刚按下去面板就在那里。按得越多，越能感觉到它跟得上你的节奏，而不是你在等它。'
  }
]

function Palette({ variant }: { variant: Variant }) {
  return (
    <>
      <div className='nf-scrim' data-variant={variant} aria-hidden='true' />
      <div className='nf-palette' data-variant={variant} role='dialog' aria-label='命令面板'>
        <div className='nf-search'>
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <circle cx='11' cy='11' r='6.5' />
            <path d='m16 16 4 4' />
          </svg>
          <span>输入命令…</span>
        </div>
        <ul className='nf-list'>
          {COMMANDS.map((c, i) => (
            <li key={c.label} data-active={i === 0}>
              <span>{c.label}</span>
              <kbd>{c.key}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function Window({
  variant,
  open,
  opens,
  seq,
  onToggle,
  onClose
}: {
  variant: (typeof VARIANTS)[number]
  open: boolean
  opens: number
  seq: number
  onToggle: () => void
  onClose: () => void
}) {
  const waited = variant.id === 'anim' ? (opens * WAIT_MS) / 1000 : 0
  const fill = Math.min(waited / ((BURST * WAIT_MS) / 1000), 1)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault()
      onToggle()
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className='nf-col'>
      <span className={`nf-tag nf-tag--${variant.tone}`}>{variant.tag}</span>
      <div className='nf-frame' onKeyDown={onKeyDown}>
        <div className='nf-chrome'>
          <span className='nf-title'>笔记</span>
          <button type='button' className='nf-open' aria-expanded={open} onClick={onToggle}>
            命令面板 <kbd>K</kbd>
          </button>
        </div>
        <div
          className='nf-stage'
          tabIndex={0}
          role='group'
          aria-label={`${variant.tag}的示例窗口，聚焦后按 K 打开或关闭命令面板`}
        >
          <div className='nf-doc' aria-hidden='true'>
            <span className='nf-doc-h' />
            <span />
            <span />
            <span className='nf-doc-short' />
            <span />
            <span className='nf-doc-short' />
          </div>
          {open && <Palette key={seq} variant={variant.id} />}
        </div>
        <div className='nf-meter'>
          <span className='nf-readout' aria-live='polite'>
            已打开 <b>{opens}</b> 次 · 累计等待 <b>{waited.toFixed(1)}</b> 秒
          </span>
          <span className='nf-track' aria-hidden='true'>
            <span className='nf-fill' style={{ transform: `scaleX(${fill})` }} />
          </span>
        </div>
      </div>
      <p className='nf-caption'>{variant.caption}</p>
    </div>
  )
}

type Side = { open: boolean; opens: number; seq: number }
const EMPTY: Side = { open: false, opens: 0, seq: 0 }

export default function FrequentDemo() {
  const [sides, setSides] = useState<Record<Variant, Side>>({ anim: EMPTY, instant: EMPTY })
  const [running, setRunning] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const setOpen = (v: Variant, next: boolean) =>
    setSides((s) => {
      const cur = s[v]
      if (cur.open === next) return s
      return {
        ...s,
        [v]: next ? { open: true, opens: cur.opens + 1, seq: cur.seq + 1 } : { ...cur, open: false }
      }
    })

  const toggle = (v: Variant) => setOpen(v, !sides[v].open)

  const burst = () => {
    if (running) return
    setRunning(true)
    setOpen('anim', false)
    setOpen('instant', false)
    const step = HOLD_MS + GAP_MS
    for (let i = 0; i < BURST; i++) {
      const at = GAP_MS + i * step
      timers.current.push(
        window.setTimeout(() => {
          setOpen('anim', true)
          setOpen('instant', true)
        }, at),
        window.setTimeout(() => {
          setOpen('anim', false)
          setOpen('instant', false)
        }, at + HOLD_MS)
      )
    }
    timers.current.push(window.setTimeout(() => setRunning(false), GAP_MS + BURST * step))
  }

  const reset = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    setRunning(false)
    setSides({ anim: EMPTY, instant: EMPTY })
  }

  return (
    <div className='nf-root'>
      <style>{`
        .nf-root {
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
          --accent: #3B6E8C;
          --line: rgba(23,27,26,0.08);
          --pal: #FFFFFF;
          --pal-line: rgba(23,27,26,0.12);
          --pal-active: rgba(59,110,140,0.1);
          --scrim: rgba(23,27,26,0.08);
          --pal-shadow: 0 2px 6px rgba(23,27,26,0.08), 0 18px 40px rgba(23,27,26,0.16);
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .nf-root {
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
          --accent: #86AEC6;
          --line: rgba(255,255,255,0.07);
          --pal: #272B33;
          --pal-line: rgba(255,255,255,0.12);
          --pal-active: rgba(134,174,198,0.16);
          --scrim: rgba(0,0,0,0.28);
          --pal-shadow: 0 2px 6px rgba(0,0,0,0.4), 0 18px 40px rgba(0,0,0,0.5);
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .nf-root *, .nf-root *::before, .nf-root *::after { box-sizing: border-box; }
        .nf-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .nf-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 14px;
        }
        .nf-hint { font-size: 13px; color: var(--muted); }
        .nf-hint kbd, .nf-open kbd {
          font: 500 11px/1 'JetBrains Mono', monospace;
          padding: 2px 5px;
          border: 1px solid var(--rule);
          border-bottom-width: 2px;
          border-radius: 4px;
          color: var(--ink-soft);
          background: var(--card);
        }
        .nf-btn {
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--ink-soft);
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          padding: 8px 14px;
          cursor: pointer;
          box-shadow: var(--shadow);
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .nf-btn--primary { background: var(--ink); color: var(--card); border-color: var(--ink); }
        .nf-btn:disabled { opacity: 0.55; cursor: default; }

        .nf-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .nf-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .nf-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .nf-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .nf-tag--bad { color: var(--bad); }
        .nf-tag--good { color: var(--good); }
        .nf-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .nf-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .nf-chrome {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px 8px 12px;
          border-bottom: 1px solid var(--rule);
        }
        .nf-title { font-size: 13px; font-weight: 600; }
        .nf-open {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font: 500 12px/1 'Public Sans', -apple-system, sans-serif;
          color: var(--ink-soft);
          background: transparent;
          border: 1px solid var(--rule);
          border-radius: 6px;
          padding: 5px 6px 5px 10px;
          cursor: pointer;
        }
        .nf-open[aria-expanded='true'] { background: var(--pal-active); }

        .nf-stage {
          position: relative;
          height: 232px;
          overflow: hidden;
        }
        .nf-stage:focus-visible { outline-offset: -3px; }
        .nf-doc {
          display: flex;
          flex-direction: column;
          gap: 11px;
          padding: 22px 20px;
        }
        .nf-doc span {
          display: block;
          height: 7px;
          border-radius: 999px;
          background: var(--line);
        }
        .nf-doc .nf-doc-h { width: 45%; height: 11px; margin-bottom: 6px; background: var(--rule); }
        .nf-doc .nf-doc-short { width: 68%; }

        .nf-scrim { position: absolute; inset: 0; background: var(--scrim); }
        .nf-palette {
          position: absolute;
          top: 22px;
          left: 50%;
          width: min(300px, calc(100% - 28px));
          margin-left: calc(min(300px, calc(100% - 28px)) / -2);
          background: var(--pal);
          border: 1px solid var(--pal-line);
          border-radius: 10px;
          box-shadow: var(--pal-shadow);
          overflow: hidden;
        }
        .nf-palette[data-variant='anim'] {
          animation: nf-in ${WAIT_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        .nf-scrim[data-variant='anim'] { animation: nf-fade ${WAIT_MS}ms ease both; }
        @keyframes nf-in {
          from { opacity: 0; transform: translateY(12px) scale(0.9); filter: blur(6px); }
          to { opacity: 1; transform: none; filter: blur(0); }
        }
        @keyframes nf-fade { from { opacity: 0; } }

        .nf-search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 12px;
          font-size: 13px;
          color: var(--muted);
          border-bottom: 1px solid var(--pal-line);
        }
        .nf-search svg {
          width: 15px;
          height: 15px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
        }
        .nf-list { list-style: none; margin: 0; padding: 5px; }
        .nf-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 8px;
          border-radius: 6px;
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        .nf-list li[data-active='true'] { background: var(--pal-active); color: var(--ink); }
        .nf-list kbd { font: 11px 'JetBrains Mono', monospace; color: var(--faint); }

        .nf-meter {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 11px 14px 13px;
          border-top: 1px solid var(--rule);
        }
        .nf-readout { font: 12px/1.4 'JetBrains Mono', monospace; color: var(--muted); }
        .nf-readout b { font-weight: 600; color: var(--ink); }
        .nf-track {
          display: block;
          height: 4px;
          border-radius: 999px;
          background: var(--line);
          overflow: hidden;
        }
        .nf-fill {
          display: block;
          height: 100%;
          background: var(--bad);
          transform-origin: left center;
          transition: transform 0.2s ease;
        }

        .nf-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .nf-takeaways { grid-template-columns: 1fr; max-width: 480px; }
        }
        .nf-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .nf-num { font: 11px 'JetBrains Mono', monospace; color: var(--faint); display: block; margin-bottom: 6px; }

        @media (prefers-reduced-motion: reduce) {
          .nf-palette[data-variant='anim'], .nf-scrim[data-variant='anim'] { animation: none; }
          .nf-root *, .nf-root *::before, .nf-root *::after { transition: none !important; }
        }
      `}</style>

      <div className='nf-bar'>
        <span className='nf-hint'>
          点一下窗口再连续按 <kbd>K</kbd>，或者直接：
        </span>
        <button type='button' className='nf-btn nf-btn--primary' onClick={burst} disabled={running}>
          {running ? '连按中…' : `连按 ${BURST} 次`}
        </button>
        <button type='button' className='nf-btn' onClick={reset}>
          清零
        </button>
      </div>

      <div className='nf-compare'>
        {VARIANTS.map((v) => (
          <Window
            key={v.id}
            variant={v}
            open={sides[v.id].open}
            opens={sides[v.id].opens}
            seq={sides[v.id].seq}
            onToggle={() => toggle(v.id)}
            onClose={() => setOpen(v.id, false)}
          />
        ))}
      </div>

      <div className='nf-takeaways'>
        <div className='nf-takeaway'>
          <span className='nf-num'>01</span>
          加动画之前先问：这个操作一天会做几次。一年见一次的欢迎页可以尽情发挥，一天打开几百次的面板，最好的动画就是没有动画。
        </div>
        <div className='nf-takeaway'>
          <span className='nf-num'>02</span>
          键盘触发的操作尤其不要加。按下快捷键的人已经知道自己要做什么，任何过场都是挡在他和目标之间。
        </div>
        <div className='nf-takeaway'>
          <span className='nf-num'>03</span>
          动画的成本要乘上次数来算。每次 0.3 秒看起来很短，打开一百次，就是半分钟盯着同一段过场。
        </div>
      </div>
    </div>
  )
}
