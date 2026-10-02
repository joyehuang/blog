/**
 * SpinnerDelayDemo.tsx
 *
 * 观点：请求通常很快回来时，一点按钮就转圈，转圈只存在几十毫秒，看起来像闪了一下。
 * 两个“保存”按钮并排：
 * - 左：立刻转圈，并把文字换成“保存中…”（按钮宽度跟着变）。
 * - 右：等 200ms 还没回来才转圈；一旦出现，至少停留 400ms；文字始终是“保存”，
 *   只把图标换成转圈，宽度不变。
 * 顶部选网速（快 80ms / 一般 250ms / 慢 2s），每边下方的时间线画出请求和转圈各占哪一段。
 * 时间是按计划算出来的，不依赖真实网络；减少动态效果时转圈不旋转，时间线结束后一次画完。
 */
import { useCallback, useEffect, useRef, useState } from 'react'

type SpeedId = 'fast' | 'normal' | 'slow'
type Variant = 'instant' | 'delayed'

const SPEEDS: { id: SpeedId; label: string; ms: number; scale: number }[] = [
  { id: 'fast', label: '快 · 80ms', ms: 80, scale: 800 },
  { id: 'normal', label: '一般 · 250ms', ms: 250, scale: 800 },
  { id: 'slow', label: '慢 · 2s', ms: 2000, scale: 2400 }
]

const SHOW_DELAY = 200
const MIN_VISIBLE = 400

interface Plan {
  ms: number
  scale: number
  shownAt: number | null
  hiddenAt: number | null
  end: number
}

function makePlan(variant: Variant, ms: number, scale: number): Plan {
  if (variant === 'instant') return { ms, scale, shownAt: 0, hiddenAt: ms, end: ms }
  if (ms < SHOW_DELAY) return { ms, scale, shownAt: null, hiddenAt: null, end: ms }
  const hiddenAt = Math.max(ms, SHOW_DELAY + MIN_VISIBLE)
  return { ms, scale, shownAt: SHOW_DELAY, hiddenAt, end: hiddenAt }
}

function Spinner() {
  return (
    <svg className='ds-spinner' viewBox='0 0 16 16' aria-hidden='true'>
      <circle className='ds-spin-track' cx='8' cy='8' r='6' />
      <path className='ds-spin-arc' d='M8 2a6 6 0 0 1 6 6' />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg className='ds-save-icon' viewBox='0 0 16 16' aria-hidden='true'>
      <path d='M3 2.5h8l2.5 2.5v8.5H2.5V3a.5.5 0 0 1 .5-.5Z' />
      <path d='M5.5 2.5v3h4.5v-3M5 13.5V9.5h6v4' />
    </svg>
  )
}

function summary(variant: Variant, plan: Plan): string {
  if (variant === 'instant') {
    if (plan.ms < 300) {
      return `转圈 0ms 出现、${plan.ms}ms 消失，只露面 ${plan.ms}ms，看起来就是闪了一下。`
    }
    return `一点就转，从 0ms 转到 ${plan.ms}ms。按钮文字换成“保存中…”，宽度也跟着变。`
  }
  if (plan.shownAt === null) {
    return `请求 ${plan.ms}ms 就回来了，没到 ${SHOW_DELAY}ms，转圈根本没出现。`
  }
  if (plan.hiddenAt! > plan.ms) {
    return `${SHOW_DELAY}ms 时还没回来，转圈出现；请求 ${plan.ms}ms 回来，转圈多留到 ${plan.hiddenAt}ms，凑够 ${MIN_VISIBLE}ms 再收起。`
  }
  return `${SHOW_DELAY}ms 时还没回来才出现转圈，请求 ${plan.ms}ms 回来时收起。按钮文字一直是“保存”。`
}

const COLUMNS: { variant: Variant; tag: string; tone: 'bad' | 'good'; caption: string }[] = [
  {
    variant: 'instant',
    tag: '✕ 一点就转',
    tone: 'bad',
    caption:
      '选“快”，连点几次左边的保存：转圈和“保存中…”一闪就没，按钮还跟着变宽又变回来，像出了故障。'
  },
  {
    variant: 'delayed',
    tag: '✓ 晚 200ms 再转，转了就至少停 400ms',
    tone: 'good',
    caption:
      '同样是“快”，右边一下都不转，直接显示已保存。切到“一般”，转圈会出现，但至少停留 400ms，不会一闪而过。'
  }
]

