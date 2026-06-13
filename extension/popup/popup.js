const elements = {
  listView: document.getElementById("list-view"),
  detailView: document.getElementById("detail-view"),
  gameList: document.getElementById("game-list"),
  back: document.getElementById("back"),
  detailIcon: document.getElementById("detail-icon"),
  detailName: document.getElementById("detail-name"),
  go: document.getElementById("go"),
  solve: document.getElementById("solve"),
  toggle: document.getElementById("toggle"),
  solveTime: document.getElementById("solve-time"),
  preview: document.getElementById("preview"),
  spoiler: document.getElementById("spoiler"),
  canvas: document.getElementById("canvas"),
  dims: document.getElementById("dims"),
  status: document.getElementById("status"),
  dailyTime: document.getElementById("daily-time"),
  dailyUseGame: document.getElementById("daily-usegame"),
  runDailies: document.getElementById("run-dailies"),
};

let currentGame = null;
let currentMap = null;
let currentView = null;

function setStatus(text) {
  elements.status.textContent = text || "";
}

const loadedScripts = new Set();
function loadScript(path) {
  if (loadedScripts.has(path)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL(path);
    s.onload = () => (loadedScripts.add(path), resolve());
    s.onerror = () => reject(new Error(`Could not load ${path}`));
    document.head.appendChild(s);
  });
}

async function viewFor(game) {
  if (!GameViews.get(game.id) && game.viewScript) await loadScript(game.viewScript);
  return GameViews.get(game.id);
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function onGameRoute(tab, game) {
  return new RegExp(`^https://www\\.linkedin\\.com${game.match.replace("/", "\\/")}`).test(tab?.url ?? "");
}

async function fetchMap(tab) {
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_MAP" });
    return res?.map ?? null;
  } catch {
    return null;
  }
}

async function fetchSolution(tab) {
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_SOLUTION" });
    return res?.solution ?? null;
  } catch {
    return null;
  }
}

function renderList() {
  elements.gameList.innerHTML = "";
  for (const game of GameCatalog.games) {
    const li = document.createElement("li");
    li.className = "game-list__item";
    li.innerHTML = `
      <img class="game-list__icon" src="${chrome.runtime.getURL(game.icon)}" alt="" />
      <span class="game-list__name">${game.name}</span>
      <span class="game-list__chevron">›</span>
    `;
    li.addEventListener("click", () => openDetail(game));
    elements.gameList.appendChild(li);
  }
}

async function openDetail(game) {
  currentGame = game;
  currentMap = null;
  currentView = null;
  elements.detailIcon.src = chrome.runtime.getURL(game.icon);
  elements.detailName.textContent = game.name;
  elements.listView.hidden = true;
  elements.detailView.hidden = false;
  setStatus("");
  elements.preview.hidden = true;

  // Solve-time is per-game, so rebuild it bound to the game being opened.
  elements.solveTime.replaceChildren(Controls.createSolveTimeControl(game.id));

  // Some games (e.g. Patches) don't support auto-solve — block the button.
  const canAutoSolve = game.canAutoSolve !== false;
  elements.solve.disabled = !canAutoSolve;
  elements.solve.title = canAutoSolve ? "" : `Auto-solve is disabled for ${game.name}`;

  const tab = await activeTab();
  if (!onGameRoute(tab, game)) {
    setStatus(`Open ${game.name} on LinkedIn to see the map.`);
    return;
  }
  const map = await fetchMap(tab);
  if (map) {
    currentMap = map;
    currentView = await viewFor(game);
    elements.dims.textContent = `${map.rows}×${map.cols}`;
    elements.spoiler.classList.remove("game-spoiler--revealed");
    currentView.draw(elements.canvas, map);
    elements.preview.hidden = false;
    // Paint the solution underneath the blur once it's ready.
    const solution = await fetchSolution(tab);
    if (solution) currentView.draw(elements.canvas, { ...map, solution });
  } else {
    setStatus("No map loaded yet. Reload the page if needed.");
  }
}

function showList() {
  currentGame = null;
  elements.detailView.hidden = true;
  elements.listView.hidden = false;
}

elements.back.addEventListener("click", showList);

Controls.wireSpoiler(elements.spoiler);

elements.go.addEventListener("click", () => chrome.tabs.create({ url: currentGame?.url }));

elements.solve.addEventListener("click", async () => {
  const tab = await activeTab();
  if (!onGameRoute(tab, currentGame)) {
    chrome.tabs.create({ url: `${currentGame.url}?hackTheLink=1` });
    return;
  }
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "SOLVE_NOW" });
    if (res?.ok) {
      setStatus(`Solved: ${res.cells} cells${res.completeMap ? "" : " (not completed)"}.`);
      elements.spoiler.classList.add("game-spoiler--revealed");
    } else if (res?.error === "no-solution") setStatus("No solution (walls loaded incorrectly?).");
    else if (res?.error === "autosolve-disabled") setStatus(`Auto-solve is disabled for ${currentGame.name}.`);
    else if (res?.error === "already-solved") setStatus("Already solved on LinkedIn.");
    else setStatus("No map loaded yet.");
  } catch {
    setStatus("Could not reach the page. Reload it and try again.");
  }
});

elements.toggle.appendChild(
  Controls.createCompleteMapToggle({
    hint: "If disabled, it stops one step short of the end (for testing).",
  }),
);

function gameForTab(tab) {
  return GameCatalog.games.find((game) => onGameRoute(tab, game)) ?? null;
}

// "Solve all dailies": persist the two settings live, and on run, kick off a
// DailyRunner pass that the content script drives through every game.
async function wireDailies() {
  const { dailyUseGameTime } = await Settings.get();

  // Same slider as the per-game "Solve time", bound to the global dailies value.
  const timeCtrl = Controls.createDailyTimeControl();
  elements.dailyTime.replaceChildren(timeCtrl);
  // "Use game time" locks the slider (each game keeps its own natural time).
  timeCtrl.setEnabled(!dailyUseGameTime);
  elements.dailyUseGame.checked = dailyUseGameTime;

  elements.dailyUseGame.addEventListener("change", () => {
    const on = elements.dailyUseGame.checked;
    timeCtrl.setEnabled(!on);
    Settings.set({ dailyUseGameTime: on });
  });

  elements.runDailies.addEventListener("click", async () => {
    const { dailySeconds: seconds, dailyUseGameTime: useGameTime } = await Settings.get();
    await DailyRunner.start({ seconds, useGameTime });

    const firstId = DailyRunner.order()[0];
    const first = firstId ? GameCatalog.byId(firstId) : null;
    if (!first) return;

    const tab = await activeTab();
    // On a games page the content script picks up the run via storage; otherwise
    // open the first game so a content script is there to drive it.
    if (!tab || !/linkedin\.com\/games\//.test(tab.url ?? "")) {
      await chrome.tabs.create({ url: first.url });
    }
    window.close();
  });
}

async function init() {
  renderList();
  wireDailies();
  const tab = await activeTab();
  const game = gameForTab(tab);
  if (game) openDetail(game);
}

init();
