/**
 * IconSwapDemo.tsx
 *
 * 观点：一个按钮在几种图标之间切换（本站的主题切换：跟随系统 / 浅色 / 深色）时，
 * 别直接把图标换掉。三种做法并排：
 * 1. 直接替换：只渲染当前图标，点下去像闪了一帧。
 * 2. 只做淡入淡出：中途两个图标叠在一起，能看到“重影”。
 * 3. 模糊 + 缩放（本站做法）：opacity + blur(4px) + scale(0.6)，0.25s ease。
 *
 * 三个按钮各自独立，一个一个点着对比手感；“慢放”把时长拉到 0.75s（×3），
 * 中间帧就看得清了。系统开启减少动态效果时，过渡全部关闭，状态照样切换。
 */
import { useState, type CSSProperties } from 'react'

type Mode = 'system' | 'light' | 'dark'

const ORDER: Mode[] = ['system', 'light', 'dark']
const MODE_LABEL: Record<Mode, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色'
}

function SystemIcon() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true'>
      <rect x='3' y='4' width='18' height='12' rx='2' />
      <path d='M8 20h8M12 16v4' />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true'>
      <circle cx='12' cy='12' r='4' />
      <path d='M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4' />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true'>
      <path d='M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z' />
    </svg>
  )
}

const ICONS: Record<Mode, () => React.JSX.Element> = {
  system: SystemIcon,
  light: SunIcon,
  dark: MoonIcon
}

type Variant = 'swap' | 'fade' | 'blur'

const VARIANTS: { id: Variant; tag: string; tone: 'bad' | 'good'; caption: string }[] = [
  {
    id: 'swap',
    tag: '✕ 直接替换',
    tone: 'bad',
    caption:
      '只渲染当前那个图标。点下去的瞬间图形“跳”成另一个，像页面闪了一帧，看不出是自己点出来的。'
  },
  {
    id: 'fade',
    tag: '✕ 只做淡入淡出',
    tone: 'bad',
    caption:
      '有过渡了，但中间那几帧，太阳和月亮半透明地叠在一起，眼睛看到的是两个图形，不是一次变化。'
  },
  {
    id: 'blur',
    tag: '✓ 模糊 + 缩放（本站）',
    tone: 'good',
    caption:
      '旧图标缩小、变糊、淡出，新图标从糊到清、从小到大。模糊把两个轮廓揉成一团，读起来就是“它变了”。'
  }
]

function ToggleButton({
  variant,
  mode,
  onClick
}: {
  variant: Variant
  mode: Mode
  onClick: () => void
}) {
  return (
    <button
      type='button'
      className='is-btn'
      data-variant={variant}
      onClick={onClick}
      aria-label={`切换主题，当前：${MODE_LABEL[mode]}`}
    >
      {variant === 'swap' ? (
        <span className='is-icon' data-on='true'>
          {ICONS[mode]()}
        </span>
      ) : (
        ORDER.map((m) => (
          <span className='is-icon' data-on={m === mode} key={m}>
            {ICONS[m]()}
          </span>
        ))
      )}
    </button>
  )
}

function Column({ variant }: { variant: (typeof VARIANTS)[number] }) {
  const [mode, setMode] = useState<Mode>('system')
  const next = () => setMode((m) => ORDER[(ORDER.indexOf(m) + 1) % ORDER.length]!)

  return (
    <div className='is-col'>
      <span className={`is-tag is-tag--${variant.tone}`}>{variant.tag}</span>
      <div className='is-frame'>
        <div className='is-chrome' aria-hidden='true'>
          joye.
          <span className='is-chrome-nav'>
            <span />
            <span />
            <span />
          </span>
        </div>
        <div className='is-stage'>
          <ToggleButton variant={variant.id} mode={mode} onClick={next} />
          <span className='is-state' aria-live='polite'>
            {MODE_LABEL[mode]}
          </span>
        </div>
      </div>
      <p className='is-caption'>{variant.caption}</p>
    </div>
  )
}

