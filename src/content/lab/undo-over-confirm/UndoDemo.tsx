/**
 * UndoDemo.tsx
 *
 * 观点：删除这类可以挽回的操作，别每次都弹“确定吗？”。人会对确认框形成习惯，
 * 点“删除”变成肌肉记忆，真正删错的那一次照样点过去。直接删除，再给一个
 * 足够宽裕的“撤销”，删错了才有救。
 * - 左：每次删除都弹确认框（框在 demo 里，不是浏览器的 confirm）。删错的邮件找不回来。
 * - 右：立即删除，底部弹出“已删除 · 撤销”提示，最多叠 3 条，各自倒计时，鼠标停在上面时暂停。
 * “模拟手快”会重置两边，然后在同一个位置连点 4 下：列表往上收，第 3 下正好落在房东那封重要邮件上。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'

type Mail = { id: number; from: string; subject: string; promo: boolean }

const MAILS: Mail[] = [
  { id: 1, from: '优选商城', subject: '周末全场 5 折，最后 1 天', promo: true },
  { id: 2, from: '云盘会员', subject: '会员即将到期，续费立减', promo: true },
  { id: 3, from: '房东 王先生', subject: '租房合同：请今天签好发回', promo: false },
  { id: 4, from: '外卖红包', subject: '3 张满减券已到账', promo: true },
  { id: 5, from: '特价机票', subject: '你关注的航线降价了', promo: true },
  { id: 6, from: '周报机器人', subject: '本周团队周报', promo: false }
]

const byId = (id: number) => MAILS.find((m) => m.id === id)!
const ALL_IDS = MAILS.map((m) => m.id)
/** Script: click the same spot 4 times — always the top row. */
const SCRIPT_STEPS = 4
const STEP_MS = 900
const TOAST_MS = 8000

function TrashIcon() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true'>
      <path d='M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3' />
    </svg>
  )
}

function MailRow({
  mail,
  pressed,
  onDelete
}: {
  mail: Mail
  pressed: boolean
  onDelete: () => void
}) {
  return (
    <li className='uc-row' data-mail={mail.id}>
      <span className='uc-avatar' aria-hidden='true'>
        {mail.from.slice(0, 1)}
      </span>
      <span className='uc-text'>
        <span className='uc-from'>
          {mail.from}
          {mail.promo && <span className='uc-chip'>推广</span>}
        </span>
        <span className='uc-subject'>{mail.subject}</span>
      </span>
      <button
        type='button'
        className='uc-del'
        data-pressed={pressed}
        onClick={onDelete}
        aria-label={`删除：${mail.from}，${mail.subject}`}
      >
        <TrashIcon />
      </button>
    </li>
  )
}

function Chrome({ count }: { count: number }) {
  return (
    <div className='uc-chrome' aria-hidden='true'>
      收件箱
      <span className='uc-count'>{count}</span>
      <span className='uc-chrome-nav'>
        <span />
        <span />
      </span>
    </div>
  )
}

/** Focus the delete button now sitting at `index` (or the last one), without scrolling the page. */
function focusRowButton(root: HTMLElement | null, index: number) {
  const btns = root?.querySelectorAll<HTMLButtonElement>('.uc-del')
  if (!btns || btns.length === 0) return
  btns[Math.min(index, btns.length - 1)]!.focus({ preventScroll: true })
}

