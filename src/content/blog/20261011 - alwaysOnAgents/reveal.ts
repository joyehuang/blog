/**
 * 这篇博文里几张图共用的「进入视口再播放」开关。
 *
 * 先给图加上 aoa-armed（收起状态），进入视口后换成 aoa-play，CSS 里的过渡只写在 aoa-play 上，
 * 所以收起是瞬间完成的，页面加载时不会看到元素倒着消失。
 * 没有 JS、没有 IntersectionObserver、prefers-reduced-motion 时什么都不做，图直接以终态展示。
 */
export function armReveal(selector: string, onPlay?: (el: HTMLElement) => void, threshold = 0.35) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const figs = document.querySelectorAll<HTMLElement>(selector)

  if (reduce || !('IntersectionObserver' in window)) {
    figs.forEach((fig) => onPlay?.(fig))
    return
  }

  figs.forEach((fig) => {
    if (fig.dataset.aoaArmed) return
    fig.dataset.aoaArmed = '1'
    fig.classList.add('aoa-armed')
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fig.classList.add('aoa-play')
          fig.classList.remove('aoa-armed')
          io.disconnect()
          onPlay?.(fig)
        }
      },
      { threshold }
    )
    io.observe(fig)
  })
}
