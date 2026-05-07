/**
 * Pseudo-FS node types. The tree is built server-side (see `manifest.ts`)
 * and shipped to the React island once. File content is either inlined
 * (small, static) or fetched lazily via `endpoint` (large, e.g. blog posts).
 */

export type FsNode = DirNode | FileNode | LinkNode

export type DirNode = {
  type: 'dir'
  name: string
  description?: string
  children: FsNode[]
  /**
   * Optional structured metadata at the dir level. Surfaced so an agent
   * can sort or filter (`date`, `lang`, `tags`) without descending into
   * the children. Used for blog/note dirs.
   */
  meta?: Record<string, unknown>
}

export type FileNode = {
  type: 'file'
  name: string
  description?: string
  /** Inline content for static, small nodes. */
  content?: string
  /**
   * Endpoint that returns full plaintext content. Used for blog posts so
   * the manifest stays small. Fetched on `cat` / inline-open.
   */
  endpoint?: string
  /** Where `open` would navigate. Optional escape hatch out of the terminal. */
  href?: string
  /** Structured metadata exposed via `stat` and the agent manifest. */
  meta?: Record<string, unknown>
}

export type LinkNode = {
  type: 'link'
  name: string
  description?: string
  href: string
  /** Display label; falls back to href. */
  display?: string
}
