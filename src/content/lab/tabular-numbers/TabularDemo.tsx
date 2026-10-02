/**
 * TabularDemo.tsx
 *
 * 观点：会变的数字、要上下比较的数字，都该用等宽数字。
 * 大多数字体默认是“比例数字”：1 比 0 窄一大截。数字一跳，整串的宽度跟着变，
 * 右对齐时左边缘就来回晃；表格里的小数点也排不成一列。
 *
 * 两栏用同一个字体（Public Sans）、同一份数据，唯一区别是右栏打开了等宽数字。
 * - 秒表：下方的色带画出“最近一秒左边缘到过的范围”，把晃动变成看得见的宽度。
 * - 下载计数：小字号下同样会抖。
 * - 账单：虚线对准“合计”的小数点，看其余几行能不能对上。
 * 暂停后画面定格，方便细看。减少动态效果时，秒表默认暂停。
 *
 * 底部“再进一步”：同样是等宽数字，数字变化时直接换 vs 用 NumberFlow 滚过去。
 */
import NumberFlow from '@number-flow/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const BILL: { item: string; amount: string }[] = [
  { item: '域名续费', amount: '111.11' },
  { item: '对象存储', amount: '1,048.00' },
  { item: 'CDN 流量', amount: '980.80' },
  { item: '云服务器', amount: '1,111.11' }
]
const TOTAL = '3,251.02'
const FILE_SIZE = 128