function ConfirmInbox({ autoplay }: { autoplay: boolean }) {
  const [ids, setIds] = useState<number[]>(ALL_IDS)
  const [dialog, setDialog] = useState<{ id: number; index: number; byUser: boolean } | null>(null)
  const [confirmPressed, setConfirmPressed] = useState(false)
  const [rowPressed, setRowPressed] = useState<number | null>(null)
  const [confirms, setConfirms] = useState(0)
  const [lost, setLost] = useState<Mail[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  const confirm = (id: number, index: number, byUser: boolean) => {
    setIds((cur) => cur.filter((x) => x !== id))
    setConfirms((n) => n + 1)
    const mail = byId(id)
    if (!mail.promo) setLost((cur) => [...cur, mail])
    setDialog(null)
    setConfirmPressed(false)
    if (byUser) requestAnimationFrame(() => focusRowButton(rootRef.current, index))
  }

  useEffect(() => {
    if (dialog?.byUser) okRef.current?.focus({ preventScroll: true })
  }, [dialog])

  useEffect(() => {
    if (!autoplay) return
    const timers: number[] = []
    for (let k = 0; k < SCRIPT_STEPS; k++) {
      const id = ALL_IDS[k]!
      const t = 300 + k * STEP_MS
      timers.push(window.setTimeout(() => setRowPressed(id), t))
      timers.push(
        window.setTimeout(() => {
          setRowPressed(null)
          setDialog({ id, index: 0, byUser: false })
        }, t + 140)
      )
      timers.push(window.setTimeout(() => setConfirmPressed(true), t + 560))
      timers.push(window.setTimeout(() => confirm(id, 0, false), t + 700))
    }
    return () => timers.forEach(clearTimeout)
  }, [autoplay])

  const open = dialog ? byId(dialog.id) : null

  return (
    <div className='uc-frame' ref={rootRef}>
      <Chrome count={ids.length} />
      <div className='uc-body'>
        <ul className='uc-list'>
          {ids.map((id, index) => (
            <MailRow
              key={id}
              mail={byId(id)}
              pressed={rowPressed === id}
              onDelete={() => setDialog({ id, index, byUser: true })}
            />
          ))}
          {ids.length === 0 && <li className='uc-empty'>收件箱空了</li>}
        </ul>

        {open && dialog && (
          <div
            className='uc-scrim'
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDialog(null)
                requestAnimationFrame(() => focusRowButton(rootRef.current, dialog.index))
              }
            }}
          >
            <div
              className='uc-dialog'
              role='alertdialog'
              aria-modal='true'
              aria-labelledby='uc-dialog-title'
              aria-describedby='uc-dialog-desc'
            >
              <p className='uc-dialog-title' id='uc-dialog-title'>
                确定要删除这封邮件吗？
              </p>
              <p className='uc-dialog-desc' id='uc-dialog-desc'>
                删除后无法恢复。
              </p>
              <div className='uc-dialog-actions'>
                <button
                  type='button'
                  className='uc-btn uc-btn--ghost'
                  onClick={() => {
                    setDialog(null)
                    if (dialog.byUser)
                      requestAnimationFrame(() => focusRowButton(rootRef.current, dialog.index))
                  }}
                >
                  取消
                </button>
                <button
                  type='button'
                  ref={okRef}
                  className='uc-btn uc-btn--danger'
                  data-pressed={confirmPressed}
                  onClick={() => confirm(dialog.id, dialog.index, dialog.byUser)}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className='uc-status' aria-live='polite' data-alert={lost.length > 0}>
        点了 {confirms} 次「删除」
        {lost.length > 0 && <> · 误删「{lost[lost.length - 1]!.from}」的邮件，找不回来了</>}
      </p>
    </div>
  )
}

type Toast = { key: number; id: number; left: number }

