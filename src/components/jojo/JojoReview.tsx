import { currentMode, JOJO_EVENTS, JOJO_KEYS, writeStored, type JojoMode } from '@/lib/jojo/keys'
import type { StatusId } from '@jojo-web/runtime'
import { useEffect, useState } from 'react'

import './dock.css'

/**
 * Preview-only review tools (built only with PUBLIC_JOJO_REVIEW=1; never in
 * production). Lets a reviewer switch between the integrated design and each
 * scheme alone, replay or re-arm the intro without clearing storage by hand,
 * and preview chat *states* on the dock — clearly labelled as a demo, because
 * no chat backend exists.
 */
const MODES: { id: JojoMode; zh: string; en: string }[] = [
  { id: 'abc', zh: '整合 A+B+C（默认）', en: 'Integrated A+B+C (default)' },
  { id: 'a', zh: '只 A · 署名', en: 'A only · signature' },
  { id: 'b', zh: '只 B · 常驻 dock', en: 'B only · dock' },
  { id: 'c', zh: '只 C · 搭站开场', en: 'C only · intro' },
  { id: 'off', zh: '关掉 Jojo', en: 'Jojo off' }
]
const STATES: (StatusId | null)[] = [null, 'working', 'needs-input', 'success', 'error', 'offline']

export default function JojoReview({ lang }: { lang: 'zh' | 'en' }) {
  const zh = lang === 'zh'
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<JojoMode>('abc')
  const [status, setStatus] = useState<StatusId | null>(null)
  useEffect(() => setMode(currentMode()), [])

  const home = zh ? '/' : '/en'
  const isHome =
    typeof location !== 'undefined' && (location.pathname === '/' || location.pathname === '/en')

  const go = (m: JojoMode) => {
    const url = new URL(location.href)
    url.searchParams.set('jojo', m)
    url.searchParams.delete('jojo-intro')
    location.assign(url.toString())
  }
  const replay = () => {
    if (isHome) document.dispatchEvent(new CustomEvent(JOJO_EVENTS.introReplay))
    else location.assign(`${home}?jojo-intro=play`)
  }
  const firstVisit = () => {
    for (const k of [JOJO_KEYS.intro, JOJO_KEYS.hello, JOJO_KEYS.dock]) writeStored(k, null)
    location.assign(home)
  }
  const previewStatus = (s: StatusId | null) => {
    setStatus(s)
    document.dispatchEvent(new CustomEvent(JOJO_EVENTS.reviewStatus, { detail: { status: s } }))
  }

  return (
    <div className='jojo-review' data-open={open ? '' : undefined}>
      <button
        type='button'
        className='jojo-review-pill'
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Jojo · Review
      </button>
      {open && (
        <div className='jojo-review-body'>
          <p className='jojo-review-h'>{zh ? '方案' : 'Scheme'}</p>
          <div className='jojo-review-row'>
            {MODES.map((m) => (
              <button
                key={m.id}
                type='button'
                aria-pressed={mode === m.id}
                onClick={() => go(m.id)}
              >
                {zh ? m.zh : m.en}
              </button>
            ))}
          </div>
          <p className='jojo-review-h'>{zh ? '开场' : 'Intro'}</p>
          <div className='jojo-review-row'>
            <button type='button' onClick={replay}>
              {zh ? '重播' : 'Replay'}
            </button>
            <button type='button' onClick={firstVisit}>
              {zh ? '模拟首访（清 Jojo 记录）' : 'Simulate first visit'}
            </button>
          </div>
          <p className='jojo-review-h'>
            {zh ? 'Chat 状态预览 · 仅演示' : 'Chat state preview · demo only'}
          </p>
          <div className='jojo-review-row'>
            {STATES.map((s) => (
              <button
                key={s ?? 'none'}
                type='button'
                aria-pressed={status === s}
                onClick={() => previewStatus(s)}
              >
                {s ?? (zh ? '真实（未接入）' : 'real (none)')}
              </button>
            ))}
          </div>
          <p className='jojo-review-note'>
            {zh
              ? '审阅决定：Jojo 模式下首访推广大弹窗停用，保留首页静态推广卡；左下 popout 等开场结束后再出现。'
              : 'Review decision: in Jojo mode the first-visit promo modal is off; the static promo card stays, and the popout waits for the intro.'}
          </p>
        </div>
      )}
    </div>
  )
}
