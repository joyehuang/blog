/**
 * CopyDemo.tsx
 *
 * 观点：复制按钮上的“✓ 已复制”是一句承诺，要等 clipboard.writeText 的 Promise
 * 真正 resolve 之后再说。两个代码块并排：
 * - 左：点下去立刻打勾，写入结果回来之前就已经“承诺”了。
 * - 右：先显示“确认中”，写入成功才打勾；失败就走 execCommand 兜底；兜底也失败，
 *   就老实说失败，并帮人把代码选中，方便手动复制。
 *
 * 顶部的模式切换只是模拟 writeText 被拒（不会改浏览器权限），“正常写入”模式下
 * 调用的是真实的剪贴板。底部粘贴框可以验证剪贴板里实际是什么。
 */
import { useEffect, useRef, useState } from 'react'

import { copyWithFallback, legacyCopy } from './copy'

type Mode = 'ok' | 'denied' | 'broken'
type Label = 'idle' | 'pending' | 'copied' | 'failed'
type LogTone = 'plain' | 'good' | 'bad'
interface LogLine {
  t: number
  text: string
  tone: LogTone
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'ok', label: '正常写入' },
  { id: 'denied', label: '写入被拒' },
  { id: 'broken', label: '被拒 + 兜底也失败' }
]

const LABELS: Record<Label, string> = {
  idle: '复制',
  pending: '确认中…',
  copied: '✓ 已复制',
  failed: '复制失败'
}

