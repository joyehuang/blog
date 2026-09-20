/**
 * AbsorbTimeline.tsx
 *
 * Harness 那篇博文第二节的交互图：换一代模型，看 Harness 里哪些补丁被学走、哪些一直留着。
 *
 * 两种用法：
 * 1. 选一个阶段（2022 → 下一代）：左栏的补丁在「尚未出现 / 在用 / 已进模型」之间变化，
 *    右栏那些学不走的东西一项不少，分量逐代变重。
 * 2. 点任意一项：下方面板解释它补的是什么、为什么会（或不会）被学走。
 *
 * 布局稳定性：
 * - 两栏的每一行始终渲染，阶段切换只改透明度、删除线和徽章文字，行高不变。
 * - 徽章宽度固定；阶段说明和下方面板都预留了最小高度，切换时页面不跳。
 * - 面板内容切换用一次淡入，而不是硬切。
 *
 * 样式只用站点的语义 token，明暗主题自动跟随。prefers-reduced-motion 下取消全部过渡和动画。
 */
import { useState } from 'react'

type PatchState = 'future' | 'active' | 'absorbed'

interface Stage {
  label: string
  note: string
}

interface Patch {
  id: string
  name: string
  /** 从哪个阶段开始有人用 */
  from: number
  /** 到哪个阶段进了模型 */
  until: number
  fixes: string
  gone: string
}

interface Keep {
  id: string
  name: string
  why: string
}

const STAGES: Stage[] = [
  { label: '2022', note: '模型外面主要是提示词技巧：怎么问，用什么格式让它调用工具。' },
  { label: '2024', note: '先思考再回答、工具调用都进了模型，上一批技巧没有人再写。新的补丁开始围绕长任务。' },
  { label: '2025', note: 'coding agent 普及，补丁变成了提醒、待办工具和整套开发流程。' },
  { label: '今天', note: '上一批补丁基本都进了模型。右边一项没少，而且每一项都更重了。' },
  { label: '下一代', note: '今天还在用的补丁也会走同一条路，留下来的仍然是右边这一栏。' }
]

const PATCHES: Patch[] = [
  {
    id: 'cot',
    name: '「Let’s think step by step」',
    from: 0,
    until: 1,
    fixes: '模型不会先思考再回答。在提示词末尾加上这一句，推理题的正确率就明显提高。',
    gone: '2024 年推理模型出现，「先思考再回答」被直接训练进了模型。'
  },
  {
    id: 'parse',
    name: '解析文本的工具调用',
    from: 0,
    until: 1,
    fixes: '模型不会调用工具。在提示词里约定一种输出格式，由外部程序解析、执行，再把结果交还给它。',
    gone: '各家把 function calling 做成了原生能力，这一层解析代码不再需要。'
  },
  {
    id: 'todo',
    name: 'Todo List 工具',
    from: 1,
    until: 3,
    fixes: '交给模型五件事，它往往做完三件就停了。加一个待办列表，效果非常明显。',
    gone: '2026 年 8 月的 Claude Code v2.1.233 起，待办工具在新一代模型上默认不再提供。'
  },
  {
    id: 'sysprompt',
    name: '纠正旧模型问题的系统提示词',
    from: 2,
    until: 3,
    fixes: '模型本该做到却做不到的行为，一条一条写进系统提示词里提醒。',
    gone: 'Opus 5 发布时，Claude Code 删掉了 80% 的系统提示词，去掉之后模型的表现反而略有提升。'
  },
  {
    id: 'test',
    name: '「改完记得跑测试」',
    from: 2,
    until: 3,
    fixes: '早期的 Codex 改完代码不会主动跑测试，只能在提示词里加一句提醒。',
    gone: '几个月后训练出的新模型自己会跑，这句提醒就删掉了。'
  },
  {
    id: 'process',
    name: '整套开发流程 Skills',
    from: 2,
    until: 3,
    fixes: 'Superpowers 这一类：先 brainstorm、再拆计划、强制 TDD、做完 review，补的是模型在规划和执行上的判断。',
    gone: 'GPT-6 发布之后，很多人不再用它。模型自己具备了这种判断，流程就从帮助变成了负担。'
  },
  {
    id: 'grill',
    name: '动手前的追问（grill-me）',
    from: 3,
    until: 4,
    fixes: '在动手之前反过来追问你，把只有你知道的信息问出来。',
    gone: '下一代模型很可能自己就知道什么时候该停下来提问、该问什么。'
  }
]

