/**
 * PlaceholderDemo.tsx
 *
 * 观点：输入框里的灰色占位文字不能代替标签。一打字它就消失：填到一半会忘了这一栏要什么，
 * 填完没法核对，出了错也不知道是哪一栏；灰字本身对比度也低。
 * - 左：同一份表单，只用占位文字。
 * - 右：标签常驻在输入框上方，格式要求写在下方。
 * “自动填好”会把两份表按同样的内容逐字填进去，其中故意把「公司」和「部门」填反。
 * 读者先自己找错，再点“标出错误”对照。减少动态效果时直接填好，不逐字打。
 */
import { useEffect, useId, useRef, useState } from 'react'

type FieldId = 'name' | 'phone' | 'zip' | 'company' | 'dept'
type Values = Record<FieldId, string>

const FIELDS: { id: FieldId; label: string; hint?: string; inputMode?: 'numeric' | 'tel' }[] = [
  { id: 'name', label: '姓名' },
  { id: 'phone', label: '手机号', hint: '11 位，用来接收验证码', inputMode: 'tel' },
  { id: 'zip', label: '邮编', hint: '6 位数字', inputMode: 'numeric' },
  { id: 'company', label: '公司' },
  { id: 'dept', label: '部门' }
]

/** What gets typed in. Company and department are deliberately swapped. */
const FILL: Values = {
  name: '林晓',
  phone: '13800138000',
  zip: '200030',
  company: '研发部',
  dept: '星河科技'
}
const WRONG: FieldId[] = ['company', 'dept']
const EMPTY: Values = { name: '', phone: '', zip: '', company: '', dept: '' }
const CHAR_MS = 45

function Chrome() {
  return (
    <div className='pl-chrome' aria-hidden='true'>
      填写收货信息
      <span className='pl-chrome-nav'>
        <span />
        <span />
      </span>
    </div>
  )
}

function Form({
  variant,
  values,
  reveal,
  onChange
}: {
  variant: 'placeholder' | 'label'
  values: Values
  reveal: boolean
  onChange: (id: FieldId, v: string) => void
}) {
  const uid = useId()
  // Only flag the swapped pair while it is still swapped; fixing it by hand clears the error.
  const wrongIds = reveal ? WRONG.filter((id) => values[id] === FILL[id]) : []
  return (
    <div className='pl-frame'>
      <Chrome />
      <form className='pl-form' data-variant={variant} onSubmit={(e) => e.preventDefault()}>
        {wrongIds.length > 0 && (
          <p className='pl-error' role='alert'>
            「公司」和「部门」好像填反了，请检查。
          </p>
        )}
        {FIELDS.map((f) => {
          const wrong = wrongIds.includes(f.id)
          const inputId = `${uid}-${f.id}`
          const hintId = f.hint ? `${inputId}-hint` : undefined
          return variant === 'placeholder' ? (
            <input
              key={f.id}
              id={inputId}
              className='pl-input'
              data-wrong={wrong}
              aria-invalid={wrong || undefined}
              placeholder={f.label}
              aria-label={f.label}
              autoComplete='off'
              inputMode={f.inputMode}
              value={values[f.id]}
              onChange={(e) => onChange(f.id, e.target.value)}
            />
          ) : (
            <div className='pl-field' key={f.id}>
              <label className='pl-label' htmlFor={inputId}>
                {f.label}
              </label>
              <input
                id={inputId}
                className='pl-input'
                data-wrong={wrong}
                aria-invalid={wrong || undefined}
                aria-describedby={hintId}
                autoComplete='off'
                inputMode={f.inputMode}
                value={values[f.id]}
                onChange={(e) => onChange(f.id, e.target.value)}
              />
              {f.hint && (
                <span className='pl-hint' id={hintId}>
                  {f.hint}
                </span>
              )}
            </div>
          )
        })}
      </form>
    </div>
  )
}

