/**
 * OpticalDemo.tsx
 *
 * 观点：数值上居中、数值上一样大，不等于看起来居中、看起来一样大。
 * 三个小例子，每个都是左 ✕（按数值）右 ✓（按视觉）：
 * 1. 播放按钮：三角形的外框居中时看起来偏左；按重心往右挪 1/6 个宽度。
 * 2. 圆和方块：同为 60px 时圆显得小；圆放大 5%（63px），略微超出方块的上下边。
 * 3. 图标 + 文字按钮：左右内边距一样时图标那侧显得更宽；图标侧收窄。
 * “显示辅助线”画出外框、圆心、重心和内边距，让人看到右边在数值上其实“不准”。
 */
import { useState } from 'react'

const TRI_W = 30
const TRI_H = 34
const SIZE = 60
const CIRCLE_OPTICAL = 63

function Play({ optical }: { optical: boolean }) {
  return (
    <div className='oa-play'>
      <span className='oa-cross' aria-hidden='true' />
      <span
        className='oa-tri'
        style={{ transform: `translate(calc(-50% + ${optical ? TRI_W / 6 : 0}px), -50%)` }}
      >
        <svg viewBox={`0 0 ${TRI_W} ${TRI_H}`} width={TRI_W} height={TRI_H} aria-hidden='true'>
          <path d={`M0 0 L${TRI_W} ${TRI_H / 2} L0 ${TRI_H} Z`} />
        </svg>
        <span className='oa-centroid' aria-hidden='true' />
      </span>
    </div>
  )
}

function Shapes({ optical }: { optical: boolean }) {
  const c = optical ? CIRCLE_OPTICAL : SIZE
  return (
    <div className='oa-shapes'>
      <span className='oa-edge oa-edge--top' aria-hidden='true' />
      <span className='oa-edge oa-edge--bottom' aria-hidden='true' />
      <span className='oa-square' style={{ width: SIZE, height: SIZE }} />
      <span className='oa-circle' style={{ width: c, height: c }} />
      <span className='oa-size' aria-hidden='true'>
        <span style={{ width: SIZE }}>{SIZE}</span>
        <span style={{ width: c }}>{c}</span>
      </span>
    </div>
  )
}

function IconButton({ optical }: { optical: boolean }) {
  const left = optical ? 12 : 16
  return (
    <div className='oa-btnwrap'>
      <span className='oa-btn' style={{ paddingLeft: left, paddingRight: 16 }}>
        <span className='oa-pad oa-pad--l' style={{ width: left }} aria-hidden='true' />
        <span className='oa-pad oa-pad--r' style={{ width: 16 }} aria-hidden='true' />
        <span className='oa-ico'>
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M12 5v14M5 12h14' />
          </svg>
        </span>
        新建
      </span>
      <span className='oa-padnote' aria-hidden='true'>
        左 {left} · 右 16
      </span>
    </div>
  )
}

const EXAMPLES = [
  {
    id: 'play',
    title: '01 · 播放按钮',
    bad: '✕ 外框居中',
    good: '✓ 重心居中',
    render: (optical: boolean) => <Play optical={optical} />,
    caption:
      '左边三角形的外框正好在圆心，看起来却偏左：三角形的分量都压在竖边那一侧。右边往尖端挪了几像素，让重心（圆点）落在圆心（十字）上。'
  },
  {
    id: 'shapes',
    title: '02 · 圆和方块',
    bad: '✕ 同样 60px',
    good: '✓ 圆放大 5%',
    render: (optical: boolean) => <Shapes optical={optical} />,
    caption:
      '宽高一样时，圆少了四个角，看起来小一号。右边把圆放大到 63px，上下各探出方块边线一点点，两个形状才显得一样大。'
  },
  {
    id: 'button',
    title: '03 · 图标 + 文字按钮',
    bad: '✕ 左右都是 16',
    good: '✓ 图标侧收到 12',
    render: (optical: boolean) => <IconButton optical={optical} />,
    caption:
      '左右内边距相同，图标那侧却显得更空：图标的外框里本来就留着白。右边把图标侧收窄一些，两侧看起来才一样宽。'
  }
]

