import type { RegionGrid } from '../models/Cell'
import { QueensMap } from '../models/Map'
import { QUEENS_MAPS } from '../data/maps'

export interface SavedMapSummary {
  key: string
  group: string
  source?: string
  savedAt: string
}

// Maps are bucketed by board size, so a group is just "7x7", "8x8", ...
function groupForSize(size: number): string {
  return `${size}x${size}`
}

/**
 * Mirrors the Zip `MapExporter` API, but instead of scraping LinkedIn it serves
 * the 100 real Queens boards bundled in `data/maps.ts` (downloaded from
 * queens-game.com). Maps are grouped by board size. Swap these methods for
 * `fetch('/api/queens/...')` calls once a live source exists.
 */
export class MapExporter {
  async getTodayMap(): Promise<QueensMap> {
    // No live Queens feed yet — pick a stable "map of the day" from the set.
    const keys = Object.keys(QUEENS_MAPS)
    const dayIndex = Math.floor(Date.now() / 86_400_000) % keys.length
    return this.getMap(keys[dayIndex])
  }

  async getMap(key?: string): Promise<QueensMap> {
    if (!key) return this.getTodayMap()
    const data = QUEENS_MAPS[key]
    if (!data) throw new Error(`Unknown Queens map: ${key}`)
    return QueensMap.fromGrid(data.colorGrid)
  }

  async listGroups(): Promise<string[]> {
    const sizes = new Set<number>()
    for (const map of Object.values(QUEENS_MAPS)) sizes.add(map.size)
    return [...sizes].sort((a, b) => a - b).map(groupForSize)
  }

  async listMapsInGroup(group: string): Promise<SavedMapSummary[]> {
    const size = parseInt(group, 10)
    return Object.entries(QUEENS_MAPS)
      .filter(([, map]) => map.size === size)
      .map(([key]) => ({ key, group, source: 'queens-game.com', savedAt: '' }))
  }

  async deleteMap(_key: string): Promise<boolean> {
    // Bundled maps are read-only, so there is nothing to delete.
    return false
  }

  /** Exposes the raw region grid (handy for debugging / a future scraper). */
  gridForKey(key: string): RegionGrid {
    const data = QUEENS_MAPS[key]
    if (!data) throw new Error(`Unknown Queens map: ${key}`)
    return data.colorGrid
  }
}
