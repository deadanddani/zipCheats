import type { Grid } from '../models/Cell'
import { ZipMap } from '../models/Map'

export class MapExporter {
  async getTodayMap(): Promise<ZipMap> {
    const response = await fetch('/api/zip/map')
    if (!response.ok) throw new Error('no-map')
    const { grid } = await response.json()
    return ZipMap.fromGrid(grid as Grid)
  }

  async clearMap(): Promise<void> {
    await fetch('/api/zip/map', { method: 'DELETE' })
  }
}
