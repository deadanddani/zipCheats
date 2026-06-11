import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Grid } from '../src/models/Cell'

export interface StoredMap {
  key: string
  group: string
  grid: Grid
  source?: string
  savedAt: string
}

const STORE_PATH = join(process.cwd(), 'server', 'storage', 'maps.json')

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard']

/** Orders groups as: "LinkedIn" first, then by grid size (6x6, 8x8, ...), then by difficulty (easy, medium, hard). */
function compareGroups(a: string, b: string): number {
  if (a === b) return 0
  if (a === 'LinkedIn') return -1
  if (b === 'LinkedIn') return 1

  const [sizeA, difficultyA] = a.split(' · ')
  const [sizeB, difficultyB] = b.split(' · ')
  const sizeDiff = parseInt(sizeA, 10) - parseInt(sizeB, 10)
  if (sizeDiff !== 0) return sizeDiff

  return DIFFICULTY_ORDER.indexOf(difficultyA) - DIFFICULTY_ORDER.indexOf(difficultyB)
}

/**
 * Persists puzzle maps to a local JSON file, keyed by string and organized
 * into groups (e.g. "LinkedIn", "6x6 · easy"). Saving under a key that
 * already exists overwrites it, which is what keeps a given day's LinkedIn
 * puzzle from being stored twice (its key is the date).
 */
export class MapStore {
  private read(): Record<string, StoredMap> {
    if (!existsSync(STORE_PATH)) return {}
    try {
      return JSON.parse(readFileSync(STORE_PATH, 'utf-8'))
    } catch {
      return {}
    }
  }

  private write(maps: Record<string, StoredMap>): void {
    mkdirSync(dirname(STORE_PATH), { recursive: true })
    writeFileSync(STORE_PATH, JSON.stringify(maps, null, 2))
  }

  save(key: string, group: string, grid: Grid, source?: string): StoredMap {
    const entry: StoredMap = { key, group, grid, source, savedAt: new Date().toISOString() }
    const maps = this.read()
    maps[key] = entry
    this.write(maps)
    return entry
  }

  get(key: string): StoredMap | undefined {
    return this.read()[key]
  }

  delete(key: string): boolean {
    const maps = this.read()
    if (!(key in maps)) return false
    delete maps[key]
    this.write(maps)
    return true
  }

  list(): StoredMap[] {
    return Object.values(this.read()).sort((a, b) => b.key.localeCompare(a.key))
  }

  groups(): string[] {
    return [...new Set(this.list().map((entry) => entry.group))].sort(compareGroups)
  }

  byGroup(group: string): StoredMap[] {
    return this.list().filter((entry) => entry.group === group)
  }
}
