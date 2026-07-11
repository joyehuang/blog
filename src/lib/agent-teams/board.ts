export type SearchableTeam = {
  title: string
  tags: string[]
  members: { name: string }[]
}

export function normalizeTeamSearch(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

export function teamMatchesSearch(team: SearchableTeam, query: string): boolean {
  const needle = normalizeTeamSearch(query).replace(/^#/, '')
  if (!needle) return true
  const fields = [team.title, ...team.tags, ...team.members.map((member) => member.name)]
  return fields.some((field) => normalizeTeamSearch(field).includes(needle))
}

export function pageSizeForWidth(width: number): number {
  return width <= 640 ? 4 : 8
}

export function paginationFor(total: number, requestedPage: number, pageSize: number) {
  const safeSize = Math.max(1, Math.trunc(pageSize) || 1)
  const pageCount = total === 0 ? 0 : Math.ceil(total / safeSize)
  const maxPage = Math.max(0, pageCount - 1)
  const page = Math.min(maxPage, Math.max(0, Math.trunc(requestedPage) || 0))
  return {
    page,
    pageCount,
    start: page * safeSize,
    end: Math.min(total, (page + 1) * safeSize)
  }
}
