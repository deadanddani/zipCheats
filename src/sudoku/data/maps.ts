// Fixture set for the Sudoku solver tester. Every puzzle is carved out of a
// known-valid completed grid (so it always has at least one solution) by hiding
// a deterministic subset of its cells — fewer clues left means a harder board.
// `difficulty` buckets the puzzles the way Queens buckets by board size.

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface SudokuMapData {
  name: string;
  difficulty: Difficulty;
  grid: number[][];
}

// A valid, fully-solved 9×9 grid (the classic Wikipedia solution).
const BASE_SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

// Relabeling every digit by a fixed offset keeps a Sudoku solution valid, so
// this gives us visually different boards without hand-authoring (error-prone)
// puzzles.
function shiftDigits(solution: string, offset: number): string {
  return [...solution].map((ch) => String(((Number(ch) - 1 + offset) % 9) + 1)).join("");
}

// Tiny seeded PRNG (mulberry32) so the hidden cells are reproducible per puzzle.
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Keep `givens` of the solution's cells as clues, blank the rest (0).
function carve(offset: number, givens: number, seed: number): number[][] {
  const solution = shiftDigits(BASE_SOLUTION, offset);
  const indices = Array.from({ length: 81 }, (_, i) => i);
  const rand = mulberry32(seed);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const keep = new Set(indices.slice(0, givens));

  const grid: number[][] = [];
  for (let row = 0; row < 9; row++) {
    const cells: number[] = [];
    for (let col = 0; col < 9; col++) {
      const i = row * 9 + col;
      cells.push(keep.has(i) ? Number(solution[i]) : 0);
    }
    grid.push(cells);
  }
  return grid;
}

const GIVENS: Record<Difficulty, number> = {
  easy: 42,
  medium: 33,
  hard: 27,
  expert: 24,
};

function puzzle(name: string, difficulty: Difficulty, offset: number, seed: number): SudokuMapData {
  return { name, difficulty, grid: carve(offset, GIVENS[difficulty], seed) };
}

export const SUDOKU_MAPS: Record<string, SudokuMapData> = {
  easy1: puzzle("Fácil n° 1", "easy", 0, 101),
  easy2: puzzle("Fácil n° 2", "easy", 2, 202),
  easy3: puzzle("Fácil n° 3", "easy", 4, 303),
  easy4: puzzle("Fácil n° 4", "easy", 6, 404),
  medium1: puzzle("Media n° 1", "medium", 1, 511),
  medium2: puzzle("Media n° 2", "medium", 3, 622),
  medium3: puzzle("Media n° 3", "medium", 5, 733),
  medium4: puzzle("Media n° 4", "medium", 7, 844),
  hard1: puzzle("Difícil n° 1", "hard", 0, 911),
  hard2: puzzle("Difícil n° 2", "hard", 3, 1022),
  hard3: puzzle("Difícil n° 3", "hard", 6, 1133),
  hard4: puzzle("Difícil n° 4", "hard", 8, 1244),
  expert1: puzzle("Experta n° 1", "expert", 2, 1311),
  expert2: puzzle("Experta n° 2", "expert", 4, 1422),
  expert3: puzzle("Experta n° 3", "expert", 6, 1533),
  expert4: puzzle("Experta n° 4", "expert", 8, 1644),
};
