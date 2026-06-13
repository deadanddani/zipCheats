import "./style.css";
import { mountZip } from "./zip/zipApp";
import { mountQueens } from "./queens/queensApp";
import { mountSudoku } from "./sudoku/sudokuApp";

const app = document.querySelector<HTMLDivElement>("#app")!;

const GAMES = [
  { id: "zip", label: "Zip", icon: "🔢", description: "Une los números en orden recorriendo todo el tablero.", mount: mountZip },
  { id: "queens", label: "Queens", icon: "👑", description: "Coloca una corona por fila, columna y región sin que se toquen.", mount: mountQueens },
  { id: "sudoku", label: "Sudoku", icon: "🔢", description: "Rellena la cuadrícula con dígitos sin repetir en fila, columna ni región.", mount: mountSudoku },
] as const;

function renderSelector() {
  app.replaceChildren();

  const header = document.createElement("div");
  header.className = "puzzle-header";
  header.innerHTML = `<span class="puzzle-label">Elige un juego</span>`;

  const cards = document.createElement("div");
  cards.className = "game-selector";

  for (const game of GAMES) {
    const card = document.createElement("button");
    card.className = "game-card";
    card.innerHTML = `
      <span class="game-card__icon">${game.icon}</span>
      <span class="game-card__label">${game.label}</span>
      <span class="game-card__desc">${game.description}</span>
    `;
    card.addEventListener("click", () => {
      app.replaceChildren();
      game.mount(app, renderSelector);
    });
    cards.appendChild(card);
  }

  app.append(header, cards);
}

renderSelector();