const SIDES = [
  {
    id: 'eager',
    tag: '✕ 点下去就打勾',
    tone: 'bad',
    code: 'echo "来自左边的按钮"',
    caption: '先打勾，再去写剪贴板。写入失败的消息只会躺在控制台里，按钮上的“已复制”收不回来。'
  },
  {
    id: 'honest',
    tag: '✓ 写入成功才打勾',
    tone: 'good',
    code: 'echo "来自右边的按钮"',
    caption: '等 Promise 有结果再说话；失败先兜底，兜底也失败就直说，并把代码选中让人手动复制。'
  }
] as const

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function CodeCard({ side, mode }: { side: (typeof SIDES)[number]; mode: Mode }) {
  const [label, setLabel] = useState<Label>('idle')
  const [log, setLog] = useState<LogLine[]>([])
  const [verdict, setVerdict] = useState<'' | 'lie' | 'honest'>('')
  const codeRef = useRef<HTMLElement>(null)
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const run = useRef(0)

  useEffect(() => () => clearTimeout(reset.current), [])

  async function write() {
    if (mode !== 'ok') {
      // Simulated permission failure: the real clipboard is never touched.
      await wait(450)
      throw new DOMException('Write permission denied.', 'NotAllowedError')
    }
    await navigator.clipboard.writeText(side.code)
  }

  async function onCopy() {
    clearTimeout(reset.current)
    const id = ++run.current
    const start = performance.now()
    const lines: LogLine[] = []
    const push = (text: string, tone: LogTone = 'plain') => {
      if (id !== run.current) return
      lines.push({ t: Math.round(performance.now() - start), text, tone })
      setLog([...lines])
    }
    const settle = (next: Label, v: '' | 'lie' | 'honest') => {
      if (id !== run.current) return
      setLabel(next)
      setVerdict(v)
      reset.current = setTimeout(() => setLabel('idle'), 2200)
    }
    setVerdict('')

    if (side.id === 'eager') {
      setLabel('copied')
      push('按钮显示 ✓ 已复制')
      push('调用 clipboard.writeText()')
      try {
        await write()
        push('写入成功', 'good')
        settle('copied', 'honest')
      } catch {
        push('写入被拒绝 · 剪贴板没变', 'bad')
        // The button keeps saying "copied" — that is the bug being shown.
        settle('copied', 'lie')
      }
      return
    }

    setLabel('pending')
    push('按钮显示 确认中…')
    push('await clipboard.writeText()')
    const result = await copyWithFallback(write, () => {
      push('写入被拒绝 → 改用 execCommand 兜底', 'bad')
      return mode === 'broken' ? false : legacyCopy(side.code)
    })
    if (result === 'failed') {
      push('兜底也失败 → 显示 复制失败', 'bad')
      push('已选中代码，可以手动 ⌘C / Ctrl+C')
      const el = codeRef.current
      const selection = document.getSelection()
      if (el && selection) {
        const range = document.createRange()
        range.selectNodeContents(el)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      settle('failed', 'honest')
    } else {
      push(result === 'clipboard' ? '写入成功 → 显示 ✓' : '兜底成功 → 显示 ✓', 'good')
      settle('copied', 'honest')
    }
  }

  return (
    <div className='hc-col'>
      <span className={`hc-tag hc-tag--${side.tone}`}>{side.tag}</span>
      <div className='hc-frame'>
        <div className='hc-head'>
          <span className='hc-dots' aria-hidden='true'>
            <i />
            <i />
            <i />
          </span>
          <span className='hc-file'>terminal</span>
          <button
            type='button'
            className='hc-copy'
            data-state={label}
            onClick={() => void onCopy()}
            disabled={label === 'pending'}
            aria-label={`复制代码：${LABELS[label]}`}
          >
            {(Object.keys(LABELS) as Label[]).map((key) => (
              <span key={key} data-on={key === label} aria-hidden='true'>
                {LABELS[key]}
              </span>
            ))}
          </button>
        </div>
        <pre className='hc-code'>
          <span className='hc-prompt' aria-hidden='true'>
            ${' '}
          </span>
          <code ref={codeRef}>{side.code}</code>
        </pre>
        <ol className='hc-log' aria-live='polite'>
          {log.length === 0 ? (
            <li className='hc-log-empty'>点右上角的“复制”，这里会记下每一步。</li>
          ) : (
            log.map((line, i) => (
              <li key={i} data-tone={line.tone}>
                <span className='hc-t'>+{line.t}ms</span>
                {line.text}
              </li>
            ))
          )}
        </ol>
        <div className='hc-verdict' data-v={verdict} aria-hidden={verdict === ''}>
          {verdict === 'lie' ? '按钮说了谎：显示已复制，剪贴板却没变' : '按钮说的和剪贴板一致'}
        </div>
      </div>
      <p className='hc-caption'>{side.caption}</p>
    </div>
  )
}

export default function CopyDemo() {
  const [mode, setMode] = useState<Mode>('denied')
  const [pasted, setPasted] = useState('')

  return (
    <div className='hc-root'>
      <style>{`
        .hc-root {
          --bg: #F1F3EE;
          --ink: #171B1A;
          --ink-soft: rgba(23,27,26,0.82);
          --muted: #6B7570;
          --faint: #B7BDB6;
          --good: #1F6F4A;
          --bad: #B8402C;
          --card: #FFFFFF;
          --code-bg: #F6F7F4;
          --rule: rgba(23,27,26,0.1);
          --dot: rgba(23,27,26,0.05);
          --accent: #3B6E8C;
          --good-soft: rgba(31,111,74,0.09);
          --bad-soft: rgba(184,64,44,0.09);
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .hc-root {
          --bg: #15171B;
          --ink: #E8EAE6;
          --ink-soft: rgba(232,234,230,0.82);
          --muted: #9BA39D;
          --faint: #565C57;
          --good: #4ADE80;
          --bad: #F17A6B;
          --card: #1E2128;
          --code-bg: #191C21;
          --rule: rgba(255,255,255,0.1);
          --dot: rgba(255,255,255,0.045);
          --accent: #86AEC6;
          --good-soft: rgba(74,222,128,0.1);
          --bad-soft: rgba(241,122,107,0.12);
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .hc-root *, .hc-root *::before, .hc-root *::after { box-sizing: border-box; }
        .hc-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .hc-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 14px;
        }
        .hc-bar-label { font-size: 13px; color: var(--muted); }
        .hc-seg {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: 3px;
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          box-shadow: var(--shadow);
        }
        .hc-seg button {
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--muted);
          background: transparent;
          border: 0;
          border-radius: 999px;
          padding: 7px 12px;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .hc-seg button[aria-pressed='true'] { background: var(--ink); color: var(--card); }

        .hc-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .hc-compare { grid-template-columns: 1fr; }
        }
        .hc-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .hc-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .hc-tag--bad { color: var(--bad); }
        .hc-tag--good { color: var(--good); }
        .hc-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .hc-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .hc-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 8px 8px 14px;
          border-bottom: 1px solid var(--rule);
        }
        .hc-dots { display: inline-flex; gap: 5px; }
        .hc-dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--rule); }
        .hc-file { font: 12px 'JetBrains Mono', monospace; color: var(--muted); }

        .hc-copy {
          margin-left: auto;
          display: grid;
          min-width: 92px;
          font: 500 12px/1 'Public Sans', sans-serif;
          color: var(--ink);
          background: transparent;
          border: 1px solid var(--rule);
          border-radius: 6px;
          padding: 7px 10px;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.15s ease;
        }
        .hc-copy:disabled { cursor: progress; }
        .hc-copy:active { transform: scale(0.97); }
        @media (hover: hover) and (pointer: fine) {
          .hc-copy:hover { background: var(--code-bg); }
        }
        .hc-copy[data-state='copied'] { color: var(--good); }
        .hc-copy[data-state='failed'] { color: var(--bad); }
        /* Labels stacked in one cell; swapped with the site's blur + scale recipe. */
        .hc-copy > span {
          grid-area: 1 / 1;
          opacity: 0;
          filter: blur(4px);
          transform: scale(0.6);
          transition: opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease;
        }
        .hc-copy > span[data-on='true'] { opacity: 1; filter: blur(0); transform: scale(1); }

        .hc-code {
          margin: 0;
          padding: 18px 16px;
          background: var(--code-bg);
          font: 13px/1.6 'JetBrains Mono', monospace;
          color: var(--ink);
          white-space: pre-wrap;
          word-break: break-all;
        }
        .hc-prompt { color: var(--faint); user-select: none; }

        .hc-log {
          list-style: none;
          margin: 0;
          padding: 12px 16px 14px;
          min-height: 128px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font: 12px/1.6 'JetBrains Mono', monospace;
          color: var(--ink-soft);
        }
        .hc-log li[data-tone='good'] { color: var(--good); }
        .hc-log li[data-tone='bad'] { color: var(--bad); }
        .hc-log-empty { color: var(--faint); font-family: 'Public Sans', sans-serif; }
        .hc-t {
          display: inline-block;
          min-width: 64px;
          color: var(--faint);
        }

        .hc-verdict {
          margin: 0 12px 12px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 500;
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .hc-verdict[data-v='lie'] { opacity: 1; transform: none; background: var(--bad-soft); color: var(--bad); }
        .hc-verdict[data-v='honest'] { opacity: 1; transform: none; background: var(--good-soft); color: var(--good); }

        .hc-paste {
          max-width: 960px;
          margin: 28px auto 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 14px;
          padding-top: 22px;
          border-top: 1px solid var(--rule);
        }
        .hc-paste label { font-size: 13px; color: var(--muted); }
        .hc-paste input {
          flex: 1 1 260px;
          min-width: 0;
          font: 13px 'JetBrains Mono', monospace;
          color: var(--ink);
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 6px;
          padding: 9px 12px;
        }
        .hc-paste input::placeholder { color: var(--faint); }

        @media (prefers-reduced-motion: reduce) {
          .hc-root *, .hc-root *::before, .hc-root *::after { transition: none !important; }
          .hc-copy:active { transform: none; }
        }
      `}</style>

      <div className='hc-bar'>
        <span className='hc-bar-label'>模拟剪贴板：</span>
        <div className='hc-seg' role='group' aria-label='模拟剪贴板的写入结果'>
          {MODES.map((m) => (
            <button
              type='button'
              key={m.id}
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className='hc-compare'>
        {SIDES.map((side) => (
          <CodeCard key={side.id} side={side} mode={mode} />
        ))}
      </div>

      <div className='hc-paste'>
        <label htmlFor='hc-paste-box'>粘贴验证：剪贴板里实际是</label>
        <input
          id='hc-paste-box'
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder='点这里，⌘V / Ctrl+V'
        />
      </div>
    </div>
  )
}
