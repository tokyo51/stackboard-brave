import type { Appearance } from '../../lib/appearance'
import { GRADIENTS, patternInfo, resolvedGlows, wallpaperPng, wallpaperSvg } from '../../lib/backgrounds'

// Fork: Settings > Look > Background > Save as wallpaper. Draws the background on screen (canvas,
// glows, pattern) at the screen's full pixel size, from the live palette tokens on <html>.

/** The screen in device pixels, which is the wallpaper's size. */
export function wallpaperSize(): { width: number; height: number; scale: number } {
  const scale = window.devicePixelRatio || 1
  return { width: Math.round(screen.width * scale), height: Math.round(screen.height * scale), scale }
}

export async function saveWallpaper(a: Appearance, format: 'png' | 'svg'): Promise<string> {
  const css = getComputedStyle(document.documentElement)
  const tok = (name: string) => css.getPropertyValue(`--sb-${name}`).trim()
  const glowRaw = parseFloat(css.getPropertyValue('--sb-glow'))
  const glow = Number.isFinite(glowRaw) ? glowRaw : 1
  const { width, height, scale } = wallpaperSize()
  const gradient = a.bg.kind === 'gradient'
  const { canvas, glows } = resolvedGlows(a.bg.gradient, tok, glow)
  const pattern = a.bg.pattern === 'none' ? null : (patternInfo(a.bg.pattern) ?? null)
  const svg = wallpaperSvg({
    width,
    height,
    canvas,
    glows: gradient ? glows : [],
    pattern,
    patternColor: tok('fg'),
    // The board shows the pattern as this share of the text colour (--sb-pattern-alpha).
    patternAlpha: Math.round(a.bg.patternStrength * 0.22) / 100,
    scale,
  })

  const look = gradient ? (GRADIENTS.find((g) => g.id === a.bg.gradient)?.name ?? 'gradient').toLowerCase() : 'solid'
  const name = ['stackboard', a.palette, look, pattern?.id].filter(Boolean).join('-')
  const blob = format === 'svg' ? new Blob([svg], { type: 'image/svg+xml' }) : await wallpaperPng(svg, width, height)
  const filename = `${name}.${format}`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
  return filename
}
