import "./style.css";
import { MapExporter } from "./extractor/MapExporter";
import { renderGrid } from "./components/GridBoard";

const date = new Date().toLocaleDateString("es-ES", { weekday: "long", month: "long", day: "numeric" });

const title = document.createElement("div");
title.className = "puzzle-header";
title.innerHTML = `<span class="puzzle-label">Zip</span><span class="puzzle-date">${date}</span>`;

const linkedinBtn = document.createElement("a");
linkedinBtn.className = "linkedin-btn";
linkedinBtn.href = "https://www.linkedin.com/games/zip/";
linkedinBtn.target = "_blank";
linkedinBtn.textContent = "→ Abrir LinkedIn Zip";

const clearBtn = document.createElement("button");
clearBtn.className = "clear-btn";
clearBtn.textContent = "Limpiar mapa";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.appendChild(title);
app.appendChild(linkedinBtn);

const exporter = new MapExporter();
let gridEl: HTMLElement | null = null;
let pollInterval: ReturnType<typeof setInterval>;

function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      const grid = await exporter.getTodayMap();
      clearInterval(pollInterval);
      linkedinBtn.remove();
      gridEl = renderGrid(grid);
      app.appendChild(gridEl);
      app.appendChild(clearBtn);
    } catch {
      // no map yet, keep polling
    }
  }, 1000);
}

clearBtn.addEventListener("click", async () => {
  await exporter.clearMap();
  gridEl?.remove();
  clearBtn.remove();
  app.appendChild(linkedinBtn);
  startPolling();
});

startPolling();
