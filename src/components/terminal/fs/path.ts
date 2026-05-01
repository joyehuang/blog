import { ROOT_LABEL } from './content'
import type { FsNode } from './types'

/**
 * Resolve a user-typed path against `cwd` to an absolute, normalized path.
 *
 *   resolvePath('/',      'blog')      // '/blog'
 *   resolvePath('/blog',  '..')        // '/'
 *   resolvePath('/blog',  '../notes')  // '/notes'
 *   resolvePath('/blog',  '~')         // '/'
 *   resolvePath('/blog',  '/etc/motd') // '/etc/motd'
 *
 * Always returns a string starting with '/'. Drops trailing '/'.
 */
export function resolvePath(cwd: string, input: string): string {
  if (!input || input === '~') return '/'
  let raw = input
  if (raw.startsWith('~/')) raw = '/' + raw.slice(2)

  const isAbs = raw.startsWith('/')
  const base = isAbs ? [] : segs(cwd)
  const out = base.slice()
  for (const seg of segs(raw)) {
    if (seg === '.') continue
    if (seg === '..') out.pop()
    else out.push(seg)
  }
  return out.length ? '/' + out.join('/') : '/'
}

export function parentOf(path: string): string {
  if (path === '/' || !path) return '/'
  const s = segs(path)
  s.pop()
  return s.length ? '/' + s.join('/') : '/'
}

/** Walk `root` to find the node at `path`. Returns null on any miss. */
export function getNode(root: FsNode, path: string): FsNode | null {
  if (path === '/' || path === '') return root
  if (root.type !== 'dir') return null
  let node: FsNode = root
  for (const seg of segs(path)) {
    if (node.type !== 'dir') return null
    const next: FsNode | undefined = node.children.find((c) => c.name === seg)
    if (!next) return null
    node = next
  }
  return node
}

/** Render a path for the prompt. Root displays as `~` (bash-style). */
export function displayPath(path: string): string {
  return path === '/' ? '~' : path
}

/**
 * Hostname-prefixed path for `pwd` output. Root → `joye.devserver`,
 * children → `joye.devserver/blog/<slug>`. Always anchors the tree on
 * a visible host name, so the FS feels like a real machine.
 */
export function prettyPath(path: string): string {
  return path === '/' ? ROOT_LABEL : `${ROOT_LABEL}${path}`
}

function segs(path: string): string[] {
  return path.split('/').filter(Boolean)
}
