// Links only: the application never fetches these destinations. Public search
// requests go to a fixed TinyFish API origin, with redirects disabled.
export function safeWebUrl(value: string): string | undefined {
  if (value.length > 2000 || /[\\\s\u0000-\u001f]/.test(value)) return
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return
    const host = url.hostname.toLowerCase()
    // Reject every IP literal (including alternative numeric forms canonicalized
    // by URL), local/special-use suffix and single-label host. No DNS fetch occurs.
    if (
      !host.includes('.') ||
      host.includes(':') ||
      /^[\d.]+$/.test(host) ||
      host.endsWith('.') ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion|home|lan)$/.test(host) ||
      /(?:^|\.)(?:example\.(?:com|net|org)|metadata\.google\.internal)$/.test(host)
    )
      return
    if (
      url.searchParams.has('url') ||
      url.searchParams.has('redirect') ||
      url.searchParams.has('redirect_uri')
    )
      return
    url.hash = ''
    return url.href
  } catch {
    return
  }
}
