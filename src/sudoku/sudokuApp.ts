import { MapExporter } from './extractor/MapExporter'
import { renderSudokuBoard } from './components/SudokuBoard'
import { SudokuMap } from './models/Map'
import { Resolution } from './models/Resolution'
import { Solver } from './solver/Solver'
import { createSpeedControl } from './components/SpeedControl'
import { renderTestRun } from './components/TestRun'

/**
 * Mounts the Sudoku game into `app`. Mirrors the Queens app: a home screen with
 * a map browser, and a board view with manual play + a solve button (single
 * backtracking method, wired as the test resolver).
 */
export function mountSudoku(app: HTMLDivElement, onChangeGame: () => void) {
  const date = new Date().toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })

  const title = document.createElement('div')
  title.className = 'puzzle-header'

  const titleLabel = document.createElement('span')
  titleLabel.className = 'puzzle-label'
  titleLabel.textContent = 'Sudoku'

  const dateRow = document.createElement('div')
  dateRow.className = 'puzzle-date-row'

  const solvedCheck = document.createElement('div')
  solvedCheck.className = 'puzzle-indicator'
  solvedCheck.title = '¿Está resuelto?'
  solvedCheck.innerHTML = `<span class="puzzle-indicator__icon">🔢</span><span class="puzzle-indicator__label">Resuelto</span>`

  const dateLabel = document.createElement('span')
  dateLabel.className = 'puzzle-date'
  dateLabel.textContent = date

  const solvableCheck = document.createElement('div')
  solvableCheck.className = 'puzzle-indicator'
  solvableCheck.title = '¿Sigue siendo resoluble?'
  solvableCheck.innerHTML = `<span class="puzzle-indicator__icon">🧩</span><span class="puzzle-indicator__label">Resoluble</span>`

  dateRow.append(solvedCheck, dateLabel, solvableCheck)
  title.append(titleLabel, dateRow)

  const todayBtn = document.createElement('a')
  todayBtn.className = 'linkedin-btn'
  todayBtn.textContent = '📋 Mapa de hoy'
  todayBtn.style.cursor = 'pointer'
  todayBtn.onclick = () => exporter.getTodayMap().then(showGrid)

  const linkedinRow = document.createElement('div')
  linkedinRow.className = 'linkedin-row'
  linkedinRow.appendChild(todayBtn)

  const browser = document.createElement('div')
  browser.className = 'map-browser'

  const groupSelect = document.createElement('select')
  groupSelect.className = 'sample-map-select'

  const mapSelect = document.createElement('select')
  mapSelect.className = 'sample-map-select'

  const loadMapBtn = document.createElement('button')
  loadMapBtn.className = 'test-map-btn'
  loadMapBtn.textContent = '📂 Abrir mapa'

  browser.append(groupSelect, mapSelect, loadMapBtn)

  const solveBtn = document.createElement('button')
  solveBtn.className = 'solve-btn'
  solveBtn.textContent = '⚡ Resolver automáticamente'

  const resetBtn = document.createElement('button')
  resetBtn.className = 'test-map-btn'
  resetBtn.textContent = '🧹 Limpiar tablero'

  const homeBtn = document.createElement('button')
  homeBtn.className = 'home-btn'
  homeBtn.textContent = '🏠 Ir al inicio'

  const changeGameBtn = document.createElement('button')
  changeGameBtn.className = 'home-btn'
  changeGameBtn.textContent = '🎮 Cambiar juego'
  changeGameBtn.addEventListener('click', onChangeGame)

  const testRunBtn = document.createElement('button')
  testRunBtn.className = 'test-map-btn'
  testRunBtn.textContent = '🧪 Probar mapas'

  const speedControl = createSpeedControl()

  app.appendChild(title)

  const exporter = new MapExporter()
  const solver = new Solver()
  let boardEl: HTMLElement | null = null
  let testRunEl: HTMLElement | null = null
  let currentResolution: Resolution | null = null

  function fillSelect(select: HTMLSelectElement, options: { value: string; label: string }[]) {
    select.innerHTML = ''
    options.forEach(({ value, label }) => {
      const option = document.createElement('option')
      option.value = value
      option.textContent = label
      select.appendChild(option)
    })
  }

  async function refreshMapsForGroup(group: string) {
    const maps = await exporter.listMapsInGroup(group)
    fillSelect(mapSelect, maps.map((entry) => ({ value: entry.key, label: entry.key })))
  }

  async function refreshGroups() {
    const groups = await exporter.listGroups()
    fillSelect(groupSelect, groups.map((group) => ({ value: group, label: group })))
    if (groups.length > 0) await refreshMapsForGroup(groupSelect.value)
  }

  function showHome() {
    boardEl?.remove()
    solveBtn.remove()
    resetBtn.remove()
    speedControl.element.remove()
    homeBtn.remove()
    testRunEl?.remove()
    testRunEl = null
    currentResolution = null
    dateRow.classList.remove('puzzle-date-row--active')

    app.append(linkedinRow, browser, testRunBtn, changeGameBtn)
    refreshGroups()
  }

  function showGrid(map: SudokuMap) {
    linkedinRow.remove()
    browser.remove()
    testRunBtn.remove()
    changeGameBtn.remove()

    currentResolution = new Resolution(map)
    boardEl = renderSudokuBoard(map, currentResolution)
    app.append(boardEl, solveBtn, resetBtn, speedControl.element, homeBtn)

    const renderBoard = currentResolution.onChange
    currentResolution.onChange = () => {
      renderBoard?.()
      updateChecks()
    }
    dateRow.classList.add('puzzle-date-row--active')
    updateChecks()
  }

  function updateChecks() {
    if (!currentResolution) return
    const { map } = currentResolution
    solvedCheck.classList.toggle('puzzle-indicator--on', currentResolution.isCompleted())
    solvableCheck.classList.toggle('puzzle-indicator--on', map.isSolvable())
  }

  groupSelect.addEventListener('change', () => refreshMapsForGroup(groupSelect.value))

  loadMapBtn.addEventListener('click', () => {
    const key = mapSelect.value
    if (!key) return
    exporter.getMap(key).then(showGrid)
  })

  solveBtn.addEventListener('click', async () => {
    if (!currentResolution || solveBtn.disabled) return
    solveBtn.disabled = true
    try {
      await solver.solve(currentResolution, undefined, speedControl.getSps)
    } finally {
      solveBtn.disabled = false
    }
  })

  function showTestRun() {
    linkedinRow.remove()
    browser.remove()
    testRunBtn.remove()
    changeGameBtn.remove()

    testRunEl = renderTestRun(exporter, showHome)
    app.appendChild(testRunEl)
  }

  resetBtn.addEventListener('click', () => currentResolution?.reset())
  homeBtn.addEventListener('click', showHome)
  testRunBtn.addEventListener('click', showTestRun)

  showHome()
}
