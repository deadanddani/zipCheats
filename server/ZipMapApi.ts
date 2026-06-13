import type { IncomingMessage, ServerResponse } from 'node:http'
import { MapStore } from './MapStore'

const LINKEDIN_GROUP = 'LinkedIn'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => resolve(body))
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

/** LinkedIn publishes one Zip puzzle per day, so the day is the natural key: re-extracting the same puzzle overwrites instead of duplicating. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Mounted at /api/zip. Routes:
 *   POST /map                  store today's extracted grid (key = today's date, group = "LinkedIn")
 *   GET  /map                  today's grid
 *   GET  /map/groups           list of group names
 *   GET  /map/groups/:group    summaries of the maps within a group (no grid payload)
 *   GET  /map/:key             a specific saved grid
 *   DELETE /map/:key           remove a saved grid
 */
export class ZipMapApi {
  private store = new MapStore()

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const [resource, ...rest] = (req.url ?? '').split('?')[0].split('/').filter(Boolean)
    if (resource !== 'map') {
      res.writeHead(404)
      res.end()
      return
    }

    if (req.method === 'POST' && rest.length === 0) {
      const body = await readBody(req)
      const { data, url } = JSON.parse(body)
      const { grid } = data
      const savedKey = todayKey()
      this.store.save(savedKey, LINKEDIN_GROUP, grid, url)
      console.log(`[ZipMapApi] Grid stored under key "${savedKey}": ${grid.length}x${grid[0].length}`)
      sendJson(res, 200, { ok: true, key: savedKey })
      return
    }

    if (req.method === 'GET' && rest[0] === 'groups') {
      if (rest[1]) {
        const group = decodeURIComponent(rest[1])
        sendJson(res, 200, { maps: this.store.byGroup(group).map(({ grid: _grid, ...summary }) => summary) })
      } else {
        sendJson(res, 200, { groups: this.store.groups() })
      }
      return
    }

    if (req.method === 'GET' && rest.length === 1) {
      const stored = this.store.get(rest[0])
      if (!stored) {
        sendJson(res, 404, { error: 'Map not found' })
        return
      }
      sendJson(res, 200, { grid: stored.grid })
      return
    }

    if (req.method === 'DELETE' && rest.length === 1) {
      const deleted = this.store.delete(rest[0])
      if (!deleted) {
        sendJson(res, 404, { error: 'Map not found' })
        return
      }
      sendJson(res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && rest.length === 0) {
      const stored = this.store.get(todayKey())
      if (!stored) {
        sendJson(res, 404, { error: 'No map received yet' })
        return
      }
      sendJson(res, 200, { grid: stored.grid })
      return
    }

    res.writeHead(405)
    res.end()
  }
}
