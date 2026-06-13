import './SpeedControl.css'
import { SPS_DEFAULT_INDEX, SPS_PAUSED, SPS_STOPS, SPS_UNLIMITED } from '../solver/SolverSpeed'

export interface SpeedControl {
  element: HTMLElement
  getSps: () => number
}

export interface SpeedControlOptions {
  index?: number
}

// accent palette walked bottom→top: red (paused) → green → amber (unlimited).
// the colour is interpolated from the slider fraction so it shifts progressively
// as the user drags, instead of snapping between fixed states.
const STOP_COLORS: [number, number, number][] = [
  [248, 113, 113], // #f87171
  [52, 211, 153], // #34d399
  [251, 191, 36], // #fbbf24
]

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

function accentForFraction(t: number): string {
  if (t <= 0.5) return mix(STOP_COLORS[0], STOP_COLORS[1], t / 0.5)
  return mix(STOP_COLORS[1], STOP_COLORS[2], (t - 0.5) / 0.5)
}

function formatSps(sps: number): string {
  if (sps === SPS_PAUSED) return 'Parado'
  if (sps === SPS_UNLIMITED) return 'Sin límite'
  const value = sps < 1 ? sps.toString() : Math.round(sps).toString()
  return `${value} pasos/s`
}

export function createSpeedControl(options: SpeedControlOptions = {}): SpeedControl {
  const lastIndex = SPS_STOPS.length - 1
  let index = clampIndex(options.index ?? SPS_DEFAULT_INDEX)

  const wrapper = document.createElement('div')
  wrapper.className = 'speed-control'

  const header = document.createElement('div')
  header.className = 'speed-control__header'

  const title = document.createElement('span')
  title.className = 'speed-control__title'
  title.textContent = 'Velocidad'

  const readout = document.createElement('span')
  readout.className = 'speed-control__readout'

  header.append(title, readout)

  const track = document.createElement('div')
  track.className = 'speed-control__track'
  track.tabIndex = 0
  track.setAttribute('role', 'slider')
  track.setAttribute('aria-label', 'Velocidad del resolutor')
  track.setAttribute('aria-valuemin', '0')
  track.setAttribute('aria-valuemax', String(lastIndex))

  const fill = document.createElement('div')
  fill.className = 'speed-control__fill'

  const thumb = document.createElement('div')
  thumb.className = 'speed-control__thumb'

  track.append(fill, thumb)
  wrapper.append(header, track)

  function clampIndex(i: number): number {
    return Math.min(SPS_STOPS.length - 1, Math.max(0, i))
  }

  function render() {
    const fraction = index / lastIndex
    const accent = accentForFraction(fraction)
    const percent = `${fraction * 100}%`

    fill.style.height = percent
    thumb.style.bottom = percent
    wrapper.style.setProperty('--accent', accent)

    const sps = SPS_STOPS[index]
    readout.textContent = formatSps(sps)
    wrapper.classList.toggle('speed-control--paused', sps === SPS_PAUSED)
    wrapper.classList.toggle('speed-control--unlimited', sps === SPS_UNLIMITED)

    track.setAttribute('aria-valuenow', String(index))
    track.setAttribute('aria-valuetext', formatSps(sps))
  }

  function setIndex(next: number) {
    const clamped = clampIndex(next)
    if (clamped === index) return
    index = clamped
    render()
  }

  function indexFromPointer(clientY: number) {
    const rect = track.getBoundingClientRect()
    const fraction = 1 - (clientY - rect.top) / rect.height
    setIndex(Math.round(Math.min(1, Math.max(0, fraction)) * lastIndex))
  }

  let dragging = false
  track.addEventListener('pointerdown', (event) => {
    dragging = true
    track.setPointerCapture(event.pointerId)
    indexFromPointer(event.clientY)
    event.preventDefault()
  })
  track.addEventListener('pointermove', (event) => {
    if (dragging) indexFromPointer(event.clientY)
  })
  const endDrag = () => {
    dragging = false
  }
  track.addEventListener('pointerup', endDrag)
  track.addEventListener('pointercancel', endDrag)

  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      setIndex(index + 1)
      event.preventDefault()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      setIndex(index - 1)
      event.preventDefault()
    } else if (event.key === 'Home') {
      setIndex(0)
      event.preventDefault()
    } else if (event.key === 'End') {
      setIndex(lastIndex)
      event.preventDefault()
    }
  })

  render()

  return {
    element: wrapper,
    getSps: () => SPS_STOPS[index],
  }
}
