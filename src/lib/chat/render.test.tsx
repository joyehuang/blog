import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import AnswerMarkdown from '../../components/chat/AnswerMarkdown'

test('Markdown escapes code and rejects HTML, image tracking and fabricated source links', () => {
  const html = renderToStaticMarkup(
    <AnswerMarkdown
      text={
        '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1)) [fake](/blog/fake) [source](/blog/real)\n\n```html\n<img onerror=alert(1)>\n```'
      }
      urls={['https://www.joyehuang.me/blog/real']}
    />
  )
  expect(html).not.toContain('<script')
  expect(html).not.toContain('<img')
  expect(html).not.toContain('javascript:')
  expect(html).not.toContain('href="/blog/fake"')
  expect(html).toContain('https://www.joyehuang.me/blog/real')
  expect(html).toContain('&lt;img')
})

test('web citations require retrieved authority and reject internal addresses', () => {
  const html = renderToStaticMarkup(
    <AnswerMarkdown
      text={
        '[docs](https://docs.astro.build/en/guides/) [guessed](https://github.com/fabricated) [private](https://127.0.0.1/admin)'
      }
      urls={['https://docs.astro.build/en/guides/', 'https://127.0.0.1/admin']}
    />
  )
  expect(html).toContain('href="https://docs.astro.build/en/guides/"')
  expect(html).not.toContain('href="https://github.com')
  expect(html).not.toContain('href="https://127')
})
