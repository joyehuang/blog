import { once } from 'node:events'
import { createServer } from 'node:http'
import { expect, test } from 'bun:test'

import { pinnedRequest } from './data.mjs'

// Direct transport fixture on an ephemeral port; production safeGet never permits this address.
test('real pinned transport rejects oversized and slow responses and closes sockets', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/big') res.end('x'.repeat(1024))
    else if (req.url === '/slow') {
      res.writeHead(200)
      res.flushHeaders()
    } else res.end('ok')
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = (server.address() as any).port
  try {
    const address = { address: '127.0.0.1', family: 4 }
    expect(
      (
        await pinnedRequest(new URL(`http://public.example:${port}/ok`), address, 20, 1000)
      ).body.toString()
    ).toBe('ok')
    await expect(
      pinnedRequest(new URL(`http://public.example:${port}/big`), address, 20, 1000)
    ).rejects.toThrow('too large')
    await expect(
      pinnedRequest(new URL(`http://public.example:${port}/slow`), address, 20, 30)
    ).rejects.toThrow('timeout')
  } finally {
    server.closeAllConnections()
    server.close()
  }
})
