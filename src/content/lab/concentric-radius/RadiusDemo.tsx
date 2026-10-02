/**
 * RadiusDemo.tsx
 *
 * 观点：一个圆角元素套在另一个圆角元素里，内层圆角应该等于“外层圆角 − 两者之间的间距”，
 * 这样两条弧共用同一个圆心，拐角处的缝隙和直边一样宽。内外用同一个圆角值，
 * 内层会显得更圆，拐角处的缝隙被撑粗，看上去像被捏了一下。
 *
 * 两个面板并排，共用顶部的“间距”和“外圆角”两个滑杆：
 * - 左：内层圆角 = 外层圆角。
 * - 右：内层圆角 = max(0, 外层圆角 − 间距)。
 * “显示圆心”会在四个角画出外弧、内弧所在的圆和各自的圆心。
 */
import { useState } from 'react'

type Corner = { x: '0' | '100%'; y: '0' | '100%'; sx: 1 | -1; sy: 1 | -1 }
const CORNERS: Corner[] = [
  { x: '0', y: '0', sx: 1, sy: 1 },
  { x: '100%', y: '0', sx: -1, sy: 1 },
  { x: '0', y: '100%', sx: 1, sy: -1 },
  { x: '100%', y: '100%', sx: -1, sy: -1 }
]

/**
 * One SVG over the whole panel; each corner is a nested <svg> anchored at that
 * corner, with coordinates mirrored so the same offsets work for all four.
 */
function Guides({ outer, pad, inner }: { outer: number; pad: number; inner: number }) {
  const concentric = pad + inner === outer
  const ic = pad + inner
  return (
    <svg className='cr-guides' aria-hidden='true'>
      {CORNERS.map((c) => (
        <svg key={`${c.x}${c.y}`} x={c.x} y={c.y} overflow='visible'>
          <circle className='cr-ring' cx={c.sx * outer} cy={c.sy * outer} r={outer - 0.75} />
          {inner > 0 && (
            <circle
              className='cr-ring cr-ring--inner'
              cx={c.sx * ic}
              cy={c.sy * ic}
              r={inner - 0.75}
            />
          )}
          <circle className='cr-center' cx={c.sx * outer} cy={c.sy * outer} r={3} />
          {!concentric && inner > 0 && (
            <circle className='cr-center cr-center--inner' cx={c.sx * ic} cy={c.sy * ic} r={3} />
          )}
        </svg>
      ))}
    </svg>
  )
}

function Panel({
  tone,
  tag,
  outer,
  pad,
  inner,
  guides,
  caption
}: {
  tone: 'bad' | 'good'
  tag: string
  outer: number
  pad: number
  inner: number
  guides: boolean
  caption: string
}) {
  return (
    <div className='cr-col'>
      <span className={`cr-tag cr-tag--${tone}`}>{tag}</span>
      <div className='cr-frame'>
        <div className='cr-stage'>
          <div className='cr-shell'>
            <div className='cr-panel' style={{ borderRadius: outer, padding: pad }}>
              <div className='cr-photo' style={{ borderRadius: inner }}>
                <span className='cr-title'>周末徒步</span>
                <span className='cr-sub'>3 张照片</span>
              </div>
            </div>
            {guides && <Guides outer={outer} pad={pad} inner={inner} />}
          </div>
        </div>
        <div className='cr-readout' aria-live='polite'>
          外圆角 {outer} · 间距 {pad} · 内圆角 <b className={`cr-val cr-val--${tone}`}>{inner}</b>
        </div>
      </div>
      <p className='cr-caption'>{caption}</p>
    </div>
  )
}

