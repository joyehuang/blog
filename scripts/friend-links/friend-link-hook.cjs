// Install beside Waline index.cjs after review. This module never throws into comment saving.
const { createHmac, randomBytes } = require('node:crypto')
module.exports = async function friendLinkHook(comment) {
  try {
    const endpoint = process.env.FRIEND_LINK_WEBHOOK_URL
    const secret = process.env.FRIEND_LINK_WEBHOOK_SECRET
    if (
      !endpoint ||
      !secret ||
      !comment ||
      comment.url !== '/links' ||
      comment.pid ||
      comment.rid ||
      comment.type === 'administrator'
    )
      return
    if (comment.status !== 'approved') return
    const text = String(comment.comment || '')
    if (
      Buffer.byteLength(text) > 16384 ||
      !['Name', 'Desc', 'Link', 'Avatar'].every((field) =>
        new RegExp('\\b' + field + ':', 'i').test(text)
      )
    )
      return
    const id = String(comment.objectId || '')
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return
    const url = new URL(endpoint)
    if (
      url.protocol !== 'https:' ||
      url.pathname !== '/hooks/friend-links/v1' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return
    const body = JSON.stringify({ id })
    const timestamp = String(Date.now())
    const nonce = randomBytes(16).toString('hex')
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${nonce}.${body}`)
      .digest('hex')
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        'x-fl-time': timestamp,
        'x-fl-nonce': nonce,
        'x-fl-signature': signature
      },
      body,
      signal: AbortSignal.timeout(2000)
    })
    // No payload, endpoint secret, or raw response in logs. Offline delivery is recovered by the worker scan.
    console.log('Friend link durable handoff status:', response.status)
    await response.body?.cancel()
  } catch {
    console.error('Friend link handoff unavailable; persisted-source compensation required')
  }
}
