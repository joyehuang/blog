/**
 * StatusDemo.tsx
 *
 * 观点：头像角上的状态信号，别只靠换颜色、也别全都一直闪。参考 jojo-friends
 * 的状态设计：
 * - 每种状态一个独立轮廓：空闲 = 小圆点，工作中 = 绕着圆点走的进度弧，
 *   等你回复 = 带“?”的气泡，完成 = 带勾的徽章，出错 = 带“!”的点，
 *   离线 = 整个头像变灰。缩小、转成灰度、关掉动画，仍然分得清。
 * - 动效有分寸：只有“工作中”会一直动；气泡弹一下就停，对勾画完闪一次就停，
 *   出错晃两下就停。
 * - 状态和表情分开：出错不会让头像哭，脸始终不变。
 *
 * 左边是常见做法（头像角上叠一个彩色在线点，工作中 / 等你回复 / 出错都在闪），
 * 右边是形状做法。每个框底部有一排“体检”：六种状态并排，32px、灰度、静止。
 *
 * 有 Jojo 包的构建（__JOJO__）直接用真正的 Jojo 和它自带的六种状态；没有时
 * 退回下面这个通用头像，演示同样的规则。左边的彩色点是叠在头像外面的独立圆点，
 * 不给 Jojo 重新上色。
 */
import type { JojoProps } from '@jojo-web/runtime'
import { useEffect, useState, type ComponentType } from 'react'

import { loadJojoRuntime } from '@/components/jojo/LazyJojo'

type Status = 'idle' | 'working' | 'needs-input' | 'success' | 'error' | 'offline'
type Kind = 'color' | 'shape'

const STATUSES: { id: Status; label: string }[] = [
  { id: 'idle', label: '空闲' },
  { id: 'working', label: '工作中' },
  { id: 'needs-input', label: '等你回复' },
  { id: 'success', label: '已完成' },
  { id: 'error', label: '出错了' },
  { id: 'offline', label: '离线' }
]
const LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label])) as Record<Status, string>

/* Geometry, in a 64 × 64 box. The dot sits in a notch bitten out of the shell's corner. */
const DOT = { x: 44, y: 17 }
// Gauge: from upper-left, under the dot, to upper-right.
const GAUGE = 'M36.6 14.3 A7.9 7.9 0 1 0 51.4 14.3'
const BUBBLE =
  'M51 1.5 h9 a3.5 3.5 0 0 1 3.5 3.5 v6 a3.5 3.5 0 0 1 -3.5 3.5 h-5.2 l-4.6 3.6 l0.8 -3.6 a3.5 3.5 0 0 1 -3.5 -3.5 v-6 a3.5 3.5 0 0 1 3.5 -3.5 z'

function Avatar({ status, kind, small }: { status: Status; kind: Kind; small?: boolean }) {
  const shaped = kind === 'shape'
  return (
    <svg
      className='sa-avatar'
      data-kind={kind}
      data-status={status}
      data-small={small ? 'true' : undefined}
      viewBox='0 0 64 64'
      role='img'
      aria-label={shaped ? `头像，状态：${LABEL[status]}` : '头像'}
    >
      <g className='sa-body'>
        <rect className='sa-shell' x='5' y='14' width='42' height='42' rx='13' />
        <rect className='sa-face' x='11' y='23' width='29' height='25' rx='9' />
        <rect className='sa-eye' x='18' y='29' width='3.4' height='7' rx='1.7' />
        <rect className='sa-eye' x='29' y='29' width='3.4' height='7' rx='1.7' />
        <rect className='sa-mouth' x='22.5' y='40' width='6' height='2.4' rx='1.2' />
        {/* the paper gap around the dot: the notch */}
        <circle className='sa-notch' cx={DOT.x} cy={DOT.y} r={small ? 12 : 11} />
      </g>

      {shaped && status === 'working' && (
        <g className='sa-gauge'>
          <path className='sa-gauge-track' d={GAUGE} pathLength={100} />
          <path className='sa-gauge-fill' d={GAUGE} pathLength={100} />
        </g>
      )}

      {shaped && status === 'success' && <circle className='sa-ring' cx={DOT.x} cy={DOT.y} r='8' />}

      <g className='sa-dot-wrap'>
        <circle className='sa-dot' cx={DOT.x} cy={DOT.y} r={small ? 6 : 5} />
        {shaped && status === 'success' && (
          <path className='sa-check' d='M41.4 17.2 l1.8 1.8 l3.4 -3.6' pathLength={10} />
        )}
        {shaped && status === 'error' && (
          <g className='sa-mark'>
            <rect x='43.2' y='13.6' width='1.6' height='4' rx='0.8' />
            <circle cx='44' cy='20' r='0.9' />
          </g>
        )}
      </g>

      {shaped && status === 'needs-input' && (
        <g className='sa-bubble'>
          <path className='sa-bubble-shape' d={BUBBLE} />
          <path className='sa-ask' d='M53.3 6.3 a2.2 2.2 0 1 1 3.1 2 c-0.7 0.4 -0.9 0.8 -0.9 1.5' />
          <circle className='sa-ask-dot' cx='55.5' cy='12.2' r='0.75' />
        </g>
      )}
    </svg>
  )
}

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

