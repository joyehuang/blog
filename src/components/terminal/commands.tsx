import type { CommandRegistry, OutputLine, PostSummary } from './types'

const SOCIAL_LINKS: { label: string; href: string }[] = [
  { label: 'github', href: 'https://github.com/joyehuang' },
  { label: 'linkedin', href: 'https://www.linkedin.com/in/deshiouhuang/' },
  { label: 'mail', href: 'mailto:huangdeshiou@gmail.com' }
]

const MOCK_AGENT_REPLIES: Record<string, string[]> = {
  default: [
    'Hey, this is Joye (well, a tiny mock of him).',
    'Real agent endpoint is wiring up — for now I just rehearse lines.',
    'Try `chat what are you building?` or `chat hire you?` for canned answers.'
  ],
  building: [
    'Right now: this terminal, an AI persona for the homepage,',
    'and a few half-finished posts about Astro + RSC + agent UX.'
  ],
  hire: [
    'Open to chats — frontend / full-stack / AI-product roles.',
    'Best path: `mail` (huangdeshiou@gmail.com) or `connect` for socials.'
  ],
  stack: [
    'Astro 5 · React 19 · UnoCSS · TypeScript · deployed on Vercel.',
    'I lean into server-rendered HTML with small interactive islands.'
  ]
}

function pickReply(msg: string): string[] {
  const m = msg.toLowerCase()
  if (m.includes('build')) return MOCK_AGENT_REPLIES.building
  if (m.includes('hire') || m.includes('job') || m.includes('work')) return MOCK_AGENT_REPLIES.hire
  if (m.includes('stack') || m.includes('tech')) return MOCK_AGENT_REPLIES.stack
  return MOCK_AGENT_REPLIES.default
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export const commands: CommandRegistry = {
  help: {
    name: 'help',
    summary: 'list available commands',
    run: ({ push, registry }) => {
      const visible = Object.values(registry).filter((c) => !c.hidden)
      const width = Math.max(...visible.map((c) => c.name.length)) + 2
      push([
        { kind: 'text', tone: 'muted', text: 'Available commands — try them out.' },
        { kind: 'spacer' },
        ...visible.map<OutputLine>((c) => ({
          kind: 'node',
          node: (
            <span>
              <span className='wt-tone-primary'>{c.name.padEnd(width)}</span>
              <span className='wt-tone-muted'>{c.summary}</span>
            </span>
          )
        })),
        { kind: 'spacer' },
        { kind: 'text', tone: 'muted', text: 'shortcuts: ↑/↓ history · tab complete · ⌃L clear · ` focus' }
      ])
    }
  },

  whoami: {
    name: 'whoami',
    summary: 'about Joye',
    run: ({ push }) => {
      push([
        {
          kind: 'node',
          node: (
            <span>
              <span className='wt-tone-primary'>Joye</span>
              <span className='wt-tone-muted'> · Frontend developer based in Melbourne</span>
            </span>
          )
        },
        { kind: 'text', tone: 'muted', text: '  ↳ 2nd-year CS @ University of Melbourne' },
        { kind: 'text', tone: 'muted', text: '  ↳ AIGC full-stack intern @ Tezign' },
        { kind: 'text', tone: 'muted', text: '  ↳ stays hungry, stays foolish · plays piano + cello' },
        { kind: 'spacer' },
        { kind: 'text', tone: 'muted', text: 'next: try `ls posts`, `chat`, or `connect`' }
      ])
    }
  },

  ls: {
    name: 'ls',
    summary: 'list things — try `ls posts`',
    usage: 'ls [posts|socials]',
    complete: (args) => (args.length <= 1 ? ['posts', 'socials'] : []),
    run: ({ args, push, posts }) => {
      const target = args[0] ?? 'posts'
      if (target === 'socials' || target === 'connect') {
        push(
          SOCIAL_LINKS.map<OutputLine>((s) => ({
            kind: 'node',
            node: (
              <span>
                <span className='wt-tone-primary'>{s.label.padEnd(10)}</span>
                <a className='wt-link' href={s.href} target='_blank' rel='noreferrer'>
                  {s.href}
                </a>
              </span>
            )
          }))
        )
        return
      }
      if (target !== 'posts') {
        push([{ kind: 'text', tone: 'err', text: `ls: unknown target '${target}' — try 'posts' or 'socials'` }])
        return
      }
      if (posts.length === 0) {
        push([{ kind: 'text', tone: 'muted', text: '(no posts indexed)' }])
        return
      }
      push([
        { kind: 'text', tone: 'muted', text: `recent ${posts.length} posts — \`cat <slug>\` to read` },
        { kind: 'spacer' },
        ...posts.map<OutputLine>((p) => ({
          kind: 'node',
          node: (
            <span>
              <span className='wt-tone-muted'>{p.date.padEnd(12)}</span>
              <span className='wt-tone-primary'>{p.slug.padEnd(28)}</span>
              <span className='wt-tone-fg'>{p.title}</span>
            </span>
          )
        }))
      ])
    }
  },

  cat: {
    name: 'cat',
    summary: 'open a post by slug',
    usage: 'cat <slug>',
    complete: (args, posts) => (args.length <= 1 ? posts.map((p) => p.slug) : []),
    run: ({ args, push, posts, navigate }) => {
      const slug = args[0]
      if (!slug) {
        push([{ kind: 'text', tone: 'err', text: 'cat: missing slug — `ls posts` first' }])
        return
      }
      const match = posts.find((p) => p.slug === slug)
      if (!match) {
        push([{ kind: 'text', tone: 'err', text: `cat: ${slug}: no such post` }])
        return
      }
      push([
        { kind: 'text', tone: 'muted', text: `opening ${match.href} …` }
      ])
      setTimeout(() => navigate(match.href), 300)
    }
  },

  chat: {
    name: 'chat',
    summary: 'talk to my agent (mock)',
    usage: 'chat [message]',
    run: async ({ args, startStream, appendStream, endStream }) => {
      const message = args.join(' ').trim()
      const id = `chat-${Date.now()}`
      startStream(id)
      appendStream(id, { kind: 'text', tone: 'muted', text: '⠋ thinking…' })
      await sleep(420)
      const lines = message ? pickReply(message) : MOCK_AGENT_REPLIES.default
      appendStream(id, { kind: 'spacer' })
      for (const line of lines) {
        appendStream(id, {
          kind: 'node',
          node: (
            <span>
              <span className='wt-tone-primary'>agent ▸ </span>
              <span className='wt-tone-fg'>{line}</span>
            </span>
          )
        })
        await sleep(260)
      }
      endStream(id)
    }
  },

  mail: {
    name: 'mail',
    summary: 'send me an email',
    run: ({ push }) => {
      const href = 'mailto:huangdeshiou@gmail.com?subject=hi%20joye'
      push([
        { kind: 'text', tone: 'muted', text: 'opening your mail client…' },
        {
          kind: 'node',
          node: (
            <a className='wt-link' href={href}>
              huangdeshiou@gmail.com
            </a>
          )
        }
      ])
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.href = href
      }, 200)
    }
  },

  connect: {
    name: 'connect',
    summary: 'social links',
    run: ({ push }) => {
      push(
        SOCIAL_LINKS.map<OutputLine>((s) => ({
          kind: 'node',
          node: (
            <span>
              <span className='wt-tone-primary'>{s.label.padEnd(10)}</span>
              <a className='wt-link' href={s.href} target='_blank' rel='noreferrer'>
                {s.href}
              </a>
            </span>
          )
        }))
      )
    }
  },

  theme: {
    name: 'theme',
    summary: 'switch site theme',
    usage: 'theme [dark|light|toggle]',
    complete: (args) => (args.length <= 1 ? ['dark', 'light', 'toggle'] : []),
    run: ({ args, push, setTheme }) => {
      const mode = (args[0] as 'dark' | 'light' | 'toggle') ?? 'toggle'
      if (!['dark', 'light', 'toggle'].includes(mode)) {
        push([{ kind: 'text', tone: 'err', text: `theme: invalid mode '${mode}'` }])
        return
      }
      setTheme(mode)
      push([{ kind: 'text', tone: 'ok', text: `theme → ${mode}` }])
    }
  },

  echo: {
    name: 'echo',
    summary: 'print arguments',
    run: ({ args, push }) => push([{ kind: 'text', text: args.join(' ') }])
  },

  clear: {
    name: 'clear',
    summary: 'clear the screen',
    run: ({ clear }) => clear()
  },

  matrix: {
    name: 'matrix',
    summary: 'easter egg',
    run: async ({ push, setMatrix }) => {
      push([{ kind: 'text', tone: 'ok', text: 'wake up, neo… (3s)' }])
      setMatrix(true)
      await sleep(3000)
      setMatrix(false)
      push([{ kind: 'text', tone: 'muted', text: 'follow the white rabbit.' }])
    }
  },

  about: {
    name: 'about',
    summary: 'alias of whoami',
    hidden: true,
    run: (ctx) => commands.whoami.run(ctx)
  },

  sudo: {
    name: 'sudo',
    summary: 'nice try',
    hidden: true,
    run: ({ args, push }) => {
      if (args.join(' ') === 'hire-me') {
        push([
          { kind: 'text', tone: 'ok', text: '✓ permission granted.' },
          { kind: 'text', tone: 'muted', text: '`mail` to start the conversation.' }
        ])
        return
      }
      push([{ kind: 'text', tone: 'err', text: 'Permission denied (you are not in the sudoers file).' }])
    }
  }
}

