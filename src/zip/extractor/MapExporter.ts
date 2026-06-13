import type { Grid } from '../models/Cell'
import { ZipMap } from '../models/Map'

export interface SavedMapSummary {
  key: string
  group: string
  source?: string
  savedAt: string
}

export class MapExporter {
  async getTodayMap(): Promise<ZipMap> {
    return this.getMap()
  }

  async getMap(key?: string): Promise<ZipMap> {
    const response = await fetch(key ? `/api/zip/map/${key}` : '/api/zip/map')
    if (!response.ok) throw new Error('no-map')
    const { grid } = await response.json()
    return ZipMap.fromGrid(grid as Grid)
  }

  async listGroups(): Promise<string[]> {
    const response = await fetch('/api/zip/map/groups')
    if (!response.ok) return []
    const { groups } = await response.json()
    return groups as string[]
  }

  async listMapsInGroup(group: string): Promise<SavedMapSummary[]> {
    const response = await fetch(`/api/zip/map/groups/${encodeURIComponent(group)}`)
    if (!response.ok) return []
    const { maps } = await response.json()
    return maps as SavedMapSummary[]
  }

  async deleteMap(key: string): Promise<boolean> {
    const response = await fetch(`/api/zip/map/${encodeURIComponent(key)}`, { method: 'DELETE' })
    return response.ok
  }
}
