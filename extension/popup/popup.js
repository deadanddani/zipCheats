const ZIP_URL = 'https://www.linkedin.com/games/zip/?zipCheats=1'

const els = {
  go: document.getElementById('go'),
  solve: document.getElementById('solve'),
  completeMap: document.getElementById('completeMap'),
  board: document.getElementById('board'),
  dims: document.getElementById('dims'),
  status: document.getElementById('status'),
}

function setStatus(text) {
  els.status.textContent = text || ''
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

// Ask the content script on the active tab for whatever it last extracted.
async function fetchMap() {
  const tab = await activeTab()
  if (!tab || !/^https:\/\/www\.linkedin\.com\/games\//.test(tab.url ?? '')) {
    setStatus('Abre un juego de Zip en LinkedIn para ver el mapa.')
    return null
  }
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_MAP' })
    return res?.map ?? null
  } catch {
    setStatus('No se pudo contactar con la página. Recárgala e inténtalo de nuevo.')
    return null
  }
}

function renderBoard(map) {
  const { rows, cols, grid } = map
  els.dims.textContent = `${rows}×${cols}`
  els.board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
  els.board.innerHTML = ''

  const WALL = '2px solid #f5c518'
  const LINE = '0.5px solid #2a343d'

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c]
      const div = document.createElement('div')
      div.className = 'board__cell'
      div.textContent = cell.value ?? ''
      div.style.borderTop = cell.walls.top ? WALL : LINE
      div.style.borderRight = cell.walls.right ? WALL : LINE
      div.style.borderBottom = cell.walls.bottom ? WALL : LINE
      div.style.borderLeft = cell.walls.left ? WALL : LINE
      els.board.appendChild(div)
    }
  }
}

async function load() {
  const settings = await Settings.get()
  els.completeMap.checked = settings.completeMap

  const map = await fetchMap()
  if (map) {
    renderBoard(map)
    setStatus('')
  }
}

els.completeMap.addEventListener('change', () => {
  Settings.set({ completeMap: els.completeMap.checked })
})

els.go.addEventListener('click', () => {
  chrome.tabs.create({ url: ZIP_URL })
})

els.solve.addEventListener('click', async () => {
  const tab = await activeTab()
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'SOLVE_NOW' })
    if (res?.ok) setStatus(`Resuelto: ${res.cells} celdas${res.completeMap ? '' : ' (sin completar)'}.`)
    else setStatus(res?.error === 'no-solution' ? 'Sin solución (¿muros mal cargados?).' : 'No hay mapa cargado.')
  } catch {
    setStatus('No se pudo contactar con la página.')
  }
})

load()