const KEEPS: Keep[] = [
  {
    id: 'fact',
    name: '取回真实的结果',
    why: '「测试通过了」从模型口中说出来只是一句话，真实的退出码要由程序去取。模型越强，完成报告读起来越可靠，也就越难靠读报告发现问题。'
  },
  {
    id: 'perm',
    name: '权限和边界',
    why: '「它会选择不读」和「它读不了」是两回事，只有后者才是保证。规则可以让模型起草，执行必须交给沙箱和权限系统。'
  },
  {
    id: 'state',
    name: '进度和触发',
    why: '模型只在被调用的那几秒存在。谁来触发、崩溃之后从哪一步继续、哪些操作不能重复，都发生在它不在场的时候。'
  },
  {
    id: 'io',
    name: '通往真实世界的接口',
    why: '模型再聪明，也接触不到没有接给它的东西：数据库、内部系统、IM、邮箱、支付。'
  },
  {
    id: 'human',
    name: '人在哪里介入',
    why: '怎么看到它正在做什么，在哪一步可以打断，哪些操作需要人确认。Claude Code 剩下的代码里那一大块 UI，做的就是这件事。'
  },
  {
    id: 'cost',
    name: '成本',
    why: '用哪个模型，同时开几路，预算花到多少应该停。付账的是你，这笔账只能在模型外面算。'
  },
  {
    id: 'audit',
    name: '追查和撤回',
    why: 'Agent 替你做的事情越多，事后能不能说清楚它做了什么、做错了能不能撤回，就越重要。'
  },
  {
    id: 'ctx',
    name: '你、组织、企业自己的上下文',
    why: '团队为什么这样决定，用户说「老样子」指的是什么，什么样的结果才算合格。这些不在任何人的训练数据里。'
  }
]

const STATE_LABEL: Record<PatchState, string> = {
  future: '尚未出现',
  active: '在用',
  absorbed: '已进模型'
}

const DEFAULT_STAGE = 3

function patchState(p: Patch, stage: number): PatchState {
  if (stage < p.from) return 'future'
  if (stage >= p.until) return 'absorbed'
  return 'active'
}

