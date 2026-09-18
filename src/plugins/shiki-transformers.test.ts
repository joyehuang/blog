import { describe, expect, test } from 'bun:test'
import type { Element } from 'hast'

import { addCopyButton } from './shiki-transformers'

/** 直接跑 transformer 的 pre 钩子，检查产出的标记 */
function renderButton(source = 'console.log(1)') {
  const node = { type: 'element', tagName: 'div', properties: {}, children: [] } as unknown as Element
  const transformer = addCopyButton()
  // transformer 钩子里的 this 是 shiki 的上下文，这里只需要 source
  ;(transformer.pre as (this: { source: string }, node: Element) => void).call({ source }, node)
  return node.children.at(-1) as Element
}

describe('addCopyButton', () => {
  test('不再内联 onclick —— 复制成功与否由等待剪贴板的委托监听器决定', () => {
    const button = renderButton()
    const props = button.properties as Record<string, unknown>
    // onclick 里 writeText 既不 await 也不接异常，正是假成功的来源
    expect(props.onclick).toBeUndefined()
    expect(JSON.stringify(props)).not.toContain('clipboard')
  })

  test('按钮有无障碍名称与显式 type', () => {
    const props = renderButton().properties as Record<string, unknown>
    expect(props.ariaLabel ?? props['aria-label']).toBe('Copy code')
    expect(props.type).toBe('button')
  })

  test('待复制的原文原样挂在 data-code 上', () => {
    const props = renderButton('const a = "<&>"').properties as Record<string, unknown>
    expect(props.dataCode ?? props['data-code']).toBe('const a = "<&>"')
  })

  test('三个状态都渲染出来，且没有一个是 hidden —— 交给 CSS 交叉淡入', () => {
    const button = renderButton()
    const classes = (button.children as Element[])
      .map((child) => String((child.properties as Record<string, unknown>)?.className ?? ''))
      .join(' ')
    expect(classes).toContain('ready')
    expect(classes).toContain('success')
    expect(classes).toContain('failed')
    // 原来 success 上挂着 hidden，等于成功态永远显示不出来
    expect(classes).not.toContain('hidden')
  })

  test('带一个给读屏器播报结果的 status 区域', () => {
    const button = renderButton()
    const live = (button.children as Element[]).find(
      (child) => (child.properties as Record<string, unknown>)?.role === 'status'
    )
    expect(live).toBeDefined()
    const props = live!.properties as Record<string, unknown>
    expect(props.ariaLive ?? props['aria-live']).toBe('polite')
  })
})
