/**
 * RotationDemo.tsx
 *
 * 观点：元素本身用 transform: rotate() 歪着放，入场动画也动 transform，
 * 动画终点又用 forwards 保留着——动画结束后，倾斜和 hover 效果都被动画层压住了。
 * - 左：transform: rotate(var(--rot)) + 关键帧终点 transform: none + forwards。
 *   落地后便利贴全被摆正，hover 也抬不起来。
 * - 右：倾斜改用独立的 rotate 属性，入场只动 translate / opacity，fill-mode 用
 *   backwards（配合错开的 delay）。动画碰不到 rotate，结束后也不再占着属性。
 *
 * 每块板子下方会在动画结束后读一次 getComputedStyle，显示第一张便利贴的实际角度。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'

const NOTES = [
  { text: '改 OG 图', rot: -6, tone: 'a' },
  { text: '写一条 lab', rot: 4, tone: 'b' },
  { text: '周五发 Preview', rot: -3, tone: 'c' }
]

function angleOf(el: HTMLElement) {
  const style = getComputedStyle(el)
  let deg = 0
  if (style.transform && style.transform !== 'none') {
    const m = new DOMMatrix(style.transform)
    deg += (Math.atan2(m.b, m.a) * 180) / Math.PI
  }
  const rotate = parseFloat(style.rotate)
  if (!Number.isNaN(rotate)) deg += rotate
  return Math.round(deg)
}

function Board({ fixed, run }: { fixed: boolean; run: number }) {
  const first = useRef<HTMLButtonElement>(null)
  const [angle, setAngle] = useState<number | null>(null)
  const [picked, setPicked] = useState('')

  useEffect(() => {
    setAngle(null)
    // Measure once every note has landed (3 notes × 90ms stagger + 700ms).
    const t = setTimeout(() => {
      if (first.current) setAngle(angleOf(first.current))
    }, 1100)
    return () => clearTimeout(t)
  }, [run])

  return (
    <div className='ar-frame'>
      <div className={`ar-board ${fixed ? 'ar-fixed' : 'ar-broken'}`} key={run}>
        {NOTES.map((note, i) => (
          <button
            type='button'
            ref={i === 0 ? first : undefined}
            key={note.text}
            className='ar-note'
            data-tone={note.tone}
            style={{ '--rot': `${note.rot}deg`, '--i': i } as CSSProperties}
            onClick={() => setPicked(note.text)}
            aria-label={`${note.text}（设定倾斜 ${note.rot}°）`}
          >
            <span className='ar-pin' aria-hidden='true' />
            {note.text}
            <small>{note.rot}°</small>
          </button>
        ))}
      </div>
      <pre className='ar-code' aria-hidden='true'>
        {fixed ? (
          <>
            <b>rotate</b>: var(--rot);{'\n'}animation: drop .7s <b>backwards</b>;{'\n'}
            <i>
              @keyframes drop {'{'} from {'{'} translate: 0 24px {'}'} {'}'}
            </i>
          </>
        ) : (
          <>
            transform: rotate(var(--rot));{'\n'}animation: drop .7s <b>forwards</b>;{'\n'}
            <i>
              @keyframes drop {'{'} to {'{'} transform: none {'}'} {'}'}
            </i>
          </>
        )}
      </pre>
      <div className='ar-meter' aria-live='polite'>
        <span>第一张落地后的实际角度</span>
        <b data-ok={angle === NOTES[0]!.rot}>{angle === null ? '…' : `${angle}°`}</b>
        <span className='ar-picked'>{picked && `已点：${picked}`}</span>
      </div>
    </div>
  )
}

export default function RotationDemo() {
  const [run, setRun] = useState(0)

  return (
    <div className='ar-root'>
      <style>{`
        .ar-root {
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
          --board: #E6DCCB;
          --board-dot: rgba(120,92,60,0.12);
          --note-a: #FCE9A6;
          --note-b: #F9D2C9;
          --note-c: #CFE6DC;
          --note-ink: #2A2A26;
          --pin: #B8402C;
          --code-bg: #F6F7F4;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);
          --note-shadow: 0 1px 1px rgba(60,40,20,0.12), 0 6px 14px rgba(60,40,20,0.14);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .ar-root {
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
          --board: #2A2620;
          --board-dot: rgba(255,230,190,0.06);
          --note-a: #D9C67F;
          --note-b: #D6AEA4;
          --note-c: #A9C7B9;
          --note-ink: #1C1C19;
          --pin: #F17A6B;
          --code-bg: #191C21;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
          --note-shadow: 0 1px 1px rgba(0,0,0,0.4), 0 8px 18px rgba(0,0,0,0.45);
        }
        .ar-root *, .ar-root *::before, .ar-root *::after { box-sizing: border-box; }
        .ar-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .ar-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .ar-hint { font-size: 13px; color: var(--muted); }
        .ar-replay {
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
        .ar-replay:active { transform: scale(0.97); }

        .ar-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .ar-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .ar-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .ar-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .ar-tag--bad { color: var(--bad); }
        .ar-tag--good { color: var(--good); }
        .ar-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .ar-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .ar-board {
          display: flex;
          justify-content: center;
          gap: 14px;
          padding: 36px 16px 32px;
          background: var(--board);
          background-image: radial-gradient(circle, var(--board-dot) 1.2px, transparent 1.2px);
          background-size: 9px 9px;
        }
        .ar-note {
          position: relative;
          width: 30%;
          max-width: 118px;
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: left;
          padding: 18px 10px 8px;
          border: 0;
          border-radius: 2px;
          font: 600 13px/1.35 'Public Sans', sans-serif;
          color: var(--note-ink);
          box-shadow: var(--note-shadow);
          cursor: pointer;
        }
        .ar-note[data-tone='a'] { background: var(--note-a); }
        .ar-note[data-tone='b'] { background: var(--note-b); }
        .ar-note[data-tone='c'] { background: var(--note-c); }
        .ar-note small {
          font: 11px 'JetBrains Mono', monospace;
          opacity: 0.55;
        }
        .ar-pin {
          position: absolute;
          top: 6px;
          left: 50%;
          width: 8px;
          height: 8px;
          margin-left: -4px;
          border-radius: 50%;
          background: var(--pin);
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        /* ✕ rotation lives in transform; the animation holds transform: none forever. */
        .ar-broken .ar-note {
          transform: rotate(var(--rot));
          transition: transform 0.2s ease;
          animation: ar-drop-bad 0.7s ease-out forwards;
          animation-delay: calc(var(--i) * 90ms);
          opacity: 0;
        }
        @keyframes ar-drop-bad {
          from { opacity: 0; transform: translateY(24px) rotate(var(--rot)); }
          to { opacity: 1; transform: none; }
        }
        .ar-broken .ar-note:is(:hover, :focus-visible) {
          transform: translateY(-6px) rotate(var(--rot));
        }

        /* ✓ rotation lives in its own property; the animation only touches translate. */
        .ar-fixed .ar-note {
          rotate: var(--rot);
          transition: translate 0.2s ease, scale 0.2s ease;
          animation: ar-drop-good 0.7s ease-out backwards;
          animation-delay: calc(var(--i) * 90ms);
        }
        @keyframes ar-drop-good {
          from { opacity: 0; translate: 0 24px; }
        }
        .ar-fixed .ar-note:is(:hover, :focus-visible) {
          translate: 0 -6px;
          scale: 1.03;
        }

        .ar-code {
          margin: 0;
          padding: 12px 16px;
          background: var(--code-bg);
          border-top: 1px solid var(--rule);
          font: 12px/1.7 'JetBrains Mono', monospace;
          color: var(--ink-soft);
          white-space: pre-wrap;
        }
        .ar-code b { font-weight: 600; color: var(--accent); }
        .ar-code i { font-style: normal; color: var(--muted); }

        .ar-meter {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 4px 10px;
          padding: 10px 16px 12px;
          border-top: 1px solid var(--rule);
          font-size: 12px;
          color: var(--muted);
        }
        .ar-meter b { font: 600 13px 'JetBrains Mono', monospace; color: var(--bad); }
        .ar-meter b[data-ok='true'] { color: var(--good); }
        .ar-picked { margin-left: auto; color: var(--faint); }

        @media (prefers-reduced-motion: reduce) {
          .ar-root .ar-note { animation: none !important; transition: none !important; opacity: 1 !important; }
          .ar-replay { transition: none; }
          .ar-replay:active { transform: none; }
        }
      `}</style>

      <div className='ar-bar'>
        <button type='button' className='ar-replay' onClick={() => setRun((n) => n + 1)}>
          ↻ 重播入场
        </button>
        <span className='ar-hint'>等便利贴落定，再把鼠标放上去（或用 Tab 聚焦）。</span>
      </div>

      <div className='ar-compare'>
        <div className='ar-col'>
          <span className='ar-tag ar-tag--bad'>✕ 倾斜写在 transform 里 + forwards</span>
          <Board fixed={false} run={run} />
          <p className='ar-caption'>
            动画最后一帧是 transform: none，又被 forwards 一直保留。落地那一刻全被摆正，hover
            时的上浮也被动画层压着，怎么悬停都不动。
          </p>
        </div>
        <div className='ar-col'>
          <span className='ar-tag ar-tag--good'>✓ 倾斜用 rotate 属性 + backwards</span>
          <Board fixed run={run} />
          <p className='ar-caption'>
            倾斜交给独立的 rotate 属性，入场只动 translate，动画根本碰不到角度；backwards
            只在错开的延迟里先藏好，播完就把属性交还给 hover。
          </p>
        </div>
      </div>
    </div>
  )
}