export const commandNames = Object.keys(commands)

function commonPrefix(items: string[]): string {
  if (items.length === 0) return ''
  let prefix = items[0]
  for (let i = 1; i < items.length; i++) {
    while (!items[i].startsWith(prefix)) prefix = prefix.slice(0, -1)
    if (!prefix) return ''
  }
  return prefix
}

/**
 * Resolve a Tab completion for the current input buffer.
 * Returns:
 *   - a string  → replace input with this value
 *   - an array  → ambiguous, show as suggestions
 *   - null      → nothing to do
 */
export function completeInput(
  input: string,
  posts: PostSummary[]
): string | string[] | null {
  // command-name completion: nothing typed yet, or no space after first token
  const hasSpace = /\s/.test(input)
  if (!hasSpace) {
    const head = input.trimStart()
    const candidates = commandNames.filter(
      (n) => n.startsWith(head) && !commands[n].hidden
    )
    if (candidates.length === 0) return null
    if (candidates.length === 1) return candidates[0] + ' '
    const lcp = commonPrefix(candidates)
    if (lcp.length > head.length) return lcp
    return candidates
  }

  // arg completion: dispatch to the command's completer
  const tokens = input.split(/\s+/)
  const cmd = tokens[0].toLowerCase()
  const spec = commands[cmd]
  if (!spec || !spec.complete) return null
  const argTokens = tokens.slice(1)
  const partial = argTokens[argTokens.length - 1] ?? ''
  const all = spec.complete(argTokens, posts)
  const matches = all.filter((c) => c.startsWith(partial))
  if (matches.length === 0) return null
  const replaceLast = (next: string) => {
    const head = tokens.slice(0, -1).join(' ')
    return head + ' ' + next
  }
  if (matches.length === 1) return replaceLast(matches[0]) + ' '
  const lcp = commonPrefix(matches)
  if (lcp.length > partial.length) return replaceLast(lcp)
  return matches
}
