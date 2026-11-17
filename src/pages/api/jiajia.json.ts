import type { APIRoute } from 'astro'

export const prerender = false

export interface JiajiaAnswerItem {
  id: string
  title: string
  conclusion: string
  type: 'method' | 'comparison' | 'concept' | 'career' | 'industry' | 'link' | 'qa'
  topic?: string | null
  url: string
}

const JIAJIA_ORIGIN = 'https://jiajia.fun'

/** Curated real answers from jiajia.fun with exact /a/<id>-<slug> permalinks. */
export const FALLBACK_JIAJIA_ANSWERS: JiajiaAnswerItem[] = [
  {
    id: '3f1234d6-48cc-488b-b49d-9aec22950181',
    title: '多 Agent 协作与分工应该怎么设计',
    conclusion:
      '不要模仿人类职位或让多个 Agent 平级自由协作，应按上下文边界、权限立场和物理隔离切分，把子 Agent 当受控工具调用。',
    type: 'method',
    topic: 'Agent 工程',
    url: `${JIAJIA_ORIGIN}/a/3f1234d6-48cc-488b-b49d-9aec22950181-%E5%A4%9Aagent%E5%8D%8F%E4%BD%9C%E4%B8%8E%E5%88%86%E5%B7%A5%E5%BA%94%E8%AF%A5%E6%80%8E%E4%B9%88%E8%AE%BE%E8%AE%A1`
  },
  {
    id: '200b404c-a49a-439b-9201-52314c3c59c6',
    title: '为何应让强模型自主决定写入记忆而非写死规则',
    conclusion:
      '对强模型预先写死记忆筛选规则反而压低性能；解决不可靠靠的是拿原始 transcript 核对重写，而非静态规则限制。',
    type: 'concept',
    topic: 'Agent 工程',
    url: `${JIAJIA_ORIGIN}/a/200b404c-a49a-439b-9201-52314c3c59c6-%E4%B8%BA%E4%BD%95%E5%BA%94%E8%AE%A9%E5%BC%BA%E6%A8%A1%E5%9E%8B%E8%87%AA%E4%B8%BB%E5%86%B3%E5%AE%9A%E5%86%99%E5%85%A5%E8%AE%B0%E5%BF%86%E8%80%8C%E9%9D%9E%E5%86%99%E6%AD%BB%E8%A7%84%E5%88%99`
  },
  {
    id: 'a2ce6b7c-1b1f-4cb2-9320-3a6903d4c930',
    title: '长期编程任务如何管理 Agent 上下文',
    conclusion:
      '长期编程协作应以分层知识、可验证任务状态和按需历史检索重建上下文，让新会话低成本恢复工作，而不是反复搬运完整聊天记录。',
    type: 'method',
    topic: 'Agent 工程',
    url: `${JIAJIA_ORIGIN}/a/a2ce6b7c-1b1f-4cb2-9320-3a6903d4c930-%E9%95%BF%E6%9C%9F%E7%BC%96%E7%A8%8B%E4%BB%BB%E5%8A%A1%E5%A6%82%E4%BD%95%E7%AE%A1%E7%90%86agent%E4%B8%8A%E4%B8%8B%E6%96%87`
  },
  {
    id: 'b685e4d5-b261-4021-915c-dae70e72a1b1',
    title: '如何把 Agent 评测包装进项目',
    conclusion:
      '从 20 到 50 条真实 badcase 起步，按任务集、判定器、可复现运行层和带 trace 的报告四要素分三层落地。',
    type: 'method',
    topic: 'Agent 工程',
    url: `${JIAJIA_ORIGIN}/a/b685e4d5-b261-4021-915c-dae70e72a1b1-%E5%A6%82%E4%BD%95%E6%8A%8Aagent%E8%AF%84%E6%B5%8B%E5%8C%85%E8%A3%85%E8%BF%9B%E9%A1%B9%E7%9B%AE`
  },
  {
    id: '7acb496a-11b2-4150-b04b-1adbe3d834d3',
    title: 'Agent 的记忆模块怎么做',
    conclusion:
      '记忆模块按会话上下文、近期问答带入、检索式长期记忆、群聊历史、顶层规则五层设计，核心是原文落盘加索引指针。',
    type: 'method',
    topic: 'Agent 工程',
    url: `${JIAJIA_ORIGIN}/a/7acb496a-11b2-4150-b04b-1adbe3d834d3-agent%E7%9A%84%E8%AE%B0%E5%BF%86%E6%A8%A1%E5%9D%97%E6%80%8E%E4%B9%88%E5%81%9A`
  },
  {
    id: 'd49fe50e-dfd1-4968-b92f-5ed9078aee26',
    title: 'Skill 的定义、构建步骤与多 Agent 协调机制',
    conclusion:
      'Skill 是将做事流程文件化的经验资产；多 Agent 协调在工程上应采用“主从 + 文件契约”而非自由聊天。',
    type: 'method',
    topic: 'Agent 工程',
    url: `${JIAJIA_ORIGIN}/a/d49fe50e-dfd1-4968-b92f-5ed9078aee26-skill%E7%9A%84%E5%AE%9A%E4%B9%89-%E6%9E%84%E5%BB%BA%E6%AD%A5%E9%AA%A4%E4%B8%8E%E5%A4%9Aagent%E5%8D%8F%E8%B0%83%E6%9C%BA%E5%88%B6`
  },
  {
    id: 'e33f26f6-ca20-4641-9104-9b33906ea7fd',
    title: '高并发下 Agent 记忆怎么分层与保证一致',
    conclusion:
      '按会话内工作记忆与跨会话长期记忆分层，写入走异步队列或事件溯源，避免多并发直接覆写同一状态。',
    type: 'method',
    topic: 'Agent 工程',
    url: `${JIAJIA_ORIGIN}/a/e33f26f6-ca20-4641-9104-9b33906ea7fd-%E9%AB%98%E5%B9%B6%E5%8F%91%E4%B8%8Bagent%E8%AE%B0%E5%BF%86%E6%80%8E%E4%B9%88%E5%88%86%E5%B1%82%E4%B8%8E%E4%BF%9D%E8%AF%81%E4%B8%80%E8%87%B4`
  },
  {
    id: 'b25f41c3-5c27-4b54-8b27-d96bfb7b40e6',
    title: '如何提升 Claude Code 的日常使用体验',
    conclusion:
      '用 CLAUDE.md 固化仓库约定与验证命令，配合小步提交与子 Agent 隔离重度检索，减少上下文污染。',
    type: 'method',
    topic: '编程工具与选型',
    url: `${JIAJIA_ORIGIN}/a/b25f41c3-5c27-4b54-8b27-d96bfb7b40e6-%E5%A6%82%E4%BD%95%E6%8F%90%E5%8D%87claude-code%E7%9A%84%E6%97%A5%E5%B8%B8%E4%BD%BF%E7%94%A8%E4%BD%93%E9%AA%8C`
  },
  {
    id: 'cc4559e7-59bc-4561-b090-3f4af35a9df9',
    title: '实习抢不到核心活怎么攒出可写进简历的产出',
    conclusion:
      '把边缘任务做成可量化的工程闭环（评测集、自动化回归、耗时或准确率对比），比单纯参与大模块更有说服力。',
    type: 'method',
    topic: '求职与学习',
    url: `${JIAJIA_ORIGIN}/a/cc4559e7-59bc-4561-b090-3f4af35a9df9-%E5%AE%9E%E4%B9%A0%E6%8A%A2%E4%B8%8D%E5%88%B0%E6%A0%B8%E5%BF%83%E6%B4%BB%E6%80%8E%E4%B9%88%E6%94%92%E5%87%BA%E5%8F%AF%E5%86%99%E8%BF%9B%E7%AE%80%E5%8E%86%E7%9A%84%E4%BA%A7%E5%87%BA`
  }
]

