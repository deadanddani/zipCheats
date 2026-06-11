import "./style.css";
import { MapExporter } from "./extractor/MapExporter";
import { renderGrid } from "./components/GridBoard";
import { ZipMap } from "./models/Map";
import { Resolution } from "./models/Resolution";
import { Solver } from "./solver/Solver";
import { SOLVE_METHODS } from "./solver/methods";
import { renderTestRun } from "./components/TestRun";
import { createSpeedControl } from "./components/SpeedControl";

const date = new Date().toLocaleDateString("es-ES", { weekday: "long", month: "long", day: "numeric" });

const title = document.createElement("div");
title.className = "puzzle-header";

const titleLabel = document.createElement("span");
titleLabel.className = "puzzle-label";
titleLabel.textContent = "Zip";

const dateRow = document.createElement("div");
dateRow.className = "puzzle-date-row";

const solvableCheck = document.createElement("div");
solvableCheck.className = "puzzle-indicator";
solvableCheck.title = "¿Es resolvible?";
solvableCheck.innerHTML = `<span class="puzzle-indicator__icon">🧩</span><span class="puzzle-indicator__label">Resoluble</span>`;

const dateLabel = document.createElement("span");
dateLabel.className = "puzzle-date";
dateLabel.textContent = date;

const reachCheck = document.createElement("div");
reachCheck.className = "puzzle-indicator";
reachCheck.title = "¿Se puede llegar al siguiente número?";
reachCheck.innerHTML = `<span class="puzzle-indicator__icon">🎯</span><span class="puzzle-indicator__label">Sig. número</span>`;

dateRow.append(solvableCheck, dateLabel, reachCheck);
title.append(titleLabel, dateRow);

const linkedinBtn = document.createElement("a");
linkedinBtn.className = "linkedin-btn";

const reloadLinkedinBtn = document.createElement("a");
reloadLinkedinBtn.className = "linkedin-btn linkedin-btn--secondary";
reloadLinkedinBtn.textContent = "🔄 Recargar desde LinkedIn";
reloadLinkedinBtn.href = "https://www.linkedin.com/games/zip/?zipCheats=1";

const linkedinRow = document.createElement("div");
linkedinRow.className = "linkedin-row";
linkedinRow.appendChild(linkedinBtn);

const browser = document.createElement("div");
browser.className = "map-browser";

const groupSelect = document.createElement("select");
groupSelect.className = "sample-map-select";

const mapSelect = document.createElement("select");
mapSelect.className = "sample-map-select";

const loadMapBtn = document.createElement("button");
loadMapBtn.className = "test-map-btn";
loadMapBtn.textContent = "📂 Abrir mapa";

const deleteMapBtn = document.createElement("button");
deleteMapBtn.className = "delete-map-btn";
deleteMapBtn.textContent = "🗑️ Borrar mapa";

browser.appendChild(groupSelect);
browser.appendChild(mapSelect);
browser.appendChild(loadMapBtn);
browser.appendChild(deleteMapBtn);

const methodSelect = document.createElement("select");
methodSelect.className = "sample-map-select solve-method-select";
fillSelect(
  methodSelect,
  SOLVE_METHODS.map((method, index) => ({ value: String(index), label: method.name }))
);

const solveBtn = document.createElement("button");
solveBtn.className = "solve-btn";
solveBtn.textContent = "⚡ Resolver automáticamente";

const homeBtn = document.createElement("button");
homeBtn.className = "home-btn";
homeBtn.textContent = "🏠 Ir al inicio";

const testRunBtn = document.createElement("button");
testRunBtn.className = "test-map-btn";
testRunBtn.textContent = "🧪 Comparar métodos";

const speedControl = createSpeedControl();

const app = document.querySelector<HTMLDivElement>("#app")!;
app.appendChild(title);

const exporter = new MapExporter();
const solver = new Solver();
let gridEl: HTMLElement | null = null;
let testRunEl: HTMLElement | null = null;
let currentResolution: Resolution | null = null;
let pollInterval: ReturnType<typeof setInterval>;

function setLinkedinBtnAsTodayMap() {
  linkedinBtn.removeAttribute("href");
  linkedinBtn.textContent = "📋 Ver mapa de hoy";
  linkedinBtn.onclick = () => {
    exporter.getTodayMap().then(showGrid);
  };
  if (!reloadLinkedinBtn.isConnected) linkedinRow.appendChild(reloadLinkedinBtn);
}

