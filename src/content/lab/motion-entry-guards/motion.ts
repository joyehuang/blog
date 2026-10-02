export function animatePage(element: HTMLElement) {
  return element.animate(
    [
      { opacity: 0.25, transform: 'translateY(24px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    { duration: 2400, easing: 'ease', fill: 'none' }
  )
}
