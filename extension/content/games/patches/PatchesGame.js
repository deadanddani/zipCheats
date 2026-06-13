// Catalog metadata wired to Patches' runtime. Content-script context only — it
// references globals (PatchesExtractor, …) not loaded in the popup.
const PatchesGame = {
  ...GameCatalog.byId('patches'),
  extractor: PatchesExtractor,
  solver: PatchesSolver,
  player: PatchesPlayer,
  view: PatchesBoardView,
}
