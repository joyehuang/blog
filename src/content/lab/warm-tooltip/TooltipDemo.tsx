/**
 * TooltipDemo.tsx
 *
 * 观点：工具栏里的提示，第一次出现时等一等（过滤鼠标路过），但只要有一个提示已经
 * 出现，在同一组里横移到下一个按钮就该立刻显示，而且不再播入场动画。
 * - 左：每个按钮各算各的延迟，横扫一排要等 N 次。
 * - 右：组内共享“热身”状态。冷进入等 600ms；已有提示打开、或刚关不到 300ms 时，
 *   下一个立即出现、没有动画。键盘聚焦一律立即显示，Escape 收起，触屏不出提示。
 *
 * 每个工具栏下方实时显示“这次等了多少毫秒”，差别可以量出来。
 */
import { useEffect, useId, useRef, useState } from 'react'

const DELAY = 600
const SKIP = 300

const TOOLS = [
  {
    label: '加粗',
    keys: '⌘B',
    icon: <path d='M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z' />
  },
  { label: '斜体', keys: '⌘I', icon: <path d='M10 5h8M6 19h8M14 5l-4 14' /> },
  {
    label: '插入链接',
    keys: '⌘K',
    icon: (
      <path d='M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' />
    )
  },
  { label: '引用', keys: '⌘⇧9', icon: <path d='M6 6v12M10 8h8M10 12h8M10 16h5' /> },
  { label: '代码块', keys: '⌘⌥C', icon: <path d='m9 8-4 4 4 4M15 8l4 4-4 4' /> },
  {
    label: '列表',
    keys: '⌘⇧8',
    icon: <path d='M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01' />
  }
]

function Toolbar({ warm }: { warm: boolean }) {
  const id = useId()
  const [active, setActive] = useState(-1)
  const [instant, setInstant] = useState(false)
  const [waits, setWaits] = useState<number[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const openRef = useRef(false)
  const warmUntil = useRef(0)

  useEffect(() => () => clearTimeout(timer.current), [])

  function record(ms: number) {
    setWaits((w) => [...w.slice(-5), ms])
  }

  function reveal(index: number, skipAnimation: boolean) {
    openRef.current = true
    setInstant(skipAnimation)
    setActive(index)
  }

  function show(index: number, via: 'mouse' | 'keyboard') {
    clearTimeout(timer.current)
    const isWarm = warm && (openRef.current || performance.now() < warmUntil.current)
    if (via === 'keyboard' || isWarm) {
      reveal(index, isWarm)
      if (via === 'mouse') record(0)
      return
    }
    const start = performance.now()
    if (openRef.current) {
      openRef.current = false
      setActive(-1)
    }
    timer.current = setTimeout(() => {
      reveal(index, false)
      record(Math.round(performance.now() - start))
    }, DELAY)
  }

  function hide() {
    clearTimeout(timer.current)
    if (openRef.current) warmUntil.current = performance.now() + SKIP
    openRef.current = false
    setActive(-1)
  }

  return (
    <div className='wt-frame'>
      <div
        className='wt-toolbar'
        role='toolbar'
        aria-label={warm ? '共享热身的工具栏' : '各自延迟的工具栏'}
      >
        {TOOLS.map((tool, index) => (
          <div className='wt-item' key={tool.label}>
            <button
              type='button'
              className='wt-btn'
              aria-label={tool.label}
              aria-describedby={active === index ? `${id}-${index}` : undefined}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') show(index, 'mouse')
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === 'mouse') hide()
              }}
              onPointerDown={hide}
              onFocus={(e) => {
                if (e.currentTarget.matches(':focus-visible')) show(index, 'keyboard')
              }}
              onBlur={hide}
              onKeyDown={(e) => {
                if (e.key === 'Escape') hide()
              }}
            >
              <svg viewBox='0 0 24 24' aria-hidden='true'>
                {tool.icon}
              </svg>
            </button>
            <span
              id={`${id}-${index}`}
              role='tooltip'
              className='wt-tip'
              data-open={active === index}
              data-instant={instant}
            >
              {tool.label}
              <kbd>{tool.keys}</kbd>
            </span>
          </div>
        ))}
      </div>
      <div className='wt-page' aria-hidden='true'>
        <span style={{ width: '62%' }} />
        <span style={{ width: '88%' }} />
        <span style={{ width: '74%' }} />
      </div>
      <div className='wt-meter'>
        <span className='wt-meter-label'>每次等待</span>
        <span className='wt-waits' aria-live='polite'>
          {waits.length === 0 ? (
            <em>把鼠标从左到右扫过工具栏</em>
          ) : (
            waits.map((ms, i) => (
              <b key={i} data-zero={ms === 0}>
                {ms}ms
              </b>
            ))
          )}
        </span>
      </div>
    </div>
  )
}

