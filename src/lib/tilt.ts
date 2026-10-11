// Fork: the "Tilt" hover effect. One delegated pointer listener for the whole board instead of
// one per card; it writes the pointer position into CSS variables on the hovered card and
// styles.css turns them into a small 3D tilt and a moving shine. Does nothing unless <html>
// says data-hover="tilt".

const MAX_DEG = 6

export function installTilt(): () => void {
  let card: HTMLElement | null = null
  let frame = 0
  let last: PointerEvent | null = null

  const paint = () => {
    frame = 0
    if (!card || !last) return
    const r = card.getBoundingClientRect()
    const x = (last.clientX - r.left) / r.width
    const y = (last.clientY - r.top) / r.height
    card.style.setProperty('--tilt-x', `${((x - 0.5) * 2 * MAX_DEG).toFixed(2)}deg`)
    card.style.setProperty('--tilt-y', `${((0.5 - y) * 2 * MAX_DEG).toFixed(2)}deg`)
    card.style.setProperty('--shine-x', `${(x * 100).toFixed(1)}%`)
    card.style.setProperty('--shine-y', `${(y * 100).toFixed(1)}%`)
  }

  const onMove = (e: PointerEvent) => {
    if (document.documentElement.getAttribute('data-hover') !== 'tilt') return
    const next = (e.target as Element | null)?.closest?.('[data-surface="card"]') as HTMLElement | null
    if (next !== card) {
      card?.style.removeProperty('--tilt-x')
      card?.style.removeProperty('--tilt-y')
      card = next
    }
    last = e
    if (card && !frame) frame = requestAnimationFrame(paint)
  }

  document.addEventListener('pointermove', onMove, { passive: true })
  return () => {
    document.removeEventListener('pointermove', onMove)
    cancelAnimationFrame(frame)
  }
}
