import { COMMENT_KIND_LABELS, type DevComment } from './types'

export function normalizePath(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return '/'
  const withoutHash = trimmed.split('#')[0] ?? ''
  const withoutQuery = withoutHash.split('?')[0] ?? ''
  const withLeading = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
  if (withLeading.length > 1 && withLeading.endsWith('/')) {
    return withLeading.replace(/\/+$/, '') || '/'
  }
  return withLeading || '/'
}

export function formatCommentsAsMarkdown(
  comments: DevComment[],
  options: { onlyOpen?: boolean; title?: string } = {}
): string {
  const { onlyOpen = true, title = '请按下面这些页面批注帮我修改文章：' } = options
  const list = onlyOpen ? comments.filter((c) => c.status === 'open') : comments
  if (list.length === 0) return ''

  const grouped = new Map<string, DevComment[]>()
  for (const item of list) {
    const arr = grouped.get(item.path) ?? []
    arr.push(item)
    grouped.set(item.path, arr)
  }

  const lines: string[] = [title, '']
  for (const [pagePath, items] of grouped.entries()) {
    lines.push(`## 页面：\`${pagePath}\``)
    lines.push('')
    items.forEach((item, index) => {
      const tag = COMMENT_KIND_LABELS[item.kind] ?? item.kind
      const statusSuffix = item.status === 'resolved' ? '（已解决）' : ''
      const headingPart = item.heading ? ` · 位于「${item.heading}」` : ''
      lines.push(`${index + 1}. **[${tag}]**${headingPart}${statusSuffix}`)
      if (item.quote) {
        const quoted = item.quote.replace(/\n+/g, ' ')
        lines.push(`   > 原文：${quoted}`)
      }
      lines.push(`   - 批注：${item.body.replace(/\n/g, '\n     ')}`)
      lines.push('')
    })
  }

  return lines.join('\n').trim()
}
