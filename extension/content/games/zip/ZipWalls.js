const ZipWalls = {
  extract(cellEl) {
    const walls = { top: false, right: false, bottom: false, left: false }

    for (const b of cellEl.querySelectorAll('.eeacacaa')) {
      const after = getComputedStyle(b, '::after')
      const bt = parseFloat(after.borderTopWidth) || 0
      const br = parseFloat(after.borderRightWidth) || 0
      const bb = parseFloat(after.borderBottomWidth) || 0
      const bl = parseFloat(after.borderLeftWidth) || 0

      if (br > 2) walls.right = true
      if (bl > 2) walls.left  = true
      if (bt > 2 || bb > 2) {
        if (b.classList.contains('_39e44d65')) walls.bottom = true
        else walls.top = true
      }
    }

    return walls
  },
}
