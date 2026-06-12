const Game = {
  assert(game) {
    const meta = ["id", "name", "icon", "url", "match", "selector"];
    for (const key of meta) {
      if (typeof game?.[key] !== "string") throw new Error(`Game: missing/invalid "${key}"`);
    }
    const checks = [
      ["extractor", "extract"],
      ["solver", "solve"],
      ["player", "play"],
      ["view", "draw"],
    ];
    for (const [obj, method] of checks) {
      if (typeof game?.[obj]?.[method] !== "function") {
        throw new Error(`Game "${game?.id}": ${obj}.${method}() is required`);
      }
    }
    return game;
  },
};
