import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useAppearance } from '../store/useAppearance'
import { useStackableStore } from '../store/useStackableStore'
import { loadBgImage } from '../lib/bgImage'
import { patternInfo, patternMaskUrl } from '../lib/backgrounds'

/**
 * The background picture (0.5.0), behind everything at z-index -1. It never holds up the board:
 * the IndexedDB read starts only once the board has rendered, and the picture is decoded before
 * it shows, then fades in. Dim lays the palette's canvas colour over it, so cards and headings
 * stay readable on a busy photo.
 *
 * Fork: without a picture, this is where the pattern layer lives instead (solid or gradient bg).
 */
export function Backdrop() {
  const kind = useAppearance((s) => s.appearance.bg.kind)
  const rev = useAppearance((s) => s.appearance.bg.imageRev)
  const dim = useAppearance((s) => s.appearance.bg.dim)
  const blur = useAppearance((s) => s.appearance.bg.blur)
  const boardReady = useStackableStore((s) => !!s.tree)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (kind !== 'image' || !boardReady) return
    let live = true
    let objectUrl: string | null = null
    // Effects run after the board's first paint; the timeout keeps the read clear of that frame.
    const timer = setTimeout(async () => {
      try {
        const record = await loadBgImage()
        if (!record || !live) return
        objectUrl = URL.createObjectURL(record.blob)
        const img = new Image()
        img.src = objectUrl
        await img.decode()
        if (!live) return
        performance.mark('sb:backdrop')
        setUrl(objectUrl)
      } catch {
        // No picture, or one Chrome can't decode: the palette's canvas shows instead.
      }
    }, 0)
    return () => {
      live = false
      clearTimeout(timer)
      setUrl(null)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [kind, rev, boardReady])

  if (kind !== 'image') return <PatternLayer />
  if (!url) return null

  return (
    <div aria-hidden data-backdrop className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="backdrop-image absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url("${url}")`,
          // Blur pulls transparent edges in; a slight overscale keeps them off screen.
          filter: blur ? `blur(${blur}px)` : undefined,
          transform: blur ? `scale(${1 + blur / 200})` : undefined,
        }}
      />
      <div className="absolute inset-0 bg-canvas" style={{ opacity: dim / 100 }} />
    </div>
  )
}

/**
 * Fork: the chosen pattern tile as a mask over a faint wash of the text colour (styles.css,
 * .bg-pattern). It renders before <Ambient /> in App.tsx, so with the same z-index it paints
 * between the body background and the ambient layer. Keyed by pattern so a new one fades in.
 */
function PatternLayer() {
  const id = useAppearance((s) => s.appearance.bg.pattern)
  const style = useMemo(() => {
    const p = patternInfo(id)
    if (!p) return null
    const mask = patternMaskUrl(p)
    const size = `${p.size}px ${p.size}px`
    return { maskImage: mask, WebkitMaskImage: mask, maskSize: size, WebkitMaskSize: size } as CSSProperties
  }, [id])
  if (!style) return null
  return <div key={id} aria-hidden data-pattern-layer={id} className="bg-pattern" style={style} />
}
