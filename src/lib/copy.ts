/**
 * 复制入口的共同实现。
 *
 * 唯一的规则：**先等剪贴板真的收下，再说复制成功**。原来几处入口都是
 * `navigator.clipboard.writeText(...)` 之后立刻打勾 / 弹 toast，Promise 不等、
 * 异常不接——权限被拒、非安全上下文、文档失焦，用户都会看到一个假的「已复制」。
 */

export type CopyOutcome = 'copied' | 'failed'

/** 老浏览器 / 非安全上下文的兜底：真选中再 execCommand，失败照样算失败 */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0'
  document.body.appendChild(area)
  try {
    area.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    area.remove()
  }
}

export async function copyText(text: string): Promise<CopyOutcome> {
  if (!text) return 'failed'
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'copied'
    } catch {
      // 掉到兜底再试一次，而不是直接报成功
    }
  }
  return legacyCopy(text) ? 'copied' : 'failed'
}

export function showToast(message: string) {
  document.dispatchEvent(new CustomEvent('toast', { detail: { message } }))
}
