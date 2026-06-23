// LinkedIn server-renders each game's puzzle into the page as RSC / "big pipe"
// data held in <code>/<script> nodes. Reading those (instead of fetching the
// whole page again over the network) is the fast path for extraction.
//
// We scan ONLY those nodes, not document.documentElement.outerHTML: the hydrated
// DOM is huge and the puzzle key also appears in unrelated rendered content, so a
// full-document scan is pathologically slow (seconds) and can pick the wrong
// occurrence. Callers parse the puzzle out of this text and fall back to a fetch
// when it isn't present (e.g. once hydration has consumed/removed the data).
function domPayload() {
  let out = ''
  for (const node of document.querySelectorAll('code, script')) {
    const text = node.textContent
    if (text) out += text + '\n'
  }
  return out
}