export default function PlaceholderDemo() {
  const [bad, setBad] = useState<Values>(EMPTY)
  const [good, setGood] = useState<Values>(EMPTY)
  const [filling, setFilling] = useState(false)
  const [filled, setFilled] = useState(false)
  const [reveal, setReveal] = useState(false)
  const timers = useRef<number[]>([])

  const stop = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => stop, [])

  const fill = () => {
    stop()
    setReveal(false)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setBad(FILL)
      setGood(FILL)
      setFilled(true)
      return
    }
    setBad(EMPTY)
    setGood(EMPTY)
    setFilling(true)
    setFilled(false)
    // Type field by field, character by character, into both forms at once.
    let t = 150
    for (const f of FIELDS) {
      const text = FILL[f.id]
      for (let i = 1; i <= text.length; i++) {
        const partial = text.slice(0, i)
        timers.current.push(
          window.setTimeout(() => {
            setBad((v) => ({ ...v, [f.id]: partial }))
            setGood((v) => ({ ...v, [f.id]: partial }))
          }, t)
        )
        t += CHAR_MS
      }
      t += 180
    }
    timers.current.push(
      window.setTimeout(() => {
        setFilling(false)
        setFilled(true)
      }, t)
    )
  }

  const clear = () => {
    stop()
    setBad(EMPTY)
    setGood(EMPTY)
    setFilling(false)
    setFilled(false)
    setReveal(false)
  }

  const status = reveal
    ? '公司和部门填反了。右边一眼能看出来，左边只能把内容删掉，让灰字露出来再对。'
    : filled
      ? '两份表都填好了，其中有一处填错。先自己找找，再点“标出错误”。'
      : filling
        ? '正在填写……'
        : '点“自动填好”，再检查两份表：哪一处填错了？'

  return (
    <div className='pl-root'>
      <style>{`
        .pl-root {
          --bg: #F1F3EE;
          --ink: #171B1A;
          --ink-soft: rgba(23,27,26,0.82);
          --muted: #6B7570;
          --faint: #B7BDB6;
          --good: #1F6F4A;
          --bad: #B8402C;
          --bad-tint: rgba(184,64,44,0.07);
          --card: #FFFFFF;
          --rule: rgba(23,27,26,0.1);
          --dot: rgba(23,27,26,0.05);
          --field: #FFFFFF;
          --field-line: rgba(23,27,26,0.18);
          --placeholder: #B4BAB3;
          --accent: #3B6E8C;
          --shadow: 0 1px 2px rgba(23,27,26,0.06), 0 10px 24px rgba(23,27,26,0.05);

          background: var(--bg);
          background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
          background-size: 22px 22px;
          color: var(--ink);
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 40px 24px 48px;
        }
        .dark .pl-root {
          --bg: #15171B;
          --ink: #E8EAE6;
          --ink-soft: rgba(232,234,230,0.82);
          --muted: #9BA39D;
          --faint: #565C57;
          --good: #4ADE80;
          --bad: #F17A6B;
          --bad-tint: rgba(241,122,107,0.08);
          --card: #1E2128;
          --rule: rgba(255,255,255,0.1);
          --dot: rgba(255,255,255,0.045);
          --field: #181B21;
          --field-line: rgba(255,255,255,0.16);
          --placeholder: #5A605C;
          --accent: #86AEC6;
          --shadow: 0 1px 2px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4);
        }
        .pl-root *, .pl-root *::before, .pl-root *::after { box-sizing: border-box; }
        .pl-root button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .pl-bar {
          max-width: 960px;
          margin: 0 auto 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 12px;
        }
        .pl-btns { display: flex; flex-wrap: wrap; gap: 8px; }
        .pl-switch {
          font: 500 12px/1 'JetBrains Mono', monospace;
          color: var(--ink-soft);
          background: var(--card);
          border: 1px solid var(--rule);
          border-radius: 999px;
          padding: 8px 14px;
          cursor: pointer;
          box-shadow: var(--shadow);
          transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
        }
        .pl-switch--primary { background: var(--ink); color: var(--card); border-color: transparent; }
        .pl-switch[aria-pressed='true'] { background: var(--bad); color: #fff; border-color: transparent; }
        .dark .pl-switch[aria-pressed='true'] { color: #15171B; }
        .pl-switch:disabled { opacity: 0.45; cursor: default; }
        .pl-status {
          flex: 1 1 280px;
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          color: var(--muted);
        }
        .pl-status[data-state='filled'] { color: var(--ink-soft); }
        .pl-status[data-state='reveal'] { color: var(--bad); }

        .pl-compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 768px) {
          .pl-compare { grid-template-columns: 1fr; max-width: 480px; }
        }
        .pl-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .pl-tag { font: 500 12px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
        .pl-tag--bad { color: var(--bad); }
        .pl-tag--good { color: var(--good); }
        .pl-caption { font-size: 12.5px; line-height: 1.6; color: var(--muted); margin: 2px 2px 0; }

        .pl-frame {
          background: var(--card);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .pl-chrome {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--rule);
          font-size: 13px;
          font-weight: 600;
        }
        .pl-chrome-nav { display: flex; gap: 6px; margin-left: auto; }
        .pl-chrome-nav span { width: 22px; height: 6px; border-radius: 999px; background: var(--rule); }

        .pl-form { display: flex; flex-direction: column; padding: 18px 18px 20px; margin: 0; }
        .pl-form[data-variant='placeholder'] { gap: 10px; }
        .pl-form[data-variant='label'] { gap: 14px; }
        .pl-field { display: flex; flex-direction: column; gap: 6px; }
        .pl-label { font-size: 13px; font-weight: 600; color: var(--ink); }
        .pl-hint { font-size: 11.5px; color: var(--muted); }
        .pl-input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          font: 400 14.5px/1 'Public Sans', -apple-system, sans-serif;
          color: var(--ink);
          background: var(--field);
          border: 1px solid var(--field-line);
          border-radius: 8px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
        }
        .pl-input::placeholder { color: var(--placeholder); opacity: 1; }
        .pl-input:focus-visible {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
        }
        .pl-input[data-wrong='true'] { border-color: var(--bad); background: var(--bad-tint); }
        @media (max-width: 768px) {
          .pl-input { font-size: 16px; }
        }
        .pl-error {
          margin: 0 0 2px;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--bad-tint);
          color: var(--bad);
          font-size: 12.5px;
          line-height: 1.5;
        }

        .pl-takeaways {
          max-width: 960px;
          margin: 36px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 768px) {
          .pl-takeaways { grid-template-columns: 1fr; max-width: 480px; }
        }
        .pl-takeaway { font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
        .pl-num { font: 11px 'JetBrains Mono', monospace; color: var(--faint); display: block; margin-bottom: 6px; }

        @media (prefers-reduced-motion: reduce) {
          .pl-root *, .pl-root *::before, .pl-root *::after { transition: none !important; }
        }
      `}</style>

      <div className='pl-bar'>
        <p
          className='pl-status'
          aria-live='polite'
          data-state={reveal ? 'reveal' : filled ? 'filled' : 'idle'}
        >
          {status}
        </p>
        <div className='pl-btns'>
          <button
            type='button'
            className='pl-switch pl-switch--primary'
            onClick={fill}
            disabled={filling}
          >
            ▶ 自动填好
          </button>
          <button
            type='button'
            className='pl-switch'
            aria-pressed={reveal}
            disabled={!filled}
            onClick={() => setReveal((r) => !r)}
          >
            标出错误
          </button>
          <button type='button' className='pl-switch' onClick={clear}>
            清空
          </button>
        </div>
      </div>

      <div className='pl-compare'>
        <div className='pl-col'>
          <span className='pl-tag pl-tag--bad'>✕ 只有占位文字</span>
          <Form
            variant='placeholder'
            values={bad}
            reveal={reveal}
            onChange={(id, v) => setBad((cur) => ({ ...cur, [id]: v }))}
          />
          <p className='pl-caption'>
            空着时还能看到浅浅的灰字，填好之后它们全没了，只剩五行内容。哪一行是公司、哪一行是部门？想核对，只能把字删掉，让灰字重新露出来。
          </p>
        </div>
        <div className='pl-col'>
          <span className='pl-tag pl-tag--good'>✓ 标签放在框外</span>
          <Form
            variant='label'
            values={good}
            reveal={reveal}
            onChange={(id, v) => setGood((cur) => ({ ...cur, [id]: v }))}
          />
          <p className='pl-caption'>
            标签一直在输入框上方，格式要求写在下方，打字时都不会消失。填完从上往下扫一遍，“公司：研发部”马上就能看出不对。
          </p>
        </div>
      </div>

      <div className='pl-takeaways'>
        <div className='pl-takeaway'>
          <span className='pl-num'>01</span>
          占位文字一打字就消失。填到一半忘了这一栏要什么，或者被打断后回来，只能把内容删掉重新看。
        </div>
        <div className='pl-takeaway'>
          <span className='pl-num'>02</span>
          填完没法核对，出错时也不好改：错误提示说“公司填错了”，可哪个框是公司，界面上已经找不到了。
        </div>
        <div className='pl-takeaway'>
          <span className='pl-num'>03</span>
          灰色占位字本来就浅，看不太清；有人还会把它当成已经填好的内容，直接跳过这一栏。
        </div>
      </div>
    </div>
  )
}
