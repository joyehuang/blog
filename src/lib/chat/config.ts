// Server-only. Production has no local-file fallback and never reads pi/QQ config.
export function chatConfig() {
  const env = process.env
  const required = [
    'CHAT_DATABASE_URL',
    'CHAT_COOKIE_SECRET',
    'CHAT_CC_KEY',
    'CHAT_TINYFISH_KEY',
    'CHAT_RESEND_KEY',
    'CHAT_EMAIL_FROM',
    'CHAT_ORIGIN'
  ] as const
  if (
    env.CHAT_ENABLED !== 'true' ||
    required.some((k) => !env[k]) ||
    (env.CHAT_COOKIE_SECRET?.length ?? 0) < 32
  )
    throw Error('unavailable')
  const origin = new URL(env.CHAT_ORIGIN!).origin
  if (
    !origin.startsWith('https://') &&
    !(env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  )
    throw Error('unavailable')
  // Preview remains off unless separately configured with a preview DB and key.
  if (env.VERCEL_ENV === 'preview' && env.CHAT_PREVIEW_ENABLED !== 'true')
    throw Error('unavailable')
  return {
    database: env.CHAT_DATABASE_URL!,
    secret: env.CHAT_COOKIE_SECRET!,
    key: env.CHAT_CC_KEY!,
    searchKey: env.CHAT_TINYFISH_KEY!,
    resend: env.CHAT_RESEND_KEY!,
    from: env.CHAT_EMAIL_FROM!,
    origin
  }
}
