import type { AgentEvent } from '@/lib/workshop/agent.server'
import { curatedJourneys, validatePlan, type JourneyPlan } from '@/lib/workshop/journey'

import type { SpaceItem } from './content'

export function initAgentNavigator(
  root: HTMLElement,
  items: SpaceItem[],
  openDetail: (id: string) => void
) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!
  const ids = new Set(items.map((item) => item.id))
  const state = {
    plan: null as JourneyPlan | null,
    step: 0,
    busy: false,
    readingId: null as string | null,
    visited: new Set<string>()
  }
  const history: JourneyPlan[] = []
  let controller: AbortController | null = null
  let available = false
  let disposed = false
  let requestId = 0
  const input = get<HTMLInputElement>('agent-question')
  const panel = get('route-panel')
  const activity = get<HTMLOListElement>('agent-activity')
  const status = (text: string, error = false) => {
    get('agent-feedback').hidden = false
    get('agent-status').textContent = text
    root.dataset.agentError = String(error)
  }
  function setBusy(busy: boolean) {
    state.busy = busy
    root.dataset.agentBusy = String(busy)
    get('agent-submit').hidden = busy
    get('agent-cancel').hidden = !busy
    input.setAttribute('aria-busy', String(busy))
  }
  function cancel() {
    requestId++
    controller?.abort()
    controller = null
    setBusy(false)
    state.readingId = null
  }
  function reset() {
    cancel()
    state.plan = null
    state.step = 0
    root.dataset.route = 'false'
    panel.hidden = true
    get('agent-feedback').hidden = true
    activity.hidden = true
    get('agent-activity-toggle').setAttribute('aria-expanded', 'false')
    input.placeholder = '你想了解我的哪一面？'
  }
  function updateStep() {
    const plan = state.plan
    if (!plan) return
    const step = plan.steps[state.step]
    state.visited.add(step.id)
    get('route-mode').textContent =
      plan.mode === 'ai' ? 'AGENT 为你组织的路线' : '策划路线 · 可直接探索'
    get('route-question').textContent = plan.question
    get('route-title').textContent = plan.title
    get('route-number').textContent = String(state.step + 1).padStart(2, '0')
    get('route-label').textContent = step.label
    get('route-reason').textContent = step.reason
    get('route-count').textContent = `${state.step + 1} / ${plan.steps.length}`
    get<HTMLButtonElement>('route-prev').disabled = state.step === 0
    get<HTMLButtonElement>('route-next').disabled = state.step === plan.steps.length - 1
    get('route-read').setAttribute(
      'aria-label',
      `展开来源：${items.find((item) => item.id === step.id)!.title.replace(/\n/g, ' ')}`
    )
    get('route-steps').replaceChildren(
      ...plan.steps.map((step, i) => {
        const button = document.createElement('button')
        button.textContent = String(i + 1).padStart(2, '0')
        button.setAttribute('aria-label', `第 ${i + 1} 步：${step.label}`)
        if (i === state.step) button.setAttribute('aria-current', 'step')
        button.addEventListener('click', () => {
          state.step = i
          updateStep()
        })
        return button
      })
    )
    const followups = get('route-followups')
    followups.hidden = state.step !== plan.steps.length - 1
    followups.replaceChildren(
      ...plan.followUps.map((question) => {
        const button = document.createElement('button')
        button.textContent = `${question} ↗`
        button.addEventListener('click', () => {
          input.value = question
          input.focus()
        })
        return button
      })
    )
    get('route-back').hidden = history.length < 2
    input.placeholder = '沿着这条线，继续问…'
  }
  function enter(plan: JourneyPlan, remember = true) {
    cancel()
    validatePlan(plan, ids)
    if (remember) history.push(plan)
    state.plan = plan
    state.step = 0
    root.dataset.route = 'true'
    root.dataset.agentError = 'false'
    panel.hidden = false
    window.scrollTo({ top: 0, behavior: 'instant' })
    updateStep()
    input.value = ''
    status(plan.mode === 'ai' ? `已按你的问题组织 ${plan.steps.length} 份来源。` : plan.summary)
  }
  root.querySelectorAll<HTMLElement>('[data-journey]').forEach((button) =>
    button.addEventListener('click', () => {
      const plan = curatedJourneys[button.dataset.journey!]
      activity.replaceChildren()
      get('agent-activity-toggle').hidden = true
      activity.hidden = true
      enter(plan)
    })
  )
  get('route-prev').addEventListener('click', () => {
    if (state.step > 0) {
      state.step--
      updateStep()
    }
  })
  get('route-next').addEventListener('click', () => {
    if (state.plan && state.step < state.plan.steps.length - 1) {
      state.step++
      updateStep()
    }
  })
  get('route-read').addEventListener('click', () => {
    if (state.plan) openDetail(state.plan.steps[state.step].id)
  })
  get('route-exit').addEventListener('click', reset)
  get('route-back').addEventListener('click', () => {
    if (history.length > 1) {
      history.pop()
      enter(history.at(-1)!, false)
    }
  })
  get('agent-cancel').addEventListener('click', () => {
    cancel()
    status('已停止。你可以换个问题，或继续浏览当前路线。')
  })
  get('agent-activity-toggle').addEventListener('click', () => {
    activity.hidden = !activity.hidden
    get('agent-activity-toggle').setAttribute('aria-expanded', String(!activity.hidden))
  })
  const focus = () => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    input.focus({ preventScroll: true })
  }
  get('guide-focus').addEventListener('click', focus)
  const onKey = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      if (root.querySelector('dialog[open]')) return
      event.preventDefault()
      focus()
    }
  }
  document.addEventListener('keydown', onKey)
  get('agent-form').addEventListener('submit', async (event) => {
    event.preventDefault()
    const question = input.value.trim()
    if (!question) {
      input.focus()
      return
    }
    if (!available) {
      status('AI 导览尚未连接模型服务。下方三条策划路线可以直接探索。', true)
      return
    }
    cancel()
    const currentRequest = requestId
    controller = new AbortController()
    const signal = controller.signal
    setBusy(true)
    activity.replaceChildren()
    activity.hidden = true
    get('agent-activity-toggle').hidden = false
    status('正在根据你的问题，查找公开内容…')
    let gotPlan = false
    try {
      const response = await fetch('/api/workshop/guide', {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          question,
          context: history
            .slice(-3)
            .map((plan) => ({ question: plan.question, ids: plan.steps.map((step) => step.id) }))
        })
      })
      if (!response.ok) {
        const value = await response.json()
        throw new Error(value.error || '暂时无法连接导览。')
      }
      if (!response.body) throw new Error('没有收到导览内容。')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let totalBytes = 0
      const handle = (line: string) => {
        if (currentRequest !== requestId || !line.trim()) return
        const message = JSON.parse(line) as AgentEvent
        if (message.type === 'error') throw new Error(message.message)
        if (message.type === 'activity') {
          const entry = document.createElement('li')
          entry.textContent = message.message
          activity.append(entry)
          state.readingId = message.ids.find((id) => ids.has(id)) ?? null
          status(message.message)
        } else if (message.type === 'plan') {
          const plan = { ...validatePlan(message.plan, ids), mode: 'ai' as const, question }
          gotPlan = true
          enter(plan)
        }
      }
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        totalBytes += value.byteLength
        if (totalBytes > 100000) throw new Error('导览响应超出限制。')
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()!
        lines.forEach(handle)
        if (gotPlan) {
          await reader.cancel()
          break
        }
      }
      if (!gotPlan && currentRequest === requestId) {
        buffer += decoder.decode()
        handle(buffer)
        if (!gotPlan) throw new Error('导览中断了，请重试。')
      }
    } catch (error) {
      if (currentRequest === requestId && !signal.aborted)
        status(error instanceof Error ? error.message : '导览暂时不可用。', true)
    } finally {
      if (currentRequest === requestId) {
        setBusy(false)
        state.readingId = null
      }
    }
  })
  const availabilityAbort = new AbortController()
  fetch('/api/workshop/guide', { signal: availabilityAbort.signal })
    .then((response) => (response.ok ? response.json() : { available: false }))
    .then((value) => {
      if (disposed) return
      available = value.available === true
      get('agent-availability').textContent = available
        ? 'AI 导览已连接'
        : '策划路线可用 · AI 待连接'
    })
    .catch(() => {
      if (!disposed) get('agent-availability').textContent = '策划路线可用 · AI 暂不可用'
    })
  return {
    state,
    reset,
    selectSource: (id: string) => {
      const index = state.plan?.steps.findIndex((step) => step.id === id) ?? -1
      if (index < 0 || index === state.step) return false
      state.step = index
      updateStep()
      return true
    },
    dispose: () => {
      disposed = true
      cancel()
      availabilityAbort.abort()
      document.removeEventListener('keydown', onKey)
    }
  }
}