function UndoInbox({ autoplay }: { autoplay: boolean }) {
  const [ids, setIds] = useState<number[]>(ALL_IDS)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [deleted, setDeleted] = useState(0)
  const [undone, setUndone] = useState(0)
  const [rowPressed, setRowPressed] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const keyRef = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const remove = (id: number, index: number, byUser: boolean) => {
    setIds((cur) => cur.filter((x) => x !== id))
    setDeleted((n) => n + 1)
    keyRef.current += 1
    const key = keyRef.current
    // Newest at the bottom; keep at most three, each with its own countdown.
    setToasts((cur) => [...cur, { key, id, left: TOAST_MS }].slice(-3))
    if (byUser) requestAnimationFrame(() => focusRowButton(rootRef.current, index))
  }

  const undo = (toast: Toast) => {
    setIds((cur) => ALL_IDS.filter((x) => x === toast.id || cur.includes(x)))
    setToasts((cur) => cur.filter((t) => t.key !== toast.key))
    setUndone((n) => n + 1)
    setPaused(false)
  }

  // One shared clock for every toast; paused while the pointer or focus is on the stack.
  const hasToasts = toasts.length > 0
  useEffect(() => {
    if (!hasToasts || paused) return
    const tick = window.setInterval(() => {
      setToasts((cur) => cur.map((t) => ({ ...t, left: t.left - 100 })).filter((t) => t.left > 0))
    }, 100)
    return () => clearInterval(tick)
  }, [hasToasts, paused])

  useEffect(() => {
    if (!autoplay) return
    const timers: number[] = []
    for (let k = 0; k < SCRIPT_STEPS; k++) {
      const id = ALL_IDS[k]!
      const t = 300 + k * STEP_MS
      timers.push(window.setTimeout(() => setRowPressed(id), t))
      timers.push(
        window.setTimeout(() => {
          setRowPressed(null)
          remove(id, 0, false)
        }, t + 140)
      )
    }
    return () => timers.forEach(clearTimeout)
  }, [autoplay])

  const lostIds = ALL_IDS.filter((id) => !byId(id).promo && !ids.includes(id))
  const lostHasToast = lostIds.some((id) => toasts.some((t) => t.id === id))

  return (
    <div className='uc-frame' ref={rootRef}>
      <Chrome count={ids.length} />
      <div className='uc-body'>
        <ul className='uc-list'>
          {ids.map((id, index) => (
            <MailRow
              key={id}
              mail={byId(id)}
              pressed={rowPressed === id}
              onDelete={() => remove(id, index, true)}
            />
          ))}
          {ids.length === 0 && <li className='uc-empty'>收件箱空了</li>}
        </ul>

        <div
          className='uc-toasts'
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {toasts.map((t) => {
            const mail = byId(t.id)
            return (
              <div
                className='uc-toast'
                key={t.key}
                style={{ '--uc-left': t.left / TOAST_MS } as CSSProperties}
              >
                <span className='uc-toast-text'>
                  已删除「<span className='uc-toast-from'>{mail.from}</span>」
                </span>
                <button type='button' className='uc-undo' onClick={() => undo(t)}>
                  撤销
                </button>
                <span className='uc-toast-bar' aria-hidden='true' />
              </div>
            )
          })}
        </div>
      </div>
      <p
        className='uc-status'
        aria-live='polite'
        data-alert={lostIds.length > 0}
        data-ok={undone > 0 && lostIds.length === 0}
      >
        删了 {deleted} 封 · 撤销 {undone} 次
        {lostIds.length > 0 && lostHasToast && <> · 误删 1 封，趁提示还在，点撤销</>}
        {lostIds.length > 0 && !lostHasToast && <> · 误删的邮件没撤回</>}
        {lostIds.length === 0 && undone > 0 && <> · 什么都没丢</>}
      </p>
    </div>
  )
}

