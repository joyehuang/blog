export type V4Locale = 'zh' | 'en'

export type V4Item = {
  title: string
  href: string
  meta: string
  kind: string
}

export type V4Repo = {
  name: string
  href: string
  stars: number
  eyebrow: string
  description: string
}

export type V4Milestone = {
  /** `YYYY.MM`, taken from the publish date of the post it points at. */
  date: string
  title: string
  note: string
  href?: string
}

export type V4Counts = {
  posts: number
  notes: number
  talks: number
  stars: number
  teams: number
  /** Total attendance across published talks, summed from their frontmatter. */
  attendees: number
}

export type V4Data = {
  posts: V4Item[]
  notes: V4Item[]
  repos: V4Repo[]
  milestones: V4Milestone[]
  counts: V4Counts
}
