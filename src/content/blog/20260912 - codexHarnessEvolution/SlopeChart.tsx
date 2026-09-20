/**
 * SlopeChart.tsx
 *
 * Harness 那篇博文第四节的交互图：你的 Harness 涨得比底层模型快，还是慢。
 *
 * 模型线：M(t) = 基线 + 模型每代增长 × t
 * 产品线：P(t) = 基线 + 起点领先 + Harness 每代增长 × t
 * 两条线之间的距离，就是用户为产品付费的理由；产品线比模型线平，迟早被追平。
 *
 * 两种用法：
 * 1. 拖三个滑块：起点领先、Harness 每代增长、模型每代增长。
 * 2. 选一种情形：一次性领先 / 薄封装 / 有私有输入的垂类，滑块会缓动到对应的位置。
 *
 * 动效：
 * - 进入视口（也就是 client:visible 完成 hydration）时，两条线从左往右画出来，
 *   之后差距的色块和标签淡入。
 * - 两个点沿着各自的线从「今天」走到「+6 代」，循环播放：产品线更平的时候，
 *   能直接看到模型那个点从下面追上来、超过去。
 *
 * 布局稳定性：图的坐标系固定，滑块只改两条线的位置；情形说明和结论都预留了最小高度。
 * 数值只是示意用的刻度，不是测量结果。
 *
 * 服务端渲染出来的是「还没画」的状态，避免 hydration 时闪一下；没有 JS 时由 <noscript> 里的样式直接显示终态。
 * 样式只用站点的语义 token，明暗主题自动跟随。prefers-reduced-motion 下取消画线、走点和缓动。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'

interface Preset {
  id: string
  label: string
  lead: number
  slope: number
  note: string
}

const PRESETS: Preset[] = [
  { id: 'once', label: '一次性领先', lead: 30, slope: 0, note: '像 Todo List：当时领先很多，之后没有再往上加。' },
  { id: 'thin', label: '薄封装', lead: 18, slope: 3, note: '提示词模板加一个界面，质量的提升主要来自底层模型。' },
  {
    id: 'vertical',
    label: '有私有输入的垂类',
    lead: 15,
    slope: 22,
    note: '起点不高，但私有数据和真实用户的反馈让它每一代都能往上加。'
  }
]

const GENERATIONS = 6
const BASE = 20
const V_MAX = 250
const X0 = 56
const X1 = 462
const Y0 = 24
const Y1 = 232
const TWEEN_MS = 420
const RUN_MS = 7000

const px = (t: number) => X0 + ((X1 - X0) * t) / GENERATIONS
const py = (v: number) => Y1 - ((Y1 - Y0) * v) / V_MAX
const pt = (t: number, v: number) => `${px(t).toFixed(1)},${py(v).toFixed(1)}`

const CSS = `
.sl {
  --sl-line: hsl(var(--border));
  --sl-fg: hsl(var(--foreground));
  --sl-muted: hsl(var(--muted-foreground));
  --sl-accent: hsl(var(--primary));
  --sl-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --sl-dur: 0.32s;
  margin: 1.75rem 0 2rem;
  border: 1px solid var(--sl-line);
  border-radius: 8px;
  background: hsl(var(--card));
  padding: 1rem 1.1rem 1.1rem;
  color: var(--sl-fg);
  font-size: 0.9rem;
  line-height: 1.55;
}
.sl-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  margin-bottom: 0.9rem;
}
.sl-title { font-weight: 600; }
.sl-hint { color: var(--sl-muted); font-size: 0.8rem; }

.sl-presets { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
.sl-label { font-size: 0.78rem; color: var(--sl-muted); margin-right: 0.2rem; }
.sl-chip {
  border: 1px solid var(--sl-line);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    border-color var(--sl-dur) var(--sl-ease),
    background-color var(--sl-dur) var(--sl-ease),
    color var(--sl-dur) var(--sl-ease);
}
.sl-chip:hover { border-color: hsl(var(--foreground) / 0.3); }
.sl-chip:focus-visible { outline: 2px solid var(--sl-accent); outline-offset: 2px; }
.sl-chip[aria-pressed='true'] { border-color: var(--sl-accent); background: hsl(var(--primary) / 0.12); color: var(--sl-accent); }
.sl-preset-note {
  margin: 0.55rem 0 0;
  min-height: 1.6em;
  color: var(--sl-muted);
  font-size: 0.82rem;
  transition: opacity var(--sl-dur) var(--sl-ease);
}
.sl-preset-note[data-shown='false'] { opacity: 0; }

.sl-svg { display: block; width: 100%; max-width: 640px; height: auto; margin: 0.4rem auto 0; }
.sl-svg text { font-family: inherit; fill: var(--sl-fg); }
.sl-svg .sl-t-muted { fill: var(--sl-muted); }
.sl-svg .sl-t-accent { fill: var(--sl-accent); }
/* 字号写在样式里而不是属性上：手机上整张图被缩小，需要把字放大回来 */
.sl-fs-tick { font-size: 11.5px; }
.sl-fs-label { font-size: 12.5px; }
.sl-fs-name { font-size: 13.5px; }
.sl-axis { stroke: var(--sl-line); stroke-width: 1.5; fill: none; }
.sl-tick { stroke: var(--sl-line); stroke-width: 1; }
.sl-model { stroke: var(--sl-fg); stroke-width: 2.5; stroke-linecap: round; fill: none; }
.sl-product { stroke: var(--sl-accent); stroke-width: 2.5; stroke-linecap: round; fill: none; }
.sl-lead { fill: hsl(var(--primary) / 0.16); stroke: none; }
.sl-behind { fill: hsl(var(--muted-foreground) / 0.14); stroke: none; }
.sl-cross { fill: hsl(var(--card)); stroke: var(--sl-muted); stroke-width: 2; }

