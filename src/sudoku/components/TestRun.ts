import './TestRun.css'
import { Chart } from 'chart.js/auto'
import type { MapExporter, SavedMapSummary } from '../extractor/MapExporter'
import type { SudokuMap } from '../models/Map'
import { Solver } from '../solver/Solver'
import { Resolution } from '../models/Resolution'
import { renderSudokuBoard } from './SudokuBoard'
import { createSpeedControl } from './SpeedControl'

const SLOWEST_COUNT = 5

// every board is scaled to fit this footprint, so switching between difficulties
// never changes how much space the grid takes up on screen
const GRID_FRAME_SIZE = 460

function formatMs(ms: number): string {
  return `${ms.toFixed(0)} ms`
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function fillSelect(select: HTMLSelectElement, options: { value: string; label: string }[]) {
  select.innerHTML = ''
  for (const { value, label } of options) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    select.appendChild(option)
  }
}

function fitBoardToFrame(board: HTMLElement, map: SudokuMap) {
  const cellSize = Math.floor(GRID_FRAME_SIZE / map.size)
  board.style.setProperty('--cell-size', `${cellSize}px`)
}

interface MapResult {
  key: string
  elapsed: number
  solved: boolean
}

function buildTimelineChart(results: MapResult[], avg: number): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'test-summary__chart'

  const canvas = document.createElement('canvas')
  wrapper.appendChild(canvas)

  const pointColors = results.map((result) => (result.solved ? '#34d399' : '#f87171'))

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: results.map((result) => result.key),
      datasets: [
        {
          label: 'Tiempo',
          data: results.map((result) => result.elapsed),
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.15)',
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: 3,
          tension: 0.25,
          fill: true,
        },
        {
          label: 'Media',
          data: results.map(() => avg),
          borderColor: '#6b7280',
          borderDash: [4, 3],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { display: false }, grid: { color: '#2a2e37' } },
        y: { ticks: { color: '#9ca3af' }, grid: { color: '#2a2e37' }, beginAtZero: true },
      },
      plugins: {
        legend: { labels: { color: '#9ca3af' } },
        tooltip: {
          callbacks: {
            title: (items) => results[items[0].dataIndex]?.key ?? '',
            label: (item) => `${item.dataset.label}: ${formatMs(item.parsed.y ?? 0)}`,
          },
        },
      },
    },
  })

  return wrapper
}

function buildStat(label: string, value: string): HTMLElement {
  const stat = document.createElement('span')
  const labelEl = document.createElement('span')
  labelEl.className = 'test-summary__stat-label'
  labelEl.textContent = label
  const valueEl = document.createElement('strong')
  valueEl.textContent = value
  stat.append(labelEl, valueEl)
  return stat
}

function buildSummary(results: MapResult[]): HTMLElement {
  const summary = document.createElement('div')
  summary.className = 'test-summary'
  if (results.length === 0) return summary

  const card = document.createElement('div')
  card.className = 'test-summary__column'

  const title = document.createElement('div')
  title.className = 'test-summary__title'
  title.textContent = 'Resumen · Backtracking'

  const times = results.map((result) => result.elapsed)
  const avg = times.reduce((sum, time) => sum + time, 0) / times.length
  const max = Math.max(...times)
  const min = Math.min(...times)

  const stats = document.createElement('div')
  stats.className = 'test-summary__stats'
  stats.append(buildStat('Media', formatMs(avg)), buildStat('Mín', formatMs(min)), buildStat('Máx', formatMs(max)))

  const chart = buildTimelineChart(results, avg)

  const slowestTitle = document.createElement('div')
  slowestTitle.className = 'test-summary__subtitle'
  slowestTitle.textContent = 'Mapas más lentos'

  const slowestList = document.createElement('ol')
  slowestList.className = 'test-summary__slowest'
  const slowest = [...results].sort((a, b) => b.elapsed - a.elapsed).slice(0, SLOWEST_COUNT)
  for (const result of slowest) {
    const item = document.createElement('li')
    const label = document.createElement('span')
    label.textContent = result.solved ? result.key : `${result.key} (sin resolver)`
    const time = document.createElement('span')
    time.textContent = formatMs(result.elapsed)
    item.append(label, time)
    slowestList.appendChild(item)
  }

  card.append(title, stats, chart, slowestTitle, slowestList)
  summary.appendChild(card)
  return summary
}

