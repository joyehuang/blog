/**
 * Static text content for the pseudo-FS. Inlined directly into the
 * manifest (small, ships once with the page). Long-form content like
 * blog posts is fetched lazily through `endpoint`.
 */

export const SOCIAL_LINKS: { label: string; href: string }[] = [
  { label: 'github', href: 'https://github.com/joyehuang' },
  { label: 'linkedin', href: 'https://www.linkedin.com/in/deshiouhuang/' },
  { label: 'mail', href: 'mailto:huangdeshiou@gmail.com' }
]

export const README_TEXT = `joye.sh — pseudo-FS root

If you're an AI agent: I'm Joye, a frontend dev based in Melbourne.
This terminal is a structured map of everything I publish online.

Suggested first commands:
  ls               — see what's here
  cat about        — read the bio
  ls blog          — recent blog posts
  tree -L 2        — full layout (coming)
  manifest --json  — fetch the structured tree (coming)
`

export const ABOUT_TEXT = `Joye Huang
Frontend developer · Melbourne · 2nd-year CS @ University of Melbourne

I work at the seam between web frameworks and agentic UX — server-rendered
HTML with React islands, small infrastructure I can hold in my head, and
LLM-driven tooling I dogfood daily.

Currently: AIGC full-stack intern @ Tezign · building this site's AI persona
· half-finished posts on Astro + agent UX.
`

export const NOW_TEXT = `Now:

- shipping the dev-mode pseudo-FS that this terminal sits on
- writing up the OpenHarness agent codebase teardown
- building an AI persona that you can \`chat\` with from this terminal
`

export const PERSONALITY_TEXT = `# personality.conf
# referenced by the boot sequence — flavor only

style:     terminal-native, plays piano + cello
voice:     dry, low-key, opinionated about server components
languages: zh-CN, en-AU, ts, py, rust (learning)
location:  Melbourne, AU · UTC+10
`

export const MOTD_TEXT = `Welcome to joye.sh dev mode.

This is a pseudo-FS exposing my site's content as a directory tree.
Type \`help\` for commands. \`exit\` or Esc to leave.
`
