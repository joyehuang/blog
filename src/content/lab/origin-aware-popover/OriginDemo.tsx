/**
 * OriginDemo.tsx
 *
 * 观点：下拉菜单、弹出层放大出现时，应该从触发它的那个按钮那一侧长出来，
 * 而不是从自己的正中间。动作本身就交代了“它是从哪来的”。
 * - 左：三个菜单都以自身中心为缩放原点。
 * - 右：左上的按钮 → 左上角；右上的按钮 → 右上角；右下的悬浮按钮 → 右下角往上长。
 * 两边共用同一个“当前打开的菜单”，点任一边的按钮，两边同时打开，方便对照。
 * “慢放”把时长从 200ms 拉到 600ms，并在菜单上标出缩放原点。
 * 系统开启减少动态效果时，过渡全部关闭，菜单直接出现。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'

type MenuId = 'insert' | 'more' | 'help'
type Variant = 'center' | 'origin'

const MENUS: Record<MenuId, { label: string; items: string[] }> = {
  insert: { label: '插入菜单', items: ['图片', '表格', '分隔线', '代码块'] },
  more: { label: '更多操作', items: ['复制链接', '导出 PDF', '版本历史', '移到废纸篓'] },
  help: { label: '帮助', items: ['键盘快捷键', '帮助中心', '反馈问题'] }
}

const VARIANTS: { id: Variant; tag: string; tone: 'bad' | 'good'; caption: string }[] = [
  {
    id: 'center',
    tag: '✕ 从自己的中心放大',
    tone: 'bad',
    caption:
      '打开慢放，盯住菜单贴着按钮的那条边：它先出现在离按钮有一段距离的地方，再往按钮那边“够”过去。三个菜单的动作一模一样，看不出谁是谁打开的。'
  },
  {
    id: 'origin',
    tag: '✓ 从触发按钮那一侧长出来',
    tone: 'good',
    caption:
      '贴着按钮的那个角从头到尾都不动，菜单从那里铺开。左上的按钮从左上角长，右上的从右上角长，右下的帮助按钮从右下角往上长。'
  }
]

function Chevron() {
  return (
    <svg viewBox='0 0 12 12' aria-hidden='true'>
      <path d='m3 4.5 3 3 3-3' />
    </svg>
  )
}

function Editor({
  variant,
  openId,
  onToggle,
  onClose
}: {
  variant: (typeof VARIANTS)[number]
  openId: MenuId | null
  onToggle: (id: MenuId) => void
  onClose: () => void
}) {
  const menuId = (id: MenuId) => `op-${variant.id}-${id}`

  return (
    <div className='op-col'>
      <span className={`op-tag op-tag--${variant.tone}`}>{variant.tag}</span>
      <div className='op-frame' data-variant={variant.id}>
        <div className='op-toolbar'>
          <button
            type='button'
            className='op-trigger'
            data-trigger='insert'
            aria-expanded={openId === 'insert'}
            aria-controls={menuId('insert')}
            onClick={() => onToggle('insert')}
          >
            插入 <Chevron />
          </button>
          <span className='op-tools' aria-hidden='true'>
            <b>B</b>
            <i>I</i>
            <u>U</u>
          </span>
          <button
            type='button'
            className='op-trigger op-trigger--icon'
            data-trigger='more'
            aria-label='更多操作'
            aria-expanded={openId === 'more'}
            aria-controls={menuId('more')}
            onClick={() => onToggle('more')}
          >
            <svg viewBox='0 0 24 24' aria-hidden='true'>
              <circle cx='5' cy='12' r='1.6' />
              <circle cx='12' cy='12' r='1.6' />
              <circle cx='19' cy='12' r='1.6' />
            </svg>
          </button>
        </div>
        <div className='op-doc' aria-hidden='true'>
          <span className='op-doc-h' />
          <span />
          <span />
          <span className='op-doc-short' />
          <span />
          <span className='op-doc-short' />
        </div>
        <button
          type='button'
          className='op-help'
          data-trigger='help'
          aria-label='帮助'
          aria-expanded={openId === 'help'}
          aria-controls={menuId('help')}
          onClick={() => onToggle('help')}
        >
          ?
        </button>

        {(Object.keys(MENUS) as MenuId[]).map((id) => (
          <div
            key={id}
            id={menuId(id)}
            className='op-menu'
            data-menu={id}
            data-open={openId === id}
            role='menu'
            aria-label={MENUS[id].label}
            aria-hidden={openId !== id}
          >
            <span className='op-pin' aria-hidden='true' />
            {MENUS[id].items.map((item) => (
              <button
                type='button'
                role='menuitem'
                key={item}
                tabIndex={openId === id ? 0 : -1}
                onClick={onClose}
              >
                {item}
              </button>
            ))}
          </div>
        ))}
      </div>
      <p className='op-caption'>{variant.caption}</p>
    </div>
  )
}

export default function OriginDemo() {
  const [slow, setSlow] = useState(false)
  const [openId, setOpenId] = useState<MenuId | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openId) return
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!t?.closest('.op-menu, [data-trigger], .op-switch')) setOpenId(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('pointerdown', onPointer)
    rootRef.current?.addEventListener('keydown', onKey)
    const root = rootRef.current
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      root?.removeEventListener('keydown', onKey)
    }
  }, [openId])

  return (
    <div
      ref={rootRef}
      className='op-root'
      data-slow={slow}
      style={{ '--op-dur': slow ? '0.6s' : '0.2s' } as CSSProperties}
    >
      <style>{`
        .op-root {
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
          --line: rgba(23,27,26,0.08);
          --hover: rgba(23,27,26,0.05);
          --menu: #FFFFFF;
          --menu-line: rgba(23,27,26,0.12);
          --menu-shadow: 0 2px 6px rgba(23,27,26,0.08), 0 14px 32px rgba(23,27,26,0.14);
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .op-root {
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
          --line: rgba(255,255,255,0.07);
          --hover: rgba(255,255,255,0.06);
          --menu: #272B33;
          --menu-line: rgba(255,255,255,0.12);
          --menu-shadow: 0 2px 6px rgba(0,0,0,0.4), 0 14px 32px rgba(0,0,0,0.5);
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .op-root *, .op-root *::before, .op-root *::after { box-sizing: border-box; }
        .op-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        .op-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 16px;
        }
        .op-hint { font-size: 13px; color: var(--muted); }
        .op-switch {
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
        .op-track {
          width: 26px;
          height: 16px;
          border-radius: 999px;
          background: var(--faint);
          position: relative;
          transition: background 0.2s ease;
        }
        .op-track::after {
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
        .op-switch[aria-pressed='true'] .op-track { background: var(--accent); }
        .op-switch[aria-pressed='true'] .op-track::after { transform: translateX(10px); }

        .op-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .op-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .op-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .op-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .op-tag--bad { color: var(--bad); }
        .op-tag--good { color: var(--good); }
        .op-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .op-frame {
          position: relative;
          height: 300px;
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .op-toolbar {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 46px;
          padding: 0 8px;
          border-bottom: 1px solid var(--rule);
        }
        .op-trigger, .op-help {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 30px;
          padding: 0 8px 0 10px;
          font: 500 13px/1 'Public Sans', -apple-system, sans-serif;
          color: var(--ink);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .op-trigger svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
        .op-trigger--icon { margin-left: auto; width: 30px; padding: 0; }
        .op-trigger--icon svg { width: 18px; height: 18px; fill: currentColor; stroke: none; }
        .op-trigger[aria-expanded='true'], .op-help[aria-expanded='true'] { background: var(--hover); border-color: var(--rule); }
        @media (hover: hover) and (pointer: fine) {
          .op-trigger:hover { background: var(--hover); }
        }
        .op-tools {
          display: inline-flex;
          gap: 12px;
          padding-left: 10px;
          margin-left: 2px;
          border-left: 1px solid var(--rule);
          font: 13px/1 Georgia, serif;
          color: var(--faint);
        }
        .op-tools b, .op-tools i, .op-tools u { font-style: normal; font-weight: 400; text-decoration: none; }
        .op-tools b { font-weight: 700; }
        .op-tools i { font-style: italic; }
        .op-tools u { text-decoration: underline; }

        .op-doc { display: flex; flex-direction: column; gap: 11px; padding: 24px 20px; }
        .op-doc span { display: block; height: 7px; border-radius: 999px; background: var(--line); }
        .op-doc .op-doc-h { width: 45%; height: 11px; margin-bottom: 6px; background: var(--rule); }
        .op-doc .op-doc-short { width: 68%; }

        .op-help {
          position: absolute;
          right: 14px;
          bottom: 14px;
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: 50%;
          border-color: var(--rule);
          background: var(--card);
          box-shadow: var(--shadow);
          font-weight: 600;
        }

        .op-menu {
          --ox: 50%;
          --oy: 50%;
          position: absolute;
          z-index: 2;
          width: 168px;
          padding: 5px;
          display: flex;
          flex-direction: column;
          background: var(--menu);
          border: 1px solid var(--menu-line);
          border-radius: 9px;
          box-shadow: var(--menu-shadow);
          transform-origin: var(--ox) var(--oy);
          opacity: 0;
          visibility: hidden;
          transform: scale(0.85);
          transition:
            opacity calc(var(--op-dur) * 0.5) ease,
            transform var(--op-dur) cubic-bezier(0.2, 0.8, 0.2, 1),
            visibility 0s linear var(--op-dur);
        }
        .op-menu[data-open='true'] {
          opacity: 1;
          visibility: visible;
          transform: none;
          transition:
            opacity calc(var(--op-dur) * 0.5) ease,
            transform var(--op-dur) cubic-bezier(0.2, 0.8, 0.2, 1),
            visibility 0s;
        }
        .op-menu[data-menu='insert'] { top: 44px; left: 8px; }
        .op-menu[data-menu='more'] { top: 44px; right: 8px; }
        .op-menu[data-menu='help'] { bottom: 56px; right: 14px; }
        .op-frame[data-variant='origin'] .op-menu[data-menu='insert'] { --ox: 0%; --oy: 0%; }
        .op-frame[data-variant='origin'] .op-menu[data-menu='more'] { --ox: 100%; --oy: 0%; }
        .op-frame[data-variant='origin'] .op-menu[data-menu='help'] { --ox: 100%; --oy: 100%; }

        .op-menu button {
          position: relative;
          text-align: left;
          font: 13px/1 'Public Sans', -apple-system, sans-serif;
          color: var(--ink-soft);
          background: transparent;
          border: 0;
          border-radius: 6px;
          padding: 8px 9px;
          cursor: pointer;
        }
        .op-menu button:focus-visible { outline-offset: -2px; }
        @media (hover: hover) and (pointer: fine) {
          .op-menu button:hover { background: var(--hover); color: var(--ink); }
        }

        /* The scale origin, marked only in slow motion. */
        .op-pin {
          position: absolute;
          left: var(--ox);
          top: var(--oy);
          width: 12px;
          height: 12px;
          margin: -6px 0 0 -6px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 0 3px var(--menu), 0 0 0 4px var(--accent);
          opacity: 0;
          pointer-events: none;
        }
        .op-root[data-slow='true'] .op-pin { opacity: 1; }

        .op-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .op-takeaways { grid-template-columns: 1fr; max-width: 480px; }
        }
        .op-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .op-num { font: 11px 'JetBrains Mono', monospace; color: var(--faint); display: block; margin-bottom: 6px; }

        @media (prefers-reduced-motion: reduce) {
          .op-root *, .op-root *::before, .op-root *::after { transition: none !important; }
        }
      `}</style>

      <div className='op-bar'>
        <span className='op-hint'>
          点“插入”、右上角的“⋯”或右下角的“?”，左右两边会同时打开同一个菜单。
        </span>
        <button
          type='button'
          className='op-switch'
          aria-pressed={slow}
          onClick={() => setSlow((s) => !s)}
        >
          <span className='op-track' aria-hidden='true' />
          慢放 ×3 · 标出原点
        </button>
      </div>

      <div className='op-compare'>
        {VARIANTS.map((v) => (
          <Editor
            key={v.id}
            variant={v}
            openId={openId}
            onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
            onClose={() => setOpenId(null)}
          />
        ))}
      </div>

      <div className='op-takeaways'>
        <div className='op-takeaway'>
          <span className='op-num'>01</span>
          放大总要有一个中心点，默认是元素自己的正中间。对挂在按钮上的菜单来说，这个默认值几乎总是错的。
        </div>
        <div className='op-takeaway'>
          <span className='op-num'>02</span>
          中心点放在按钮那一侧：按钮在左上，就从左上角长；菜单在按钮上方弹出，就从下沿往上长。弹出方向变了，中心点也跟着变。
        </div>
        <div className='op-takeaway'>
          <span className='op-num'>03</span>
          正常速度下，很少有人说得出它是从哪个角长出来的，但会觉得这个菜单是从按钮里出来的，而不是凭空出现在旁边。
        </div>
      </div>
    </div>
  )
}
