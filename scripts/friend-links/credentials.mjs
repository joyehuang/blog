import { closeSync, constants, fstatSync, openSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const tokenPath = join(homedir(), '.config/friend-link-automation/waline-admin-token')
// Read on each use: atomic private-file replacement takes effect without restarting the worker.
export function readAdminToken(path = tokenPath) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const s = fstatSync(fd)
    if (!s.isFile() || (s.mode & 0o777) !== 0o600 || s.uid !== process.getuid() || s.size > 8192)
      throw Error('administrator bearer requires owned regular file mode 0600')
    const token = readFileSync(fd, 'utf8').trim()
    // Waline 1.41.4 verifies a string user ID payload. It rejects object payloads (including exp).
    // This is a format guard, NOT local signature verification; GET /api/token verifies identity.
    const parts = token.split('.')
    if (
      parts.length !== 3 ||
      parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p)) ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(Buffer.from(parts[1], 'base64url').toString())
    )
      throw Error('invalid Waline string-payload bearer format')
    return token
  } finally {
    closeSync(fd)
  }
}