export function renderTestRun(exporter: MapExporter, onExit: () => void): HTMLElement {
  const root = document.createElement('div')
  root.className = 'test-run'

  let cancelled = false
  let runTimer: ReturnType<typeof setInterval> | undefined

  const stopTimer = () => {
    if (runTimer !== undefined) clearInterval(runTimer)
    runTimer = undefined
  }

  const exit = () => {
    cancelled = true
    stopTimer()
    onExit()
  }

  showSetup()

  function showSetup() {
    cancelled = true
    stopTimer()
    root.replaceChildren()

    const selectedMaps = new Map<string, SavedMapSummary>()

    const setup = document.createElement('div')
    setup.className = 'test-setup'

    // ── Group / map picker ──
    const mapsSection = document.createElement('div')
    mapsSection.className = 'test-setup__section'

    const mapsTitle = document.createElement('div')
    mapsTitle.className = 'test-setup__title'
    mapsTitle.textContent = 'Mapas a resolver'

    const setSelect = document.createElement('select')
    setSelect.className = 'sample-map-select'
    fillSelect(setSelect, [
      { value: 'group', label: 'Por grupo' },
      { value: 'all', label: 'Todos los mapas' },
    ])

    const groupSelect = document.createElement('select')
    groupSelect.className = 'sample-map-select'

    const selectAllBtn = document.createElement('button')
    selectAllBtn.className = 'test-setup__select-all'
    selectAllBtn.textContent = 'Seleccionar todos'

    const mapsList = document.createElement('div')
    mapsList.className = 'test-setup__list'

    const mapsHint = document.createElement('div')
    mapsHint.className = 'test-setup__hint'

    mapsSection.append(mapsTitle, setSelect, groupSelect, selectAllBtn, mapsList, mapsHint)

    const startBtn = document.createElement('button')
    startBtn.className = 'test-setup__start'
    startBtn.textContent = '▶ Iniciar prueba'

    const exitBtn = document.createElement('button')
    exitBtn.className = 'home-btn'
    exitBtn.textContent = '🏠 Ir al inicio'
    exitBtn.addEventListener('click', exit)

    setup.append(mapsSection, startBtn, exitBtn)
    root.appendChild(setup)

    function updateHint() {
      mapsHint.textContent = `${selectedMaps.size} mapa(s) seleccionado(s)`
    }

    function updateStartState() {
      startBtn.disabled = selectedMaps.size === 0
    }

    async function refreshMapsList(group: string) {
      mapsList.replaceChildren()
      const maps = await exporter.listMapsInGroup(group)
      for (const map of maps) {
        const label = document.createElement('label')
        label.className = 'test-setup__option'

        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.checked = selectedMaps.has(map.key)
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) selectedMaps.set(map.key, map)
          else selectedMaps.delete(map.key)
          updateHint()
          updateStartState()
        })

        const span = document.createElement('span')
        span.textContent = map.key

        label.append(checkbox, span)
        mapsList.appendChild(label)
      }
    }

    async function setupGroups() {
      const groups = await exporter.listGroups()
      groupSelect.replaceChildren()
      for (const group of groups) {
        const option = document.createElement('option')
        option.value = group
        option.textContent = group
        groupSelect.appendChild(option)
      }
      if (groups.length > 0) await refreshMapsList(groupSelect.value)
    }

    async function selectAll() {
      selectedMaps.clear()
      const groups = await exporter.listGroups()
      for (const group of groups) {
        const maps = await exporter.listMapsInGroup(group)
        for (const map of maps) selectedMaps.set(map.key, map)
      }
      updateHint()
      updateStartState()
    }

    setSelect.addEventListener('change', async () => {
      const isAll = setSelect.value === 'all'
      groupSelect.style.display = isAll ? 'none' : ''
      selectAllBtn.style.display = isAll ? 'none' : ''
      mapsList.style.display = isAll ? 'none' : ''

      selectedMaps.clear()
      if (isAll) {
        await selectAll()
      } else {
        await refreshMapsList(groupSelect.value)
        updateHint()
        updateStartState()
      }
    })

    groupSelect.addEventListener('change', () => refreshMapsList(groupSelect.value))

    selectAllBtn.addEventListener('click', async () => {
      const maps = await exporter.listMapsInGroup(groupSelect.value)
      const allSelected = maps.every((map) => selectedMaps.has(map.key))
      for (const map of maps) {
        if (allSelected) selectedMaps.delete(map.key)
        else selectedMaps.set(map.key, map)
      }
      await refreshMapsList(groupSelect.value)
      updateHint()
      updateStartState()
    })

    startBtn.addEventListener('click', () => {
      if (startBtn.disabled) return
      showRun([...selectedMaps.values()])
    })

    updateHint()
    updateStartState()
    setupGroups()
  }

  function showRun(maps: SavedMapSummary[]) {
    cancelled = false
    root.replaceChildren()

    const speedControl = createSpeedControl()

    const column = document.createElement('div')
    column.className = 'test-run__column'

    const title = document.createElement('div')
    title.className = 'test-run__column-title'
    title.textContent = 'Backtracking'

    const progressBar = document.createElement('div')
    progressBar.className = 'test-run__progress-bar'
    const progressFill = document.createElement('div')
    progressFill.className = 'test-run__progress-fill'
    progressBar.appendChild(progressFill)

    const status = document.createElement('div')
    status.className = 'test-run__status'
    const statusMap = document.createElement('span')
    const statusTime = document.createElement('strong')
    status.append(statusMap, statusTime)

    const gridFrame = document.createElement('div')
    gridFrame.className = 'test-run__grid-frame'
    gridFrame.style.width = `${GRID_FRAME_SIZE}px`
    gridFrame.style.height = `${GRID_FRAME_SIZE}px`

    const total = document.createElement('div')
    total.className = 'test-run__total'

    const summaryList = document.createElement('ul')
    summaryList.className = 'test-run__summary'

    column.append(title, progressBar, status, gridFrame, total, summaryList)

    const columnsEl = document.createElement('div')
    columnsEl.className = 'test-run__columns'
    columnsEl.appendChild(column)

    const stopBtn = document.createElement('button')
    stopBtn.className = 'test-run__stop-btn'
    stopBtn.textContent = '⏹ Detener prueba'
    stopBtn.addEventListener('click', () => {
      cancelled = true
      stopTimer()
      stopBtn.disabled = true
      stopBtn.textContent = '⏹ Prueba detenida'
    })

    const exitBtn = document.createElement('button')
    exitBtn.className = 'home-btn'
    exitBtn.textContent = '🏠 Ir al inicio'
    exitBtn.addEventListener('click', exit)

    const actions = document.createElement('div')
    actions.className = 'test-run__actions'
    actions.append(stopBtn, exitBtn)

    root.append(speedControl.element, columnsEl, actions)

    function setProgress(index: number, map?: SavedMapSummary) {
      progressFill.style.width = `${(index / maps.length) * 100}%`
      statusMap.textContent = map
        ? `Mapa ${index + 1} / ${maps.length} · ${map.key}`
        : `Completado: ${maps.length} / ${maps.length}`
    }

    async function run() {
      const results: MapResult[] = []
      const runStart = performance.now()
      runTimer = setInterval(() => {
        statusTime.textContent = formatDuration(performance.now() - runStart)
      }, 250)

      let totalElapsed = 0
      let failedCount = 0

      for (let i = 0; i < maps.length; i++) {
        if (cancelled) break
        const mapSummary = maps[i]
        setProgress(i, mapSummary)

        const map = await exporter.getMap(mapSummary.key)
        if (cancelled) break

        const resolution = new Resolution(map)
        const solver = new Solver()
        const board = renderSudokuBoard(map, resolution, { interactive: false })
        fitBoardToFrame(board, map)
        gridFrame.replaceChildren(board)

        const start = performance.now()
        await solver.solve(resolution, () => cancelled, speedControl.getSps)
        if (cancelled) break
        const elapsed = performance.now() - start
        totalElapsed += elapsed

        const solved = resolution.isCompleted()
        if (!solved) {
          failedCount++
          console.warn(`No se pudo resolver el mapa "${mapSummary.key}"`)
        }
        results.push({ key: mapSummary.key, elapsed, solved })

        const entry = document.createElement('li')
        if (!solved) entry.classList.add('test-run__summary-item--failed')
        const label = document.createElement('span')
        label.textContent = mapSummary.key
        const time = document.createElement('span')
        time.textContent = `${solved ? '✅' : '❌'} ${formatMs(elapsed)}`
        entry.append(label, time)
        summaryList.prepend(entry)
      }

      stopTimer()

      if (!cancelled) {
        setProgress(maps.length)
        total.textContent =
          failedCount > 0
            ? `Tiempo total: ${formatMs(totalElapsed)} · ❌ ${failedCount} sin resolver`
            : `Tiempo total: ${formatMs(totalElapsed)}`
        stopBtn.disabled = true
        root.appendChild(buildSummary(results))
      }
    }

    run()
  }

  return root
}
