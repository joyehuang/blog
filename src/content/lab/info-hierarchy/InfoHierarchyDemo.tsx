/**
 * InfoHierarchyDemo.tsx
 *
 * 观点：展示不同信息密度 / 重要程度时，不必靠“嵌套边框”来表达层级。
 * 三层信息一层套一层的边框会显得很挤很乱；用字号、字重、颜色对比、
 * 留白，或者背景色的深浅差异，同样能传达层级关系，而且更轻盈。
 *
 * 这个组件用同一份数据（任务 → 步骤 → 日志，三层信息）渲染三遍：
 * 1. 嵌套边框（反例）
 * 2. 字号 + 颜色 + 留白（正例 A：完全不用色块，纯排版）
 * 3. 背景色差（正例 B：不画任何边框线，靠背景色的浓淡表达“层级有多深”）
 * 纯 React + TypeScript + 内联 <style>，字体由 DemoFrame 统一加载。
 */

type StepStatus = 'done' | 'active' | 'pending'

interface LogEntry {
  text: string
  muted?: boolean
}

interface StepEntry {
  id: string
  label: string
  status: StepStatus
  meta: string
  logs: LogEntry[]
}

const STEPS: StepEntry[] = [
  {
    id: '01',
    label: '数据采集',
    status: 'done',
    meta: '2.3s · 14,203 条记录',
    logs: [
      { text: '连接 CloudResearch API，鉴权成功' },
      { text: '抓取 2026-07 用户会话样本' },
      { text: '写入 cache/q3_raw.json（8.2MB）', muted: true }
    ]
  },
  {
    id: '02',
    label: '建模分析',
    status: 'active',
    meta: '进行中 · 第 2/3 批',
    logs: [
      { text: '拆分留存 / 流失 / 新增三组样本' },
      { text: '运行归因模型 attribution_v3' },
      { text: '等待 GPU 队列（RTX 5070 × 1）', muted: true }
    ]
  },
  {
    id: '03',
    label: '生成报告',
    status: 'pending',
    meta: '等待中',
    logs: [{ text: '汇总关键指标与图表' }, { text: '生成中文 + 英文双语摘要' }]
  }
]

const STATUS_COLOR: Record<StepStatus, string> = {
  done: '#1F6F4A',
  active: '#B8860B',
  pending: '#9AA3AC'
}

const STATUS_LABEL: Record<StepStatus, string> = {
  done: '完成',
  active: '进行中',
  pending: '等待'
}

/* ---------- 反例：三层信息，三层嵌套边框 ---------- */

