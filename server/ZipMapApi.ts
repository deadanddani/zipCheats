import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Grid } from '../src/models/Cell'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => resolve(body))
  })
}

export class ZipMapApi {
  private grid: Grid | null = null

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method === 'POST') {
      const body = await readBody(req)
      const { data } = JSON.parse(body)
      const { grid } = data
      this.grid = grid
      console.log(`[ZipMapApi] Grid stored: ${grid.length}x${grid[0].length}`)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    if (req.method === 'DELETE') {
      this.grid = null
      console.log('[ZipMapApi] Grid cleared')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    if (req.method === 'GET') {
      if (!this.grid) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'No map received yet' }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ grid: this.grid }))
      return
    }

    res.writeHead(405)
    res.end()
  }
}
