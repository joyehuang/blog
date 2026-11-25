import {
  applyHighlights,
  captureSelectionAnchor,
  clearHighlights,
  getAnnotationRoot,
  scrollToHighlight,
  type SelectionAnchor
} from '@/lib/dev-comments/anchor'
import { formatCommentsAsMarkdown, normalizePath } from '@/lib/dev-comments/format'
import {
  COMMENT_KIND_LABELS,
  COMMENT_KINDS,
  type CommentKind,
  type CommentStatus,
  type DevComment
} from '@/lib/dev-comments/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import './dev-comments.css'

type ScopeFilter = 'page' | 'all'
type StatusFilter = 'open' | 'resolved' | 'all'

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const mo = d.getMonth() + 1
    const da = d.getDate()
    return `${mo}/${da} ${hh}:${mm}`
  } catch {
    return ''
  }
}

export default function DevCommentsHost() {
  const [pathname, setPathname] = useState<string>(() => normalizePath(window.location.pathname))
  const [allComments, setAllComments] = useState<DevComment[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scope, setScope] = useState<ScopeFilter>('page')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Selection popover & floating composer state
  const [selectionAnchor, setSelectionAnchor] = useState<SelectionAnchor | null>(null)
  const [floatingComposerOpen, setFloatingComposerOpen] = useState(false)
  const [draftBody, setDraftBody] = useState('')
  const [draftKind, setDraftKind] = useState<CommentKind>('rewrite')
  const [submitting, setSubmitting] = useState(false)

  // Page-level composer in drawer
  const [pageComposerOpen, setPageComposerOpen] = useState(false)
  const [pageDraftBody, setPageDraftBody] = useState('')
  const [pageDraftKind, setPageDraftKind] = useState<CommentKind>('idea')

  // Inline card editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editKind, setEditKind] = useState<CommentKind>('rewrite')

  // Two-step confirm for clearing current page
  const [confirmClearPage, setConfirmClearPage] = useState(false)

  const toastTimerRef = useRef<number | null>(null)
  const floatingInputRef = useRef<HTMLTextAreaElement | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch('/__dev/comments', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { comments?: DevComment[] }
      setAllComments(Array.isArray(data.comments) ? data.comments : [])
    } catch {
      // Dev server temporarily restarting
    }
  }, [])

  useEffect(() => {
    void fetchComments()
    const syncPath = () => setPathname(normalizePath(window.location.pathname))
    window.addEventListener('popstate', syncPath)
    document.addEventListener('astro:page-load', syncPath)
    return () => {
      window.removeEventListener('popstate', syncPath)
      document.removeEventListener('astro:page-load', syncPath)
    }
  }, [fetchComments])

  const pageComments = useMemo(
    () => allComments.filter((c) => c.path === pathname),
    [allComments, pathname]
  )

  const pageOpenCount = useMemo(
    () => pageComments.filter((c) => c.status === 'open').length,
    [pageComments]
  )

  const allOpenCount = useMemo(
    () => allComments.filter((c) => c.status === 'open').length,
    [allComments]
  )

  const visibleComments = useMemo(() => {
    const base = scope === 'page' ? pageComments : allComments
    return base
      .filter((c) => (statusFilter === 'all' ? true : c.status === statusFilter))
      .slice()
      .reverse()
  }, [allComments, pageComments, scope, statusFilter])

  // Apply & sync in-article highlights whenever current page's comments change
  useEffect(() => {
    const root = getAnnotationRoot()
    applyHighlights(root, pageComments, activeId, (id) => {
      setActiveId(id)
      setScope('page')
      const target = pageComments.find((c) => c.id === id)
      if (target && statusFilter !== 'all' && statusFilter !== target.status) {
        setStatusFilter('all')
      }
      setDrawerOpen(true)
    })
    return () => {
      clearHighlights(root)
    }
  }, [pageComments, activeId, statusFilter])

  // Scroll active card into view inside the drawer
  useEffect(() => {
    if (!drawerOpen || !activeId) return
    const card = document.querySelector<HTMLElement>(`[data-devc-card="${CSS.escape(activeId)}"]`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [drawerOpen, activeId])

  // Track text selections inside the article
  useEffect(() => {
    const handleSelectionEnd = (event: MouseEvent | KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-dev-comments-ui]')) return
      window.setTimeout(() => {
        if (floatingComposerOpen) return
        const root = getAnnotationRoot()
        const anchor = captureSelectionAnchor(root, window.getSelection())
        setSelectionAnchor(anchor)
      }, 10)
    }

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-dev-comments-ui]')) return
      if (floatingComposerOpen) {
        setFloatingComposerOpen(false)
        setSelectionAnchor(null)
      }
    }

    document.addEventListener('mouseup', handleSelectionEnd)
    document.addEventListener('keyup', handleSelectionEnd)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mouseup', handleSelectionEnd)
      document.removeEventListener('keyup', handleSelectionEnd)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [floatingComposerOpen])

  // Keyboard shortcut: Cmd/Ctrl + Shift + M -> annotate selection or toggle drawer
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault()
        const root = getAnnotationRoot()
        const anchor = captureSelectionAnchor(root, window.getSelection())
        if (anchor) {
          setSelectionAnchor(anchor)
          setFloatingComposerOpen(true)
          window.setTimeout(() => floatingInputRef.current?.focus(), 20)
        } else {
          setDrawerOpen((open) => !open)
        }
      } else if (event.key === 'Escape') {
        if (floatingComposerOpen) {
          setFloatingComposerOpen(false)
          setSelectionAnchor(null)
        } else if (editingId) {
          setEditingId(null)
        } else if (drawerOpen) {
          setDrawerOpen(false)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen, editingId, floatingComposerOpen])

  const openFloatingComposer = () => {
    setFloatingComposerOpen(true)
    setDraftBody('')
    setDraftKind('rewrite')
    window.setTimeout(() => floatingInputRef.current?.focus(), 20)
  }

  const createComment = async (payload: {
    quote?: string
    prefix?: string
    suffix?: string
    heading?: string
    body: string
    kind: CommentKind
  }) => {
    const trimmed = payload.body.trim()
    if (!trimmed || submitting) return null
    setSubmitting(true)
    try {
      const res = await fetch('/__dev/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, path: pathname })
      })
      if (!res.ok) {
        showToast('保存失败，请检查本地 dev 服务')
        return null
      }
      const data = (await res.json()) as { comment: DevComment }
      setAllComments((prev) => [...prev, data.comment])
      setActiveId(data.comment.id)
      showToast('已保存到 .dev-comments.json')
      return data.comment
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveSelectionComment = async () => {
    if (!selectionAnchor) return
    const created = await createComment({
      quote: selectionAnchor.quote,
      prefix: selectionAnchor.prefix,
      suffix: selectionAnchor.suffix,
      heading: selectionAnchor.heading,
      body: draftBody,
      kind: draftKind
    })
    if (created) {
      setDraftBody('')
      setFloatingComposerOpen(false)
      setSelectionAnchor(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleSavePageComment = async () => {
    const created = await createComment({
      body: pageDraftBody,
      kind: pageDraftKind
    })
    if (created) {
      setPageDraftBody('')
      setPageComposerOpen(false)
    }
  }

  const handleUpdateComment = async (
    id: string,
    patch: { body?: string; kind?: CommentKind; status?: CommentStatus }
  ) => {
    const res = await fetch(`/__dev/comments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    })
    if (!res.ok) {
      showToast('更新失败')
      return
    }
    const data = (await res.json()) as { comment: DevComment }
    setAllComments((prev) => prev.map((c) => (c.id === id ? data.comment : c)))
    if (editingId === id) setEditingId(null)
  }

  const handleDeleteComment = async (id: string) => {
    const res = await fetch(`/__dev/comments/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      showToast('删除失败')
      return
    }
    setAllComments((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) setActiveId(null)
    if (editingId === id) setEditingId(null)
    showToast('已删除批注')
  }

  const handleClearResolved = async () => {
    const query =
      scope === 'page'
        ? `?path=${encodeURIComponent(pathname)}&status=resolved`
        : '?status=resolved'
    const res = await fetch(`/__dev/comments${query}`, { method: 'DELETE' })
    if (!res.ok) return
    const data = (await res.json()) as { removed: number }
    if (data.removed > 0) {
      await fetchComments()
      showToast(`已清理 ${data.removed} 条已解决批注`)
    }
  }

  const handleClearPage = async () => {
    if (!confirmClearPage) {
      setConfirmClearPage(true)
      window.setTimeout(() => setConfirmClearPage(false), 3500)
      return
    }
    setConfirmClearPage(false)
    const res = await fetch(`/__dev/comments?path=${encodeURIComponent(pathname)}`, {
      method: 'DELETE'
    })
    if (!res.ok) return
    await fetchComments()
    setActiveId(null)
    showToast('已清空当前页所有批注')
  }

  const handleCopyForAgent = async () => {
    const source = scope === 'page' ? pageComments : allComments
    const md = formatCommentsAsMarkdown(source, { onlyOpen: statusFilter !== 'all' })
    if (!md) {
      showToast('当前筛选下没有可复制的批注')
      return
    }
    try {
      await navigator.clipboard.writeText(md)
      showToast('已复制为 Markdown，直接粘贴给 Agent 即可')
    } catch {
      showToast('复制失败，请直接让 Agent 读取 .dev-comments.json')
    }
  }

  const handleLocate = (comment: DevComment) => {
    setActiveId(comment.id)
    if (comment.path !== pathname) {
      window.location.href = comment.path
      return
    }
    const root = getAnnotationRoot()
    const ok = scrollToHighlight(root, comment.id)
    if (!ok) {
      showToast(comment.quote ? '原文已修改，未找到精确高亮位置' : '这是一条整页批注')
    }
  }

  // Clamp floating popover & composer inside viewport
  const popoverPos = useMemo(() => {
    if (!selectionAnchor) return null
    const x = Math.min(
      Math.max(selectionAnchor.rect.left + selectionAnchor.rect.width / 2, 90),
      window.innerWidth - 90
    )
    const y = Math.max(selectionAnchor.rect.top, 56)
    return { left: x, top: y }
  }, [selectionAnchor])

  const composerPos = useMemo(() => {
    if (!selectionAnchor) return null
    const width = Math.min(360, window.innerWidth - 24)
    const left = Math.min(Math.max(selectionAnchor.rect.left, 12), window.innerWidth - width - 12)
    const belowTop = selectionAnchor.rect.bottom + 10
    const fitsBelow = belowTop + 260 < window.innerHeight
    const top = fitsBelow ? belowTop : Math.max(16, selectionAnchor.rect.top - 250)
    return { left, top }
  }, [selectionAnchor])

  const hasResolvedInScope = useMemo(() => {
    const base = scope === 'page' ? pageComments : allComments
    return base.some((c) => c.status === 'resolved')
  }, [allComments, pageComments, scope])

  return (
    <div data-dev-comments-ui='true'>
      {/* Floating trigger pill */}
      {!drawerOpen && (
        <button
          type='button'
          className='devc-fab'
          onClick={() => setDrawerOpen(true)}
          title='打开本地批注面板（快捷键 ⌘⇧M / Ctrl+Shift+M）'
        >
          <span className='devc-fab-dot' aria-hidden='true' />
          <span>批注</span>
          <span className='devc-fab-count'>{pageOpenCount}</span>
        </button>
      )}

      {/* Selection quick action popover */}
      {selectionAnchor && !floatingComposerOpen && popoverPos && (
        <div className='devc-popover' style={popoverPos}>
          <button type='button' className='devc-popover-btn' onClick={openFloatingComposer}>
            <span>添加批注</span>
            <span className='devc-popover-kbd'>⌘⇧M</span>
          </button>
        </div>
      )}

      {/* Floating composer anchored near selected text */}
      {selectionAnchor && floatingComposerOpen && composerPos && (
        <div className='devc-composer-float' style={composerPos}>
          {selectionAnchor.heading && (
            <p className='devc-heading-hint'>位于：{selectionAnchor.heading}</p>
          )}
          <blockquote className='devc-quote'>{selectionAnchor.quote}</blockquote>

          <div className='devc-kinds' role='group' aria-label='批注类型'>
            {COMMENT_KINDS.map((k) => (
              <button
                key={k.value}
                type='button'
                className='devc-kind-pill'
                data-selected={draftKind === k.value}
                title={k.hint}
                onClick={() => setDraftKind(k.value)}
              >
                {k.label}
              </button>
            ))}
          </div>

          <textarea
            ref={floatingInputRef}
            className='devc-textarea'
            placeholder='写下你的修改意见…（⌘/Ctrl + Enter 保存）'
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                void handleSaveSelectionComment()
              }
            }}
          />

          <div className='devc-form-foot'>
            <span className='devc-hint'>存至 .dev-comments.json</span>
            <div className='devc-footer-actions'>
              <button
                type='button'
                className='devc-btn'
                onClick={() => {
                  setFloatingComposerOpen(false)
                  setSelectionAnchor(null)
                }}
              >
                取消
              </button>
              <button
                type='button'
                className='devc-btn devc-btn-primary'
                disabled={!draftBody.trim() || submitting}
                onClick={() => void handleSaveSelectionComment()}
              >
                保存批注
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-side collapsible drawer */}
      {drawerOpen && (
        <aside className='devc-drawer' aria-label='本地文章批注面板'>
          <div className='devc-header'>
            <h2 className='devc-header-title'>
              <span>本地批注</span>
              <span className='devc-header-badge'>DEV</span>
            </h2>
            <div className='devc-header-actions'>
              <button
                type='button'
                className='devc-btn'
                onClick={() => setPageComposerOpen((v) => !v)}
              >
                + 整页批注
              </button>
              <button
                type='button'
                className='devc-btn devc-btn-primary'
                onClick={() => void handleCopyForAgent()}
              >
                复制给 Agent
              </button>
              <button
                type='button'
                className='devc-btn devc-btn-ghost'
                aria-label='关闭批注面板'
                onClick={() => setDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Scope & status filters */}
          <div className='devc-toolbar'>
            <div className='devc-row'>
              <div className='devc-tabs' role='tablist' aria-label='批注范围'>
                <button
                  type='button'
                  className='devc-tab'
                  data-active={scope === 'page'}
                  onClick={() => setScope('page')}
                >
                  当前页 ({pageOpenCount})
                </button>
                <button
                  type='button'
                  className='devc-tab'
                  data-active={scope === 'all'}
                  onClick={() => setScope('all')}
                >
                  全部页面 ({allOpenCount})
                </button>
              </div>

              <div className='devc-tabs' role='tablist' aria-label='批注状态'>
                <button
                  type='button'
                  className='devc-tab'
                  data-active={statusFilter === 'open'}
                  onClick={() => setStatusFilter('open')}
                >
                  未解决
                </button>
                <button
                  type='button'
                  className='devc-tab'
                  data-active={statusFilter === 'resolved'}
                  onClick={() => setStatusFilter('resolved')}
                >
                  已解决
                </button>
                <button
                  type='button'
                  className='devc-tab'
                  data-active={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                >
                  全部
                </button>
              </div>
            </div>
          </div>

          {/* Optional page-level composer */}
          {pageComposerOpen && (
            <div className='devc-page-composer'>
              <div className='devc-kinds'>
                {COMMENT_KINDS.map((k) => (
                  <button
                    key={k.value}
                    type='button'
                    className='devc-kind-pill'
                    data-selected={pageDraftKind === k.value}
                    onClick={() => setPageDraftKind(k.value)}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <textarea
                className='devc-textarea'
                placeholder='给整篇文章留一条总评或修改方向…（⌘/Ctrl + Enter 保存）'
                value={pageDraftBody}
                onChange={(e) => setPageDraftBody(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    void handleSavePageComment()
                  }
                }}
              />
              <div className='devc-form-foot'>
                <span className='devc-hint'>{pathname}</span>
                <div className='devc-footer-actions'>
                  <button
                    type='button'
                    className='devc-btn'
                    onClick={() => setPageComposerOpen(false)}
                  >
                    取消
                  </button>
                  <button
                    type='button'
                    className='devc-btn devc-btn-primary'
                    disabled={!pageDraftBody.trim() || submitting}
                    onClick={() => void handleSavePageComment()}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Comment cards */}
          <div className='devc-list'>
            {visibleComments.length === 0 ? (
              <div className='devc-empty'>
                <p>这里还没有批注。</p>
                <p>在正文中直接用鼠标划选任意文字，就会弹出「添加批注」按钮。</p>
              </div>
            ) : (
              visibleComments.map((comment) => {
                const isEditing = editingId === comment.id
                return (
                  <article
                    key={comment.id}
                    className='devc-card'
                    data-devc-card={comment.id}
                    data-active={activeId === comment.id}
                    data-status={comment.status}
                  >
                    <div className='devc-card-top'>
                      <div className='devc-card-tags'>
                        <span className='devc-tag' data-kind={comment.kind}>
                          {COMMENT_KIND_LABELS[comment.kind]}
                        </span>
                        {comment.status === 'resolved' && (
                          <span className='devc-status-resolved'>已解决</span>
                        )}
                      </div>
                      <span className='devc-card-time'>{formatTime(comment.updatedAt)}</span>
                    </div>

                    {scope === 'all' && (
                      <a className='devc-card-path' href={comment.path}>
                        {comment.path}
                      </a>
                    )}

                    {comment.heading && (
                      <p className='devc-heading-hint'>位于：{comment.heading}</p>
                    )}

                    {comment.quote && (
                      <button
                        type='button'
                        className='devc-card-quote-btn'
                        title='点击定位到原文高亮'
                        onClick={() => handleLocate(comment)}
                      >
                        <blockquote className='devc-quote'>{comment.quote}</blockquote>
                      </button>
                    )}

                    {isEditing ? (
                      <div>
                        <div className='devc-kinds'>
                          {COMMENT_KINDS.map((k) => (
                            <button
                              key={k.value}
                              type='button'
                              className='devc-kind-pill'
                              data-selected={editKind === k.value}
                              onClick={() => setEditKind(k.value)}
                            >
                              {k.label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className='devc-textarea'
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                              e.preventDefault()
                              void handleUpdateComment(comment.id, {
                                body: editBody,
                                kind: editKind
                              })
                            }
                          }}
                        />
                        <div className='devc-form-foot'>
                          <span className='devc-hint'>⌘↵ 保存</span>
                          <div className='devc-footer-actions'>
                            <button
                              type='button'
                              className='devc-btn'
                              onClick={() => setEditingId(null)}
                            >
                              取消
                            </button>
                            <button
                              type='button'
                              className='devc-btn devc-btn-primary'
                              disabled={!editBody.trim()}
                              onClick={() =>
                                void handleUpdateComment(comment.id, {
                                  body: editBody,
                                  kind: editKind
                                })
                              }
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className='devc-card-body'>{comment.body}</p>
                        <div className='devc-card-actions'>
                          {comment.quote && (
                            <button
                              type='button'
                              className='devc-btn devc-btn-ghost'
                              onClick={() => handleLocate(comment)}
                            >
                              定位
                            </button>
                          )}
                          <button
                            type='button'
                            className='devc-btn devc-btn-ghost'
                            onClick={() => {
                              setEditingId(comment.id)
                              setEditBody(comment.body)
                              setEditKind(comment.kind)
                            }}
                          >
                            编辑
                          </button>
                          <button
                            type='button'
                            className='devc-btn devc-btn-ghost'
                            onClick={() =>
                              void handleUpdateComment(comment.id, {
                                status: comment.status === 'open' ? 'resolved' : 'open'
                              })
                            }
                          >
                            {comment.status === 'open' ? '标为已解决' : '重新打开'}
                          </button>
                          <button
                            type='button'
                            className='devc-btn devc-btn-ghost devc-btn-danger'
                            onClick={() => void handleDeleteComment(comment.id)}
                          >
                            删除
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                )
              })
            )}
          </div>

          <div className='devc-footer'>
            <span className='devc-hint'>.dev-comments.json</span>
            <div className='devc-footer-actions'>
              {hasResolvedInScope && (
                <button
                  type='button'
                  className='devc-btn'
                  onClick={() => void handleClearResolved()}
                >
                  清理已解决
                </button>
              )}
              {scope === 'page' && pageComments.length > 0 && (
                <button
                  type='button'
                  className='devc-btn devc-btn-danger'
                  onClick={() => void handleClearPage()}
                >
                  {confirmClearPage ? '确认清空本页？' : '清空本页'}
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {toast && (
        <div className='devc-toast' role='status' aria-live='polite'>
          {toast}
        </div>
      )}
    </div>
  )
}