const CSS = `
.ab {
  --ab-line: hsl(var(--border));
  --ab-fg: hsl(var(--foreground));
  --ab-muted: hsl(var(--muted-foreground));
  --ab-accent: hsl(var(--primary));
  --ab-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ab-dur: 0.32s;
  margin: 1.75rem 0 2rem;
  border: 1px solid var(--ab-line);
  border-radius: 8px;
  background: hsl(var(--card));
  padding: 1rem 1.1rem 1.1rem;
  color: var(--ab-fg);
  font-size: 0.9rem;
  line-height: 1.55;
}
.ab-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  margin-bottom: 0.9rem;
}
.ab-title { font-weight: 600; }
.ab-hint { color: var(--ab-muted); font-size: 0.8rem; }

/* ---------- 阶段 ---------- */
.ab-stages {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.ab-label { font-size: 0.78rem; color: var(--ab-muted); margin-right: 0.2rem; }
.ab-chip {
  border: 1px solid var(--ab-line);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    border-color var(--ab-dur) var(--ab-ease),
    background-color var(--ab-dur) var(--ab-ease),
    color var(--ab-dur) var(--ab-ease);
}
.ab-chip:hover { border-color: hsl(var(--foreground) / 0.3); }
.ab-chip:focus-visible { outline: 2px solid var(--ab-accent); outline-offset: 2px; }
.ab-chip[aria-pressed='true'] { border-color: var(--ab-accent); background: hsl(var(--primary) / 0.12); color: var(--ab-accent); }
.ab-note {
  margin: 0.7rem 0 0;
  min-height: 3.1em;
  color: var(--ab-muted);
  font-size: 0.85rem;
}

/* ---------- 两栏 ---------- */
.ab-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
  margin-top: 0.35rem;
}
.ab-col { min-width: 0; }
.ab-col-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.15rem 0.6rem;
  padding-bottom: 0.45rem;
  margin-bottom: 0.45rem;
  border-bottom: 1px solid var(--ab-line);
}
.ab-col-name { font-weight: 600; }
.ab-col-sub { font-size: 0.76rem; color: var(--ab-muted); }
.ab-col-meta {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.74rem;
  color: var(--ab-muted);
}
.ab-meter { display: inline-flex; gap: 3px; }
.ab-meter i {
  width: 14px;
  height: 6px;
  border-radius: 2px;
  background: hsl(var(--foreground) / 0.12);
  transition: background-color var(--ab-dur) var(--ab-ease);
}
.ab-meter i[data-on='true'] { background: var(--ab-accent); }

.ab-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.ab-row {
  display: grid;
  grid-template-columns: 1fr max-content;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 2.35rem;
  border: 1px solid var(--ab-line);
  border-radius: 8px;
  background: transparent;
  padding: 0.35rem 0.55rem;
  color: inherit;
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--ab-dur) var(--ab-ease),
    background-color var(--ab-dur) var(--ab-ease),
    opacity var(--ab-dur) var(--ab-ease),
    box-shadow var(--ab-dur) var(--ab-ease);
}
.ab-row:hover { border-color: hsl(var(--foreground) / 0.3); }
.ab-row:focus-visible { outline: 2px solid var(--ab-accent); outline-offset: 2px; }
.ab-row[aria-pressed='true'] { box-shadow: 0 0 0 2px hsl(var(--primary) / 0.35); }
.ab-row-name {
  min-width: 0;
  text-decoration: line-through;
  text-decoration-color: transparent;
  transition:
    color var(--ab-dur) var(--ab-ease),
    text-decoration-color var(--ab-dur) var(--ab-ease);
}
.ab-row[data-state='future'] { opacity: 0.4; border-style: dashed; }
.ab-row[data-state='active'] { border-color: hsl(var(--primary) / 0.55); background: hsl(var(--primary) / 0.08); }
.ab-row[data-state='absorbed'] .ab-row-name { color: var(--ab-muted); text-decoration-color: hsl(var(--muted-foreground) / 0.7); }
.ab-row[data-state='keep'] { background: hsl(var(--muted) / 0.45); }

.ab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 4.9em;
  height: 1.5em;
  padding: 0 0.5em;
  border: 1px solid var(--ab-line);
  border-radius: 999px;
  color: var(--ab-muted);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  transition:
    color var(--ab-dur) var(--ab-ease),
    background-color var(--ab-dur) var(--ab-ease),
    border-color var(--ab-dur) var(--ab-ease);
}
.ab-badge[data-state='active'] { color: var(--ab-accent); border-color: hsl(var(--primary) / 0.5); background: hsl(var(--primary) / 0.12); }
.ab-badge[data-state='future'] { border-style: dashed; }
.ab-badge[data-state='keep'] { color: var(--ab-fg); }

/* ---------- 面板 ---------- */
.ab-panel {
  margin-top: 0.9rem;
  min-height: 8.2rem;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.45);
  padding: 0.8rem 0.9rem;
}
.ab-pane { animation: ab-in var(--ab-dur) var(--ab-ease); }
.ab-pane h4 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.6rem;
  margin: 0 0 0.55rem;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
}
.ab-pane dl {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.4rem 0.9rem;
}
.ab-pane dt { color: var(--ab-muted); font-size: 0.8rem; padding-top: 0.1rem; }
.ab-pane dd { margin: 0; }
@keyframes ab-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}

@media (max-width: 640px) {
  .ab { padding: 0.85rem 0.8rem 0.9rem; }
  .ab-cols { grid-template-columns: 1fr; gap: 1.1rem; }
  .ab-note { min-height: 4.6em; }
  .ab-panel { min-height: 11rem; }
  .ab-pane dl { grid-template-columns: 1fr; gap: 0.15rem; }
  .ab-pane dd { margin-bottom: 0.45rem; }
}

@media (prefers-reduced-motion: reduce) {
  .ab-chip, .ab-row, .ab-row-name, .ab-badge, .ab-meter i { transition: none; }
  .ab-pane { animation: none; }
}
`

