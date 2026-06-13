import type { ValueGrid } from '../models/Cell'
import { SudokuMap } from '../models/Map'
import { SUDOKU_MAPS, type Difficulty } from '../data/maps'

export interface SavedMapSummary {
  key: string
  group: string
  source?: string
  savedAt: string
}

// Maps are bucketed by difficulty, so a group is "easy", "medium", ...
const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert']
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
  expert: 'Experta',
}

/**
 * Mirrors the Queens `MapExporter` API, but serves the bundled Sudoku boards in
 * `data/maps.ts` grouped by difficulty. Swap these methods for `fetch('/api/...')`
 * calls once a live source exists.
 */
export class MapExporter {
  async getTodayMap(): Promise<SudokuMap> {
    // No live Sudoku feed yet — pick a stable "map of the day" from the set.
    const keys = Object.keys(SUDOKU_MAPS)
    const dayIndex = Math.floor(Date.now() / 86_400_000) % keys.length
    return this.getMap(keys[dayIndex])
  }

  async getMap(key?: string): Promise<SudokuMap> {
    if (!key) return this.getTodayMap()
    const data = SUDOKU_MAPS[key]
    if (!data) throw new Error(`Unknown Sudoku map: ${key}`)
    return SudokuMap.fromGrid(data.grid)
  }

  async listGroups(): Promise<string[]> {
    const present = new Set(Object.values(SUDOKU_MAPS).map((map) => map.difficulty))
    return DIFFICULTY_ORDER.filter((difficulty) => present.has(difficulty)).map((d) => DIFFICULTY_LABEL[d])
  }

  async listMapsInGroup(group: string): Promise<SavedMapSummary[]> {
    const difficulty = DIFFICULTY_ORDER.find((d) => DIFFICULTY_LABEL[d] === group) ?? group
    return Object.entries(SUDOKU_MAPS)
      .filter(([, map]) => map.difficulty === difficulty)
      .map(([key]) => ({ key, group, source: 'bundled', savedAt: '' }))
  }

  async deleteMap(_key: string): Promise<boolean> {
    // Bundled maps are read-only, so there is nothing to delete.
    return false
  }

  /** Exposes the raw digit grid (handy for debugging / a future scraper). */
  gridForKey(key: string): ValueGrid {
    const data = SUDOKU_MAPS[key]
    if (!data) throw new Error(`Unknown Sudoku map: ${key}`)
    return data.grid
  }
}
