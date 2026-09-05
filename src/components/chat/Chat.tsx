import { chatTrack, type Surface } from '@/lib/chat/analytics'
import { safeSourceUrl } from '@/lib/chat/safety'
import { useEffect, useRef, useState } from 'react'

import AnswerMarkdown from './AnswerMarkdown'

import './chat.css'

type Turn = {
  id: string
  question: string
  answer: string
  sources: { title: string; url: string }[]
  status: string
}
type State = {
  authenticated: boolean
  used: boolean
  conversations: { id: string; title: string }[]
}
const errors: Record<string, string> = {
  unavailable: 'Chat 暂未开放，请稍后再试。 / Chat is not available yet.',
  email_unavailable:
    '邮件暂时发送失败，请一分钟后重试。 / Email could not be sent. Retry in a minute.',
  invalid_email: '请填写有效邮箱。 / Enter a valid email address.',
  invalid_code: '验证码无效或已过期。 / This code is invalid or expired.',
  cooldown: '请等待 60 秒再发送验证码。 / Wait 60 seconds before resending.',
  rate_limited: '请求过于频繁，请稍后再试。 / Too many requests. Please try later.',
  budget_limited: '今日提问额度已用完，请明天再来。 / The daily limit has been reached.',
  busy: '有一个回答仍在处理中，请稍等。 / An answer is still processing. Please wait.',
  session_expired: '登录已过期，请重新打开 Chat。 / Session expired. Reopen Chat.',
  answer_failed: '回答中断了，可以重试。 / The answer was interrupted. You can retry.',
  save_failed: '保存失败，请重新打开对话确认。 / Could not save. Reopen the conversation to check.',
  conversation_full: '这段对话已满，请开始新对话。 / Start a new conversation.'
}
async function api(action: string, payload: Record<string, unknown> = {}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  })
  const data = await response.json()
  if (!response.ok || data.error) throw Error(data.error ?? 'unavailable')
  return data
}
export default function Chat() {
  const [open, setOpen] = useState(false),
    [expanded, setExpanded] = useState(false),
    [surface, setSurface] = useState<Surface>('header')
  const [state, setState] = useState<State>({
    authenticated: false,
    used: false,
    conversations: []
  })
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const [draft, setDraft] = useState(''),
    [turns, setTurns] = useState<Turn[]>([]),
    [conversation, setConversation] = useState<string>()
  const [login, setLogin] = useState(false),
    [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [sent, setSent] = useState(false),
    [authBusy, setAuthBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0),
    [notice, setNotice] = useState(''),
    [confirmDelete, setConfirmDelete] = useState<'conversation' | 'account'>()
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    scroller = useRef<HTMLDivElement>(null)
  const controller = useRef<AbortController>(null),
    returnFocus = useRef<HTMLElement>(null),
    working = useRef(false)
  const en = typeof location !== 'undefined' && location.pathname.startsWith('/en')
  const t = (zh: string, english: string) => (en ? english : zh)
  const refresh = async () => {
    const data = await api('status')
    setState(data)
    return data as State
  }
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {}
      const next: Surface = ['header', 'home', 'article', 'terminal'].includes(detail.surface)
        ? detail.surface
        : 'header'
      returnFocus.current = document.activeElement as HTMLElement
      setSurface(next)
      setOpen(true)
      if (typeof detail.draft === 'string') setDraft(detail.draft.slice(0, 2000))
      window.dispatchEvent(new Event('joye:exit-dev'))
      chatTrack('chat_open', next)
    }
    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element)?.closest<HTMLElement>('[data-chat-open]')
      if (target)
        onOpen(new CustomEvent('joye:chat', { detail: { surface: target.dataset.chatOpen } }))
    }
    window.addEventListener('joye:chat', onOpen)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('joye:chat', onOpen)
      document.removeEventListener('click', onClick)
      controller.current?.abort()
    }
  }, [])
  useEffect(() => {
    if (!open) {
      dialog.current?.close()
      returnFocus.current?.focus()
      return
    }
    dialog.current?.showModal()
    input.current?.focus()
    let alive = true
    setError('')
    setReady(false)
    api('session')
      .then((data) => {
        if (alive) {
          setState(data)
          setReady(true)
        }
      })
      .catch((e) => {
        if (alive) setError(e.message)
      })
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      alive = false
      document.body.style.overflow = previous
    }
  }, [open])
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  useEffect(() => {
    const el = scroller.current
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 250) el.scrollTop = el.scrollHeight
  }, [turns, busy])
  useEffect(() => {
    if (login) dialog.current?.querySelector('.chat-auth')?.scrollIntoView({ block: 'nearest' })
  }, [login])
  const close = () => {
    controller.current?.abort()
    setOpen(false)
  }
  async function ask(question = draft, kind: 'example' | 'custom' = 'custom') {
    if (working.current || !ready || !question.trim()) return
    setDraft(question)
    if (!state.authenticated && state.used) {
      setLogin(true)
      chatTrack('chat_login', surface, { action: 'required' })
      return
    }
    working.current = true
    setBusy(true)
    setError('')
    setNotice('')
    chatTrack('chat_question', surface, { kind })
    const abort = new AbortController()
    controller.current = abort
    const localId = crypto.randomUUID()
    let received = false
    let ended = false
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body: JSON.stringify({ action: 'ask', question, conversation })
      })
      if (!response.ok) {
        const data = await response.json()
        if (data.error === 'login_required') {
          setState((s) => ({ ...s, used: true }))
          setLogin(true)
          chatTrack('chat_login', surface, { action: 'required' })
          chatTrack('chat_result', surface, { result: 'login_required' })
          return
        }
        throw Error(data.error ?? 'unavailable')
      }
      if (!response.body) throw Error('answer_failed')
      setTurns((ts) => [
        ...ts,
        { id: localId, question, answer: '', sources: [], status: 'pending' }
      ])
      setDraft('')
      const reader = response.body.getReader(),
        decoder = new TextDecoder()
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let end: number
          while ((end = buffer.indexOf('\n')) >= 0) {
            const part = JSON.parse(buffer.slice(0, end))
            buffer = buffer.slice(end + 1)
            if (part.type === 'start') setConversation(part.conversation)
            if (part.type === 'sources')
              setTurns((ts) =>
                ts.map((x) => (x.id === localId ? { ...x, sources: part.sources } : x))
              )
            if (part.type === 'delta') {
              received = true
              setTurns((ts) =>
                ts.map((x) => (x.id === localId ? { ...x, answer: x.answer + part.text } : x))
              )
            }
            if (part.type === 'done') {
              ended = true
              setTurns((ts) => ts.map((x) => (x.id === localId ? { ...x, status: 'complete' } : x)))
              chatTrack('chat_result', surface, { result: 'complete' })
            }
            if (part.type === 'error') throw Error(part.code)
          }
        }
      } finally {
        await reader.cancel().catch(() => {})
      }
      if (!ended) throw Error('answer_failed')
    } catch (e) {
      const stopped = abort.signal.aborted
      setError(stopped ? '' : (e as Error).message)
      setNotice(stopped ? t('已停止生成。', 'Generation stopped.') : '')
      setTurns((ts) => ts.map((x) => (x.id === localId ? { ...x, status: 'interrupted' } : x)))
      setDraft(question)
      chatTrack('chat_result', surface, { result: stopped ? 'stopped' : 'error' })
    } finally {
      working.current = false
      setBusy(false)
      if (received) setState((s) => ({ ...s, used: true }))
      void refresh().catch(() => {})
      input.current?.focus()
    }
  }
  async function authenticate(verify: boolean) {
    if (authBusy) return
    setAuthBusy(true)
    setError('')
    try {
      await api(verify ? 'otp_verify' : 'otp_send', verify ? { email, code } : { email })
      chatTrack('chat_login', surface, { action: verify ? 'verified' : 'code_sent' })
      if (verify) {
        await refresh()
        setLogin(false)
        setCode('')
        setNotice(
          t(
            '已登录，草稿和第一段对话都还在。',
            'Signed in. Your draft and first conversation are preserved.'
          )
        )
        input.current?.focus()
      } else {
        setSent(true)
        setCooldown(60)
      }
    } catch (e) {
      setError((e as Error).message)
      chatTrack('chat_login', surface, { action: 'error' })
    } finally {
      setAuthBusy(false)
    }
  }
  async function load(id: string) {
    if (busy) return
    try {
      const data = await api('load', { conversation: id })
      setConversation(id)
      setTurns(data.turns)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }
  async function remove() {
    try {
      await api(confirmDelete === 'account' ? 'delete_account' : 'delete_conversation', {
        conversation
      })
      setTurns([])
      setConversation(undefined)
      setConfirmDelete(undefined)
      if (confirmDelete === 'account') {
        setState({ authenticated: false, used: false, conversations: [] })
        setReady(false)
        const data = await api('session')
        setState(data)
        setReady(true)
      } else await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <dialog
      ref={dialog}
      className={`blog-chat ${expanded ? 'blog-chat-expanded' : ''}`}
      aria-labelledby='chat-title'
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
    >
      <header className='chat-header'>
        <div>
          <span className='chat-eyebrow'>
            {t('从文章里，找到答案', 'Answers from the writing')}
          </span>
          <h2 id='chat-title'>Joye blog Chat</h2>
        </div>
        <div className='chat-controls'>
          <button
            className='chat-expand'
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
            aria-pressed={expanded}
          >
            ↗
          </button>
          <button onClick={close} aria-label={t('关闭 Chat', 'Close Chat')}>
            ×
          </button>
        </div>
      </header>
      <nav className='chat-toolbar' aria-label={t('对话管理', 'Conversations')}>
        <button
          disabled={busy}
          onClick={() => {
            setConversation(undefined)
            setTurns([])
            setError('')
          }}
        >
          {t('新对话', 'New chat')}
        </button>
        <select
          aria-label={t('历史对话', 'Saved conversations')}
          value={conversation ?? ''}
          disabled={busy}
          onChange={(e) => void load(e.target.value)}
        >
          <option value=''>{t('历史对话', 'Saved chats')}</option>
          {state.conversations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        {conversation && (
          <button disabled={busy} onClick={() => setConfirmDelete('conversation')}>
            {t('删除', 'Delete')}
          </button>
        )}
        {state.authenticated ? (
          <button
            disabled={busy}
            onClick={async () => {
              try {
                await api('logout')
                setTurns([])
                setConversation(undefined)
                setState({ authenticated: false, used: false, conversations: [] })
                setReady(false)
                setState(await api('session'))
                setReady(true)
                chatTrack('chat_login', surface, { action: 'logout' })
              } catch (e) {
                setError((e as Error).message)
              }
            }}
          >
            {t('退出', 'Sign out')}
          </button>
        ) : (
          <button disabled={busy} onClick={() => setLogin(true)}>
            {t('邮箱登录', 'Sign in')}
          </button>
        )}
      </nav>
      <div className='chat-scroll' ref={scroller}>
        {!turns.length && (
          <section className='chat-welcome'>
            <span className='chat-spark' aria-hidden>
              ✳
            </span>
            <h3>{t('想从哪里开始？', 'Where would you like to start?')}</h3>
            <p>
              {t(
                '聊聊 Agent、前端和我的公开文章。回答会附上来源，方便继续阅读。',
                'Explore agents, frontend engineering, and my published writing. Follow the sources to read more.'
              )}
            </p>
            <div className='chat-suggestions'>
              {(en
                ? [
                    'How do I get started with agents?',
                    'Why use Astro for a personal blog?',
                    'What is harness engineering?'
                  ]
                : [
                    '刚开始学 Agent，推荐读哪篇？',
                    '为什么用 Astro 搭建博客？',
                    'Harness Engineering 是什么？'
                  ]
              ).map((q) => (
                <button key={q} disabled={busy || !ready} onClick={() => void ask(q, 'example')}>
                  {q}
                  <span aria-hidden>↗</span>
                </button>
              ))}
            </div>
            <p className='chat-small'>
              {t(
                '第一问免费，无需登录。继续提问只需邮箱验证码。',
                'Your first question is free. Continue with an email verification code.'
              )}
            </p>
          </section>
        )}
        {turns.map((turn) => (
          <article className='chat-turn' key={turn.id}>
            <div className='chat-question'>{turn.question}</div>
            <div className='chat-answer'>
              <span className='chat-eyebrow'>Joye blog Chat</span>
              <AnswerMarkdown text={turn.answer} urls={turn.sources.map((s) => s.url)} />
              {turn.status === 'pending' && !turn.answer && (
                <p className='chat-small'>
                  {t('正在查找文章并准备回答…', 'Finding sources and preparing an answer…')}
                </p>
              )}
              {turn.sources.length > 0 && (
                <div className='chat-sources' aria-label={t('参考来源', 'Sources')}>
                  {turn.sources
                    .filter((s) => safeSourceUrl(s.url))
                    .map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={() =>
                          chatTrack('chat_source_click', surface, {
                            target: s.url.includes('/blog/')
                              ? 'blog'
                              : s.url.includes('/notes/')
                                ? 'notes'
                                : 'other'
                          })
                        }
                      >
                        <span>{s.title}</span>
                        <span aria-hidden>↗</span>
                      </a>
                    ))}
                </div>
              )}
              {turn.status === 'interrupted' && (
                <p className='chat-small'>{t('回答未完成。', 'Answer interrupted.')}</p>
              )}
            </div>
          </article>
        ))}
        {confirmDelete && (
          <section className='chat-auth'>
            <p>
              {confirmDelete === 'account'
                ? t(
                    '永久删除账户、邮箱和全部聊天记录？',
                    'Permanently delete your account, email and all chats?'
                  )
                : t('永久删除这段对话？', 'Permanently delete this conversation?')}
            </p>
            <button onClick={() => void remove()}>{t('确认删除', 'Delete permanently')}</button>
            <button onClick={() => setConfirmDelete(undefined)}>{t('取消', 'Cancel')}</button>
          </section>
        )}
        {login && (
          <form
            className='chat-auth'
            onSubmit={(e) => {
              e.preventDefault()
              void authenticate(sent)
            }}
          >
            <h3>{t('用邮箱继续聊', 'Continue with email')}</h3>
            <p>
              {t(
                '不需要密码。验证码 10 分钟内有效；你的草稿和第一段对话会保留。',
                'No password needed. The code expires in 10 minutes; your draft and first conversation stay here.'
              )}
            </p>
            <label>
              {t('邮箱', 'Email')}
              <input
                autoFocus
                type='email'
                autoComplete='email'
                required
                maxLength={254}
                value={email}
                disabled={authBusy}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setSent(false)
                  setCode('')
                }}
              />
            </label>
            {!sent && (
              <button type='button' onClick={() => setSent(true)}>
                {t('已有验证码', 'I already have a code')}
              </button>
            )}
            {sent && (
              <label>
                {t('6 位验证码', '6-digit code')}
                <input
                  type='text'
                  inputMode='numeric'
                  autoComplete='one-time-code'
                  pattern='[0-9]{6}'
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
            )}
            <div className='chat-auth-actions'>
              <button disabled={authBusy || (!sent && cooldown > 0)} type='submit'>
                {authBusy
                  ? t('请稍等…', 'Please wait…')
                  : sent
                    ? t('验证并登录', 'Verify and sign in')
                    : t('发送验证码', 'Send code')}
              </button>
              {sent && (
                <button
                  type='button'
                  disabled={authBusy || cooldown > 0}
                  onClick={() => void authenticate(false)}
                >
                  {cooldown > 0 ? `${cooldown}s` : t('重新发送', 'Resend')}
                </button>
              )}
              <button type='button' onClick={() => setLogin(false)}>
                {t('稍后', 'Later')}
              </button>
            </div>
          </form>
        )}
      </div>
      <footer className='chat-composer'>
        <div role='status' aria-live='polite' className='chat-small'>
          {busy
            ? t('正在回答…', 'Answering…')
            : !ready && !error
              ? t('正在连接…', 'Connecting…')
              : notice}
        </div>
        {error && (
          <div role='alert' className='chat-error'>
            {errors[error] ?? t('操作失败，请重试。', 'Something went wrong. Please retry.')}{' '}
            <button
              onClick={() => {
                setError('')
                if (!ready) {
                  void api('session')
                    .then((data) => {
                      setState(data)
                      setReady(true)
                    })
                    .catch((e) => setError(e.message))
                } else if (!login) void ask()
              }}
            >
              {t('重试', 'Retry')}
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void ask()
          }}
        >
          <label className='sr-only' htmlFor='chat-question'>
            {t('你的问题', 'Your question')}
          </label>
          <textarea
            id='chat-question'
            ref={input}
            value={draft}
            maxLength={2000}
            rows={2}
            placeholder={t('关于这些文章，你想问什么？', 'What would you like to know?')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void ask()
              }
            }}
          />
          {busy ? (
            <button type='button' onClick={() => controller.current?.abort()}>
              {t('停止', 'Stop')}
            </button>
          ) : (
            <button type='submit' disabled={!ready || !draft.trim()}>
              {t('提问', 'Ask')} ↑
            </button>
          )}
        </form>
        <p className='chat-small'>
          {t(
            'AI 回答可能有误，请核对来源。聊天保存 30 天；匿名记录保存 1 天。问题及相关对话会发送给模型服务商。',
            'AI can make mistakes. Check the sources. Chats are saved for 30 days; anonymous chats for 1 day. Questions and relevant history are sent to the model provider.'
          )}{' '}
          {state.authenticated && (
            <button disabled={busy} onClick={() => setConfirmDelete('account')}>
              {t('删除账户数据', 'Delete account data')}
            </button>
          )}
        </p>
      </footer>
    </dialog>
  )
}
