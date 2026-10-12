import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'

/**
 * Commit times of the edits made to a file after the commit that introduced it,
 * newest first. The oldest commit in view is dropped because it is either the
 * file's creation or, in a shallow clone, the boundary commit that git reports
 * as "adding" every file that already existed there; neither is an edit.
 * Returns [] without history (no repository, or untracked file).
 */
export function editCommitTimes(filePath: string): Date[] {
  const sourcePath = resolve(filePath)
  let log: string
  try {
    log = execFileSync('git', ['log', '--format=%cI', '--', sourcePath], {
      cwd: dirname(sourcePath),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch {
    return []
  }
  return log
    .split('\n')
    .map((line) => new Date(line.trim()))
    .filter((date) => Number.isFinite(date.getTime()))
    .slice(0, -1)
}

/**
 * Pick the last-modified time: the frontmatter `updatedDate` when present,
 * otherwise the last git edit, otherwise `published`. Never earlier than
 * `published`. Pure, so it never depends on the build clock.
 */
export function resolveLastModified(published: Date, declared?: Date, edits: Date[] = []): string {
  const source = [declared, edits[0]].find((date) => date && Number.isFinite(date.getTime()))
  return new Date(Math.max(published.getTime(), source?.getTime() ?? 0)).toISOString()
}

/**
 * ISO last-modified time for an article. Sourced from the frontmatter
 * `updatedDate`, else the last git edit of the source file, else the publish date. Deterministic across rebuilds: it comes from
 * the content and its history, never from build time.
 */
export function contentLastModified(
  filePath: string | undefined,
  published: Date,
  declared?: Date
): string {
  return resolveLastModified(published, declared, filePath ? editCommitTimes(filePath) : [])
}
