/**
 * HitAreaDemo.tsx
 *
 * 观点：能点的范围应该比看起来大。小控件（复选框、关闭叉号、图标按钮）的可点区域
 * 不必跟着图形一样小；复选框旁边的文字也应该能勾选。
 *
 * 两栏是同一个“通知设置”面板，长得一模一样：
 * - ✕：只有 14px 的小方块和 14px 的叉号能点，文字点了没反应。
 * - ✓：整行都能勾选，叉号四周 44×44 都算点中，图形大小没变。
 * 每次按下都会判定“点中 / 点空”，并在落点留一个小圈；“显示可点区域”把真实的
 * 可点范围染色画出来。减少动态效果时，落点圈不做动画。
 */
import { useEffect, useRef, useState } from 'react'

const SETTINGS: { id: string; title: string; desc: string; on: boolean }[] = [
  { id: 'comment', title: '新评论', desc: '有人回复你的文章时提醒', on: true },
  { id: 'follow', title: '新的关注者', desc: '有人订阅了你的更新', on: false },
  { id: 'digest', title: '每周摘要', desc: '每周一早上汇总一封邮件', on: true },
  { id: 'product', title: '产品更新', desc: '有新功能上线时通知你', on: false }
]

type Mark = { id: number; x: number; y: number; hit: boolean }

function Check() {
  return (
    <svg viewBox='0 0 14 14' aria-hidden='true'>
      <path d='m3.5 7.2 2.3 2.3 4.7-5' />
    </svg>
  )
}

