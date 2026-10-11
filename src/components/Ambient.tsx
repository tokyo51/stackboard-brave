import { useMemo, type CSSProperties } from 'react'
import { useAppearance } from '../store/useAppearance'

/** A fixed scatter in [0, 1), so particles don't jump around between renders. */
const scatter = (i: number, n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
const fix = (n: number, digits = 2) => n.toFixed(digits)

// Stars: mostly the text colour, a few in the accents; every ninth is bright with a glow.
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => scatter(i + 101, n)
  const bright = i % 9 === 0
  const tone = r(6) < 0.72 ? 'fg' : r(6) < 0.86 ? 'accent-mark' : 'brand-to'
  return {
    bright,
    style: {
      '--x': `${fix(r(1) * 100)}vw`,
      '--y': `${fix(r(2) * 100)}vh`,
      '--s': `${fix(bright ? 4.5 + r(3) * 1.5 : 2.4 + r(3) * 1.8)}px`,
      '--d': `${fix(2.4 + r(4) * 4.8)}s`,
      '--delay': `${fix(-r(5) * 8)}s`,
      '--c': `var(--sb-${tone})`,
    } as CSSProperties,
  }
})

// Fireflies: x and y swing on different periods, so each one traces a slow Lissajous loop.
const FIREFLIES = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => scatter(i + 307, n)
  return {
    '--x': `${fix(4 + r(1) * 92)}vw`,
    '--y': `${fix(18 + r(2) * 76)}vh`,
    '--s': `${fix(2.5 + r(3) * 2.5)}px`,
    '--ax': `${fix(2 + r(4) * 5)}vw`,
    '--ay': `${fix(2 + r(5) * 6)}vh`,
    '--tx': `${fix(13 + r(6) * 14)}s`,
    '--ty': `${fix(9 + r(7) * 12)}s`,
    '--tg': `${fix(4.5 + r(8) * 4.5)}s`,
    '--dx': `${fix(-r(9) * 27)}s`,
    '--dy': `${fix(-r(10) * 21)}s`,
    '--dg': `${fix(-r(11) * 9)}s`,
  } as CSSProperties
})

/**
 * One tileable wave in a 2880 x 100 box: two identical halves, so sliding it left by half its
 * width loops without a seam. Quadratic arcs joined with T stay smooth at every crest.
 */
function wavePath(periods: number, amp: number, base: number): string {
  const half = 720 / periods
  let d = `M0 ${base}Q${half / 2} ${base - 2 * amp} ${half} ${base}`
  for (let x = 2 * half; x <= 2880; x += half) d += `T${x} ${base}`
  return `${d}V100H0Z`
}

const WAVES = [wavePath(2, 16, 44), wavePath(3, 12, 50), wavePath(2, 9, 58)]

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
        const r = (n: number) => scatter(i, n)
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
      {kind === 'stars' && (
        <>
          {STARS.map((s, i) => (
            <span key={i} className="ambient-star" data-bright={s.bright || undefined} style={s.style} />
          ))}
          <span className="ambient-shooting" />
        </>
      )}
      {kind === 'waves' &&
        WAVES.map((d, i) => (
          <svg key={i} className="ambient-wave" viewBox="0 0 2880 100" preserveAspectRatio="none">
            <path d={d} />
          </svg>
        ))}
      {kind === 'fireflies' && FIREFLIES.map((style, i) => <span key={i} className="ambient-firefly" style={style} />)}
      {kind === 'lava' && Array.from({ length: 5 }, (_, i) => <span key={i} className="ambient-lava" />)}
    </div>
  )
}
