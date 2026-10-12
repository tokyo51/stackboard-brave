import { parseAppearance, type Appearance, type AppearancePatch } from './appearance'

// Fork: a look as a file (Settings > Look > Share your theme). Everything visual travels:
// palette, mode, style, corners, font, density, motion, the Y2K options and the gradient choice. A wallpaper
// picture stays on its device, so an imported "image" background falls back to a gradient.

export interface ThemeFile {
  stackboardTheme: 1
  exportedAt: string
  appearance: Appearance
}

export function themeFile(a: Appearance, now = new Date()): ThemeFile {
  return { stackboardTheme: 1, exportedAt: now.toISOString(), appearance: { ...a, bg: { ...a.bg, imageRev: 0 } } }
}

/** The settings a theme file asks for, or null when it isn't one. */
export function readThemeFile(raw: unknown): AppearancePatch | null {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  if (!o || o.stackboardTheme !== 1 || !o.appearance) return null
  const a = parseAppearance(o.appearance)
  const { imageRev: _drop, ...bg } = a.bg
  return { ...a, bg: { ...bg, kind: bg.kind === 'image' ? 'gradient' : bg.kind } }
}