export default function IconSwapDemo() {
  const [slow, setSlow] = useState(false)

  return (
    <div className='is-root' style={{ '--is-dur': slow ? '0.75s' : '0.25s' } as CSSProperties}>
      <style>{`
        .is-root {
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
          --btn-line: rgba(23,27,26,0.14);
          --btn-hover: rgba(23,27,26,0.05);
          --accent: #3B6E8C;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .is-root {
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
          --btn-line: rgba(255,255,255,0.16);
          --btn-hover: rgba(255,255,255,0.06);
          --accent: #86AEC6;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .is-root *, .is-root *::before, .is-root *::after { box-sizing: border-box; }

        .is-bar {
          max-width: 1080px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 16px;
        }
        .is-hint { font-size: 13px; color: var(--muted); }
        .is-state {
          font-size: 12px;
          color: var(--muted);
        }
        .is-switch {
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
        .is-track {
          width: 26px;
          height: 16px;
          border-radius: 999px;
          background: var(--faint);
          position: relative;
          transition: background 0.2s ease;
        }
        .is-track::after {
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
        .is-switch[aria-pressed='true'] .is-track { background: var(--accent); }
        .is-switch[aria-pressed='true'] .is-track::after { transform: translateX(10px); }
        .is-switch:focus-visible, .is-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }

        .is-compare {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1080px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .is-compare { grid-template-columns: 1fr; max-width: 420px; }
        }
        .is-col { display: flex; flex-direction: column; gap: 10px; }
        .is-tag {
          font: 500 12px/1.4 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
        }
        .is-tag--bad { color: var(--bad); }
        .is-tag--good { color: var(--good); }

        .is-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        /* A miniature site header, so the button is seen where it really lives. */
        .is-chrome {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--rule);
          font-size: 13px;
          font-weight: 600;
        }
        .is-chrome-nav {
          display: flex;
          gap: 6px;
          margin-left: auto;
        }
        .is-chrome-nav span {
          width: 22px;
          height: 6px;
          border-radius: 999px;
          background: var(--rule);
        }
        .is-stage {
          height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }
        .is-btn {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 16px;
          border: 1px solid var(--btn-line);
          background: transparent;
          color: var(--ink);
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .is-btn:hover { background: var(--btn-hover); }
        }
        .is-icon {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 32px;
          height: 32px;
          pointer-events: none;
        }
        .is-icon svg {
          width: 100%;
          height: 100%;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* fade: opacity only */
        .is-btn[data-variant='fade'] .is-icon {
          opacity: 0;
          transition: opacity var(--is-dur) ease;
        }
        .is-btn[data-variant='fade'] .is-icon[data-on='true'] { opacity: 1; }

        /* blur: the site's Blurred Icon Transition */
        .is-btn[data-variant='blur'] .is-icon {
          opacity: 0;
          filter: blur(4px);
          transform: scale(0.6);
          transition:
            opacity var(--is-dur) ease,
            filter var(--is-dur) ease,
            transform var(--is-dur) ease;
        }
        .is-btn[data-variant='blur'] .is-icon[data-on='true'] {
          opacity: 1;
          filter: blur(0);
          transform: scale(1);
        }

        .is-caption {
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--muted);
          margin: 2px 2px 0;
        }

        .is-takeaways {
          max-width: 1080px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .is-takeaways { grid-template-columns: 1fr; max-width: 420px; }
        }
        .is-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .is-num {
          font: 11px 'JetBrains Mono', monospace;
          color: var(--faint);
          display: block;
          margin-bottom: 6px;
        }

        @media (prefers-reduced-motion: reduce) {
          .is-root .is-icon, .is-track, .is-track::after, .is-btn { transition: none !important; }
        }
      `}</style>

      <div className='is-bar'>
        <span className='is-hint'>一个一个点，感受三种切换的手感。</span>
        <button
          type='button'
          className='is-switch'
          aria-pressed={slow}
          onClick={() => setSlow((s) => !s)}
        >
          <span className='is-track' aria-hidden='true' />
          慢放 ×3
        </button>
      </div>

      <div className='is-compare'>
        {VARIANTS.map((v) => (
          <Column key={v.id} variant={v} />
        ))}
      </div>

      <div className='is-takeaways'>
        <div className='is-takeaway'>
          <span className='is-num'>01</span>
          状态切换不要“瞬间替换”。哪怕只有零点几秒的过渡，也能让人确认：这个变化是我刚才点出来的。
        </div>
        <div className='is-takeaway'>
          <span className='is-num'>02</span>
          缩放带来点击感：旧图标缩下去、新图标弹出来，和手指按下、松开的节奏对得上。模糊负责把两个轮廓揉成一个，避免重影。
        </div>
        <div className='is-takeaway'>
          <span className='is-num'>03</span>
          要快。整个过程在四分之一秒左右，正常速度下你不会注意到动画本身，只会觉得“切得很顺”。
        </div>
      </div>
    </div>
  )
}