function NestedBordersDemo() {
  return (
    <div className='hd-frame'>
      <div className='hd-bad-title'>Atypica 研究任务</div>
      <div className='hd-bad-sub'>Q3 用户增长归因分析</div>

      {STEPS.map((step) => (
        <div className='hd-bad-step' key={step.id}>
          <div className='hd-bad-step-head'>
            <span>
              {step.id} {step.label}
            </span>
            <span
              className='hd-bad-status'
              style={{ borderColor: STATUS_COLOR[step.status], color: STATUS_COLOR[step.status] }}
            >
              {STATUS_LABEL[step.status]}
            </span>
          </div>
          <div className='hd-bad-meta'>{step.meta}</div>

          {step.logs.map((log, i) => (
            <div className='hd-bad-log' key={i}>
              {log.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ---------- 正例：同样三层信息，靠字号 / 字重 / 颜色 / 留白区分 ---------- */

function TypographyHierarchyDemo() {
  return (
    <div className='hd-frame'>
      <div className='hd-good-title'>Atypica 研究任务</div>
      <div className='hd-good-sub'>Q3 用户增长归因分析</div>

      <div className='hd-good-steps'>
        {STEPS.map((step) => (
          <div className='hd-good-step' key={step.id}>
            <div className='hd-good-step-head'>
              <span
                className='hd-good-dot'
                style={{ background: STATUS_COLOR[step.status] }}
                aria-hidden
              />
              <span className='hd-good-step-label'>
                {step.id} {step.label}
              </span>
              <span className='hd-good-status' style={{ color: STATUS_COLOR[step.status] }}>
                {STATUS_LABEL[step.status]}
              </span>
              <span className='hd-good-meta'>{step.meta}</span>
            </div>

            <div className='hd-good-logs'>
              {step.logs.map((log, i) => (
                <div className={`hd-good-log${log.muted ? ' hd-good-log--muted' : ''}`} key={i}>
                  {log.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- 正例 B：不画边框，靠背景色的深浅表达层级 ---------- */

function BackgroundShadeDemo() {
  return (
    <div className='hd-frame'>
      <div className='hd-bg-title'>Atypica 研究任务</div>
      <div className='hd-bg-sub'>Q3 用户增长归因分析</div>

      <div className='hd-bg-steps'>
        {STEPS.map((step) => (
          <div
            className='hd-bg-step'
            key={step.id}
            style={{ background: `color-mix(in srgb, ${STATUS_COLOR[step.status]} 7%, white)` }}
          >
            <div className='hd-bg-step-head'>
              <span className='hd-bg-step-label'>
                {step.id} {step.label}
              </span>
              <span className='hd-bg-status' style={{ color: STATUS_COLOR[step.status] }}>
                {STATUS_LABEL[step.status]}
              </span>
              <span className='hd-bg-meta'>{step.meta}</span>
            </div>

            <div
              className='hd-bg-logs'
              style={{ background: `color-mix(in srgb, ${STATUS_COLOR[step.status]} 13%, white)` }}
            >
              {step.logs.map((log, i) => (
                <div className={`hd-bg-log${log.muted ? ' hd-bg-log--muted' : ''}`} key={i}>
                  {log.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- 主组件：并排对比 + 结论 ---------- */

export default function InfoHierarchyDemo() {
  return (
    <div className='hd-root'>
      <style>{`
        .hd-root {
          --bg: #F1F3EE;
          --ink: #171B1A;
          --ink-soft: rgba(23,27,26,0.82);
          --muted: #6B7570;
          --faint: #B7BDB6;
          --good: #1F6F4A;
          --bad: #B8402C;
          --shade: #3B6E8C;
          --card: #FFFFFF;

          background: var(--bg);
          background-image:
            radial-gradient(circle, rgba(23,27,26,0.05) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 48px 24px 56px;
          box-sizing: border-box;
        }
        .hd-root *, .hd-root *::before, .hd-root *::after { box-sizing: border-box; }

        .hd-header { max-width: 760px; margin: 0 auto 36px; }
        .hd-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          color: var(--muted);
          margin: 0 0 10px;
          text-transform: uppercase;
        }
        .hd-h1 {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: clamp(26px, 4vw, 34px);
          line-height: 1.25;
          margin: 0 0 12px;
          letter-spacing: -0.01em;
        }
        .hd-lede {
          font-size: 14.5px;
          line-height: 1.7;
          color: var(--ink-soft);
          margin: 0;
          max-width: 60ch;
        }

        .hd-compare {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1180px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 980px) {
          .hd-compare { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 620px) {
          .hd-compare { grid-template-columns: 1fr; }
        }

        .hd-col { display: flex; flex-direction: column; gap: 10px; }

        .hd-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.02em;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
        }
        .hd-tag--bad { color: var(--bad); }
        .hd-tag--good { color: var(--good); }
        .hd-tag--shade { color: var(--shade); }

        .hd-caption {
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--muted);
          margin: 2px 2px 0;
        }

        .hd-frame {
          background: var(--card);
          border-radius: 10px;
          padding: 22px 20px;
          box-shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);
          animation: hd-rise 0.5s ease both;
        }
        @keyframes hd-rise {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ---- 反例：嵌套边框 ---- */

        .hd-bad-title {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 15px;
        }
        .hd-bad-sub {
          font-size: 12px;
          color: var(--muted);
          margin: 2px 0 14px;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--ink);
        }
        .hd-bad-step {
          border: 2px solid var(--muted);
          border-radius: 4px;
          padding: 10px 12px;
          margin-bottom: 10px;
          background: #FAFAF8;
        }
        .hd-bad-step-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
        }
        .hd-bad-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          border: 1px solid;
          border-radius: 3px;
          padding: 1px 6px;
        }
        .hd-bad-meta {
          font-size: 11px;
          color: var(--muted);
          margin: 4px 0 8px;
        }
        .hd-bad-log {
          border: 1px solid var(--faint);
          border-radius: 3px;
          padding: 6px 8px;
          margin-top: 6px;
          margin-left: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          background: #fff;
        }

        /* ---- 正例：字号 + 颜色 + 留白 ---- */

        .hd-good-title {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 21px;
          letter-spacing: -0.01em;
        }
        .hd-good-sub {
          font-size: 12.5px;
          color: var(--muted);
          margin: 3px 0 20px;
        }
        .hd-good-steps { display: flex; flex-direction: column; gap: 18px; }
        .hd-good-step {
          padding: 4px 6px;
          margin: -4px -6px;
          border-radius: 6px;
          transition: background 0.2s ease;
        }
        .hd-good-step:hover { background: rgba(23,27,26,0.03); }

        .hd-good-step-head {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }
        .hd-good-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          align-self: center;
          flex-shrink: 0;
        }
        .hd-good-step-label {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--ink-soft);
        }
        .hd-good-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 500;
        }
        .hd-good-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--faint);
          margin-left: auto;
        }
        .hd-good-logs {
          margin-top: 6px;
          padding-left: 14px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .hd-good-log {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.6;
        }
        .hd-good-log--muted { color: var(--faint); }

        /* ---- 正例 B：背景色差，不画任何边框 ---- */

        .hd-bg-title {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 17px;
        }
        .hd-bg-sub {
          font-size: 12px;
          color: var(--muted);
          margin: 3px 0 16px;
        }
        .hd-bg-steps { display: flex; flex-direction: column; gap: 10px; }
        .hd-bg-step {
          border-radius: 8px;
          padding: 10px 12px 12px;
          transition: filter 0.2s ease;
        }
        .hd-bg-step:hover { filter: brightness(0.99) saturate(1.1); }

        .hd-bg-step-head {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--ink-soft);
        }
        .hd-bg-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          font-weight: 500;
        }
        .hd-bg-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          color: var(--muted);
          margin-left: auto;
        }
        .hd-bg-logs {
          margin-top: 8px;
          border-radius: 6px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .hd-bg-log {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          color: var(--ink-soft);
          line-height: 1.6;
        }
        .hd-bg-log--muted { color: var(--muted); }

        .hd-takeaways {
          max-width: 1180px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid rgba(23,27,26,0.1);
        }
        @media (max-width: 900px) {
          .hd-takeaways { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 520px) {
          .hd-takeaways { grid-template-columns: 1fr; }
        }
        .hd-takeaway {
          font-size: 13px;
          line-height: 1.7;
          color: var(--ink-soft);
        }
        .hd-takeaway-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--faint);
          display: block;
          margin-bottom: 6px;
        }

        @media (prefers-reduced-motion: reduce) {
          .hd-frame { animation: none; }
          .hd-good-step, .hd-bg-step { transition: none; }
        }
      `}</style>

      <div className='hd-header'>
        <p className='hd-eyebrow'>Rendering UI · 层级表达</p>
        <h1 className='hd-h1'>信息层级，不必靠边框一层套一层</h1>
        <p className='hd-lede'>
          同一份数据，同样是三层信息——任务、步骤、日志。第一种每一层都套一个边框；
          后两种完全不画边框线，分别靠“字号 + 颜色 + 留白”和“背景色的深浅”来表达层级。
          内容完全一致，观感完全不同。
        </p>
      </div>

      <div className='hd-compare'>
        <div className='hd-col'>
          <span className='hd-tag hd-tag--bad'>✕ 三层嵌套边框</span>
          <NestedBordersDemo />
          <p className='hd-caption'>
            读者要先分辨三种边框的粗细和颜色，才能意会“这是层级、不是并列内容”——边框在替读者做本该由排版做的事。
          </p>
        </div>
        <div className='hd-col'>
          <span className='hd-tag hd-tag--good'>✓ 字号 · 颜色 · 留白</span>
          <TypographyHierarchyDemo />
          <p className='hd-caption'>标题大而深、步骤中等、日志小而浅；边框数量为零，层级反而一眼可辨。</p>
        </div>
        <div className='hd-col'>
          <span className='hd-tag hd-tag--shade'>✓ 背景色差</span>
          <BackgroundShadeDemo />
          <p className='hd-caption'>
            不画一条线：步骤块是任务色的 7% 浓度，日志块是 13% 浓度——颜色越浓，说明嵌套得越深。
          </p>
        </div>
      </div>

      <div className='hd-takeaways'>
        <div className='hd-takeaway'>
          <span className='hd-takeaway-num'>01</span>
          边框在暗示“这是一个独立区域”。三层嵌套边框，等于给读者三个不必要的视觉边界。
        </div>
        <div className='hd-takeaway'>
          <span className='hd-takeaway-num'>02</span>
          字号、字重、颜色的深浅对比，同样能传达“谁是主、谁是次”，而且视线扫过去更轻。
        </div>
        <div className='hd-takeaway'>
          <span className='hd-takeaway-num'>03</span>
          留白比边框更安静地分组：靠得近的是一组，留白大的地方，自然就是两组。
        </div>
        <div className='hd-takeaway'>
          <span className='hd-takeaway-num'>04</span>
          背景色的浓淡也是一种层级信号：颜色越浓、越靠近观感“前景”，天然就读作“嵌套得更深”，不需要一条线来宣告。
        </div>
      </div>
    </div>
  )
}
