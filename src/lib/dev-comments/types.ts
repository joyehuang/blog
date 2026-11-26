export type CommentKind = 'rewrite' | 'fix' | 'add' | 'cut' | 'idea'
export type CommentStatus = 'open' | 'resolved'

export interface DevComment {
  id: string
  path: string
  quote: string
  prefix: string
  suffix: string
  heading: string
  body: string
  kind: CommentKind
  status: CommentStatus
  updatedQuote?: string
  resolution?: string
  createdAt: string
  updatedAt: string
}

export interface CreateDevCommentInput {
  path: string
  quote?: string
  prefix?: string
  suffix?: string
  heading?: string
  body: string
  kind?: CommentKind
}

export interface UpdateDevCommentInput {
  body?: string
  kind?: CommentKind
  status?: CommentStatus
  updatedQuote?: string
  resolution?: string
}

export const COMMENT_KINDS: ReadonlyArray<{
  value: CommentKind
  label: string
  hint: string
}> = [
  { value: 'rewrite', label: '改文案', hint: '表达更顺、精简或换说法' },
  { value: 'fix', label: '纠错', hint: '事实、术语、代码或链接有误' },
  { value: 'add', label: '补充', hint: '补例子、背景、数据或配图' },
  { value: 'cut', label: '删减', hint: '冗余、偏题或不需要的内容' },
  { value: 'idea', label: '想法', hint: '待讨论的思路或延伸方向' }
]

export const COMMENT_KIND_LABELS: Record<CommentKind, string> = {
  rewrite: '改文案',
  fix: '纠错',
  add: '补充',
  cut: '删减',
  idea: '想法'
}
