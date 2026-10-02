/**
 * SkeletonDemo.tsx
 *
 * 观点：整块内容加载时，骨架屏比空白和转圈都好。三个同样的“动态”列表并排，
 * 同时开始加载，2 秒后同时拿到同一份内容：
 * - 空白：只有页头，下面什么都没有，像坏了。（内容其实已经按最终版式占好位，只是隐藏，
 *   所以高度不变，突出的是“没有反馈”这一点。）
 * - 转圈：知道在加载，但不知道会来什么；内容到了整块冒出来，下面的“查看更多”被顶下去。
 * - 骨架屏：灰块和最终版式一一对应（同样的行高、同样的头像尺寸），内容原地填上，不跳。
 * “重新加载”让三个一起重播。骨架的呼吸动画和内容淡入在减少动态效果时关闭。
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const LOAD_MS = 2000

const POSTS = [
  {
    name: '林一',
    meta: '3 分钟前',
    initial: '林',
    tone: '#3B6E8C',
    text: '周末把家里的书架重新整理了一遍，按读完和没读完分成两排，没读完的那排比想象中长得多。'
  },
  {
    name: '周晓',
    meta: '18 分钟前',
    initial: '周',
    tone: '#1F6F4A',
    text: '今天第一次自己做了酸面包，发酵时间没掌握好，切开有点塌，但味道比买的还要香。'
  },
  {
    name: '陈默',
    meta: '1 小时前',
    initial: '陈',
    tone: '#B8702C',
    text: '下班路上换了一条没走过的街，发现一家开了二十多年的旧书店，老板说下个月就要搬走了。'
  }
]

const BONES: { name: string; meta: string; line2: string }[] = [
  { name: '34%', meta: '22%', line2: '72%' },
  { name: '28%', meta: '26%', line2: '58%' },
  { name: '31%', meta: '20%', line2: '80%' }
]

type Variant = 'blank' | 'spinner' | 'skeleton'

const COLUMNS: { id: Variant; tag: string; tone: 'bad' | 'good'; caption: string }[] = [
  {
    id: 'blank',
    tag: '✕ 空白',
    tone: 'bad',
    caption: '两秒钟什么都没有。页头还在，下面一片空白，人会以为页面坏了，开始刷新或者直接离开。'
  },
  {
    id: 'spinner',
    tag: '✕ 转圈',
    tone: 'bad',
    caption:
      '知道在加载，但不知道会来什么。盯住下面的“查看更多”：内容一到，它会被整块冒出来的列表一下顶到最底下。'
  },
  {
    id: 'skeleton',
    tag: '✓ 骨架屏',
    tone: 'good',
    caption:
      '先把版式画出来：头像、名字、两行正文各在什么位置，一眼就知道。内容到了原地填上，“查看更多”一动不动。'
  }
]

function Feed() {
  return (
    <div className='sk-feed'>
      {POSTS.map((p) => (
        <article className='sk-post' key={p.name}>
          <div className='sk-head'>
            <span className='sk-avatar' style={{ background: p.tone }} aria-hidden='true'>
              {p.initial}
            </span>
            <div className='sk-who'>
              <div className='sk-name'>{p.name}</div>
              <div className='sk-meta'>{p.meta}</div>
            </div>
          </div>
          <p className='sk-text'>{p.text}</p>
        </article>
      ))}
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className='sk-feed sk-feed--bones' aria-hidden='true'>
      {BONES.map((b, i) => (
        <div className='sk-post' key={i}>
          <div className='sk-head'>
            <span className='sk-avatar sk-bone' />
            <div className='sk-who'>
              <div className='sk-name'>
                <span className='sk-bar sk-bone' style={{ width: b.name }} />
              </div>
              <div className='sk-meta'>
                <span className='sk-bar sk-bar--thin sk-bone' style={{ width: b.meta }} />
              </div>
            </div>
          </div>
          <div className='sk-text'>
            <div className='sk-line'>
              <span className='sk-bar sk-bone' style={{ width: '100%' }} />
            </div>
            <div className='sk-line'>
              <span className='sk-bar sk-bone' style={{ width: b.line2 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <svg className='sk-spinner' viewBox='0 0 16 16' aria-hidden='true'>
      <circle className='sk-spin-track' cx='8' cy='8' r='6' />
      <path className='sk-spin-arc' d='M8 2a6 6 0 0 1 6 6' />
    </svg>
  )
}

function More() {
  return (
    <div className='sk-more' aria-hidden='true'>
      查看更多
    </div>
  )
}

function Screen({ variant, loaded, round }: { variant: Variant; loaded: boolean; round: number }) {
  let body: ReactNode
  if (loaded) {
    body = (
      <div className='sk-in' key={`in-${round}`}>
        <Feed />
        <More />
      </div>
    )
  } else if (variant === 'blank') {
    // Same final layout, just invisible: the screen is the right size but empty.
    body = (
      <div className='sk-ghost' aria-hidden='true'>
        <Feed />
        <More />
      </div>
    )
  } else if (variant === 'spinner') {
    body = (
      <>
        <div className='sk-wait'>
          <Spinner />
        </div>
        <More />
      </>
    )
  } else {
    body = (
      <>
        <FeedSkeleton />
        <More />
      </>
    )
  }

  return (
    <div className='sk-frame' aria-busy={!loaded}>
      <div className='sk-chrome' aria-hidden='true'>
        动态
        <span className='sk-chrome-nav'>
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className='sk-body'>{body}</div>
    </div>
  )
}

export default function SkeletonDemo() {
  const [loaded, setLoaded] = useState(false)
  const [round, setRound] = useState(0)
  const timer = useRef<number | undefined>(undefined)

  const reload = useCallback(() => {
    window.clearTimeout(timer.current)
    setLoaded(false)
    setRound((r) => r + 1)
    timer.current = window.setTimeout(() => setLoaded(true), LOAD_MS)
  }, [])

  useEffect(() => {
    reload()
    return () => window.clearTimeout(timer.current)
  }, [reload])

  return (
    <div className='sk-root'>
      <style>{`
        .sk-root {
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
          --bone: rgba(23,27,26,0.08);
          --bone-hi: rgba(23,27,26,0.14);
          --accent: #3B6E8C;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .sk-root {
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
          --bone: rgba(255,255,255,0.07);
          --bone-hi: rgba(255,255,255,0.13);
          --accent: #86AEC6;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .sk-root *, .sk-root *::before, .sk-root *::after { box-sizing: border-box; }
        .sk-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .sk-bar-row {
          max-width: 1080px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 14px;
        }
        .sk-hint { font-size: 13px; color: var(--muted); }
        .sk-reload {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--ink-soft);
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          padding: 8px 14px 8px 11px;
          cursor: pointer;
          box-shadow: var(--shadow);
          transition: color 0.2s ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .sk-reload:hover { color: var(--ink); }
        }
        .sk-reload svg {
          width: 13px;
          height: 13px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .sk-status {
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--muted);
        }
        .sk-status[data-loaded='true'] { color: var(--good); }

        .sk-compare {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1080px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .sk-compare { grid-template-columns: 1fr; max-width: 420px; }
        }
        .sk-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .sk-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .sk-tag--bad { color: var(--bad); }
        .sk-tag--good { color: var(--good); }
        .sk-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .sk-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .sk-chrome {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--rule);
          font-size: 13px;
          font-weight: 600;
        }
        .sk-chrome-nav { display: flex; gap: 6px; margin-left: auto; }
        .sk-chrome-nav span { width: 22px; height: 6px; border-radius: 999px; background: var(--rule); }

        .sk-body { padding: 4px 14px 14px; }
        .sk-ghost { visibility: hidden; }

        .sk-post { padding: 12px 0; }
        .sk-post + .sk-post { border-top: 1px solid var(--rule); }
        .sk-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .sk-avatar {
          flex: none;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
        }
        .sk-who { flex: 1; min-width: 0; }
        .sk-name {
          height: 18px;
          display: flex;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
          line-height: 18px;
        }
        .sk-meta {
          height: 16px;
          display: flex;
          align-items: center;
          font-size: 11.5px;
          line-height: 16px;
          color: var(--muted);
        }
        .sk-text {
          margin: 0;
          height: 40px;
          font-size: 13px;
          line-height: 20px;
          color: var(--ink-soft);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sk-feed--bones .sk-text { display: block; }
        .sk-line { height: 20px; display: flex; align-items: center; }
        .sk-bar { display: block; height: 10px; border-radius: 4px; }
        .sk-bar--thin { height: 8px; }
        .sk-bone { background: var(--bone); animation: sk-pulse 1.4s ease-in-out infinite; }
        @keyframes sk-pulse {
          0%, 100% { background: var(--bone); }
          50% { background: var(--bone-hi); }
        }

        .sk-more {
          margin-top: 6px;
          text-align: center;
          font-size: 12.5px;
          color: var(--accent);
          padding: 8px;
          border: 1px solid var(--rule);
          border-radius: 8px;
        }

        .sk-wait {
          height: 88px;
          display: grid;
          place-items: center;
          color: var(--muted);
        }
        .sk-spinner { width: 22px; height: 22px; animation: sk-spin 0.8s linear infinite; }
        .sk-spin-track { fill: none; stroke: currentColor; stroke-opacity: 0.25; stroke-width: 1.8; }
        .sk-spin-arc { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
        @keyframes sk-spin { to { transform: rotate(360deg); } }

        .sk-in { animation: sk-fade 0.3s ease both; }
        @keyframes sk-fade { from { opacity: 0; } to { opacity: 1; } }

        .sk-takeaways {
          max-width: 1080px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .sk-takeaways { grid-template-columns: 1fr; max-width: 420px; }
        }
        .sk-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .sk-num { font: 11px 'JetBrains Mono', monospace; color: var(--faint); display: block; margin-bottom: 6px; }

        @media (prefers-reduced-motion: reduce) {
          .sk-bone, .sk-spinner, .sk-in { animation: none; }
          .sk-root *, .sk-root *::before, .sk-root *::after { transition: none !important; }
        }
      `}</style>

      <div className='sk-bar-row'>
        <span className='sk-hint'>三种做法同时开始加载，2 秒后拿到同一份内容。</span>
        <button type='button' className='sk-reload' onClick={reload}>
          <svg viewBox='0 0 16 16' aria-hidden='true'>
            <path d='M13.5 8a5.5 5.5 0 1 1-1.6-3.9' />
            <path d='M13.5 2.5v3h-3' />
          </svg>
          重新加载
        </button>
        <span className='sk-status' data-loaded={loaded} aria-live='polite'>
          {loaded ? '已加载' : '加载中…'}
        </span>
      </div>

      <div className='sk-compare'>
        {COLUMNS.map((c) => (
          <div className='sk-col' key={c.id}>
            <span className={`sk-tag sk-tag--${c.tone}`}>{c.tag}</span>
            <Screen variant={c.id} loaded={loaded} round={round} />
            <p className='sk-caption'>{c.caption}</p>
          </div>
        ))}
      </div>

      <div className='sk-takeaways'>
        <div className='sk-takeaway'>
          <span className='sk-num'>01</span>
          空白最糟。没有任何反馈，人会以为页面卡住了。哪怕只放一个转圈，也比一片空白强。
        </div>
        <div className='sk-takeaway'>
          <span className='sk-num'>02</span>
          转圈只说“在等”，不说“等什么”。内容到的那一刻整块出现，下面的东西被顶走，视线要重新找位置。
        </div>
        <div className='sk-takeaway'>
          <span className='sk-num'>03</span>
          骨架屏和最终版式一一对应。等待时眼睛已经在熟悉结构，内容来了只是“填进去”，等待也显得更短。
        </div>
      </div>
    </div>
  )
}
