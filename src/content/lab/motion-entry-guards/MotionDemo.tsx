/**
 * MotionDemo.tsx
 *
 * 观点：prefers-reduced-motion 不是“页面加载时问一次”就完事。一段入场动画往往有
 * 好几个入口：首次进入、重放按钮、延迟几秒后自动播放；用户也可能在播放途中改设置。
 * - 左：只在“进入页面”时检查，重放和延迟播放都忘了问。
 * - 右：每个入口都走同一个守卫；延迟播放在到点时再问一次；播放途中偏好变了，
 *   立刻跳到终点。
 *
 * 顶部开关模拟系统设置（不会改你的系统）。如果你的系统真的开了减少动态效果，
 * 两边都会遵守——反例只演示“漏问模拟开关”，不会真的对你播动画。
 */
import { useEffect, useRef, useState } from 'react'

import { guardedEntry } from './entry'

type Entry = '进入页面' | '重放' | '2 秒后自动播' | '播放途中'
type Outcome = 'played' | 'blocked' | 'stopped' | 'waiting' | 'superseded'
interface Attempt {
  id: number
  entry: Entry
  outcome: Outcome
  bad: boolean
}

const ENTRIES: Entry[] = ['进入页面', '重放', '2 秒后自动播'] // '播放途中' is logged, not clicked
const OUTCOME_TEXT: Record<Outcome, string> = {
  played: '播放了',
  blocked: '已拦截',
  stopped: '中途停下，直接到终点',
  waiting: '计时中…',
  superseded: '被下一次操作取代'
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const systemReduce = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

let nextId = 0

function Stage({ fixed, reduce }: { fixed: boolean; reduce: boolean }) {
  const stage = useRef<HTMLDivElement>(null)
  const running = useRef<Animation[]>([])
  const reduceRef = useRef(reduce)
  const generation = useRef(0)
  const [log, setLog] = useState<Attempt[]>([])

  const add = (entry: Entry, outcome: Outcome) => {
    const attempt = { id: ++nextId, entry, outcome, bad: outcome === 'played' && reduceRef.current }
    setLog((l) => [attempt, ...l].slice(0, 4))
    return attempt.id
  }
  const settle = (id: number, outcome: Outcome) =>
    setLog((l) =>
      l.map((a) =>
        a.id === id ? { ...a, outcome, bad: outcome === 'played' && reduceRef.current } : a
      )
    )

  function finishAll() {
    const any = running.current.some((a) => a.playState === 'running')
    running.current.forEach((a) => a.finish())
    running.current = []
    return any
  }

  // The fixed side listens for the preference changing mid-flight.
  useEffect(() => {
    reduceRef.current = reduce
    // A pending delayed start re-checks reduceRef when it wakes, so it is blocked there.
    if (!fixed || !reduce) return
    if (finishAll()) add('播放途中', 'stopped')
  }, [reduce, fixed])

  useEffect(
    () => () => {
      generation.current++
      running.current.forEach((a) => a.cancel())
    },
    []
  )

  function play() {
    finishAll()
    const pieces = stage.current?.querySelectorAll<HTMLElement>('[data-piece]') ?? []
    running.current = Array.from(pieces, (el, i) =>
      el.animate(
        [
          { opacity: 0, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'none' }
        ],
        { duration: 900, delay: i * 140, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }
      )
    )
  }

  async function enter(entry: Entry) {
    const token = ++generation.current
    // ✕ side only asks on the first entry; ✓ side asks on every entry.
    const asks = fixed || entry === '进入页面'
    const blocked = () =>
      token !== generation.current || systemReduce() || (asks && reduceRef.current)

    const delayed = entry === '2 秒后自动播'
    const id = add(entry, delayed ? 'waiting' : 'played')
    const started = await guardedEntry(
      blocked,
      () => (delayed ? wait(2000) : Promise.resolve()),
      () => play()
    )
    settle(id, started ? 'played' : token !== generation.current ? 'superseded' : 'blocked')
  }

  return (
    <div className='me-frame'>
      <div className='me-stage' ref={stage} aria-hidden='true'>
        <div className='me-hero' data-piece>
          <span className='me-avatar' />
          <span className='me-lines'>
            <i style={{ width: '70%' }} />
            <i style={{ width: '45%' }} />
          </span>
        </div>
        <div className='me-cards'>
          <span data-piece />
          <span data-piece />
          <span data-piece />
        </div>
      </div>
      <div className='me-entries'>
        {ENTRIES.map((entry) => (
          <button type='button' key={entry} onClick={() => void enter(entry)}>
            {entry}
          </button>
        ))}
      </div>
      <ol className='me-log' aria-live='polite'>
        {log.length === 0 ? (
          <li className='me-empty'>每次尝试会记在这里。</li>
        ) : (
          log.map((a) => (
            <li key={a.id} data-outcome={a.outcome} data-bad={a.bad}>
              <span className='me-entry'>{a.entry}</span>
              <span className='me-arrow'>→</span>
              {OUTCOME_TEXT[a.outcome]}
              {a.bad && <em>开着“减少动态”还在播</em>}
            </li>
          ))
        )}
      </ol>
    </div>
  )
}

export default function MotionDemo() {
  const [reduce, setReduce] = useState(false)
  const [system, setSystem] = useState(false)

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setSystem(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return (
    <div className='me-root'>
      <style>{`
        .me-root {
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
          --stage: #F6F7F4;
          --piece: rgba(23,27,26,0.09);
          --piece-strong: rgba(59,110,140,0.35);
          --bad-soft: rgba(184,64,44,0.09);
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .me-root {
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
          --stage: #191C21;
          --piece: rgba(255,255,255,0.08);
          --piece-strong: rgba(134,174,198,0.4);
          --bad-soft: rgba(241,122,107,0.12);
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .me-root *, .me-root *::before, .me-root *::after { box-sizing: border-box; }
        .me-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .me-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 16px;
        }
        .me-switch {
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
        .me-track {
          width: 26px;
          height: 16px;
          border-radius: 999px;
          background: var(--faint);
          position: relative;
          transition: background 0.2s ease;
        }
        .me-track::after {
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
        .me-switch[aria-pressed='true'] .me-track { background: var(--accent); }
        .me-switch[aria-pressed='true'] .me-track::after { transform: translateX(10px); }
        .me-hint { font-size: 13px; color: var(--muted); }

        .me-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .me-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .me-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .me-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .me-tag--bad { color: var(--bad); }
        .me-tag--good { color: var(--good); }
        .me-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .me-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .me-stage {
          background: var(--stage);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          border-bottom: 1px solid var(--rule);
        }
        .me-hero { display: flex; align-items: center; gap: 12px; }
        .me-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--piece-strong); flex: none; }
        .me-lines { flex: 1; display: flex; flex-direction: column; gap: 7px; }
        .me-lines i { display: block; height: 8px; border-radius: 999px; background: var(--piece); }
        .me-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .me-cards span { height: 52px; border-radius: 8px; background: var(--piece); }

        .me-entries {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--rule);
        }
        .me-entries button {
          font: 500 12px/1 'Public Sans', sans-serif;
          color: var(--ink);
          background: transparent;
          border: 1px solid var(--rule);
          border-radius: 6px;
          padding: 8px 11px;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.15s ease;
        }
        .me-entries button:active { transform: scale(0.97); }
        @media (hover: hover) and (pointer: fine) {
          .me-entries button:hover { background: var(--stage); }
        }

        .me-log {
          list-style: none;
          margin: 0;
          padding: 10px 16px 14px;
          min-height: 132px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        .me-log li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; padding: 3px 6px; border-radius: 4px; }
        .me-log li[data-outcome='blocked'], .me-log li[data-outcome='stopped'] { color: var(--good); }
        .me-log li[data-bad='true'] { color: var(--bad); background: var(--bad-soft); }
        .me-log em { font-style: normal; font-size: 11.5px; margin-left: auto; }
        .me-entry { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--muted); }
        .me-arrow { color: var(--faint); }
        .me-empty { color: var(--faint); }

        .me-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .me-takeaways { grid-template-columns: 1fr; max-width: 480px; }
        }
        .me-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .me-num { font: 11px 'JetBrains Mono', monospace; color: var(--faint); display: block; margin-bottom: 6px; }

        @media (prefers-reduced-motion: reduce) {
          .me-root *, .me-root *::before, .me-root *::after { transition: none !important; }
          .me-entries button:active { transform: none; }
        }
      `}</style>

      <div className='me-bar'>
        <button
          type='button'
          className='me-switch'
          aria-pressed={reduce}
          onClick={() => setReduce((r) => !r)}
        >
          <span className='me-track' aria-hidden='true' />
          模拟：减少动态效果
        </button>
        <span className='me-hint'>
          {system
            ? '你的系统已开启减少动态效果，两边都不会真的播放。'
            : '先点几次入口看动画，再打开开关，挨个入口试一遍。'}
        </span>
      </div>

      <div className='me-compare'>
        <div className='me-col'>
          <span className='me-tag me-tag--bad'>✕ 只在进入页面时问一次</span>
          <Stage fixed={false} reduce={reduce} />
          <p className='me-caption'>
            “进入页面”会检查偏好，于是看起来没问题。可“重放”和“2
            秒后自动播”走的是另外的代码路径，谁都没去问。
          </p>
        </div>
        <div className='me-col'>
          <span className='me-tag me-tag--good'>✓ 每个入口都过同一个守卫</span>
          <Stage fixed reduce={reduce} />
          <p className='me-caption'>
            所有入口调用同一个函数；延迟播放到点时再问一次；播放途中打开开关，动画直接跳到终点，内容一点不少。
          </p>
        </div>
      </div>

      <div className='me-takeaways'>
        <div className='me-takeaway'>
          <span className='me-num'>01</span>
          把“要不要播”收进一个守卫函数，所有入口都调用它，而不是在第一个入口写一句 if。
        </div>
        <div className='me-takeaway'>
          <span className='me-num'>02</span>
          中间隔着 await、setTimeout 或动态 import
          的，回来以后要再问一次——等待期间设置可能已经变了。
        </div>
        <div className='me-takeaway'>
          <span className='me-num'>03</span>
          监听 matchMedia 的 change 事件；正在播的动画用 finish() 直接到终点，别用 cancel()
          把内容留在半路。
        </div>
      </div>
    </div>
  )
}
