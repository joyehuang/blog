import { useEffect, useId, useRef, useState } from 'react'

import { Experiment } from '@/components/lab/Experiment'

import './tooltip.css'

const items = [
  { label: '收藏', glyph: '☆' },
  { label: '添加', glyph: '+' },
  { label: '更多', glyph: '⋯' }
]
function Toolbar({ warm }: { warm: boolean }) {
  const id = useId()
  const [active, setActive] = useState(-1)
  const [action, setAction] = useState('尚未操作')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const warmUntil = useRef(0)
  const shown = useRef(false)
  const pointer = useRef(false)
  useEffect(() => () => clearTimeout(timer.current), [])
  function hide() {
    clearTimeout(timer.current)
    if (shown.current) warmUntil.current = Date.now() + 900
    shown.current = false
    setActive(-1)
  }
  function show(index: number, keyboard = false) {
    clearTimeout(timer.current)
    const immediate = warm && (keyboard || shown.current || Date.now() < warmUntil.current)
    const reveal = () => {
      shown.current = true
      setActive(index)
    }
    if (immediate) reveal()
    else {
      setActive(-1)
      timer.current = setTimeout(reveal, 420)
    }
  }
  return (
    <section className='lab-panel'>
      <span className='lab-eyebrow'>{warm ? '修正 / 同组共享热身' : '反例 / 每次重新等'}</span>
      <h3>{warm ? '冷 420ms，热 0ms' : '每次都等 420ms'}</h3>
      <div
        className='tooltip-toolbar'
        role='group'
        aria-label={warm ? '热身工具栏' : '固定延迟工具栏'}
        onPointerLeave={hide}
      >
        {items.map((item, index) => (
          <div className='tooltip-item' key={item.label}>
            <button
              aria-label={item.label}
              aria-describedby={active === index ? `${id}-${index}` : undefined}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') show(index)
              }}
              onPointerDown={() => {
                pointer.current = true
                hide()
              }}
              onFocus={() => {
                if (!pointer.current) show(index, true)
              }}
              onBlur={() => {
                pointer.current = false
                hide()
              }}
              onKeyDown={(e) => {
                pointer.current = false
                if (e.key === 'Escape') hide()
              }}
              onClick={() => {
                hide()
                setAction(`已执行：${item.label}`)
              }}
            >
              <span aria-hidden='true'>{item.glyph}</span>
            </button>
            <span
              id={`${id}-${index}`}
              role='tooltip'
              className='toolbar-tip'
              data-visible={active === index}
              aria-hidden={active !== index}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <p role='status'>{action}</p>
    </section>
  )
}
export default function TooltipDemo() {
  return (
    <Experiment>
      <div className='lab-compare'>
        <Toolbar warm={false} />
        <Toolbar warm />
      </div>
      <p className='lab-footnote'>
        鼠标停在第一项，再横移到下一项。离开 900ms 后重新冷却。用 Tab 聚焦右侧会立即显示，Escape
        收起；触屏直接执行按钮。
      </p>
    </Experiment>
  )
}