function setLinkedinBtnAsLink() {
  linkedinBtn.href = "https://www.linkedin.com/games/zip/?zipCheats=1";
  linkedinBtn.textContent = "→ Abrir LinkedIn Zip";
  linkedinBtn.onclick = null;
  reloadLinkedinBtn.remove();
}

async function refreshLinkedinBtn() {
  try {
    await exporter.getTodayMap();
    setLinkedinBtnAsTodayMap();
    clearInterval(pollInterval);
  } catch {
    setLinkedinBtnAsLink();
  }
}

function fillSelect(select: HTMLSelectElement, options: { value: string; label: string }[]) {
  select.innerHTML = "";
  options.forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
}

async function refreshMapsForGroup(group: string) {
  const maps = await exporter.listMapsInGroup(group);
  fillSelect(mapSelect, maps.map((entry) => ({ value: entry.key, label: entry.key })));
}

async function refreshGroups() {
  const groups = await exporter.listGroups();
  fillSelect(groupSelect, groups.map((group) => ({ value: group, label: group })));

  const hasGroups = groups.length > 0;
  browser.style.display = hasGroups ? "" : "none";
  if (hasGroups) await refreshMapsForGroup(groupSelect.value);
}

function showHome() {
  clearInterval(pollInterval);
  gridEl?.remove();
  methodSelect.remove();
  solveBtn.remove();
  speedControl.element.remove();
  homeBtn.remove();
  testRunEl?.remove();
  testRunEl = null;
  currentResolution = null;
  dateRow.classList.remove("puzzle-date-row--active");

  app.appendChild(linkedinRow);
  app.appendChild(browser);
  app.appendChild(testRunBtn);

  refreshLinkedinBtn();
  refreshGroups();
  startPolling();
}

function showGrid(map: ZipMap) {
  clearInterval(pollInterval);
  linkedinRow.remove();
  browser.remove();
  testRunBtn.remove();

  currentResolution = new Resolution(map);
  gridEl = renderGrid(map, currentResolution);
  app.appendChild(gridEl);
  app.appendChild(methodSelect);
  app.appendChild(solveBtn);
  app.appendChild(speedControl.element);
  app.appendChild(homeBtn);

  const renderBoard = currentResolution.onChange;
  currentResolution.onChange = () => {
    renderBoard?.();
    updateChecks();
  };
  dateRow.classList.add("puzzle-date-row--active");
  updateChecks();
}

function updateChecks() {
  if (!currentResolution) return;
  const { path, map } = currentResolution;

  solvableCheck.classList.toggle("puzzle-indicator--on", map.isSolvable());

  const start = path[path.length - 1] ?? map.getFirstCell();
  if (!start) {
    reachCheck.classList.remove("puzzle-indicator--on");
    return;
  }

  let highest = 0;
  for (const cell of path) if (cell.value !== null) highest = cell.value;
  const target = highest + 1;
  reachCheck.classList.toggle("puzzle-indicator--on", map.canReachNode(start, target));
}

function showTestRun() {
  clearInterval(pollInterval);
  linkedinRow.remove();
  browser.remove();
  testRunBtn.remove();

  testRunEl = renderTestRun(exporter, showHome);
  app.appendChild(testRunEl);
}

function startPolling() {
  pollInterval = setInterval(refreshLinkedinBtn, 2000);
}

groupSelect.addEventListener("change", () => {
  refreshMapsForGroup(groupSelect.value);
});

loadMapBtn.addEventListener("click", () => {
  const key = mapSelect.value;
  if (!key) return;
  exporter.getMap(key).then(showGrid);
});

deleteMapBtn.addEventListener("click", async () => {
  const key = mapSelect.value;
  if (!key) return;
  if (!confirm(`¿Borrar el mapa "${key}"?`)) return;
  await exporter.deleteMap(key);
  await refreshGroups();
});

solveBtn.addEventListener("click", async () => {
  if (!currentResolution || solveBtn.disabled) return;
  solveBtn.disabled = true;
  try {
    solver.method = SOLVE_METHODS[Number(methodSelect.value)] ?? solver.method;
    await solver.solve(currentResolution, undefined, speedControl.getSps);
  } finally {
    solveBtn.disabled = false;
  }
});

homeBtn.addEventListener("click", () => {
  showHome();
});

testRunBtn.addEventListener("click", () => {
  showTestRun();
});

showHome();
