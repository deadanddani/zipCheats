// Small floating popup shown after a solve completes, reporting how long the
// solver took to find the solution. Auto-dismisses after a few seconds.
const Toast = {
  show(message, { durationMs = 4000 } = {}) {
    document.getElementById('zipcheats-toast')?.remove()

    const toast = document.createElement('div')
    toast.id = 'zipcheats-toast'
    toast.innerHTML = `
      <span class="zipcheats-toast__text">${message}</span>
      <button class="zipcheats-toast__close" type="button" aria-label="Cerrar">✕</button>
    `

    toast.querySelector('.zipcheats-toast__close').addEventListener('click', () => toast.remove())
    document.body.appendChild(toast)

    // trigger the enter transition on the next frame
    requestAnimationFrame(() => toast.classList.add('zipcheats-toast--visible'))

    if (durationMs > 0) {
      setTimeout(() => {
        toast.classList.remove('zipcheats-toast--visible')
        setTimeout(() => toast.remove(), 250)
      }, durationMs)
    }
  },
}