export default function UndoDemo() {
  const [round, setRound] = useState(0)
  const [autoplay, setAutoplay] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => setRunning(false), 300 + SCRIPT_STEPS * STEP_MS)
    return () => clearTimeout(t)
  }, [running])

  const play = () => {
    setAutoplay(true)
    setRound((r) => r + 1)
    setRunning(true)
  }
  const reset = () => {
    setAutoplay(false)
    setRound((r) => r + 1)
    setRunning(false)
  }

  return (
    <div className='uc-root'>
      <style>{`
        .uc-root {
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
          --chip: rgba(199,134,26,0.14);
          --chip-ink: #8A5A0E;
          --avatar: #E7EBE5;
          --scrim: rgba(23,27,26,0.32);
          --toast-bg: #22272A;
          --toast-ink: #F1F3EE;
          --toast-act: #9CC9E4;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);
          --pop: 0 2px 6px rgba(23,27,26,0.12), 0 18px 40px rgba(23,27,26,0.18);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .uc-root {
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
          --chip: rgba(242,181,68,0.14);
          --chip-ink: #F2B544;
          --avatar: #2A2E36;
          --scrim: rgba(0,0,0,0.5);
          --toast-bg: #E8EAE6;
          --toast-ink: #15171B;
          --toast-act: #2F6585;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
          --pop: 0 2px 6px rgba(0,0,0,0.5), 0 18px 40px rgba(0,0,0,0.55);
        }
        .uc-root *, .uc-root *::before, .uc-root *::after { box-sizing: border-box; }
        .uc-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        .uc-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 12px;
        }
        .uc-hint { font-size: 13px; color: var(--muted); margin-right: auto; }
        .uc-switch {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--ink-soft);
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          padding: 8px 14px;
          cursor: pointer;
          box-shadow: var(--shadow);
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .uc-switch--primary { background: var(--ink); color: var(--card); border-color: transparent; }
        .uc-switch:disabled { opacity: 0.55; cursor: default; }

        .uc-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .uc-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .uc-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .uc-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .uc-tag--bad { color: var(--bad); }
        .uc-tag--good { color: var(--good); }
        .uc-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .uc-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .uc-chrome {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--rule);
          font-size: 13px;
          font-weight: 600;
        }
        .uc-count {
          font: 500 11px/1 'JetBrains Mono', monospace;
          color: var(--muted);
          background: var(--btn-hover);
          border-radius: 999px;
          padding: 3px 7px;
        }
        .uc-chrome-nav { display: flex; gap: 6px; margin-left: auto; }
        .uc-chrome-nav span { width: 22px; height: 6px; border-radius: 999px; background: var(--rule); }

        .uc-body { position: relative; height: 348px; }
        .uc-list { list-style: none; margin: 0; padding: 0; }
        .uc-row {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 58px;
          padding: 0 10px 0 14px;
          border-bottom: 1px solid var(--rule);
        }
        .uc-avatar {
          flex: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--avatar);
          color: var(--muted);
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 600;
        }
        .uc-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
        .uc-from {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .uc-chip {
          font-size: 10.5px;
          font-weight: 500;
          color: var(--chip-ink);
          background: var(--chip);
          border-radius: 4px;
          padding: 1px 5px;
        }
        .uc-subject {
          font-size: 12.5px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .uc-del {
          flex: none;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--muted);
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease, transform 0.12s ease;
        }
        .uc-del svg {
          width: 18px;
          height: 18px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        @media (hover: hover) and (pointer: fine) {
          .uc-del:hover { background: var(--btn-hover); color: var(--bad); }
        }
        .uc-del[data-pressed='true'] {
          background: var(--btn-hover);
          border-color: var(--btn-line);
          color: var(--bad);
          transform: scale(0.9);
        }
        .uc-empty {
          padding: 40px 0;
          text-align: center;
          font-size: 13px;
          color: var(--faint);
        }

        /* The confirmation dialog lives inside the demo frame. */
        .uc-scrim {
          position: absolute;
          inset: 0;
          background: var(--scrim);
          display: grid;
          place-items: center;
          padding: 16px;
          animation: uc-fade 0.15s ease;
        }
        .uc-dialog {
          width: min(280px, 100%);
          background: var(--card);
          border-radius: 12px;
          box-shadow: var(--pop);
          padding: 18px 18px 14px;
          animation: uc-pop 0.18s ease;
        }
        .uc-dialog-title { margin: 0 0 6px; font-size: 14px; font-weight: 600; }
        .uc-dialog-desc { margin: 0 0 16px; font-size: 12.5px; color: var(--muted); }
        .uc-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
        .uc-btn {
          font: 500 13px/1 'Public Sans', -apple-system, sans-serif;
          border-radius: 8px;
          padding: 9px 14px;
          cursor: pointer;
          border: 1px solid var(--btn-line);
          transition: transform 0.12s ease, filter 0.12s ease;
        }
        .uc-btn--ghost { background: transparent; color: var(--ink-soft); }
        .uc-btn--danger { background: var(--bad); border-color: transparent; color: #fff; }
        .dark .uc-btn--danger { color: #15171B; }
        .uc-btn--danger[data-pressed='true'] { transform: scale(0.94); filter: brightness(0.9); }

        .uc-toasts {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .uc-toast {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--toast-bg);
          color: var(--toast-ink);
          border-radius: 8px;
          padding: 9px 8px 9px 12px;
          font-size: 12.5px;
          box-shadow: var(--pop);
          animation: uc-rise 0.2s ease;
        }
        .uc-toast-text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .uc-toast-from { font-weight: 600; }
        .uc-undo {
          flex: none;
          font: 600 12.5px/1 'Public Sans', -apple-system, sans-serif;
          color: var(--toast-act);
          background: transparent;
          border: 0;
          border-radius: 6px;
          padding: 6px 8px;
          cursor: pointer;
        }
        .uc-undo:focus-visible { outline-color: var(--toast-act); }
        .uc-toast-bar {
          position: absolute;
          left: 0;
          bottom: 0;
          height: 2px;
          width: 100%;
          background: var(--toast-act);
          opacity: 0.6;
          transform-origin: left;
          transform: scaleX(var(--uc-left));
          transition: transform 0.1s linear;
        }

        .uc-status {
          margin: 0;
          padding: 10px 14px;
          border-top: 1px solid var(--rule);
          font: 500 11.5px/1.5 'JetBrains Mono', monospace;
          color: var(--muted);
          min-height: 40px;
        }
        .uc-status[data-alert='true'] { color: var(--bad); }
        .uc-status[data-ok='true'] { color: var(--good); }

        @keyframes uc-fade { from { opacity: 0; } }
        @keyframes uc-pop { from { opacity: 0; transform: scale(0.96); } }
        @keyframes uc-rise { from { opacity: 0; transform: translateY(8px); } }

        .uc-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .uc-takeaways { grid-template-columns: 1fr; max-width: 480px; }
        }
        .uc-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .uc-num { font: 11px 'JetBrains Mono', monospace; color: var(--faint); display: block; margin-bottom: 6px; }

        @media (prefers-reduced-motion: reduce) {
          .uc-root *, .uc-root *::before, .uc-root *::after {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>

      <div className='uc-bar'>
        <span className='uc-hint'>任务：把带「推广」的邮件删掉，手快一点。</span>
        <button
          type='button'
          className='uc-switch uc-switch--primary'
          onClick={play}
          disabled={running}
        >
          ▶ 模拟手快连删
        </button>
        <button type='button' className='uc-switch' onClick={reset}>
          重置
        </button>
      </div>

      <div className='uc-compare'>
        <div className='uc-col'>
          <span className='uc-tag uc-tag--bad'>✕ 每次都问“确定吗？”</span>
          <ConfirmInbox key={`c${round}`} autoplay={autoplay} />
          <p className='uc-caption'>
            删第一封时你还会读一下确认框，到第三封，手已经自己按下去了。点“模拟手快连删”：列表往上收，第三下正好落在房东的邮件上，确认框照样被点过去，而且删了就没了。
          </p>
        </div>
        <div className='uc-col'>
          <span className='uc-tag uc-tag--good'>✓ 直接删，给一个撤销</span>
          <UndoInbox key={`u${round}`} autoplay={autoplay} />
          <p className='uc-caption'>
            同样连点四下，删得更快，也没有打断。删错的那封在底部的提示里，点“撤销”就回到原位。提示会停留几秒，鼠标放上去时倒计时暂停。
          </p>
        </div>
      </div>

      <div className='uc-takeaways'>
        <div className='uc-takeaway'>
          <span className='uc-num'>01</span>
          确认框问得越频繁，人越不读它。点“删除”成了动作的一部分，真正需要停下来的那一次，手也不会停。
        </div>
        <div className='uc-takeaway'>
          <span className='uc-num'>02</span>
          撤销不靠人在动手之前保持警惕，而是在出错之后给一条退路。人总会犯错，设计应该接住它，而不是指望它不发生。
        </div>
        <div className='uc-takeaway'>
          <span className='uc-num'>03</span>
          撤销要够宽裕：提示停留足够久，连删几次也能各自撤回，最好还有回收站兜底。
        </div>
      </div>
    </div>
  )
}