function Face({
  jojo,
  status,
  kind,
  small
}: {
  jojo: JojoState
  status: Status
  kind: Kind
  small?: boolean
}) {
  if (jojo === 'off')
    return <Avatar key={small ? undefined : status} status={status} kind={kind} small={small} />
  if (!jojo) return null
  const Jojo = jojo
  const shaped = kind === 'shape'
  return (
    <span className='sa-jojo' data-kind={kind} data-status={status}>
      <Jojo
        status={shaped ? status : 'idle'}
        size={small ? 32 : 136}
        motion={small ? 'static' : shaped ? 'auto' : 'static'}
        decorative={small || !shaped}
        title={shaped ? undefined : 'Jojo'}
      />
      {!shaped && <span className='sa-badge' aria-hidden='true' />}
    </span>
  )
}

function Panel({ kind, status, jojo }: { kind: Kind; status: Status; jojo: JojoState }) {
  const shaped = kind === 'shape'
  return (
    <div className='sa-frame'>
      <div className='sa-stage'>
        <div className='sa-seat'>
          <Face jojo={jojo} status={status} kind={kind} />
        </div>
        <span className='sa-name' aria-live='polite'>
          {shaped ? LABEL[status] : ' '}
        </span>
      </div>
      <div className='sa-check-row'>
        <span className='sa-check-title'>体检 · 32px · 灰度 · 静止</span>
        <div className='sa-strip'>
          {STATUSES.map((s) => (
            <div className='sa-cell' key={s.id}>
              <span className='sa-mini'>
                <Face jojo={jojo} status={s.id} kind={kind} small />
              </span>
              <span className='sa-cell-label'>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function StatusDemo() {
  const [status, setStatus] = useState<Status>('working')
  const jojo = useJojo()

  return (
    // data-jojo-anchor: an in-flow Jojo lives here, so the dock steps aside.
    <div className='sa-root' data-jojo-anchor={__JOJO__ ? '' : undefined}>
      <style>{`
        .sa-root {
          --bg: #F1F3EE;
          --ink: #171B1A;
          --ink-soft: rgba(23,27,26,0.82);
          --muted: #6B7570;
          --faint: #B7BDB6;
          --good: #1F6F4A;
          --bad: #B8402C;
          --card: #FFFFFF;
          --rule: rgba(23,27,26,0.1);
          --dot-bg: rgba(23,27,26,0.05);
          --accent: #3B6E8C;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          /* the avatar */
          --shell: #5A6A92;
          --face: #E7F0EC;
          --face-ink: #1E2430;
          --signal: #EE6A4E;
          --track: rgba(90,106,146,0.22);
          --bubble: #FFFFFF;
          --mark: #FFFFFF;

          /* colour-only badge */
          --c-idle: #9AA3AC;
          --c-working: #E0A030;
          --c-needs-input: #3B82F6;
          --c-success: #2E9E5B;
          --c-error: #D9483B;
          --c-offline: #9AA3AC;

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot-bg) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .sa-root {
          --bg: #15171B;
          --ink: #E8EAE6;
          --ink-soft: rgba(232,234,230,0.82);
          --muted: #9BA39D;
          --faint: #565C57;
          --good: #4ADE80;
          --bad: #F17A6B;
          --card: #1E2128;
          --rule: rgba(255,255,255,0.1);
          --dot-bg: rgba(255,255,255,0.045);
          --accent: #86AEC6;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);

          --shell: #7383AC;
          --face: #DCE7E2;
          --signal: #FF8468;
          --track: rgba(160,176,214,0.28);
          --bubble: #F4F6F2;
        }
        .sa-root *, .sa-root *::before, .sa-root *::after { box-sizing: border-box; }
        .sa-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .sa-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 14px;
        }
        .sa-bar-label { font-size: 13px; color: var(--muted); }
        .sa-seg {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: 3px;
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          box-shadow: var(--shadow);
        }
        .sa-seg button {
          font: 500 12px/1 'Public Sans', sans-serif;
          color: var(--muted);
          background: transparent;
          border: 0;
          border-radius: 999px;
          padding: 7px 12px;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .sa-seg button[aria-pressed='true'] { background: var(--ink); color: var(--card); }

        .sa-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .sa-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .sa-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .sa-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .sa-tag--bad { color: var(--bad); }
        .sa-tag--good { color: var(--good); }
        .sa-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .sa-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .sa-stage {
          height: 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .sa-seat { width: 136px; height: 136px; }
        .sa-name { font-size: 13px; color: var(--ink-soft); min-height: 1.4em; }

        .sa-check-row {
          border-top: 1px solid var(--rule);
          padding: 12px 14px 14px;
        }
        .sa-check-title {
          display: block;
          font: 11px 'JetBrains Mono', monospace;
          color: var(--faint);
          margin-bottom: 10px;
        }
        .sa-strip {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 4px;
          filter: grayscale(1);
        }
        .sa-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; }
        .sa-mini { width: 32px; height: 32px; }
        .sa-cell-label { font-size: 11px; color: var(--muted); white-space: nowrap; }

        /* ---------- Jojo (when the package is in the build) ---------- */
        .sa-jojo { position: relative; display: block; width: 100%; height: 100%; }
        .sa-jojo > svg, .sa-jojo > span:not(.sa-badge) { display: block; width: 100%; height: 100%; }
        .sa-badge {
          position: absolute;
          right: 6%;
          bottom: 6%;
          width: 24%;
          height: 24%;
          border-radius: 50%;
          border: 3px solid var(--card);
          background: var(--c-idle);
        }
        .sa-mini .sa-badge { border-width: 1.5px; width: 30%; height: 30%; right: 0; bottom: 0; }
        .sa-jojo[data-status='working'] .sa-badge { background: var(--c-working); }
        .sa-jojo[data-status='needs-input'] .sa-badge { background: var(--c-needs-input); }
        .sa-jojo[data-status='success'] .sa-badge { background: var(--c-success); }
        .sa-jojo[data-status='error'] .sa-badge { background: var(--c-error); }
        .sa-jojo[data-status='offline'] .sa-badge { background: var(--c-offline); }
        .sa-stage .sa-jojo:is([data-status='working'], [data-status='needs-input'], [data-status='error']) .sa-badge {
          animation: sa-pulse 0.9s ease-in-out infinite alternate;
        }

        /* ---------- the generic avatar (builds without Jojo) ---------- */
        .sa-avatar { display: block; width: 100%; height: 100%; overflow: visible; }
        .sa-avatar * { transform-box: fill-box; }
        .sa-shell { fill: var(--shell); }
        .sa-face { fill: var(--face); }
        .sa-eye, .sa-mouth { fill: var(--face-ink); }
        .sa-notch { fill: var(--card); }
        .sa-dot { fill: var(--signal); }
        .sa-body { transition: filter 0.3s ease, opacity 0.3s ease; }

        /* colour-only: the dot changes colour, and three states pulse forever */
        .sa-avatar[data-kind='color'] .sa-dot { fill: var(--c-idle); }
        .sa-avatar[data-kind='color'][data-status='working'] .sa-dot { fill: var(--c-working); }
        .sa-avatar[data-kind='color'][data-status='needs-input'] .sa-dot { fill: var(--c-needs-input); }
        .sa-avatar[data-kind='color'][data-status='success'] .sa-dot { fill: var(--c-success); }
        .sa-avatar[data-kind='color'][data-status='error'] .sa-dot { fill: var(--c-error); }
        .sa-avatar[data-kind='color'][data-status='offline'] .sa-dot { fill: var(--c-offline); }
        .sa-avatar[data-kind='color']:is([data-status='working'], [data-status='needs-input'], [data-status='error']) .sa-dot {
          animation: sa-pulse 0.9s ease-in-out infinite alternate;
        }

        /* shape: offline greys the whole avatar */
        .sa-avatar[data-kind='shape'][data-status='offline'] .sa-body,
        .sa-avatar[data-kind='shape'][data-status='offline'] .sa-dot-wrap {
          filter: grayscale(1);
          opacity: 0.5;
        }

        /* working: an open gauge hugging the dot; only this state keeps moving */
        .sa-gauge-track, .sa-gauge-fill { fill: none; stroke-width: 2.6; stroke-linecap: round; }
        .sa-gauge-track { stroke: var(--track); }
        .sa-gauge-fill {
          stroke: var(--signal);
          stroke-dasharray: 38 200;
          stroke-dashoffset: 38;
          animation: sa-travel 1.7s linear infinite;
        }

        /* needs-input: the bubble pops once, then holds still */
        .sa-bubble { transform-origin: 0% 100%; animation: sa-pop 0.42s cubic-bezier(.34,1.56,.64,1) both; }
        .sa-bubble-shape { fill: var(--bubble); stroke: var(--signal); stroke-width: 1.3; stroke-linejoin: round; }
        .sa-ask { fill: none; stroke: var(--shell); stroke-width: 1.4; stroke-linecap: round; }
        .sa-ask-dot { fill: var(--shell); }

        /* success: the dot grows into a check badge, flashes once, then holds */
        .sa-avatar[data-kind='shape'][data-status='success'] .sa-dot-wrap {
          transform-origin: center;
          transform: scale(1.45);
          animation: sa-badge 0.45s cubic-bezier(.34,1.56,.64,1) both;
        }
        .sa-check {
          fill: none;
          stroke: var(--mark);
          stroke-width: 1.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 10;
          stroke-dashoffset: 0;
          animation: sa-draw 0.36s ease-out 0.14s both;
        }
        .sa-ring {
          fill: none;
          stroke: var(--signal);
          stroke-width: 1.2;
          opacity: 0;
          transform-origin: center;
          animation: sa-ring 0.9s ease-out both;
        }

        /* error: "!" in the dot, two small shakes, then holds */
        .sa-avatar[data-kind='shape'][data-status='error'] .sa-dot-wrap {
          transform-origin: center;
          transform: scale(1.25);
          animation: sa-shake 0.5s ease-out both;
        }
        .sa-mark { fill: var(--mark); }

        /* small sizes: bolder strokes so the shapes survive 32px */
        .sa-avatar[data-small] .sa-gauge-track, .sa-avatar[data-small] .sa-gauge-fill { stroke-width: 4; }
        .sa-avatar[data-small] .sa-gauge-fill { stroke-dasharray: 62 100; stroke-dashoffset: 0; }
        .sa-avatar[data-small] .sa-check { stroke-width: 2.4; }
        .sa-avatar[data-small] .sa-bubble-shape { stroke-width: 0; }
        .sa-avatar[data-small] .sa-ask { stroke-width: 2; }
        .sa-avatar[data-small] .sa-bubble { transform: scale(1.35); }
        .sa-avatar[data-small][data-kind='shape'][data-status='error'] .sa-dot-wrap { transform: scale(1.5); }
        .sa-avatar[data-small] *, .sa-avatar[data-small] { animation: none !important; }
        .sa-avatar[data-small] .sa-ring { display: none; }

        @keyframes sa-pulse { from { opacity: 1; } to { opacity: 0.3; } }
        @keyframes sa-travel { from { stroke-dashoffset: 38; } to { stroke-dashoffset: -100; } }
        @keyframes sa-pop { from { transform: scale(0.35); opacity: 0; } 30% { opacity: 1; } to { transform: scale(1); opacity: 1; } }
        @keyframes sa-badge { from { transform: scale(1); } 60% { transform: scale(1.7); } to { transform: scale(1.45); } }
        @keyframes sa-draw { from { stroke-dashoffset: 10; } to { stroke-dashoffset: 0; } }
        @keyframes sa-ring { from { opacity: 0.8; transform: scale(1); } to { opacity: 0; transform: scale(2); } }
        @keyframes sa-shake {
          0% { transform: scale(1.25) translateX(0); }
          20% { transform: scale(1.25) translateX(1.6px); }
          40% { transform: scale(1.25) translateX(-1.4px); }
          60% { transform: scale(1.25) translateX(1px); }
          80% { transform: scale(1.25) translateX(-0.6px); }
          100% { transform: scale(1.25) translateX(0); }
        }

        .sa-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .sa-takeaways { grid-template-columns: 1fr; max-width: 480px; }
        }
        .sa-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .sa-num { font: 11px 'JetBrains Mono', monospace; color: var(--faint); display: block; margin-bottom: 6px; }

        @media (prefers-reduced-motion: reduce) {
          .sa-root *, .sa-root *::before, .sa-root *::after { animation: none !important; transition: none !important; }
          .sa-gauge-fill { stroke-dasharray: 62 100; stroke-dashoffset: 0; }
          .sa-ring { display: none; }
        }
      `}</style>

      <div className='sa-bar'>
        <span className='sa-bar-label'>切换状态：</span>
        <div className='sa-seg' role='group' aria-label='头像状态'>
          {STATUSES.map((s) => (
            <button
              type='button'
              key={s.id}
              aria-pressed={status === s.id}
              onClick={() => setStatus(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className='sa-compare'>
        <div className='sa-col'>
          <span className='sa-tag sa-tag--bad'>✕ 只换圆点颜色，一直在闪</span>
          <Panel kind='color' status={status} jojo={jojo} />
          <p className='sa-caption'>
            看底下那排体检：去掉颜色、缩小之后，六个头像几乎一模一样。工作中、等你回复、出错还一直在闪，哪个才需要我处理？
          </p>
        </div>
        <div className='sa-col'>
          <span className='sa-tag sa-tag--good'>✓ 每个状态一个形状，动一下就停</span>
          <Panel kind='shape' status={status} jojo={jojo} />
          <p className='sa-caption'>
            进度弧、问号气泡、对勾徽章、感叹号、整体变灰，轮廓本身就是答案。只有“工作中”在动，其他状态出现时动一下，然后安静地停住。
          </p>
        </div>
      </div>

      <div className='sa-takeaways'>
        <div className='sa-takeaway'>
          <span className='sa-num'>01</span>
          每种状态一个独立轮廓，并且用最苛刻的条件检查：缩小、灰度、不动。三个条件同时满足还分得清，才算合格。
        </div>
        <div className='sa-takeaway'>
          <span className='sa-num'>02</span>
          动效要有分寸。只有正在进行的事情才一直动；等你回复的气泡弹一次就停，完成闪一下就停。满屏都在闪，等于什么都没说。
        </div>
        <div className='sa-takeaway'>
          <span className='sa-num'>03</span>
          状态和表情是两条线。出错只是一个信号，不代表角色要哭；状态也永远配一行文字，读屏软件和第一次来的人都能看懂。
        </div>
      </div>
    </div>
  )
}