export default function AbsorbTimeline() {
  const [stage, setStage] = useState(DEFAULT_STAGE)
  const [selected, setSelected] = useState('todo')

  const states = PATCHES.map((p) => patchState(p, stage))
  const activeCount = states.filter((s) => s === 'active').length
  const absorbedCount = states.filter((s) => s === 'absorbed').length

  const patch = PATCHES.find((p) => p.id === selected)
  const keep = KEEPS.find((k) => k.id === selected)

  return (
    <figure className='ab not-prose'>
      <style>{CSS}</style>

      <figcaption className='ab-head'>
        <span className='ab-title'>图 1 · 模型每强一代，Harness 里少了什么、剩下什么</span>
        <span className='ab-hint'>选一个阶段；点任意一项看原因。</span>
      </figcaption>

      <div className='ab-stages' role='group' aria-label='模型所处的阶段'>
        <span className='ab-label'>模型走到</span>
        {STAGES.map((s, i) => (
          <button
            type='button'
            className='ab-chip'
            aria-pressed={stage === i}
            onClick={() => setStage(i)}
            key={s.label}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className='ab-note' aria-live='polite'>
        {STAGES[stage].note}
      </p>

      <div className='ab-cols'>
        <section className='ab-col' aria-label='会被学走的补丁'>
          <div className='ab-col-head'>
            <span className='ab-col-name'>会被学走</span>
            <span className='ab-col-sub'>替模型的判断兜底</span>
            <span className='ab-col-meta'>
              在用 {activeCount} · 已进模型 {absorbedCount}
            </span>
          </div>
          <ul className='ab-list'>
            {PATCHES.map((p, i) => (
              <li key={p.id}>
                <button
                  type='button'
                  className='ab-row'
                  data-state={states[i]}
                  aria-pressed={selected === p.id}
                  onClick={() => setSelected(p.id)}
                >
                  <span className='ab-row-name'>{p.name}</span>
                  <span className='ab-badge' data-state={states[i]}>
                    {STATE_LABEL[states[i]]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className='ab-col' aria-label='学不走的部分'>
          <div className='ab-col-head'>
            <span className='ab-col-name'>学不走</span>
            <span className='ab-col-sub'>模型再聪明，也得有人在外面做</span>
            <span className='ab-col-meta'>
              分量
              <span className='ab-meter' aria-hidden='true'>
                {STAGES.map((s, i) => (
                  <i data-on={i <= stage} key={s.label} />
                ))}
              </span>
              示意：模型越强，越敢放手，这些越重
            </span>
          </div>
          <ul className='ab-list'>
            {KEEPS.map((k) => (
              <li key={k.id}>
                <button
                  type='button'
                  className='ab-row'
                  data-state='keep'
                  aria-pressed={selected === k.id}
                  onClick={() => setSelected(k.id)}
                >
                  <span className='ab-row-name'>{k.name}</span>
                  <span className='ab-badge' data-state='keep'>
                    一直在
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className='ab-panel' aria-live='polite'>
        {patch && (
          <div className='ab-pane' key={patch.id}>
            <h4>
              {patch.name}
              <span className='ab-badge' data-state={patchState(patch, stage)}>
                {STATE_LABEL[patchState(patch, stage)]}
              </span>
            </h4>
            <dl>
              <dt>补的是什么</dt>
              <dd>{patch.fixes}</dd>
              <dt>后来</dt>
              <dd>{patch.gone}</dd>
            </dl>
          </div>
        )}
        {keep && (
          <div className='ab-pane' key={keep.id}>
            <h4>
              {keep.name}
              <span className='ab-badge' data-state='keep'>
                一直在
              </span>
            </h4>
            <dl>
              <dt>为什么学不走</dt>
              <dd>{keep.why}</dd>
            </dl>
          </div>
        )}
      </div>
    </figure>
  )
}
