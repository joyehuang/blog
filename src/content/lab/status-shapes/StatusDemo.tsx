/**
 * StatusDemo.tsx
 *
 * 观点：状态如果只靠颜色区分（绿点 = 完成、红点 = 失败），色弱用户、灰度屏幕、
 * 小尺寸下就读不出来。给每种状态一个独立的轮廓（进度弧、气泡、对勾圆、警告三角），
 * 颜色只做加强。
 * - 左：同一份任务列表，只用彩色圆点。
 * - 右：形状 + 颜色。
 * 顶部可以切换“红绿色弱模拟”（SVG feColorMatrix，Machado 2009 的 deuteranopia 矩阵）
 * 和“灰度”，以及把图标缩小。运行中的弧会转，减少动态效果时停住。
 */
import { useState } from 'react'

type Status = 'running' | 'waiting' | 'done' | 'failed'
type Vision = 'normal' | 'deutan' | 'gray'

const STATUS_LABEL: Record<Status, string> = {
  running: '运行中',
  waiting: '等你确认',
  done: '完成',
  failed: '失败'
}

const TASKS: { name: string; status: Status; meta: string }[] = [
  { name: '抓取 Search Console 数据', status: 'done', meta: '2 分钟前' },
  { name: '生成 OG 图片', status: 'running', meta: '进行中' },
  { name: '部署 Preview', status: 'failed', meta: '1 分钟前' },
  { name: '合并 PR', status: 'waiting', meta: '等待审核' },
  { name: '压缩封面图', status: 'done', meta: '5 分钟前' },
  { name: '检查死链', status: 'failed', meta: '刚刚' }
]

const VISIONS: { id: Vision; label: string }[] = [
  { id: 'normal', label: '正常' },
  { id: 'deutan', label: '红绿色弱模拟' },
  { id: 'gray', label: '灰度' }
]

const ORDER: Status[] = ['running', 'waiting', 'done', 'failed']

function Dot({ status }: { status: Status }) {
  return <span className='ss-dot' data-s={status} aria-hidden='true' />
}

function Shape({ status }: { status: Status }) {
  return (
    <svg className='ss-shape' data-s={status} viewBox='0 0 16 16' aria-hidden='true'>
      {status === 'running' && (
        <>
          <circle className='ss-track' cx='8' cy='8' r='6' />
          <path className='ss-arc' d='M8 2a6 6 0 0 1 6 6' />
        </>
      )}
      {status === 'waiting' && (
        <>
          <path
            className='ss-fill'
            d='M3 2.5h10a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 13 11.5H7l-3.5 3v-3H3A1.5 1.5 0 0 1 1.5 10V4A1.5 1.5 0 0 1 3 2.5Z'
          />
          <circle className='ss-knock' cx='5' cy='7' r='1' />
          <circle className='ss-knock' cx='8' cy='7' r='1' />
          <circle className='ss-knock' cx='11' cy='7' r='1' />
        </>
      )}
      {status === 'done' && (
        <>
          <circle className='ss-fill' cx='8' cy='8' r='7' />
          <path className='ss-knock-line' d='m4.8 8.2 2.2 2.2 4.2-4.6' />
        </>
      )}
      {status === 'failed' && (
        <>
          <path className='ss-fill' d='M8 1.3 15 14H1Z' />
          <path className='ss-knock-line' d='M8 6v3.6' />
          <circle className='ss-knock' cx='8' cy='11.8' r='0.9' />
        </>
      )}
    </svg>
  )
}