export default function RadiusDemo() {
  const [outer, setOuter] = useState(32)
  const [pad, setPad] = useState(16)
  const [guides, setGuides] = useState(false)
  const good = Math.max(0, outer - pad)

  return (
    <div className='cr-root'>
      <style>{`
        .cr-root {
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
          --panel: #D9E0D6;
          --sky-a: #A9C9D8;
          --sky-b: #E9D3B4;
          --hill-a: #5E8C6A;
          --hill-b: #3F6B50;
          --sun: #F6E7C8;
          --ring-outer: #3B6E8C;
          --ring-inner: #C7861A;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .cr-root {
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
          --panel: #323844;
          --sky-a: #3E5B70;
          --sky-b: #8A6E57;
          --hill-a: #3C6149;
          --hill-b: #263F30;
          --sun: #E9D3A8;
          --ring-outer: #86AEC6;
          --ring-inner: #F2B544;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .cr-root *, .cr-root *::before, .cr-root *::after { box-sizing: border-box; }
        .cr-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .cr-bar {
          max-width: 880px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px 16px;
        }
        .cr-hint { font-size: 13px; color: var(--muted); flex-basis: 100%; }
        .cr-range {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--ink-soft);
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          padding: 6px 14px;
          box-shadow: var(--shadow);
        }
        .cr-range input {
          width: 120px;
          margin: 0;
          accent-color: var(--accent);
          cursor: pointer;
        }
        .cr-range output { min-width: 3.5ch; text-align: right; color: var(--muted); }
        .cr-switch {
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
        .cr-track {
          width: 26px;
          height: 16px;
          border-radius: 999px;
          background: var(--faint);
          position: relative;
          transition: background 0.2s ease;
        }
        .cr-track::after {
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
        .cr-switch[aria-pressed='true'] .cr-track { background: var(--accent); }
        .cr-switch[aria-pressed='true'] .cr-track::after { transform: translateX(10px); }

        .cr-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 880px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .cr-compare { grid-template-columns: 1fr; max-width: 420px; }
        }
        .cr-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .cr-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .cr-tag--bad { color: var(--bad); }
        .cr-tag--good { color: var(--good); }

        .cr-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .cr-stage {
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .cr-shell {
          position: relative;
          width: 100%;
          max-width: 320px;
        }
        .cr-panel {
          height: 220px;
          background: var(--panel);
        }
        .cr-photo {
          position: relative;
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 14px 16px;
          background: linear-gradient(180deg, var(--sky-a), var(--sky-b));
          color: #fff;
        }
        .cr-photo::before {
          content: '';
          position: absolute;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--sun);
          top: 22%;
          right: 22%;
          opacity: 0.9;
        }
        .cr-photo::after {
          content: '';
          position: absolute;
          left: -20%;
          right: -20%;
          bottom: -55%;
          height: 100%;
          border-radius: 50% 50% 0 0;
          background: linear-gradient(180deg, var(--hill-a), var(--hill-b));
        }
        .cr-title, .cr-sub { position: relative; z-index: 1; }
        .cr-title { font-size: 15px; font-weight: 600; }
        .cr-sub { font-size: 12px; opacity: 0.85; margin-top: 2px; }

        .cr-guides {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
          pointer-events: none;
        }
        .cr-ring {
          fill: none;
          stroke: var(--ring-outer);
          stroke-width: 1.25;
        }
        .cr-ring--inner { stroke: var(--ring-inner); }
        .cr-center {
          fill: var(--ring-outer);
          stroke: var(--card);
          stroke-width: 2;
          paint-order: stroke;
        }
        .cr-center--inner { fill: var(--ring-inner); }

        .cr-readout {
          padding: 10px 14px;
          border-top: 1px solid var(--rule);
          font: 12px/1.5 'JetBrains Mono', monospace;
          color: var(--muted);
        }
        .cr-val { font-weight: 600; }
        .cr-val--bad { color: var(--bad); }
        .cr-val--good { color: var(--good); }

        .cr-caption {
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--muted);
          margin: 2px 2px 0;
        }
        .cr-legends {
          max-width: 880px;
          margin: 14px auto 0;
          display: flex;
          flex-wrap: wrap;
          gap: 6px 16px;
          font-size: 12.5px;
          color: var(--muted);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .cr-legends[data-on='true'] { opacity: 1; }
        .cr-legend {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .cr-legend i {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid var(--ring-outer);
        }
        .cr-legend--inner i { border-color: var(--ring-inner); }

        .cr-takeaways {
          max-width: 880px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .cr-takeaways { grid-template-columns: 1fr; max-width: 420px; }
        }
        .cr-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .cr-num {
          font: 11px 'JetBrains Mono', monospace;
          color: var(--faint);
          display: block;
          margin-bottom: 6px;
        }

        @media (prefers-reduced-motion: reduce) {
          .cr-track, .cr-track::after, .cr-legends { transition: none !important; }
        }
      `}</style>

      <div className='cr-bar'>
        <span className='cr-hint'>
          拖动“间距”，看两边拐角处的缝隙怎么变；打开“显示圆心”，看两条弧是不是绕着同一个点。
        </span>
        <label className='cr-range'>
          间距
          <input
            type='range'
            min={0}
            max={40}
            value={pad}
            onChange={(e) => setPad(Number(e.target.value))}
            aria-valuetext={`${pad} 像素`}
          />
          <output>{pad}px</output>
        </label>
        <label className='cr-range'>
          外圆角
          <input
            type='range'
            min={8}
            max={48}
            value={outer}
            onChange={(e) => setOuter(Number(e.target.value))}
            aria-valuetext={`${outer} 像素`}
          />
          <output>{outer}px</output>
        </label>
        <button
          type='button'
          className='cr-switch'
          aria-pressed={guides}
          onClick={() => setGuides((g) => !g)}
        >
          <span className='cr-track' aria-hidden='true' />
          显示圆心
        </button>
      </div>

      <div className='cr-compare'>
        <Panel
          tone='bad'
          tag='✕ 内外同一个圆角'
          outer={outer}
          pad={pad}
          inner={outer}
          guides={guides}
          caption='内层照抄外层的圆角。直边上的缝隙是均匀的，一到拐角就突然变粗，内层看起来比外层更圆，像四个角被往里捏了一下。'
        />
        <Panel
          tone='good'
          tag='✓ 内圆角 = 外圆角 − 间距'
          outer={outer}
          pad={pad}
          inner={good}
          guides={guides}
          caption='两条弧绕着同一个圆心转，缝隙从直边到拐角一样宽。间距调大，内圆角自动变小；间距超过外圆角时，内层就是直角。'
        />
      </div>

      <div className='cr-legends' data-on={guides} aria-hidden={!guides}>
        <span className='cr-legend'>
          <i aria-hidden='true' />
          外层圆角所在的圆
        </span>
        <span className='cr-legend cr-legend--inner'>
          <i aria-hidden='true' />
          内层圆角所在的圆
        </span>
        <span>两个圆心重合，就是同心。</span>
      </div>

      <div className='cr-takeaways'>
        <div className='cr-takeaway'>
          <span className='cr-num'>01</span>
          内层圆角 = 外层圆角 − 两者之间的间距。这样两条弧共用一个圆心，缝隙在拐角处和直边上一样宽。
        </div>
        <div className='cr-takeaway'>
          <span className='cr-num'>02</span>
          同一个圆角值，放在小一圈的元素上会显得更圆。内外照抄，拐角处的缝隙就会被撑粗。
        </div>
        <div className='cr-takeaway'>
          <span className='cr-num'>03</span>
          记住的是关系，不是某个数字。间距一改，内圆角跟着算；间距比外圆角还大，内层就用直角。
        </div>
      </div>
    </div>
  )
}
