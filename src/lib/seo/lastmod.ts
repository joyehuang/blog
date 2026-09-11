import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/** Last source edit, not deployment time. Ignore shallow-boundary history. */
export function contentLastModified(
  filePath: string | undefined,
  declared?: Date
): string | undefined {
  const candidates = declared ? [declared.toISOString()] : []
  if (filePath) {
    const sourcePath = resolve(filePath)
    try {
      const git = (args: string[]) =>
        execFileSync('git', args, {
          cwd: dirname(sourcePath),
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim()
      // Uncommitted source edits have no trustworthy commit timestamp yet.
      if (git(['status', '--porcelain', '--', sourcePath])) return candidates[0]
      const result = git(['log', '-1', '--format=%H %cI', '--', sourcePath])
      const [commit, date] = result.split(' ')
      let shallow: string[] = []
      try {
        shallow = readFileSync(
          resolve(dirname(sourcePath), git(['rev-parse', '--git-path', 'shallow'])),
          'utf8'
        )
          .trim()
          .split('\n')
      } catch {}
      if (commit && date && !shallow.includes(commit) && Number.isFinite(Date.parse(date)))
        candidates.push(new Date(date).toISOString())
    } catch {
      /* No repository/history: only explicit updatedDate is trustworthy. */
    }
  }
  return candidates.sort().at(-1)
}
