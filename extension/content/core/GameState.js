// Reads a game's progress from LinkedIn's localStorage, generically for every
// game. Driven by the `stateType` / `stateScheme` metadata on each GameCatalog
// entry — no game-specific code lives here. Two schemes exist (see GameCatalog):
//
//   numeric → keys `play:gameState|timeElapsed|shareData:(<member>,<type>,<N>)`,
//             time stored in MILLISECONDS, solved ⇔ the shareData key exists.
//   urn     → one wrapped key `play:urn:li:fsd_game:(<member>,<type>,<N>)` =
//             { data: "<json>", expireAt }, time in SECONDS inside data, solved
//             ⇔ data.gamePlayState is terminal (e.g. END_SOLVED).
//
// Old days linger in storage, so the *current* puzzle is taken to be the one
// with the highest N for that type — daily puzzles increment, and today's key
// already exists while playing (the timer/state is written from load).
const GameState = {
  TERMINAL_STATE: /END_SOLVED|SOLVED|COMPLETE|FINISH|WON|DONE/i,

  // Returns "<member>,<type>,<N>" for the current puzzle of `game`, or null.
  currentSuffix(game) {
    const { stateType: type, stateScheme: scheme } = game ?? {};
    if (type == null) return null;
    // For numeric, anchor on the timeElapsed key (written from load, even before
    // the first move). For urn, anchor on the wrapped state key itself.
    const re =
      scheme === 'urn'
        ? new RegExp(`^play:urn:li:fsd_game:\\(([^,]+,${type},(\\d+))\\)$`)
        : new RegExp(`^play:timeElapsed:\\((\\d+,${type},(\\d+))\\)$`);
    let best = null;
    let bestN = -Infinity;
    for (let i = 0; i < localStorage.length; i++) {
      const m = localStorage.key(i).match(re);
      if (!m) continue;
      const n = Number(m[2]);
      if (n > bestN) {
        bestN = n;
        best = m[1];
      }
    }
    return best;
  },

  // Parsed inner state object for an urn-scheme game, or null.
  urnData(suffix) {
    try {
      return JSON.parse(JSON.parse(localStorage.getItem(`play:urn:li:fsd_game:(${suffix})`)).data);
    } catch {
      return null;
    }
  },

  // Seconds already on LinkedIn's clock for the current puzzle, or null if there
  // is no saved progress (e.g. a brand-new puzzle).
  readElapsedSeconds(game) {
    const suffix = this.currentSuffix(game);
    if (!suffix) return null;
    if (game.stateScheme === 'urn') {
      const d = this.urnData(suffix);
      return d && d.gamePlayState === 'IN_PROGRESS' && Number.isFinite(d.timeElapsed) ? d.timeElapsed : null;
    }
    const ms = Number(localStorage.getItem(`play:timeElapsed:(${suffix})`));
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  },

  // Whether the current puzzle is already finished (so there's nothing to solve).
  // `map` is optional: when given it lets the numeric scheme tell a genuinely
  // finished board apart from one that's merely been *replayed* (see below).
  isSolved(game, map) {
    const suffix = this.currentSuffix(game);
    if (!suffix) {
      console.log('[hackTheLink][isSolved] no suffix → false', { game: game?.id });
      return false;
    }
    if (game.stateScheme === 'urn') {
      const d = this.urnData(suffix);
      const solved = !!d && this.TERMINAL_STATE.test(String(d.gamePlayState));
      console.log('[hackTheLink][isSolved] urn', { suffix, gamePlayState: d?.gamePlayState, solved });
      return solved;
    }
    // shareData lingers through a replay, so also require the live board to look
    // finished (when the game declares `completion`).
    const hasShareData = localStorage.getItem(`play:shareData:(${suffix})`) != null;
    const board = this.boardComplete(game, map);
    console.log('[hackTheLink][isSolved] numeric', {
      suffix,
      hasShareData,
      hasMap: !!map,
      boardComplete: board, // null = couldn't tell (no map or no completion spec)
      solved: hasShareData && board !== false,
    });
    if (!hasShareData) return false;
    return board !== false;
  },

  // true/false from `completion` metadata, or null when it can't tell.
  boardComplete(game, map) {
    const spec = game?.completion;
    if (!spec || !map) return null;
    const need = spec.count === 'rows' ? (map.rows ?? 0) : (map.rows ?? 0) * (map.cols ?? 0);
    if (!need) return null;
    return document.querySelectorAll(spec.filled).length >= need;
  },
};
