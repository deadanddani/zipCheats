import type { Grid } from '../models/Cell'

export class MapExporter {
  async getTodayMap(): Promise<Grid> {
    const response = await fetch('/api/zip/map')
    if (!response.ok) throw new Error('no-map')
    const { grid } = await response.json()
    return grid as Grid
  }

  async clearMap(): Promise<void> {
    await fetch('/api/zip/map', { method: 'DELETE' })
  }
}