function formatClock(ms: number) {
  const cs = Math.floor(ms / 10) % 100
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / 60000) % 100
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(m)}:${pad(s)}.${pad(cs)}`
}

/** Splits "1,048.00" so the decimal point can be measured and highlighted. */
function Amount({
  value,
  dotRef
}: {
  value: string
  dotRef?: (el: HTMLSpanElement | null) => void
}) {
  const [int, dec] = value.split('.')
  return (
    <>
      ¥ {int}
      <span className='tn-dot' ref={dotRef}>
        .
      </span>
      {dec}
    </>
  )
}

function Column({
  tabular,
  ms,
  tag,
  caption
}: {
  tabular: boolean
  ms: number
  tag: string
  caption: string
}) {
  // --- stopwatch: track where the number's left edge has been in the last second
  const wrapRef = useRef<HTMLDivElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)
  const edgeRef = useRef<HTMLSpanElement>(null)
  const bandRef = useRef<HTMLSpanElement>(null)
  const readRef = useRef<HTMLElement>(null)
  const history = useRef<{ t: number; x: number }[]>([])

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const num = numRef.current
    if (!wrap || !num) return
    const x = num.getBoundingClientRect().left - wrap.getBoundingClientRect().left
    const now = performance.now()
    const h = history.current
    h.push({ t: now, x })
    while (h.length > 1 && now - h[0]!.t > 1000) h.shift()
    let min = Infinity
    let max = -Infinity
    for (const p of h) {
      min = Math.min(min, p.x)
      max = Math.max(max, p.x)
    }
    if (edgeRef.current) edgeRef.current.style.transform = `translateX(${x}px)`
    if (bandRef.current) {
      bandRef.current.style.transform = `translateX(${min}px)`
      bandRef.current.style.width = `${Math.max(2, max - min)}px`
    }
    if (readRef.current) readRef.current.textContent = String(Math.round(max - min))
  }, [ms])

  // --- bill: a guide line through the total's decimal point
  const tableRef = useRef<HTMLDivElement>(null)
  const totalDot = useRef<HTMLSpanElement | null>(null)
  const firstRow = useRef<HTMLDivElement>(null)
  const [guide, setGuide] = useState<{ x: number; top: number } | null>(null)
  const measureGuide = useCallback(() => {
    const t = tableRef.current
    const d = totalDot.current
    if (!t || !d || !firstRow.current) return
    const r = d.getBoundingClientRect()
    setGuide({
      x: r.left + r.width / 2 - t.getBoundingClientRect().left,
      top: firstRow.current.offsetTop
    })
  }, [])
  useEffect(() => {
    measureGuide()
    document.fonts?.ready.then(measureGuide)
    const ro = new ResizeObserver(measureGuide)
    if (tableRef.current) ro.observe(tableRef.current)
    return () => ro.disconnect()
  }, [measureGuide])

  // --- download counter, stepped ~8 times a second
  const step = Math.floor(ms / 125)
  const done = (step * 0.37 + Math.sin(step) * 0.2 + 0.2) % FILE_SIZE
  const pct = (done / FILE_SIZE) * 100

  return (
    <div className='tn-col'>
      <span className={`tn-tag tn-tag--${tabular ? 'good' : 'bad'}`}>{tag}</span>
      <div className='tn-frame' data-tabular={tabular}>
        <section className='tn-sec'>
          <div className='tn-clockwrap' ref={wrapRef}>
            <div className='tn-clock'>
              <span className='tn-label'>秒表</span>
              <span className='tn-big' ref={numRef} role='timer'>
                {formatClock(ms)}
              </span>
            </div>
            <span className='tn-edge' ref={edgeRef} aria-hidden='true' />
            <div className='tn-track' aria-hidden='true'>
              <span className='tn-band' ref={bandRef} />
            </div>
          </div>
          <p className='tn-jitter'>
            最近一秒，左边缘来回移动了 <b ref={readRef}>0</b> px
          </p>
        </section>

        <section className='tn-sec'>
          <div className='tn-dl'>
            <span className='tn-file'>lab-assets.zip</span>
            <span className='tn-num tn-dl-num'>
              {done.toFixed(1)} / {FILE_SIZE.toFixed(1)} MB
            </span>
          </div>
          <div className='tn-bar-track' aria-hidden='true'>
            <span className='tn-bar-fill' style={{ width: `${pct}%` }} />
          </div>
        </section>

        <section className='tn-sec tn-sec--bill'>
          <div className='tn-table' ref={tableRef}>
            {guide && (
              <span
                className='tn-guide'
                style={{ left: guide.x, top: guide.top }}
                aria-hidden='true'
              />
            )}
            <div className='tn-tr tn-th'>
              <span>本月账单</span>
              <span>金额</span>
            </div>
            {BILL.map((row, i) => (
              <div className='tn-tr' key={row.item} ref={i === 0 ? firstRow : undefined}>
                <span>{row.item}</span>
                <span className='tn-num'>
                  <Amount value={row.amount} />
                </span>
              </div>
            ))}
            <div className='tn-tr tn-total'>
              <span>合计</span>
              <span className='tn-num'>
                <Amount
                  value={TOTAL}
                  dotRef={(el) => {
                    totalDot.current = el
                  }}
                />
              </span>
            </div>
          </div>
        </section>
      </div>
      <p className='tn-caption'>{caption}</p>
    </div>
  )
}

const PRICES = [128, 1048, 99.9, 3251.02, 980.8, 12, 2599]
const CNY = { style: 'currency', currency: 'CNY' } as const

/** Bonus: tabular digits that also roll to the new value (NumberFlow). */
function Rolling() {
  const [i, setI] = useState(0)
  const price = PRICES[i % PRICES.length]!
  return (
    <section className='tn-roll' aria-labelledby='tn-roll-title'>
      <div className='tn-roll-head'>
        <span className='tn-tag tn-tag--good' id='tn-roll-title'>
          ✓ 再进一步：让数字滚过去
        </span>
        <button type='button' className='tn-roll-btn' onClick={() => setI((n) => n + 1)}>
          换一个价格
        </button>
      </div>
      <div className='tn-roll-grid'>
        <div className='tn-frame tn-roll-card'>
          <span className='tn-roll-label'>等宽数字 · 直接换</span>
          <span className='tn-roll-value tn-tab'>
            {new Intl.NumberFormat('zh-CN', CNY).format(price)}
          </span>
        </div>
        <div className='tn-frame tn-roll-card'>
          <span className='tn-roll-label'>等宽数字 · NumberFlow 滚动</span>
          <NumberFlow className='tn-roll-value tn-tab' value={price} locales='zh-CN' format={CNY} />
        </div>
      </div>
      <p className='tn-caption'>
        等宽数字解决了“抖”，数字变化本身还是一下跳过去的。价格、余额、计数这种值得被注意到的变化，可以让每一位像拨号盘一样滚到新值：变了多少、往哪个方向变，一眼就看得到。右边用的是{' '}
        <a href='https://number-flow.barvian.me/' target='_blank' rel='noopener noreferrer'>
          NumberFlow
        </a>
        ，一个很小的开源组件，系统开启减少动态效果时会自动不滚。
      </p>
    </section>
  )
}

export default function TabularDemo() {
  const [ms, setMs] = useState(56_800)
  const [paused, setPaused] = useState(false)

  // Respect reduced motion: start frozen; the reader can still press play.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true)
  }, [])

  useEffect(() => {
    if (paused) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      setMs((v) => v + (now - last))
      last = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused])

  return (
    <div className='tn-root'>
      <style>{`
        .tn-root {
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
          --tint-bad: rgba(184,64,44,0.16);
          --tint-good: rgba(31,111,74,0.16);
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .tn-root {
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
          --tint-bad: rgba(241,122,107,0.22);
          --tint-good: rgba(74,222,128,0.2);
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .tn-root *, .tn-root *::before, .tn-root *::after { box-sizing: border-box; }

        .tn-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 16px;
        }
        .tn-hint { font-size: 13px; color: var(--muted); }
        .tn-state { font: 11px 'JetBrains Mono', monospace; color: var(--faint); }
        .tn-switch {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--ink-soft);
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          padding: 6px 12px 6px 6px;
          cursor: pointer;
          box-shadow: var(--shadow);
        }
        .tn-track-sw {
          width: 26px;
          height: 16px;
          border-radius: 999px;
          background: var(--faint);
          position: relative;
          transition: background 0.2s ease;
        }
        .tn-track-sw::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.2s ease;
        }
        .tn-switch[aria-pressed='true'] .tn-track-sw { background: var(--accent); }
        .tn-switch[aria-pressed='true'] .tn-track-sw::after { transform: translateX(10px); }
        .tn-switch:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .tn-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .tn-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .tn-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .tn-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .tn-tag--bad { color: var(--bad); }
        .tn-tag--good { color: var(--good); }
        .tn-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .tn-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        /* The only difference between the two columns. */
        .tn-frame[data-tabular='true'] .tn-big,
        .tn-frame[data-tabular='true'] .tn-num { font-variant-numeric: tabular-nums; }
        .tn-frame[data-tabular='false'] .tn-big,
        .tn-frame[data-tabular='false'] .tn-num { font-variant-numeric: proportional-nums; }

        .tn-sec { padding: 18px 20px; }
        .tn-sec + .tn-sec { border-top: 1px solid var(--rule); }

        .tn-clockwrap { position: relative; }
        .tn-clock {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        .tn-label { font-size: 12px; color: var(--muted); }
        .tn-big {
          font-size: 46px;
          font-weight: 500;
          line-height: 1.1;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
        .tn-edge {
          position: absolute;
          left: 0;
          top: 4px;
          height: 46px;
          width: 0;
          border-left: 1.5px dashed var(--accent);
          opacity: 0.7;
          pointer-events: none;
        }
        .tn-track {
          position: relative;
          height: 6px;
          margin-top: 8px;
          border-radius: 3px;
          background: var(--rule);
        }
        .tn-band {
          position: absolute;
          left: 0;
          top: 0;
          height: 6px;
          width: 2px;
          border-radius: 3px;
        }
        .tn-frame[data-tabular='false'] .tn-band { background: var(--bad); }
        .tn-frame[data-tabular='true'] .tn-band { background: var(--good); }
        .tn-jitter {
          margin: 8px 0 0;
          font-size: 12px;
          color: var(--muted);
          text-align: right;
        }
        .tn-jitter b { font: 600 12px 'JetBrains Mono', monospace; }
        .tn-frame[data-tabular='false'] .tn-jitter b { color: var(--bad); }
        .tn-frame[data-tabular='true'] .tn-jitter b { color: var(--good); }

        .tn-dl {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
        }
        .tn-file { color: var(--ink-soft); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tn-dl-num { white-space: nowrap; color: var(--ink); }
        .tn-bar-track {
          margin-top: 10px;
          height: 4px;
          border-radius: 2px;
          background: var(--rule);
          overflow: hidden;
        }
        .tn-bar-fill { display: block; height: 100%; background: var(--accent); }

        .tn-sec--bill { padding-top: 12px; padding-bottom: 12px; }
        .tn-table { position: relative; font-size: 16px; }
        .tn-tr {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 7px 0;
        }
        .tn-tr + .tn-tr { border-top: 1px solid var(--rule); }
        .tn-tr > span:first-child { color: var(--ink-soft); }
        .tn-th { font-size: 12px; }
        .tn-th > span, .tn-th > span:first-child { color: var(--muted); }
        .tn-total { font-weight: 600; }
        .tn-total > span:first-child { color: var(--ink); }
        .tn-num { white-space: nowrap; }
        .tn-dot { color: var(--accent); font-weight: 700; }
        .tn-guide {
          position: absolute;
          bottom: 0;
          width: 0;
          border-left: 1.5px dashed var(--accent);
          opacity: 0.7;
          pointer-events: none;
        }

        .tn-roll { max-width: 960px; margin: 36px auto 0; }
        .tn-roll-head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; margin-bottom: 10px; }
        .tn-roll-btn {
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--ink);
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          padding: 8px 14px;
          cursor: pointer;
          box-shadow: var(--shadow);
          transition: transform 0.15s ease;
        }
        .tn-roll-btn:active { transform: scale(0.97); }
        .tn-roll-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        .tn-roll-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        @media (max-width: 768px) {
          .tn-roll-grid { grid-template-columns: 1fr; }
        }
        .tn-roll-card { display: flex; flex-direction: column; gap: 8px; padding: 18px 20px 20px; }
        .tn-roll-label { font-size: 12px; color: var(--muted); }
        .tn-roll-value {
          font-size: 40px;
          font-weight: 500;
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: var(--ink);
        }
        .tn-tab { font-variant-numeric: tabular-nums; }
        .tn-roll .tn-caption { margin-top: 10px; }
        .tn-roll .tn-caption a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }

        .tn-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .tn-takeaways { grid-template-columns: 1fr; max-width: 480px; }
          .tn-big { font-size: 40px; }
          .tn-edge { height: 40px; }
        }
        .tn-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .tn-numlabel {
          font: 11px 'JetBrains Mono', monospace;
          color: var(--faint);
          display: block;
          margin-bottom: 6px;
        }

        @media (prefers-reduced-motion: reduce) {
          .tn-root *, .tn-root *::before, .tn-root *::after { transition: none !important; }
        }
      `}</style>

      <div className='tn-bar'>
        <span className='tn-hint'>盯住秒表数字的左边缘，再看账单的小数点。</span>
        <button
          type='button'
          className='tn-switch'
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          <span className='tn-track-sw' aria-hidden='true' />
          暂停
        </button>
        <span className='tn-state' aria-live='polite'>
          {paused ? '已暂停' : '计时中'}
        </span>
      </div>

      <div className='tn-compare'>
        <Column
          tabular={false}
          ms={ms}
          tag='✕ 字体默认的比例数字'
          caption='“1”比“0”窄一大截。数字每跳一下，整串的宽度就变一次，右对齐的左边缘跟着来回晃；账单里的小数点也偏离了虚线。'
        />
        <Column
          tabular
          ms={ms}
          tag='✓ 等宽数字'
          caption='同一个字体，只是让每个数字占一样宽。秒表只有数字在变，位置纹丝不动；账单的小数点和千分位自然排成一条竖线。'
        />
      </div>

      <Rolling />

      <div className='tn-takeaways'>
        <div className='tn-takeaway'>
          <span className='tn-numlabel'>01</span>
          多数字体默认用比例数字，“1”窄、“0”宽，放在句子里更匀称。可一旦数字会跳，宽度就跟着跳。
        </div>
        <div className='tn-takeaway'>
          <span className='tn-numlabel'>02</span>
          会变的数字（计时、进度、价格、计数）和要上下比较的数字（表格、账单、排行），都改用等宽数字。
        </div>
        <div className='tn-takeaway'>
          <span className='tn-numlabel'>03</span>
          通常不用换字体：大多数现代字体同时带着两套数字，打开一个开关就行。左右两栏用的就是同一个字体。
        </div>
      </div>
    </div>
  )
}
