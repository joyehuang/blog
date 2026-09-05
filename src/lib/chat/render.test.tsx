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