/* 画线：pathLength=1，靠 dashoffset 从 1 走到 0 */
.sl-model, .sl-product {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 1.1s var(--sl-ease);
}
.sl-product { transition-delay: 0.18s; }
.sl-late {
  opacity: 0;
  transition: opacity 0.5s ease 0.95s;
}
.sl[data-entered='true'] .sl-model,
.sl[data-entered='true'] .sl-product { stroke-dashoffset: 0; }
.sl[data-entered='true'] .sl-late { opacity: 1; }

/* 沿线前进的两个点 */
.sl-runner { opacity: 0; }
.sl-runner-model { fill: var(--sl-fg); }
.sl-runner-product { fill: var(--sl-accent); }
.sl[data-entered='true'] .sl-runner {
  animation: sl-run ${RUN_MS}ms linear 1.5s infinite;
}
@keyframes sl-run {
  0% { opacity: 0; transform: translate(0, 0); }
  6% { opacity: 1; }
  82% { opacity: 1; transform: translate(var(--dx), var(--dy)); }
  90%, 100% { opacity: 0; transform: translate(var(--dx), var(--dy)); }
}

.sl-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem 1.1rem;
  margin-top: 0.7rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--sl-line);
}
.sl-control { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
.sl-control-top { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; font-size: 0.8rem; }
.sl-control-name { color: var(--sl-muted); }
.sl-control-value { font-weight: 600; font-variant-numeric: tabular-nums; }
.sl-control input[type='range'] { width: 100%; margin: 0; accent-color: hsl(var(--primary)); cursor: pointer; }
.sl-control input[type='range']:focus-visible { outline: 2px solid var(--sl-accent); outline-offset: 4px; border-radius: 4px; }

.sl-summary {
  margin: 0.9rem 0 0;
  min-height: 3.1em;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.45);
  padding: 0.65rem 0.9rem;
  font-weight: 500;
}
.sl-foot { margin: 0.6rem 0 0; font-size: 0.76rem; color: var(--sl-muted); }

@media (max-width: 640px) {
  .sl { padding: 0.85rem 0.8rem 0.9rem; }
  .sl-controls { grid-template-columns: 1fr; }
  .sl-fs-tick { font-size: 18px; }
  .sl-fs-label { font-size: 19px; }
  .sl-fs-name { font-size: 20px; }
  .sl-preset-note { min-height: 3.2em; }
  .sl-summary { min-height: 4.6em; }
}

