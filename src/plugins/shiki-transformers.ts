import { h } from 'hastscript'
import type { ShikiTransformer } from 'shiki'

export {
  transformerNotationDiff,
  transformerNotationHighlight
} from './shiki-official-transformers'

function parseMetaString(str = '') {
  return Object.fromEntries(
    str.split(' ').reduce((acc: [string, string | true][], cur) => {
      const matched = cur.match(/(.+)?=("(.+)"|'(.+)')$/)
      if (matched === null) return acc
      const key = matched[1]
      const value = matched[3] || matched[4] || true
      acc = [...acc, [key, value]]
      return acc
    }, [])
  )
}

// Nest a div in the outer layer
export const updateStyle = (): ShikiTransformer => {
  return {
    name: 'shiki-transformer-update-style',
    pre(node) {
      const container = h('pre', node.children)
      node.children = [container]
      node.tagName = 'div'
    }
  }
}

// Process meta string, like ```ts title="test.ts"
export const processMeta = (): ShikiTransformer => {
  return {
    name: 'shiki-transformer-process-meta',
    preprocess() {
      if (!this.options.meta) return
      const rawMeta = this.options.meta?.__raw
      if (!rawMeta) return
      const meta = parseMetaString(rawMeta)
      Object.assign(this.options.meta, meta)
    }
  }
}

// Add a title to the code block
export const addTitle = (): ShikiTransformer => {
  return {
    name: 'shiki-transformer-add-title',
    pre(node) {
      const rawMeta = this.options.meta?.__raw
      if (!rawMeta) return
      const meta = parseMetaString(rawMeta)
      // If meta is needed to parse in other transformers
      // if (this.options.meta) {
      //   Object.assign(this.options.meta, meta)
      // }

      if (!meta.title) return

      const div = h(
        'div',
        {
          class:
            'title absolute top-0 left-0 m-2 text-sm text-foreground px-3 py-1 bg-primary-foreground rounded-lg border'
        },
        meta.title.toString()
      )
      node.children.unshift(div)
    }
  }
}

// Add a language tag to the code block
export const addLanguage = (): ShikiTransformer => {
  return {
    name: 'shiki-transformer-add-language',
    pre(node) {
      const span = h(
        'span',
        {
          class: 'language ps-1 pe-3 text-sm bg-muted text-muted-foreground'
        },
        this.options.lang
      )
      node.children.push(span)
    }
  }
}

// Add a copy button to the code block
//
// 只产出标记与无障碍名称，行为交给 CopyActions.astro 的委托监听器：
// 复制必须等剪贴板真的收下才切勾号，失败要看得见——内联 onclick 做不到这件事
// （writeText 返回 Promise，原来的写法既不 await 也不接异常）。
export const addCopyButton = (): ShikiTransformer => {
  return {
    name: 'shiki-transformer-copy-button',
    pre(node) {
      const icon = (id: string, cls: string) =>
        h('span', { class: cls, 'aria-hidden': 'true' }, [
          h('svg', { class: 'size-5' }, [h('use', { href: `/icons/code.svg#${id}` })])
        ])

      const button = h(
        'button',
        {
          type: 'button',
          class: 'copy text-muted-foreground p-1 box-content border rounded bg-primary-foreground',
          'data-code': this.source,
          'aria-label': 'Copy code'
        },
        [
          icon('mingcute-clipboard-line', 'copy-state ready'),
          icon('mingcute-file-check-line', 'copy-state success'),
          icon('mingcute-close-line', 'copy-state failed'),
          // 结果同时播报给读屏器，不只靠图标变化
          h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' }, '')
        ]
      )

      node.children.push(button)
    }
  }
}