const pct = (v: number, scale: number) => `${(Math.min(v, scale) / scale) * 100}%`

function Column({
  col,
  speed,
  trigger
}: {
  col: (typeof COLUMNS)[number]
  speed: (typeof SPEEDS)[number]
  trigger: number
}) {
  const [run, setRun] = useState<{ plan: Plan; t: number; done: boolean } | null>(null)
  const raf = useRef(0)
  const busy = useRef(false)

  const start = useCallback(() => {
    if (busy.current) return
    busy.current = true
    const plan = makePlan(col.variant, speed.ms, speed.scale)
    const t0 = performance.now()
    const tick = () => {
      const t = performance.now() - t0
      if (t >= plan.end) {
        busy.current = false
        setRun({ plan, t: plan.end, done: true })
        return
      }
      setRun({ plan, t, done: false })
      raf.current = requestAnimationFrame(tick)
    }
    tick()
  }, [col.variant, speed])

  // Changing the speed resets both sides.
  useEffect(() => {
    cancelAnimationFrame(raf.current)
    busy.current = false
    setRun(null)
  }, [speed])

  // "两边一起保存" in the bar. Only react to a new press, not to `start` changing.
  const handled = useRef(0)
  useEffect(() => {
    if (trigger === handled.current) return
    handled.current = trigger
    start()
  }, [trigger, start])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const plan = run?.plan
  const t = run?.t ?? 0
  const spinning =
    !!run && !run.done && plan!.shownAt !== null && t >= plan!.shownAt && t < (plan!.hiddenAt ?? 0)
  const label = col.variant === 'instant' && spinning ? '保存中…' : '保存'
  const scale = speed.scale

  const readout = !run
    ? '点“保存”，看看转圈什么时候出现、停留多久。'
    : run.done
      ? summary(col.variant, run.plan)
      : '请求进行中…'

  return (
    <div className='ds-col'>
      <span className={`ds-tag ds-tag--${col.tone}`}>{col.tag}</span>
      <div className='ds-frame'>
        <div className='ds-chrome' aria-hidden='true'>
          设置 · 个人资料
          <span className='ds-chrome-nav'>
            <span />
            <span />
          </span>
        </div>
        <div className='ds-form'>
          <div className='ds-field'>
            <span className='ds-field-label'>昵称</span>
            <span className='ds-input'>Joye</span>
          </div>
          <div className='ds-field'>
            <span className='ds-field-label'>简介</span>
            <span className='ds-input'>写代码，也写字。</span>
          </div>
          <div className='ds-actions'>
            <span className='ds-saved' data-on={!!run?.done}>
              <svg viewBox='0 0 16 16' aria-hidden='true'>
                <path d='m3.5 8.5 3 3 6-7' />
              </svg>
              已保存
            </span>
            <button type='button' className='ds-btn' aria-busy={!!run && !run.done} onClick={start}>
              <span className='ds-btn-icon'>{spinning ? <Spinner /> : <SaveIcon />}</span>
              {label}
            </button>
          </div>
        </div>

        <div className='ds-tl' aria-hidden='true'>
          <div className='ds-tl-row'>
            <span className='ds-tl-label'>请求</span>
            <span className='ds-tl-track'>
              {run && (
                <span
                  className='ds-tl-bar ds-tl-bar--req'
                  style={{ left: 0, width: pct(Math.min(t, plan!.ms), scale) }}
                />
              )}
            </span>
          </div>
          <div className='ds-tl-row'>
            <span className='ds-tl-label'>转圈</span>
            <span className='ds-tl-track'>
              {col.variant === 'delayed' && (
                <span className='ds-tl-mark' style={{ left: pct(SHOW_DELAY, scale) }} />
              )}
              {run && plan!.shownAt !== null && t >= plan!.shownAt && (
                <span
                  className={`ds-tl-bar ds-tl-bar--${col.tone}`}
                  style={{
                    left: pct(plan!.shownAt, scale),
                    width: pct(Math.min(t, plan!.hiddenAt!) - plan!.shownAt, scale)
                  }}
                />
              )}
            </span>
          </div>
          <div className='ds-tl-axis'>
            <span>0</span>
            {col.variant === 'delayed' && (
              <span className='ds-tl-axis-mark' style={{ left: pct(SHOW_DELAY, scale) }}>
                {SHOW_DELAY}ms
              </span>
            )}
            <span>{scale >= 1000 ? `${scale / 1000}s` : `${scale}ms`}</span>
          </div>
        </div>
        <p className='ds-readout' aria-live='polite'>
          {readout}
        </p>
      </div>
      <p className='ds-caption'>{col.caption}</p>
    </div>
  )
}