function TaskList({ shapes }: { shapes: boolean }) {
  return (
    <div className='ss-frame'>
      <div className='ss-legend'>
        {ORDER.map((s) => (
          <span key={s}>
            {shapes ? <Shape status={s} /> : <Dot status={s} />}
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
      <ul className='ss-list'>
        {TASKS.map((task) => (
          <li key={task.name}>
            <span className='ss-icon' role='img' aria-label={STATUS_LABEL[task.status]}>
              {shapes ? <Shape status={task.status} /> : <Dot status={task.status} />}
            </span>
            <span className='ss-name'>{task.name}</span>
            <span className='ss-meta'>{task.meta}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function StatusDemo() {
  const [vision, setVision] = useState<Vision>('normal')
  const [small, setSmall] = useState(false)

  return (
    <div className='ss-root'>
      <style>{`
        .ss-root {
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
          --s-running: #C7861A;
          --s-waiting: #3B6E8C;
          --s-done: #2E8B57;
          --s-failed: #C8432F;
          --knock: #FFFFFF;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .ss-root {
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
          --s-running: #F2B544;
          --s-waiting: #86AEC6;
          --s-done: #5CCB8A;
          --s-failed: #F17A6B;
          --knock: #1E2128;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .ss-root *, .ss-root *::before, .ss-root *::after { box-sizing: border-box; }
        .ss-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .ss-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 14px;
        }
        .ss-bar-label { font-size: 13px; color: var(--muted); }
        .ss-seg {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: 3px;
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          box-shadow: var(--shadow);
        }
        .ss-seg button, .ss-switch {
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--muted);
          background: transparent;
          border: 0;
          border-radius: 999px;
          padding: 7px 12px;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .ss-seg button[aria-pressed='true'] { background: var(--ink); color: var(--card); }
        .ss-switch {
          border: 1px solid var(--rule);
          background: var(--card);
          box-shadow: var(--shadow);
          padding: 8px 14px;
        }
        .ss-switch[aria-pressed='true'] { background: var(--ink); color: var(--card); }

        .ss-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        .ss-compare[data-vision='deutan'] .ss-frame { filter: url(#ss-deutan); }
        .ss-compare[data-vision='gray'] .ss-frame { filter: grayscale(1); }
        @media (max-width: 768px) {
          .ss-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .ss-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .ss-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .ss-tag--bad { color: var(--bad); }
        .ss-tag--good { color: var(--good); }
        .ss-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .ss-frame {
          --icon: 16px;
          --dot-size: 9px;
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .ss-compare[data-small='true'] .ss-frame { --icon: 11px; --dot-size: 6px; }

        .ss-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 14px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--rule);
          font-size: 12px;
          color: var(--muted);
        }
        .ss-legend span { display: inline-flex; align-items: center; gap: 6px; }

        .ss-list { list-style: none; margin: 0; padding: 6px 0; }
        .ss-list li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 16px;
          font-size: 13.5px;
        }
        .ss-list li + li { border-top: 1px solid var(--rule); }
        .ss-icon {
          width: 16px;
          display: grid;
          place-items: center;
          flex: none;
        }
        .ss-name { color: var(--ink-soft); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ss-meta { margin-left: auto; font-size: 12px; color: var(--faint); flex: none; }

        .ss-dot {
          display: block;
          width: var(--dot-size);
          height: var(--dot-size);
          border-radius: 50%;
          flex: none;
        }
        .ss-dot[data-s='running'], .ss-shape[data-s='running'] { --c: var(--s-running); }
        .ss-dot[data-s='waiting'], .ss-shape[data-s='waiting'] { --c: var(--s-waiting); }
        .ss-dot[data-s='done'], .ss-shape[data-s='done'] { --c: var(--s-done); }
        .ss-dot[data-s='failed'], .ss-shape[data-s='failed'] { --c: var(--s-failed); }
        .ss-dot { background: var(--c); }

        .ss-shape { display: block; width: var(--icon); height: var(--icon); flex: none; overflow: visible; }
        .ss-fill { fill: var(--c); }
        .ss-knock { fill: var(--knock); }
        .ss-knock-line { fill: none; stroke: var(--knock); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
        .ss-track { fill: none; stroke: var(--c); stroke-opacity: 0.25; stroke-width: 2.2; }
        .ss-arc {
          fill: none;
          stroke: var(--c);
          stroke-width: 2.2;
          stroke-linecap: round;
          transform-origin: 8px 8px;
          animation: ss-spin 0.9s linear infinite;
        }
        @keyframes ss-spin { to { transform: rotate(360deg); } }

        .ss-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .ss-takeaways { grid-template-columns: 1fr; max-width: 480px; }
        }
        .ss-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .ss-num { font: 11px 'JetBrains Mono', monospace; color: var(--faint); display: block; margin-bottom: 6px; }

        @media (prefers-reduced-motion: reduce) {
          .ss-arc { animation: none; }
          .ss-root *, .ss-root *::before, .ss-root *::after { transition: none !important; }
        }
      `}</style>

      {/* Deuteranopia simulation, Machado et al. 2009 (severity 1.0). */}
      <svg
        width='0'
        height='0'
        style={{ position: 'absolute' }}
        aria-hidden='true'
        focusable='false'
      >
        <filter id='ss-deutan'>
          <feColorMatrix
            type='matrix'
            values='0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0'
          />
        </filter>
      </svg>

      <div className='ss-bar'>
        <span className='ss-bar-label'>换一双眼睛看：</span>
        <div className='ss-seg' role='group' aria-label='模拟的视觉条件'>
          {VISIONS.map((v) => (
            <button
              type='button'
              key={v.id}
              aria-pressed={vision === v.id}
              onClick={() => setVision(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          type='button'
          className='ss-switch'
          aria-pressed={small}
          onClick={() => setSmall((s) => !s)}
        >
          缩小图标
        </button>
      </div>

      <div className='ss-compare' data-vision={vision} data-small={small}>
        <div className='ss-col'>
          <span className='ss-tag ss-tag--bad'>✕ 只靠颜色</span>
          <TaskList shapes={false} />
          <p className='ss-caption'>
            切到“红绿色弱模拟”，找找哪两个任务失败了。绿色和红色变成差不多的土黄色，只能一个个去对图例。
          </p>
        </div>
        <div className='ss-col'>
          <span className='ss-tag ss-tag--good'>✓ 形状 + 颜色</span>
          <TaskList shapes />
          <p className='ss-caption'>
            颜色照样变了，但三角形还是三角形。转圈的弧、气泡、对勾圆、警告三角，轮廓本身就是答案，颜色只是加强。
          </p>
        </div>
      </div>

      <div className='ss-takeaways'>
        <div className='ss-takeaway'>
          <span className='ss-num'>01</span>约 8% 的男性有不同程度的红绿色觉异常，“绿 = 好、红 =
          坏”恰好是他们最难分辨的一组。
        </div>
        <div className='ss-takeaway'>
          <span className='ss-num'>02</span>
          给每个状态选轮廓差别最大的形状：开口的弧、带尾巴的气泡、实心圆、三角。缩到很小时，先消失的是细节，轮廓还在。
        </div>
        <div className='ss-takeaway'>
          <span className='ss-num'>03</span>
          图标再清楚也要配 aria-label 或文字。屏幕阅读器读不到形状，demo 里每个图标都带着状态名。
        </div>
      </div>
    </div>
  )
}