export default function TooltipDemo() {
  return (
    <div className='wt-root'>
      <style>{`
        .wt-root {
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
          --hover: rgba(23,27,26,0.06);
          --tip-bg: #171B1A;
          --tip-ink: #F1F3EE;
          --accent: #3B6E8C;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .wt-root {
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
          --hover: rgba(255,255,255,0.07);
          --tip-bg: #E8EAE6;
          --tip-ink: #15171B;
          --accent: #86AEC6;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .wt-root *, .wt-root *::before, .wt-root *::after { box-sizing: border-box; }

        .wt-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .wt-compare { grid-template-columns: 1fr; max-width: 460px; }
        }
        .wt-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .wt-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .wt-tag--bad { color: var(--bad); }
        .wt-tag--good { color: var(--good); }
        .wt-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .wt-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          padding-top: 44px; /* room for the tooltip above the toolbar */
        }
        .wt-toolbar {
          display: flex;
          gap: 2px;
          margin: 0 14px;
          padding: 4px;
          border: 1px solid var(--rule);
          border-radius: 8px;
          width: fit-content;
        }
        .wt-item { position: relative; }
        .wt-btn {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: var(--ink-soft);
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .wt-btn svg {
          width: 18px;
          height: 18px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        @media (hover: hover) and (pointer: fine) {
          .wt-btn:hover { background: var(--hover); }
        }
        .wt-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

        .wt-tip {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 8px;
          border-radius: 6px;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 500;
          color: var(--tip-ink);
          background: var(--tip-bg);
          pointer-events: none;
          opacity: 0;
          transform: translate(-50%, 4px) scale(0.96);
          transform-origin: 50% 100%;
          transition: opacity 0.15s ease-out, transform 0.15s ease-out;
          z-index: 2;
        }
        .wt-tip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -4px;
          border: 4px solid transparent;
          border-top-color: var(--tip-bg);
        }
        .wt-tip kbd {
          font: 11px 'JetBrains Mono', monospace;
          opacity: 0.6;
        }
        .wt-tip[data-open='true'] { opacity: 1; transform: translate(-50%, 0) scale(1); }
        /* Warm hand-off: appear in place, no entrance animation. */
        .wt-tip[data-instant='true'] { transition: none; }

        .wt-page {
          display: flex;
          flex-direction: column;
          gap: 9px;
          padding: 20px 18px 22px;
        }
        .wt-page span { height: 7px; border-radius: 999px; background: var(--rule); }

        .wt-meter {
          display: flex;
          align-items: baseline;
          gap: 12px;
          padding: 10px 16px 12px;
          border-top: 1px solid var(--rule);
          min-height: 42px;
        }
        .wt-meter-label { font-size: 12px; color: var(--muted); flex: none; }
        .wt-waits {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          font: 12px 'JetBrains Mono', monospace;
        }
        .wt-waits em { font: 12px 'Public Sans', sans-serif; font-style: normal; color: var(--faint); }
        .wt-waits b { font-weight: 500; color: var(--bad); }
        .wt-waits b[data-zero='true'] { color: var(--good); }

        .wt-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .wt-takeaways { grid-template-columns: 1fr; max-width: 460px; }
        }
        .wt-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .wt-num { font: 11px 'JetBrains Mono', monospace; color: var(--faint); display: block; margin-bottom: 6px; }

        @media (prefers-reduced-motion: reduce) {
          .wt-root *, .wt-root *::before, .wt-root *::after { transition: none !important; }
        }
      `}</style>

      <div className='wt-compare'>
        <div className='wt-col'>
          <span className='wt-tag wt-tag--bad'>✕ 每个按钮各等各的</span>
          <Toolbar warm={false} />
          <p className='wt-caption'>
            第一个提示等 600ms 很合理；可人已经在找按钮了，横扫过去每一个还要再等
            600ms，提示总是慢半拍。
          </p>
        </div>
        <div className='wt-col'>
          <span className='wt-tag wt-tag--good'>✓ 第一个等，后面直接出</span>
          <Toolbar warm />
          <p className='wt-caption'>
            只有冷进入要等。一旦有提示亮着，横移过去立刻换成下一个，也不再播入场动画，像同一个提示在跟着鼠标走。
          </p>
        </div>
      </div>

      <div className='wt-takeaways'>
        <div className='wt-takeaway'>
          <span className='wt-num'>01</span>
          延迟的作用是过滤“鼠标路过”。用户一旦停下来看了第一个提示，就说明他在找东西，后面的延迟只剩阻碍。
        </div>
        <div className='wt-takeaway'>
          <span className='wt-num'>02</span>
          热身状态挂在整组上：提示亮着或刚关不到 300ms，下一个就立即显示。离开整组超过
          300ms，才重新变冷。
        </div>
        <div className='wt-takeaway'>
          <span className='wt-num'>03</span>
          键盘 Tab 聚焦直接显示、Escape 收起；触屏不出提示，点一下就执行。按钮本身始终有
          aria-label，不靠提示解释自己。
        </div>
      </div>
    </div>
  )
}
