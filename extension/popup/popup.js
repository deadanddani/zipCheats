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
  preview: document.getElementById("preview"),
  canvas: document.getElementById("canvas"),
  dims: document.getElementById("dims"),
  status: document.getElementById("status"),
};

let currentGame = null;

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

// Ask the content script on the active tab for whatever it last extracted.
async function fetchMap(tab) {
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_MAP" });
    return res?.map ?? null;
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
  elements.detailIcon.src = chrome.runtime.getURL(game.icon);
  elements.detailName.textContent = game.name;
  elements.listView.hidden = true;
  elements.detailView.hidden = false;
  setStatus("");
  elements.preview.hidden = true;

  // Show the live board only if the active tab is actually on this game.
  const tab = await activeTab();
  if (!onGameRoute(tab, game)) {
    setStatus(`Open ${game.name} on LinkedIn to see the map.`);
    return;
  }
  const map = await fetchMap(tab);
  if (map) {
    const view = await viewFor(game);
    elements.dims.textContent = `${map.rows}×${map.cols}`;
    view.draw(elements.canvas, map);
    elements.preview.hidden = false;
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

elements.go.addEventListener("click", () => chrome.tabs.create({ url: currentGame?.url }));

elements.solve.addEventListener("click", async () => {
  const tab = await activeTab();
  if (!onGameRoute(tab, currentGame)) {
    chrome.tabs.create({ url: `${currentGame.url}?hackTheLink=1` });
    return;
  }
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "SOLVE_NOW" });
    if (res?.ok) setStatus(`Solved: ${res.cells} cells${res.completeMap ? "" : " (not completed)"}.`);
    else if (res?.error === "no-solution") setStatus("No solution (walls loaded incorrectly?).");
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

renderList();