export default function OpticalDemo() {
  const [guides, setGuides] = useState(false)

  return (
    <div className='oa-root' data-guides={guides}>
      <style>{`
        .oa-root {
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
          --shape: #3B6E8C;
          --guide: #D9534F;
          --guide-fill: rgba(217,83,79,0.28);
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .oa-root {
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
          --shape: #86AEC6;
          --guide: #FF7A70;
          --guide-fill: rgba(255,122,112,0.32);
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .oa-root *, .oa-root *::before, .oa-root *::after { box-sizing: border-box; }
        .oa-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .oa-bar {
          max-width: 1080px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 16px;
        }
        .oa-hint { font-size: 13px; color: var(--muted); }
        .oa-switch {
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
        .oa-track {
          width: 26px;
          height: 16px;
          border-radius: 999px;
          background: var(--faint);
          position: relative;
          transition: background 0.2s ease;
        }
        .oa-track::after {
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
        .oa-switch[aria-pressed='true'] .oa-track { background: var(--accent); }
        .oa-switch[aria-pressed='true'] .oa-track::after { transform: translateX(10px); }

        .oa-compare {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1080px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .oa-compare { grid-template-columns: 1fr; max-width: 420px; }
        }
        .oa-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .oa-title {
          font: 500 12px/1.4 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
          color: var(--ink-soft);
        }
        .oa-frame {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .oa-half {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 8px 16px;
          min-width: 0;
        }
        .oa-half + .oa-half { border-left: 1px solid var(--rule); }
        .oa-tag {
          align-self: flex-start;
          font: 500 11px/1.4 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
          padding-left: 4px;
        }
        .oa-tag--bad { color: var(--bad); }
        .oa-tag--good { color: var(--good); }
        .oa-cell {
          height: 132px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .oa-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        /* Guides: hidden until the switch is on. */
        .oa-cross, .oa-centroid, .oa-edge, .oa-size, .oa-pad, .oa-padnote, .oa-legend {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .oa-root[data-guides='true'] :is(.oa-cross, .oa-centroid, .oa-edge, .oa-size, .oa-pad, .oa-padnote, .oa-legend) {
          opacity: 1;
        }

        /* 1. play button */
        .oa-play {
          position: relative;
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: var(--ink);
        }
        .oa-cross::before, .oa-cross::after {
          content: '';
          position: absolute;
          background: var(--guide);
        }
        .oa-cross { position: absolute; inset: 0; }
        .oa-cross::before { left: 50%; top: 14px; bottom: 14px; width: 1px; transform: translateX(-0.5px); }
        .oa-cross::after { top: 50%; left: 14px; right: 14px; height: 1px; transform: translateY(-0.5px); }
        .oa-tri {
          position: absolute;
          left: 50%;
          top: 50%;
          width: ${TRI_W}px;
          height: ${TRI_H}px;
          outline: 1px solid transparent;
          transition: outline-color 0.2s ease;
        }
        .oa-root[data-guides='true'] .oa-tri { outline-color: var(--guide); }
        .oa-tri svg { display: block; }
        .oa-tri path { fill: var(--card); }
        .oa-centroid {
          position: absolute;
          left: ${TRI_W / 3}px;
          top: 50%;
          width: 7px;
          height: 7px;
          margin: -3.5px 0 0 -3.5px;
          border-radius: 50%;
          background: var(--guide);
        }

        /* 2. circle vs square */
        .oa-shapes {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 18px;
        }
        .oa-square, .oa-circle { display: block; background: var(--shape); flex: none; }
        .oa-square { border-radius: 2px; }
        .oa-circle { border-radius: 50%; }
        .oa-edge {
          position: absolute;
          left: -10px;
          right: -10px;
          height: 0;
          border-top: 1px solid var(--guide);
        }
        .oa-edge--top { top: calc(50% - 9px - ${SIZE / 2}px); }
        .oa-edge--bottom { top: calc(50% - 9px + ${SIZE / 2}px); }
        .oa-size {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -2px;
          display: flex;
          gap: 12px;
          font: 10.5px/1 'JetBrains Mono', monospace;
          color: var(--guide);
        }
        .oa-size span { text-align: center; flex: none; }

        /* 3. icon + text button */
        .oa-btnwrap { display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 18px; }
        .oa-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 46px;
          border-radius: 12px;
          background: var(--ink);
          color: var(--card);
          font-size: 16px;
          font-weight: 600;
          white-space: nowrap;
        }
        .oa-pad {
          position: absolute;
          top: 0;
          bottom: 0;
          background: var(--guide-fill);
        }
        .oa-pad--l { left: 0; border-radius: 12px 0 0 12px; }
        .oa-pad--r { right: 0; border-radius: 0 12px 12px 0; }
        .oa-ico {
          display: block;
          width: 20px;
          height: 20px;
          outline: 1px solid transparent;
          transition: outline-color 0.2s ease;
        }
        .oa-root[data-guides='true'] .oa-ico { outline-color: var(--guide); }
        .oa-ico svg {
          display: block;
          width: 100%;
          height: 100%;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.2;
          stroke-linecap: round;
        }
        .oa-padnote { font: 10.5px/1 'JetBrains Mono', monospace; color: var(--guide); }

        .oa-legend {
          max-width: 1080px;
          margin: 16px auto 0;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--guide);
        }

        .oa-takeaways {
          max-width: 1080px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .oa-takeaways { grid-template-columns: 1fr; max-width: 420px; }
        }
        .oa-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .oa-num {
          font: 11px 'JetBrains Mono', monospace;
          color: var(--faint);
          display: block;
          margin-bottom: 6px;
        }

        @media (prefers-reduced-motion: reduce) {
          .oa-root *, .oa-root *::before, .oa-root *::after { transition: none !important; }
        }
      `}</style>

      <div className='oa-bar'>
        <span className='oa-hint'>
          先只用眼睛判断哪边更居中、更匀称，再打开辅助线，看看数值上谁才是“准”的。
        </span>
        <button
          type='button'
          className='oa-switch'
          aria-pressed={guides}
          onClick={() => setGuides((g) => !g)}
        >
          <span className='oa-track' aria-hidden='true' />
          显示辅助线
        </button>
      </div>

      <div className='oa-compare'>
        {EXAMPLES.map((ex) => (
          <div className='oa-col' key={ex.id}>
            <span className='oa-title'>{ex.title}</span>
            <div className='oa-frame'>
              <div className='oa-half'>
                <span className='oa-tag oa-tag--bad'>{ex.bad}</span>
                <div className='oa-cell'>{ex.render(false)}</div>
              </div>
              <div className='oa-half'>
                <span className='oa-tag oa-tag--good'>{ex.good}</span>
                <div className='oa-cell'>{ex.render(true)}</div>
              </div>
            </div>
            <p className='oa-caption'>{ex.caption}</p>
          </div>
        ))}
      </div>

      <p className='oa-legend' aria-hidden={!guides}>
        红线标的是数值：外框、圆心、重心、内边距。右边每一个在数值上都“不准”，看起来却更对。
      </p>

      <div className='oa-takeaways'>
        <div className='oa-takeaway'>
          <span className='oa-num'>01</span>
          眼睛找的是重心，不是外框的中心。三角形的分量偏向竖边，所以要往尖端那边挪一点。
        </div>
        <div className='oa-takeaway'>
          <span className='oa-num'>02</span>
          面积小的形状看起来更小。圆和方块同宽同高时，圆要放大一点、稍稍超出边线，才显得一样大。
        </div>
        <div className='oa-takeaway'>
          <span className='oa-num'>03</span>
          图标自带留白。图标 + 文字的按钮，图标那一侧的内边距收一点，两边才显得对称。
        </div>
      </div>
    </div>
  )
}