@media (prefers-reduced-motion: reduce) {
  .sl-chip, .sl-preset-note, .sl-model, .sl-product, .sl-late { transition: none; }
  .sl[data-entered='true'] .sl-runner { animation: none; opacity: 0; }
}
`

// 没有 JS 时不会 hydration，直接显示终态。
const NO_JS_CSS = `.sl .sl-model, .sl .sl-product { stroke-dashoffset: 0; } .sl .sl-late { opacity: 1; }`

// 两个点走的是直线，终点相对起点的位移交给 CSS 变量，动画本身写在样式里。
const runnerStyle = (dy: number) =>
  ({ '--dx': `${(X1 - X0).toFixed(1)}px`, '--dy': `${dy.toFixed(1)}px` }) as CSSProperties

function summarize(lead: number, slope: number, model: number): string {
  const diff = slope - model
  if (diff > 0) {
    return `你的 Harness 每代比模型多涨 ${diff}。${GENERATIONS} 代之后，领先从 ${lead} 扩大到 ${lead + diff * GENERATIONS}。`
  }
  if (diff === 0) {
    return `增长速度和模型一样，领先一直停在 ${lead}，既不扩大，也不缩小。`
  }
  const cross = lead / -diff
  if (cross <= GENERATIONS) {
    return `每过一代，领先缩小 ${-diff}。到第 ${Math.max(1, Math.ceil(cross - 1e-9))} 代，模型追平了你，之后直接用模型反而能做成更多事。`
  }
  return `每过一代，领先缩小 ${-diff}。${GENERATIONS} 代之内还没有被追平，但剩下的领先只有 ${lead + diff * GENERATIONS}。`
}

export default function SlopeChart() {
  const [lead, setLead] = useState(25)
  const [slope, setSlope] = useState(8)
  const [model, setModel] = useState(15)
  const [entered, setEntered] = useState(false)
  const timer = useRef<number | null>(null)

  const stopTween = () => {
    if (timer.current === null) return
    window.clearInterval(timer.current)
    timer.current = null
  }

  useEffect(() => stopTween, [])

  // client:visible 保证 hydration 发生在图进入视口之后，所以挂载后稍等一拍就可以开始画线。
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 120)
    return () => window.clearTimeout(id)
  }, [])

  // 选情形时，滑块缓动到目标位置；reduced-motion 下直接到位。
  // 用定时器而不是 requestAnimationFrame：页面不在前台时 rAF 不触发，会停在半路。
  const applyPreset = (p: Preset) => {
    stopTween()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setLead(p.lead)
      setSlope(p.slope)
      return
    }
    const fromLead = lead
    const fromSlope = slope
    const start = performance.now()
    timer.current = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / TWEEN_MS)
      const e = 1 - Math.pow(1 - k, 3)
      setLead(Math.round(fromLead + (p.lead - fromLead) * e))
      setSlope(Math.round(fromSlope + (p.slope - fromSlope) * e))
      if (k >= 1) stopTween()
    }, 16)
  }

  const activePreset = PRESETS.find((p) => p.lead === lead && p.slope === slope) ?? null

  const m = (t: number) => BASE + model * t
  const p = (t: number) => BASE + lead + slope * t
  const cross = slope < model ? lead / (model - slope) : null
  const caught = cross !== null && cross <= GENERATIONS
  const leadEnd = caught && cross !== null ? cross : GENERATIONS

  const leadArea = [pt(0, p(0)), pt(leadEnd, p(leadEnd)), pt(leadEnd, m(leadEnd)), pt(0, m(0))].join(' ')
  const behindArea =
    caught && cross !== null
      ? [pt(cross, m(cross)), pt(GENERATIONS, m(GENERATIONS)), pt(GENERATIONS, p(GENERATIONS))].join(' ')
      : null

  // 右端两个标签离得太近时上下错开，保持「谁在上面」的顺序不变。
  let labelP = py(p(GENERATIONS))
  let labelM = py(m(GENERATIONS))
  if (Math.abs(labelP - labelM) < 24) {
    const mid = (labelP + labelM) / 2
    const productOnTop = labelP <= labelM
    labelP = mid + (productOnTop ? -12 : 12)
    labelM = mid + (productOnTop ? 12 : -12)
  }

  const crossX = cross !== null ? px(cross) : 0
  const crossY = cross !== null ? py(m(cross)) : 0
  const crossLabelBelow = crossY < Y1 - 40

  return (
    <figure className='sl not-prose' data-entered={entered}>
      <style>{CSS}</style>
      <noscript>
        <style>{NO_JS_CSS}</style>
      </noscript>

      <figcaption className='sl-head'>
        <span className='sl-title'>图 3 · 你的 Harness 涨得比模型快，还是慢</span>
        <span className='sl-hint'>拖动滑块，或者直接选一种情形。</span>
      </figcaption>

      <div className='sl-presets' role='group' aria-label='几种典型情形'>
        <span className='sl-label'>试一种情形</span>
        {PRESETS.map((preset) => (
          <button
            type='button'
            className='sl-chip'
            aria-pressed={activePreset?.id === preset.id}
            onClick={() => applyPreset(preset)}
            key={preset.id}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className='sl-preset-note' data-shown={activePreset !== null}>
        {activePreset?.note ?? ' '}
      </p>

      <svg
        className='sl-svg'
        viewBox='0 0 600 284'
        role='img'
        aria-label='折线图：横轴是模型代际，纵轴是用户能做成的事。一条线是底层模型，一条线是你的产品，两线之间的距离是用户为产品付费的理由。'
      >
        <polygon className='sl-lead sl-late' points={leadArea} />
        {behindArea && <polygon className='sl-behind sl-late' points={behindArea} />}

        <path className='sl-axis' d={`M${X0},${Y0 - 6} L${X0},${Y1} L${X1 + 8},${Y1}`} />
        {Array.from({ length: GENERATIONS + 1 }, (_, t) => (
          <g key={t}>
            <line className='sl-tick' x1={px(t)} y1={Y1} x2={px(t)} y2={Y1 + 5} />
            <text className='sl-t-muted sl-fs-tick' x={px(t)} y={Y1 + 20} textAnchor='middle'>
              {t === 0 ? '今天' : `+${t}`}
            </text>
          </g>
        ))}
        <text className='sl-t-muted sl-fs-label' x={X0 + 8} y={Y0 + 4}>
          用户能做成的事
        </text>
        <text className='sl-t-muted sl-fs-label' x={X1 + 8} y={Y1 + 40} textAnchor='end'>
          模型代际 →
        </text>

        <line
          className='sl-model'
          pathLength={1}
          x1={px(0)}
          y1={py(m(0))}
          x2={px(GENERATIONS)}
          y2={py(m(GENERATIONS))}
        />
        <line
          className='sl-product'
          pathLength={1}
          x1={px(0)}
          y1={py(p(0))}
          x2={px(GENERATIONS)}
          y2={py(p(GENERATIONS))}
        />

        <circle
          className='sl-runner sl-runner-model'
          cx={px(0)}
          cy={py(m(0))}
          r='4.5'
          style={runnerStyle(py(m(GENERATIONS)) - py(m(0)))}
        />
        <circle
          className='sl-runner sl-runner-product'
          cx={px(0)}
          cy={py(p(0))}
          r='4.5'
          style={runnerStyle(py(p(GENERATIONS)) - py(p(0)))}
        />

        {caught && (
          <g className='sl-late'>
            <circle className='sl-cross' cx={crossX} cy={crossY} r='5' />
            <text
              className='sl-t-muted sl-fs-label'
              x={crossX}
              y={crossLabelBelow ? crossY + 24 : crossY - 12}
              textAnchor='middle'
            >
              在这里被追平
            </text>
          </g>
        )}

        <text className='sl-t-accent sl-late sl-fs-name' x={X1 + 12} y={labelP + 4} fontWeight='600'>
          你的产品
        </text>
        <text className='sl-late sl-fs-name' x={X1 + 12} y={labelM + 4} fontWeight='600'>
          底层模型
        </text>
      </svg>

      <div className='sl-controls'>
        <label className='sl-control'>
          <span className='sl-control-top'>
            <span className='sl-control-name'>起点领先</span>
            <span className='sl-control-value'>{lead}</span>
          </span>
          <input type='range' min={5} max={60} step={1} value={lead} onChange={(e) => setLead(Number(e.target.value))} />
        </label>
        <label className='sl-control'>
          <span className='sl-control-top'>
            <span className='sl-control-name'>Harness 每代增长</span>
            <span className='sl-control-value'>{slope}</span>
          </span>
          <input type='range' min={0} max={28} step={1} value={slope} onChange={(e) => setSlope(Number(e.target.value))} />
        </label>
        <label className='sl-control'>
          <span className='sl-control-top'>
            <span className='sl-control-name'>模型每代增长</span>
            <span className='sl-control-value'>{model}</span>
          </span>
          <input type='range' min={5} max={25} step={1} value={model} onChange={(e) => setModel(Number(e.target.value))} />
        </label>
      </div>

      <p className='sl-summary' aria-live='polite'>
        {summarize(lead, slope, model)}
      </p>
      <p className='sl-foot'>示意图，数值只是刻度，不是测量结果。起点可以很高，但决定结局的是斜率。</p>
    </figure>
  )
}
