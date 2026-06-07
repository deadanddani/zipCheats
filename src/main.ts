import "./style.css";
import { MapExporter } from "./extractor/MapExporter";
import { renderGrid } from "./components/GridBoard";
import { ZipMap } from "./models/Map";
import { Resolution } from "./models/Resolution";
import { Solver } from "./solver/Solver";

function buildTestMap(): ZipMap {
  const map = new ZipMap(3, 3);
  map.cellAt(0, 0)!.value = 1;
  map.cellAt(0, 2)!.value = 2;
  map.cellAt(2, 0)!.value = 3;
  map.cellAt(2, 2)!.value = 4;
  map.addWall(0, 1, "bottom");
  return map;
}

const date = new Date().toLocaleDateString("es-ES", { weekday: "long", month: "long", day: "numeric" });

const title = document.createElement("div");
title.className = "puzzle-header";
title.innerHTML = `<span class="puzzle-label">Zip</span><span class="puzzle-date">${date}</span>`;

const linkedinBtn = document.createElement("a");
linkedinBtn.className = "linkedin-btn";
linkedinBtn.href = "https://www.linkedin.com/games/zip/";
linkedinBtn.target = "_blank";
linkedinBtn.textContent = "→ Abrir LinkedIn Zip";

const testMapBtn = document.createElement("button");
testMapBtn.className = "test-map-btn";
testMapBtn.textContent = "🧪 Cargar mapa de prueba";

const solveBtn = document.createElement("button");
solveBtn.className = "solve-btn";
solveBtn.textContent = "⚡ Resolver automáticamente";

const clearBtn = document.createElement("button");
clearBtn.className = "clear-btn";
clearBtn.textContent = "Limpiar mapa";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.appendChild(title);
app.appendChild(linkedinBtn);
app.appendChild(testMapBtn);

const exporter = new MapExporter();
const solver = new Solver();
let gridEl: HTMLElement | null = null;
let currentResolution: Resolution | null = null;
let pollInterval: ReturnType<typeof setInterval>;

function showGrid(map: ZipMap) {
  clearInterval(pollInterval);
  linkedinBtn.remove();
  testMapBtn.remove();
  currentResolution = new Resolution(map);
  gridEl = renderGrid(map, currentResolution);
  app.appendChild(gridEl);
  app.appendChild(solveBtn);
  app.appendChild(clearBtn);
}

function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      const map = await exporter.getTodayMap();
      showGrid(map);
    } catch {
      // no map yet, keep polling
    }
  }, 1000);
}

testMapBtn.addEventListener("click", () => {
  showGrid(buildTestMap());
});

solveBtn.addEventListener("click", () => {
  if (currentResolution) solver.solve(currentResolution);
});

clearBtn.addEventListener("click", async () => {
  await exporter.clearMap();
  gridEl?.remove();
  solveBtn.remove();
  clearBtn.remove();
  currentResolution = null;
  app.appendChild(linkedinBtn);
  app.appendChild(testMapBtn);
  startPolling();
});

startPolling();