let cachedCatalog: { items: JiajiaAnswerItem[]; fetchedAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

interface RawPublicEntry {
  id?: string
  title?: string
  conclusion?: string
  type?: JiajiaAnswerItem['type']
  topic?: { name?: string } | null
  path?: string
}

interface RawQaConversation {
  kind?: string
  id?: string
  code?: string
  path?: string
  question?: { text?: string }
  answer?: { text?: string }
}

function toEntryItem(raw: RawPublicEntry): JiajiaAnswerItem | null {
  if (!raw?.id || !raw?.title) return null
  const path =
    typeof raw.path === 'string' && raw.path.startsWith('/a/') ? raw.path : `/a/${raw.id}`
  return {
    id: raw.id,
    title: raw.title.trim(),
    conclusion: (raw.conclusion ?? '').trim().slice(0, 110),
    type: raw.type ?? 'method',
    topic: raw.topic?.name ?? null,
    url: `${JIAJIA_ORIGIN}${path}`
  }
}

function toQaItem(raw: RawQaConversation): JiajiaAnswerItem | null {
  if (raw?.kind !== 'qa' || !raw.id || !raw.question?.text) return null
  const path =
    typeof raw.path === 'string' && raw.path.startsWith('/qa/')
      ? raw.path
      : raw.code
        ? `/qa/${raw.code}`
        : `/qa/${raw.id}`
  return {
    id: raw.id,
    title: raw.question.text.trim().slice(0, 80),
    conclusion: (raw.answer?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 110),
    type: 'qa',
    topic: '群友提问',
    url: `${JIAJIA_ORIGIN}${path}`
  }
}

async function loadCatalog(): Promise<JiajiaAnswerItem[]> {
  if (cachedCatalog && Date.now() - cachedCatalog.fetchedAt < CACHE_TTL_MS) {
    return cachedCatalog.items
  }

  try {
    const pages = [1, 2, 3, 4, 5, 6]
    const responses = await Promise.all(
      pages.map((page) =>
        fetch(`${JIAJIA_ORIGIN}/api/public/entries?page=${page}&pageSize=50`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4000)
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    )

    const seen = new Set<string>()
    const items: JiajiaAnswerItem[] = []
    for (const data of responses) {
      const list = Array.isArray(data?.items) ? (data.items as RawPublicEntry[]) : []
      for (const raw of list) {
        const item = toEntryItem(raw)
        if (item && !seen.has(item.id)) {
          seen.add(item.id)
          items.push(item)
        }
      }
    }

    if (items.length > 0) {
      cachedCatalog = { items, fetchedAt: Date.now() }
      return items
    }
  } catch {
    // fall back to curated list
  }

  return FALLBACK_JIAJIA_ANSWERS
}

async function searchExactAnswers(query: string): Promise<JiajiaAnswerItem[]> {
  try {
    const res = await fetch(
      `${JIAJIA_ORIGIN}/api/public/search?${new URLSearchParams({ q: query, page: '1', pageSize: '6' })}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500)
      }
    )
    if (!res.ok) return []
    const data = (await res.json()) as {
      entries?: { items?: RawPublicEntry[] }
      qa?: { items?: RawQaConversation[] }
    }

    const results: JiajiaAnswerItem[] = []
    const seen = new Set<string>()
    for (const raw of data.entries?.items ?? []) {
      const item = toEntryItem(raw)
      if (item && !seen.has(item.url)) {
        seen.add(item.url)
        results.push(item)
      }
    }
    for (const raw of data.qa?.items ?? []) {
      const item = toQaItem(raw)
      if (item && !seen.has(item.url)) {
        seen.add(item.url)
        results.push(item)
      }
    }
    return results.slice(0, 6)
  } catch {
    return []
  }
}

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 120)
  if (q) {
    const remoteHits = await searchExactAnswers(q)
    return new Response(JSON.stringify({ query: q, items: remoteHits }), {
      headers: {
        'cache-control': 'public, max-age=60, s-maxage=300',
        'content-type': 'application/json; charset=utf-8'
      }
    })
  }

  const items = await loadCatalog()
  return new Response(JSON.stringify({ items }), {
    headers: {
      'cache-control': 'public, max-age=300, s-maxage=600',
      'content-type': 'application/json; charset=utf-8'
    }
  })
}
