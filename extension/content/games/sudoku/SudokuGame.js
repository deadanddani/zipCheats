// Catalog metadata wired to Sudoku's runtime. Content-script context only — it
// references globals (SudokuExtractor, …) not loaded in the popup.
const SudokuGame = {
  ...GameCatalog.byId('sudoku'),
  extractor: SudokuExtractor,
  solver: SudokuSolver,
  player: SudokuPlayer,
  view: SudokuBoardView,
}
