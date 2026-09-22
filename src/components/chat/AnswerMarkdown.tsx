import { safeSourceUrl } from '@/lib/chat/safety'
import { safeWebUrl } from '@/lib/chat/web-url'
import Markdown from 'react-markdown'

export default function AnswerMarkdown({ text, urls }: { text: string; urls: string[] }) {
  return (
    <Markdown
      skipHtml
      allowedElements={[
        'p',
        'strong',
        'em',
        'ul',
        'ol',
        'li',
        'blockquote',
        'pre',
        'code',
        'h1',
        'h2',
        'h3',
        'h4',
        'a',
        'hr',
        'br'
      ]}
      urlTransform={(url) => {
        const safe = safeSourceUrl(url) ?? safeWebUrl(url)
        return safe && urls.includes(safe) ? safe : ''
      }}
      components={{
        a: ({ href, children }) =>
          href ? (
            <a href={href} target='_blank' rel='noopener noreferrer'>
              {children}
            </a>
          ) : (
            <span>{children}</span>
          )
      }}
    >
      {text}
    </Markdown>
  )
}