export default function SpinnerDelayDemo() {
  const [speedId, setSpeedId] = useState<SpeedId>('fast')
  const [trigger, setTrigger] = useState(0)
  const speed = SPEEDS.find((s) => s.id === speedId)!

  return (
    <div className='ds-root'>
      <style>{`
        .ds-root {
          --bg: #F1F3EE;
          --ink: #171B1A;
          --ink-soft: rgba(23,27,26,0.82);
          --muted: #6B7570;
          --faint: #B7BDB6;
          --good: #1F6F4A;
          --bad: #B8402C;
          --card: #FFFFFF;
          --panel: #F7F8F5;
          --rule: rgba(23,27,26,0.1);
          --dot: rgba(23,27,26,0.05);
          --field: rgba(23,27,26,0.04);
          --accent: #3B6E8C;
          --btn-bg: #171B1A;
          --btn-ink: #FFFFFF;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .ds-root {
          --bg: #15171B;
          --ink: #E8EAE6;
          --ink-soft: rgba(232,234,230,0.82);
          --muted: #9BA39D;
          --faint: #565C57;
          --good: #4ADE80;
          --bad: #F17A6B;
          --card: #1E2128;
          --panel: #1A1D23;
          --rule: rgba(255,255,255,0.1);
          --dot: rgba(255,255,255,0.045);
          --field: rgba(255,255,255,0.04);
          --accent: #86AEC6;
          --btn-bg: #E8EAE6;
          --btn-ink: #15171B;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .ds-root *, .ds-root *::before, .ds-root *::after { box-sizing: border-box; }
        .ds-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .ds-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 14px;
        }
        .ds-hint { font-size: 13px; color: var(--muted); }
        .ds-seg {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: 3px;
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          box-shadow: var(--shadow);
        }
        .ds-seg button, .ds-both {
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--muted);
          background: transparent;
          border: 0;
          border-radius: 999px;
          padding: 7px 12px;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .ds-seg button[aria-pressed='true'] { background: var(--ink); color: var(--card); }
        .ds-both {
          color: var(--ink-soft);
          border: 1px solid var(--rule);
          background: var(--card);
          box-shadow: var(--shadow);
          padding: 8px 14px;
        }
        @media (hover: hover) and (pointer: fine) {
          .ds-both:hover { color: var(--ink); }
        }

        .ds-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .ds-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .ds-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .ds-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .ds-tag--bad { color: var(--bad); }
        .ds-tag--good { color: var(--good); }
        .ds-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .ds-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .ds-chrome {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--rule);
          font-size: 13px;
          font-weight: 600;
        }
        .ds-chrome-nav { display: flex; gap: 6px; margin-left: auto; }
        .ds-chrome-nav span { width: 22px; height: 6px; border-radius: 999px; background: var(--rule); }

        .ds-form { padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 12px; }
        .ds-field { display: flex; flex-direction: column; gap: 6px; }
        .ds-field-label { font-size: 12px; color: var(--muted); }
        .ds-input {
          display: block;
          font-size: 13.5px;
          color: var(--ink-soft);
          padding: 8px 10px;
          border: 1px solid var(--rule);
          border-radius: 7px;
          background: var(--field);
        }
        .ds-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 4px;
          min-height: 36px;
        }
        .ds-saved {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          color: var(--good);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .ds-saved[data-on='true'] { opacity: 1; }
        .ds-saved svg {
          width: 14px;
          height: 14px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .ds-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 36px;
          padding: 0 16px 0 13px;
          border: 0;
          border-radius: 8px;
          background: var(--btn-bg);
          color: var(--btn-ink);
          font: 600 13.5px/1 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          white-space: nowrap;
          cursor: pointer;
        }
        .ds-btn[aria-busy='true'] { cursor: progress; }
        .ds-btn-icon { width: 15px; height: 15px; display: grid; place-items: center; flex: none; }
        .ds-save-icon, .ds-spinner { width: 15px; height: 15px; display: block; }
        .ds-save-icon {
          fill: none;
          stroke: currentColor;
          stroke-width: 1.4;
          stroke-linejoin: round;
          stroke-linecap: round;
        }
        .ds-spinner { animation: ds-spin 0.8s linear infinite; }
        .ds-spin-track { fill: none; stroke: currentColor; stroke-opacity: 0.3; stroke-width: 2; }
        .ds-spin-arc { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
        @keyframes ds-spin { to { transform: rotate(360deg); } }

        /* Timeline readout */
        .ds-tl {
          background: var(--panel);
          border-top: 1px solid var(--rule);
          padding: 14px 16px 6px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ds-tl-row { display: flex; align-items: center; gap: 10px; }
        .ds-tl-label {
          flex: none;
          width: 28px;
          font-size: 11.5px;
          color: var(--muted);
        }
        .ds-tl-track {
          position: relative;
          flex: 1;
          height: 10px;
          border-radius: 3px;
          background: var(--rule);
        }
        .ds-tl-bar { position: absolute; top: 0; bottom: 0; border-radius: 3px; }
        .ds-tl-bar--req { background: var(--accent); }
        .ds-tl-bar--bad { background: var(--bad); }
        .ds-tl-bar--good { background: var(--good); }
        .ds-tl-mark {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 0;
          border-left: 1px dashed var(--muted);
        }
        .ds-tl-axis {
          position: relative;
          display: flex;
          justify-content: space-between;
          margin-left: 38px;
          font: 10.5px/1.4 'JetBrains Mono', monospace;
          color: var(--muted);
        }
        .ds-tl-axis-mark { position: absolute; top: 0; padding-left: 4px; }
        .ds-readout {
          margin: 0;
          padding: 4px 16px 14px;
          background: var(--panel);
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--ink-soft);
          min-height: 58px;
        }

        .ds-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .ds-takeaways { grid-template-columns: 1fr; max-width: 480px; }
        }
        .ds-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .ds-num { font: 11px 'JetBrains Mono', monospace; color: var(--faint); display: block; margin-bottom: 6px; }

        @media (prefers-reduced-motion: reduce) {
          .ds-spinner { animation: none; }
          .ds-root *, .ds-root *::before, .ds-root *::after { transition: none !important; }
        }
      `}</style>

      <div className='ds-bar'>
        <span className='ds-hint'>先选网速，再点下面的“保存”：</span>
        <div className='ds-seg' role='group' aria-label='模拟的网速'>
          {SPEEDS.map((s) => (
            <button
              type='button'
              key={s.id}
              aria-pressed={speedId === s.id}
              onClick={() => setSpeedId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button type='button' className='ds-both' onClick={() => setTrigger((n) => n + 1)}>
          两边一起保存
        </button>
      </div>

      <div className='ds-compare'>
        {COLUMNS.map((c) => (
          <Column key={c.variant} col={c} speed={speed} trigger={trigger} />
        ))}
      </div>

      <div className='ds-takeaways'>
        <div className='ds-takeaway'>
          <span className='ds-num'>01</span>
          先等一下再转。很快就回来的请求不需要转圈，等 150–300ms 还没回来，再告诉用户“正在处理”。
        </div>
        <div className='ds-takeaway'>
          <span className='ds-num'>02</span>
          转了就多留一会儿。一旦出现，至少停留 300–500ms，否则它刚出现就消失，看起来还是闪了一下。
        </div>
        <div className='ds-takeaway'>
          <span className='ds-num'>03</span>
          按钮保留原来的文字。只把图标换成转圈，按钮宽度不变，旁边的东西也不会跟着跳。
        </div>
      </div>
    </div>
  )
}
