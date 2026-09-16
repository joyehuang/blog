import { retrieve, safeSourceUrl, type Source } from './safety'
import { safeWebUrl } from './web-url'

export type SourceReference = { title: string; url: string; text?: string; kind?: 'site' | 'web' }
export type HistoryTurn = { question: string; answer: string; sources?: SourceReference[] }

export function isReferential(question: string): boolean {
  if (/换个话题|另一个问题|说回|改聊|换成|instead|new topic|switch (?:to|topics)/i.test(question))
    return false
  return /刚才|上面|上一(?:篇|个|条)|那篇|这篇|它(?:们)?|这个|那个|该(?:文章|项目|方法)|继续|展开|\b(?:it|its|that|those|previous|earlier|elaborate|expand|more about)\b/i.test(
    question
  )
}

// Only call with history returned by the owner-checked reserve transaction.
// Source authority is the persisted retrieval record, never a URL in model prose.
export function conversationSources(
  question: string,
  history: HistoryTurn[],
  corpus: Source[]
): Source[] {
  if (!isReferential(question) || !history.length) return retrieve(question, corpus)
  const previous = history.at(-1)!
  const references = (previous.sources ?? []).slice(0, 6)
  const documents: Source[] = []
  for (const ref of references) {
    const url = safeSourceUrl(ref.url)
    const document = url && corpus.find((s) => s.url === url)
    if (document) documents.push(document)
    else if (ref.kind === 'web' && safeWebUrl(ref.url) && ref.text) {
      documents.push({
        title: ref.title.slice(0, 200),
        url: ref.url,
        text: ref.text.slice(0, 1200),
        kind: 'web'
      })
    }
  }
  if (!documents.length) return retrieve(question, corpus)
  const result: Source[] = []
  for (const doc of documents) {
    const hits = doc.kind === 'web' ? [] : retrieve(`${previous.question} ${question}`, [doc])
    result.push(...(hits.length ? hits : [{ ...doc, text: doc.text.slice(0, 1200) }]))
  }
  return result.slice(0, 6)
}