function Panel({ good }: { good: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SETTINGS.map((s) => [s.id, s.on]))
  )
  const [bannerOpen, setBannerOpen] = useState(true)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [marks, setMarks] = useState<Mark[]>([])
  const nextId = useRef(0)

  // Judge every press: on a real target = hit; inside a row / next to the close
  // button but not on a target = miss. Presses elsewhere are ignored.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element
      const hit = !!el.closest('[data-hit]')
      if (!hit && !el.closest('[data-aim]')) return
      if (hit) setHits((n) => n + 1)
      else setMisses((n) => n + 1)
      const r = frame.getBoundingClientRect()
      const id = nextId.current++
      setMarks((m) => [...m, { id, x: e.clientX - r.left, y: e.clientY - r.top, hit }])
      window.setTimeout(() => setMarks((m) => m.filter((k) => k.id !== id)), 900)
    }
    frame.addEventListener('pointerdown', onDown)
    return () => frame.removeEventListener('pointerdown', onDown)
  }, [])

  useEffect(() => {
    if (bannerOpen) return
    const t = window.setTimeout(() => setBannerOpen(true), 1600)
    return () => window.clearTimeout(t)
  }, [bannerOpen])

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }))

  return (
    <div className='ga-frame' data-good={good} ref={frameRef}>
      <div className='ga-banner'>
        {bannerOpen ? (
          <>
            <span className='ga-banner-text'>
              <b>新功能</b> 每周摘要可以按标签筛选了
            </span>
            <span className='ga-x-zone' data-aim>
              <button
                type='button'
                className='ga-x'
                data-hit
                aria-label='关闭提示'
                onClick={() => setBannerOpen(false)}
              >
                <svg viewBox='0 0 10 10' aria-hidden='true'>
                  <path d='M1.5 1.5l7 7M8.5 1.5l-7 7' />
                </svg>
              </button>
            </span>
          </>
        ) : (
          <span className='ga-banner-text ga-banner-closed' role='status'>
            提示已关闭，稍后自动恢复
          </span>
        )}
      </div>

      <div className='ga-head'>通知设置</div>
      <ul className='ga-list'>
        {SETTINGS.map((s) => (
          <li key={s.id}>
            {good ? (
              <label className='ga-row ga-row--hit' data-hit>
                <span className='ga-boxwrap'>
                  <input
                    type='checkbox'
                    className='ga-input'
                    checked={checked[s.id]}
                    onChange={() => toggle(s.id)}
                  />
                  <span className='ga-box'>
                    <Check />
                  </span>
                </span>
                <span className='ga-text'>
                  <span className='ga-title'>{s.title}</span>
                  <span className='ga-desc'>{s.desc}</span>
                </span>
              </label>
            ) : (
              <div className='ga-row' data-aim>
                <span className='ga-boxwrap' data-hit>
                  <input
                    type='checkbox'
                    className='ga-input'
                    aria-label={s.title}
                    checked={checked[s.id]}
                    onChange={() => toggle(s.id)}
                  />
                  <span className='ga-box'>
                    <Check />
                  </span>
                </span>
                <span className='ga-text'>
                  <span className='ga-title'>{s.title}</span>
                  <span className='ga-desc'>{s.desc}</span>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className='ga-foot'>
        <span className='ga-score' aria-live='polite'>
          点中 <b className='ga-hits'>{hits}</b> 次 · 点空了{' '}
          <b className='ga-misses' data-zero={misses === 0}>
            {misses}
          </b>{' '}
          次
        </span>
        <span className='ga-legend'>
          {good ? '可点：整行 · 叉号 44×44' : '可点：方块 14×14 · 叉号 14×14'}
        </span>
      </div>

      {marks.map((m) => (
        <span
          key={m.id}
          className='ga-mark'
          data-ok={m.hit}
          style={{ left: m.x, top: m.y }}
          aria-hidden='true'
        />
      ))}
    </div>
  )
}

export default function HitAreaDemo() {
  const [show, setShow] = useState(false)
  const [round, setRound] = useState(0)

  return (
    <div className='ga-root' data-show={show}>
      <style>{`
        .ga-root {
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
          --row-hover: rgba(23,27,26,0.035);
          --banner: #EEF3F6;
          --hit-fill: rgba(59,110,140,0.16);
          --hit-line: rgba(59,110,140,0.75);
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .ga-root {
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
          --row-hover: rgba(255,255,255,0.04);
          --banner: #232A31;
          --hit-fill: rgba(134,174,198,0.2);
          --hit-line: rgba(134,174,198,0.85);
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .ga-root *, .ga-root *::before, .ga-root *::after { box-sizing: border-box; }

        .ga-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 14px;
        }
        .ga-hint { font-size: 13px; color: var(--muted); }
        .ga-switch, .ga-reset {
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
        .ga-reset { padding: 7px 12px; color: var(--muted); }
        .ga-track {
          width: 26px;
          height: 16px;
          border-radius: 999px;
          background: var(--faint);
          position: relative;
          transition: background 0.2s ease;
        }
        .ga-track::after {
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
        .ga-switch[aria-pressed='true'] .ga-track { background: var(--accent); }
        .ga-switch[aria-pressed='true'] .ga-track::after { transform: translateX(10px); }
        .ga-root button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .ga-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .ga-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .ga-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .ga-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .ga-tag--bad { color: var(--bad); }
        .ga-tag--good { color: var(--good); }
        .ga-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .ga-frame {
          position: relative;
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Banner with a tiny close button. */
        .ga-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 52px;
          padding: 0 0 0 16px;
          background: var(--banner);
          font-size: 13px;
          color: var(--ink-soft);
        }
        .ga-banner-text { flex: 1; min-width: 0; padding: 10px 0; line-height: 1.5; }
        .ga-banner-text b { font-weight: 600; color: var(--accent); margin-right: 4px; }
        .ga-banner-closed { color: var(--muted); }
        .ga-x-zone {
          flex: none;
          align-self: stretch;
          width: 60px;
          display: grid;
          place-items: center;
        }
        .ga-x {
          position: relative;
          width: 14px;
          height: 14px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          display: grid;
          place-items: center;
          border-radius: 3px;
        }
        .ga-x svg {
          width: 10px;
          height: 10px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.6;
          stroke-linecap: round;
        }
        /* ✓: same 14px glyph, but a 44×44 invisible hit area centred on it. */
        .ga-frame[data-good='true'] .ga-x::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          width: 44px;
          height: 44px;
          margin: -22px 0 0 -22px;
          border-radius: 10px;
        }
        @media (hover: hover) and (pointer: fine) {
          .ga-x:hover { color: var(--ink); }
          .ga-frame[data-good='true'] .ga-row--hit:hover { background: var(--row-hover); }
        }

        .ga-head {
          padding: 16px 16px 6px;
          font-size: 12px;
          color: var(--muted);
        }
        .ga-list { list-style: none; margin: 0; padding: 0 0 6px; }
        .ga-list li + li .ga-row { border-top: 1px solid var(--rule); }
        .ga-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
        }
        .ga-row--hit { cursor: pointer; }
        .ga-boxwrap {
          position: relative;
          flex: none;
          width: 14px;
          height: 14px;
          margin-top: 3px;
        }
        .ga-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          opacity: 0;
          cursor: pointer;
          z-index: 1;
        }
        .ga-box {
          position: absolute;
          inset: 0;
          border: 1.5px solid var(--faint);
          border-radius: 3.5px;
          background: var(--card);
          display: grid;
          place-items: center;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .ga-box svg {
          width: 12px;
          height: 12px;
          fill: none;
          stroke: #fff;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0;
        }
        .dark .ga-box svg { stroke: #15171B; }
        .ga-input:checked + .ga-box { background: var(--accent); border-color: var(--accent); }
        .ga-input:checked + .ga-box svg { opacity: 1; }
        .ga-input:focus-visible + .ga-box { outline: 2px solid var(--accent); outline-offset: 3px; }
        .ga-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .ga-title { font-size: 14px; color: var(--ink); }
        .ga-desc { font-size: 12px; color: var(--muted); }

        .ga-foot {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 4px 12px;
          padding: 10px 16px;
          border-top: 1px solid var(--rule);
          font-size: 12px;
          color: var(--muted);
        }
        .ga-score b { font: 600 12px 'JetBrains Mono', monospace; color: var(--ink); }
        .ga-score .ga-misses { color: var(--bad); }
        .ga-score .ga-misses[data-zero='true'] { color: var(--ink); }
        .ga-legend { font: 11px/1.6 'JetBrains Mono', monospace; color: var(--faint); visibility: hidden; }
        .ga-root[data-show='true'] .ga-legend { visibility: visible; color: var(--accent); }

        /* "显示可点区域": paint the real hit areas. */
        .ga-root[data-show='true'] .ga-frame[data-good='false'] .ga-boxwrap,
        .ga-root[data-show='true'] .ga-frame[data-good='false'] .ga-x,
        .ga-root[data-show='true'] .ga-frame[data-good='true'] .ga-x::before,
        .ga-root[data-show='true'] .ga-frame[data-good='true'] .ga-row--hit {
          background-color: var(--hit-fill);
          outline: 1.5px dashed var(--hit-line);
          outline-offset: -1.5px;
        }
        .ga-root[data-show='true'] .ga-frame[data-good='false'] .ga-boxwrap,
        .ga-root[data-show='true'] .ga-frame[data-good='false'] .ga-x {
          outline-offset: 1px;
        }

        /* Where each press landed: green ring = hit, red ring = miss. */
        .ga-mark {
          position: absolute;
          width: 22px;
          height: 22px;
          margin: -11px 0 0 -11px;
          border-radius: 50%;
          border: 2px solid var(--good);
          pointer-events: none;
          animation: ga-pop 0.9s ease-out forwards;
        }
        .ga-mark[data-ok='false'] { border-color: var(--bad); }
        @keyframes ga-pop {
          from { transform: scale(0.4); opacity: 1; }
          60% { opacity: 1; }
          to { transform: scale(1.3); opacity: 0; }
        }

        .ga-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .ga-takeaways { grid-template-columns: 1fr; max-width: 480px; }
        }
        .ga-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .ga-num {
          font: 11px 'JetBrains Mono', monospace;
          color: var(--faint);
          display: block;
          margin-bottom: 6px;
        }

        @media (prefers-reduced-motion: reduce) {
          .ga-mark { animation: none; }
          .ga-root *, .ga-root *::before, .ga-root *::after { transition: none !important; }
        }
      `}</style>

      <div className='ga-bar'>
        <span className='ga-hint'>两边各点几下：点文字勾选设置，或者关掉顶部的提示。</span>
        <button
          type='button'
          className='ga-switch'
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
        >
          <span className='ga-track' aria-hidden='true' />
          显示可点区域
        </button>
        <button type='button' className='ga-reset' onClick={() => setRound((r) => r + 1)}>
          重来
        </button>
      </div>

      <div className='ga-compare'>
        <div className='ga-col'>
          <span className='ga-tag ga-tag--bad'>✕ 只有图形能点</span>
          <Panel good={false} key={`bad-${round}`} />
          <p className='ga-caption'>
            只有 14px
            的小方块和小叉号有反应。试着点“新评论”这几个字，或者稍微偏一点点叉号，看“点空了”涨得有多快。
          </p>
        </div>
        <div className='ga-col'>
          <span className='ga-tag ga-tag--good'>✓ 可点范围比图形大</span>
          <Panel good key={`good-${round}`} />
          <p className='ga-caption'>
            方块和叉号的大小一点没变，但整行文字都能勾选，叉号四周 44×44
            都算点中。打开“显示可点区域”，看看两边真实的范围差多少。
          </p>
        </div>
      </div>

      <div className='ga-takeaways'>
        <div className='ga-takeaway'>
          <span className='ga-num'>01</span>
          点中一个目标要花多久，取决于它离得多远、有多大（Fitts
          定律）。图形可以画得小，能点的范围不必跟着小。
        </div>
        <div className='ga-takeaway'>
          <span className='ga-num'>02</span>
          复选框和它旁边的文字是同一件事。让文字也能勾选，可点范围就从一个小方块变成了一整行。
        </div>
        <div className='ga-takeaway'>
          <span className='ga-num'>03</span>
          尺寸有现成的下限：WCAG 2.2 要求至少 24×24 CSS 像素，更严格的 AAA 级是 44×44；Apple 在 iOS
          上的默认控件尺寸是 44×44 pt。
        </div>
      </div>
    </div>
  )
}
