// Catalog metadata wired to Queens's runtime. Content-script context only — it
// references globals (QueensExtractor, …) not loaded in the popup.
const QueensGame = {
  ...GameCatalog.byId('queens'),
  extractor: QueensExtractor,
  solver: QueensSolver,
  player: QueensPlayer,
  view: QueensBoardView,
}
