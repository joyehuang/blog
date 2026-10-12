/**
 * 审美笔记这张图的「进入视口再播放」开关。
 *
 * 视口外的图在首帧前就收起（见 RevealBoot.astro 的内联脚本）。模块脚本往往要等打包文件
 * 下载完才执行，如果那时再给已经画出来的图加 ut-armed，读者会先看见终态，再看见它塌一下、
 * 又展开。所以这里再量一次：已经在视口里、或还测不到尺寸的图，直接停在终态。
 *
 * 收起时 .ut-rv 带 inert，里面的按钮不能 Tab 到，也点不到。
 * 没有 JS、没有 IntersectionObserver、prefers-reduced-motion 时不收起，图以终态展示。
 * 页面打开期间如果改成减少动画，还没收起的图直接展开，不再等滚进视口。
 */

export type RevealRect = { top: number; bottom: number; width: number; height: number }

/** 测不到尺寸，或已经有一角在视口里：不要收起。 */
export function shouldSkipCollapse(rect: RevealRect, viewportHeight: number): boolean {
  const laidOut = rect.width > 0 || rect.height > 0
  if (!laidOut) return true
  return rect.bottom > 0 && rect.top < viewportHeight
}

function setCollapsed(fig: HTMLElement, collapsed: boolean) {
  fig.classList.toggle('ut-armed', collapsed)
  fig.querySelectorAll<HTMLElement>('.ut-rv').forEach((el) => {
    el.toggleAttribute('inert', collapsed)
  })
}

export function armReveal(selector: string, onPlay?: (el: HTMLElement) => void, threshold = 0.35) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const figs = document.querySelectorAll<HTMLElement>(selector)

  const reveal = (fig: HTMLElement) => {
    fig.classList.add('ut-play')
    setCollapsed(fig, false)
    onPlay?.(fig)
  }

  const inViewport = (fig: HTMLElement) => {
    const rect = fig.getBoundingClientRect()
    return shouldSkipCollapse(
      { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
      window.innerHeight
    )
  }

  figs.forEach((fig) => {
    if (fig.dataset.utBound) return
    fig.dataset.utBound = '1'

    if (!('IntersectionObserver' in window) || motion.matches || inViewport(fig)) {
      reveal(fig)
      return
    }

    setCollapsed(fig, true)

    let done = false
    let io: IntersectionObserver
    const finish = () => {
      if (done) return
      done = true
      io.disconnect()
      motion.removeEventListener('change', onMotion)
      reveal(fig)
    }
    const onMotion = () => {
      if (motion.matches) finish()
    }
    io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) finish()
      },
      { threshold }
    )
    motion.addEventListener('change', onMotion)
    io.observe(fig)
  })
}
