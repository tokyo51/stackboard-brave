import { useMemo, type CSSProperties } from 'react'
import { useAppearance } from '../store/useAppearance'

/**
 * Fork: a slow living layer behind the board (Settings > Motion > Background).
 * Pure CSS animation of transform/opacity (styles.css), painted in the palette's own accents,
 * still when motion is off or the OS asks for reduced motion.
 */
export function Ambient() {
  const kind = useAppearance((s) => s.appearance.motion.ambient)
  const bubbles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        // A fixed scatter so bubbles don't jump around between renders.
        const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
        return {
          '--x': `${Math.round(r(1) * 100)}vw`,
          '--s': `${Math.round(28 + r(2) * 90)}px`,
          '--d': `${Math.round(18 + r(3) * 22)}s`,
          '--delay': `${-Math.round(r(4) * 40)}s`,
          '--sway': `${Math.round((r(5) - 0.5) * 18)}vw`,
        } as CSSProperties
      }),
    [],
  )

  if (kind === 'none') return null
  if (kind === 'scanlines') return <div aria-hidden className="ambient-scanlines" data-ambient-layer="scanlines" />
  return (
    <div aria-hidden className="ambient" data-ambient-layer={kind}>
      {kind === 'aurora' && (
        <>
          <span className="ambient-blob" />
          <span className="ambient-blob" />
          <span className="ambient-blob" />
        </>
      )}
      {kind === 'drift' && <span className="ambient-drift" />}
      {kind === 'bubbles' && bubbles.map((style, i) => <span key={i} className="ambient-bubble" style={style} />)}
      {kind === 'grid' && (
        <span className="ambient-grid">
          <span className="ambient-sun" />
          <span className="ambient-plane" />
        </span>
      )}
    </div>
  )
}
