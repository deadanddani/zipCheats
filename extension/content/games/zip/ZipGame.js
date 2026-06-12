// The Zip game descriptor: ties the catalog metadata to Zip's concrete runtime
// (extractor, solver, player, view). This is the single object the content
// script's GameRegistry works with. Content-script context only — it references
// globals (ZipExtractor, …) that aren't loaded in the popup.
const ZipGame = {
  ...GameCatalog.byId('zip'),
  extractor: ZipExtractor,
  solver: ZipSolver,
  player: ZipPlayer,
  view: ZipBoardView,
}
