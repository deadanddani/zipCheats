// In-page prompt shown when you open a Zip puzzle without the auto-run param.
// A browser extension can't pop its own toolbar UI open programmatically, so
// this injected banner is how we ask "run the solver?" right on the page.
const Banner = {
  show({ onSolve }) {
    if (document.getElementById('zipcheats-banner')) return

    const banner = document.createElement('div')
    banner.id = 'zipcheats-banner'
    banner.innerHTML = `
      <span class="zipcheats-banner__label">zipCheats detectó un Zip</span>
      <button class="zipcheats-banner__solve" type="button">Resolver</button>
      <button class="zipcheats-banner__close" type="button" aria-label="Cerrar">✕</button>
    `

    banner.querySelector('.zipcheats-banner__solve').addEventListener('click', () => {
      onSolve()
      banner.remove()
    })
    banner.querySelector('.zipcheats-banner__close').addEventListener('click', () => banner.remove())

    document.body.appendChild(banner)
  },
}
