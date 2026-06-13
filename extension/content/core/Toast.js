const Toast = {
  show(message, { durationMs = 4000 } = {}) {
    document.getElementById('hackthelink-toast')?.remove()

    const toast = document.createElement('div')
    toast.id = 'hackthelink-toast'
    toast.innerHTML = `
      <span class="hackthelink-toast__text">${message}</span>
      <button class="hackthelink-toast__close" type="button" aria-label="Cerrar">✕</button>
    `

    toast.querySelector('.hackthelink-toast__close').addEventListener('click', () => toast.remove())
    document.body.appendChild(toast)

    // next frame, so the enter transition actually fires
    requestAnimationFrame(() => toast.classList.add('hackthelink-toast--visible'))

    if (durationMs > 0) {
      setTimeout(() => {
        toast.classList.remove('hackthelink-toast--visible')
        setTimeout(() => toast.remove(), 250)
      }, durationMs)
    }
  },
}
