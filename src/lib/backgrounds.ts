// Fork: gradients and patterns for the board background, in the palette's own colours.
//
// Gradients 1-3 are each palette's hand-made ones (--sb-gradient-N in palettes.css). Gradients
// 4-9 are compositions of soft glows mixed from the palette's accent tokens into its canvas, so
// they suit every theme. Patterns are black SVG tiles used as a CSS mask over a faint wash of
// the text colour, so they too take the palette's colours. Both can be saved as a PNG wallpaper:
// the same definitions are drawn into an SVG at screen size and rasterised.
//
// Pure apart from wallpaperPng (DOM): tests/unit.test.ts checks every gradient keeps text AA.

export const GRADIENT_COUNT = 9

/** Palette tokens a glow can take its colour from. */
export type GlowToken = 'accent' | 'brand-to' | 'accent-mark' | `tint-${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}-fg`

export interface Glow {
  /** Ellipse radii and centre, in % of the screen, as in radial-gradient(W% H% at X% Y%). */
  w: number
  h: number
  x: number
  y: number
  token: GlowToken
  /** Share of the token mixed into the canvas at the centre, 0-1. */
  amount: number
  /** Where the glow has faded out, in % of its radius. */
  fade: number
}

export interface GradientInfo {
  id: number
  name: string
  /** Absent for 1-3, which come straight from the palette. */
  glows?: Glow[]
}

export const GRADIENTS: readonly GradientInfo[] = [
  { id: 1, name: 'Glow' },
  { id: 2, name: 'Horizon' },
  { id: 3, name: 'Bloom' },
  {
    id: 4,
    name: 'Mesh',
    glows: [
      { w: 70, h: 70, x: 0, y: 0, token: 'accent', amount: 0.2, fade: 70 },
      { w: 60, h: 70, x: 100, y: 15, token: 'brand-to', amount: 0.18, fade: 70 },
      { w: 70, h: 60, x: 30, y: 100, token: 'accent-mark', amount: 0.14, fade: 70 },
    ],
  },
  {
    id: 5,
    name: 'Sunset',
    glows: [
      { w: 140, h: 60, x: 50, y: 100, token: 'accent', amount: 0.22, fade: 72 },
      { w: 90, h: 50, x: 50, y: 100, token: 'accent-mark', amount: 0.14, fade: 70 },
    ],
  },
  {
    id: 6,
    name: 'Aurora',
    glows: [
      { w: 120, h: 45, x: 30, y: 0, token: 'tint-3-fg', amount: 0.18, fade: 70 },
      { w: 110, h: 40, x: 75, y: 8, token: 'tint-5-fg', amount: 0.16, fade: 70 },
      { w: 80, h: 30, x: 50, y: 0, token: 'brand-to', amount: 0.12, fade: 70 },
    ],
  },
  {
    id: 7,
    name: 'Spotlight',
    glows: [{ w: 75, h: 85, x: 50, y: -10, token: 'accent', amount: 0.2, fade: 74 }],
  },
  {
    id: 8,
    name: 'Twilight',
    glows: [
      { w: 110, h: 90, x: 100, y: 100, token: 'tint-5-fg', amount: 0.2, fade: 70 },
      { w: 80, h: 80, x: 0, y: 100, token: 'tint-4-fg', amount: 0.16, fade: 70 },
      { w: 60, h: 50, x: 0, y: 0, token: 'brand-to', amount: 0.1, fade: 70 },
    ],
  },
  {
    id: 9,
    name: 'Prism',
    glows: [
      { w: 55, h: 55, x: 15, y: 20, token: 'tint-6-fg', amount: 0.16, fade: 70 },
      { w: 55, h: 55, x: 85, y: 25, token: 'tint-4-fg', amount: 0.16, fade: 70 },
      { w: 55, h: 55, x: 50, y: 95, token: 'tint-2-fg', amount: 0.16, fade: 70 },
    ],
  },
]

/** The CSS background for a gradient choice. Every colour is a var(), so it follows the palette. */
export function gradientCss(id: number): string {
  const g = GRADIENTS.find((x) => x.id === id)
  if (!g?.glows) return `var(--sb-gradient-${g ? id : 1})`
  const layers = g.glows.map(
    (l) =>
      // --sb-glow (glow.generated.css) scales every glow down where a palette's text needs it.
      `radial-gradient(${l.w}% ${l.h}% at ${l.x}% ${l.y}%, color-mix(in srgb, var(--sb-${l.token}) calc(var(--sb-glow, 1) * ${Math.round(l.amount * 100)}%), var(--sb-canvas)) 0%, transparent ${l.fade}%)`,
  )
  return [...layers, 'var(--sb-canvas)'].join(', ')
}

// ---------- Patterns ----------

export type PatternId =
  | 'none'
  | 'dots'
  | 'grid'
  | 'graph'
  | 'diagonal'
  | 'crosshatch'
  | 'waves'
  | 'zigzag'
  | 'hexagons'
  | 'triangles'
  | 'plus'
  | 'rings'
  | 'topography'
  | 'isometric'
  | 'circuit'
  | 'sparkles'
  | 'bubbles'
  | 'pinstripes'
  | 'checker'
  | 'y2kstars'
  | 'hearts'
  | 'butterflies'
  | 'orbs'

export interface PatternInfo {
  id: PatternId
  name: string
  /** Tile size in CSS px. */
  size: number
  /** Tile body in a size x size viewBox, drawn in black. */
  svg: string
}

const S = (w = 1.5) => `fill="none" stroke="#000" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`

// Fork: Y2K shapes. Numbers are rounded to two places so the tiles stay short.
const n2 = (v: number) => String(Math.round(v * 100) / 100)

/** A four-point sparkle with curved, pinched sides (the Y2K star), centred on x, y. */
function star(x: number, y: number, r: number, pinch = 0.14): string {
  const c = r * pinch
  const p = (a: number, b: number) => `${n2(a)} ${n2(b)}`
  return `M${p(x, y - r)}Q${p(x + c, y - c)} ${p(x + r, y)}Q${p(x + c, y + c)} ${p(x, y + r)}Q${p(x - c, y + c)} ${p(x - r, y)}Q${p(x - c, y - c)} ${p(x, y - r)}Z`
}

/** A glossy bubble: the ring, a highlight arc at its upper left and a glint. */
function orb(cx: number, cy: number, r: number): string {
  const rr = r * 0.66
  const at = (deg: number) => {
    const t = (deg * Math.PI) / 180
    return `${n2(cx + rr * Math.cos(t))} ${n2(cy + rr * Math.sin(t))}`
  }
  const w = Math.max(1, r / 14)
  return (
    `<circle ${S(+n2(1.1 * w))} cx="${cx}" cy="${cy}" r="${r}"/>` +
    `<path ${S(+n2(2.2 * w))} d="M${at(198)}A${n2(rr)} ${n2(rr)} 0 0 1 ${at(252)}"/>` +
    `<circle cx="${n2(cx + r * 0.42)}" cy="${n2(cy + r * 0.4)}" r="${n2(w * 1.1)}"/>`
  )
}

// A heart in a 20 x 18 box and a butterfly in a 24 x 20 box, placed with transforms.
const HEART = 'M10 18C10 18 0 11.5 0 5.5C0 2.4 2.4 0 5.4 0C7.4 0 9.1 1.1 10 2.7C10.9 1.1 12.6 0 14.6 0C17.6 0 20 2.4 20 5.5C20 11.5 10 18 10 18Z'
const BUTTERFLY =
  `<path d="M11 9C8 2 2 0 1 3C0 6 4 9 11 10ZM13 9C16 2 22 0 23 3C24 6 20 9 13 10ZM11 11C6 11 3 14 4.5 16.5C6 19 10 15 11.5 12ZM13 11C18 11 21 14 19.5 16.5C18 19 14 15 12.5 12ZM12 7.5C12.8 7.5 13 9 13 12C13 15.5 12.6 17 12 17C11.4 17 11 15.5 11 12C11 9 11.2 7.5 12 7.5Z"/>` +
  `<path ${S(0.8)} d="M11.6 8C11 5.5 10 4.5 8.8 4M12.4 8C13 5.5 14 4.5 15.2 4"/>`

export const PATTERNS: readonly PatternInfo[] = [
  { id: 'dots', name: 'Dots', size: 22, svg: '<circle cx="11" cy="11" r="1.6"/>' },
  { id: 'grid', name: 'Grid', size: 32, svg: `<path ${S(1)} d="M32 0H0V32"/>` },
  {
    id: 'graph',
    name: 'Graph paper',
    size: 80,
    svg: `<path ${S(0.6)} d="M16 0V80M32 0V80M48 0V80M64 0V80M0 16H80M0 32H80M0 48H80M0 64H80"/><path ${S(1.4)} d="M80 0H0V80"/>`,
  },
  { id: 'diagonal', name: 'Diagonal', size: 16, svg: `<path ${S(1.2)} d="M-4 4L4 -4M0 16L16 0M12 20L20 12"/>` },
  { id: 'crosshatch', name: 'Crosshatch', size: 18, svg: `<path ${S(0.9)} d="M0 0L18 18M18 0L0 18"/>` },
  { id: 'waves', name: 'Waves', size: 48, svg: `<path ${S(1.4)} d="M0 12C8 4 16 4 24 12S40 20 48 12M0 36C8 28 16 28 24 36S40 44 48 36"/>` },
  { id: 'zigzag', name: 'Zigzag', size: 28, svg: `<path ${S(1.4)} d="M0 10L7 3L14 10L21 3L28 10M0 24L7 17L14 24L21 17L28 24"/>` },
  { id: 'hexagons', name: 'Hexagons', size: 42, svg: `<path ${S(1.2)} d="M21 1L38 11V31L21 41L4 31V11Z"/>` },
  { id: 'triangles', name: 'Triangles', size: 36, svg: `<path ${S(1.1)} d="M0 36L18 4L36 36M18 4H-18M54 4H18"/>` },
  { id: 'plus', name: 'Plus', size: 28, svg: `<path ${S(1.6)} d="M14 9V19M9 14H19"/>` },
  { id: 'rings', name: 'Rings', size: 40, svg: `<circle ${S(1.1)} cx="20" cy="20" r="14"/><circle ${S(1.1)} cx="20" cy="20" r="6"/>` },
  {
    id: 'topography',
    name: 'Topography',
    size: 120,
    svg: `<path ${S(1)} d="M-10 30C20 10 40 40 70 25S110 5 130 20M-10 60C25 45 45 75 75 58S115 40 130 55M-10 92C20 80 50 110 80 92S115 78 130 90M40 120C45 108 60 104 66 112S70 122 68 128"/>`,
  },
  { id: 'isometric', name: 'Cubes', size: 48, svg: `<path ${S(1)} d="M24 -4L48 10V38L24 52L0 38V10Z M24 -4V24 M0 10L24 24L48 10"/>` },
  {
    id: 'circuit',
    name: 'Circuit',
    size: 64,
    svg: `<path ${S(1.2)} d="M0 16H20L28 24V40M64 16H44L36 8V0M32 64V48L40 40H64M0 48H12"/><circle cx="28" cy="42" r="2.5"/><circle cx="36" cy="6" r="2.5"/><circle cx="14" cy="48" r="2.5"/>`,
  },
  {
    id: 'sparkles',
    name: 'Sparkles',
    size: 72,
    svg: '<path d="M18 8L20 16L28 18L20 20L18 28L16 20L8 18L16 16Z"/><path d="M54 46L55.2 50.8L60 52L55.2 53.2L54 58L52.8 53.2L48 52L52.8 50.8Z"/><circle cx="56" cy="16" r="1.4"/><circle cx="20" cy="56" r="1.4"/>',
  },
  {
    id: 'bubbles',
    name: 'Bubbles',
    size: 90,
    svg: `<circle ${S(1.2)} cx="22" cy="24" r="14"/><circle ${S(1.2)} cx="66" cy="62" r="9"/><circle ${S(1.2)} cx="70" cy="18" r="5"/><circle ${S(1.2)} cx="24" cy="74" r="6"/>`,
  },
  // Fork: Y2K. Aqua's window pinstripes, a soft checker, sparkle stars, hearts, butterflies, glossy orbs.
  { id: 'pinstripes', name: 'Pinstripes', size: 4, svg: '<path d="M0 0H4V2H0Z"/>' },
  { id: 'checker', name: 'Checker', size: 40, svg: '<path d="M0 0H20V20H0ZM20 20H40V40H20Z"/>' },
  {
    id: 'y2kstars',
    name: 'Y2K stars',
    size: 120,
    svg: `<path d="${star(30, 34, 15)}${star(86, 82, 10)}${star(94, 22, 5.5)}${star(28, 96, 4.5)}"/><circle cx="62" cy="58" r="1.5"/><circle cx="108" cy="108" r="1.2"/><circle cx="58" cy="10" r="1"/>`,
  },
  {
    id: 'hearts',
    name: 'Hearts',
    size: 64,
    svg: `<path transform="translate(8 9)" d="${HEART}"/><path transform="translate(42 34) rotate(14) scale(0.6)" d="${HEART}"/>`,
  },
  {
    id: 'butterflies',
    name: 'Butterflies',
    size: 84,
    svg: `<g transform="translate(8 10) scale(1.15)">${BUTTERFLY}</g><g transform="translate(50 50) rotate(-14) scale(0.8)">${BUTTERFLY}</g>`,
  },
  { id: 'orbs', name: 'Orbs', size: 120, svg: `${orb(34, 36, 20)}${orb(88, 86, 13)}${orb(96, 24, 7)}${orb(22, 96, 5)}` },
]

export const PATTERN_IDS: readonly PatternId[] = ['none', ...PATTERNS.map((p) => p.id)]

export function patternInfo(id: PatternId): PatternInfo | undefined {
  return PATTERNS.find((p) => p.id === id)
}

/** A standalone SVG tile; shapes without their own fill take `color`. */
export function patternTile(p: PatternInfo, color = '#000'): string {
  const body = color === '#000' ? p.svg : p.svg.replace(/#000/g, color).replace(/<(circle|path|ellipse|rect)(?![^>]*fill=)/g, `<$1 fill="${color}"`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.size}" height="${p.size}" viewBox="0 0 ${p.size} ${p.size}">${body}</svg>`
}

export function patternMaskUrl(p: PatternInfo): string {
  return `url("data:image/svg+xml,${encodeURIComponent(patternTile(p))}")`
}

// ---------- Wallpaper export ----------

function hex(v: string): string | null {
  const s = v.trim()
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(s)) return `#${[...s.slice(1)].map((c) => c + c).join('')}`.toLowerCase()
  return null
}

/** color-mix(in srgb, a t, b) for #rrggbb. */
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const A = p(a)
  const B = p(b)
  return `#${A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, '0')).join('')}`
}

export interface ResolvedGlow {
  w: number
  h: number
  x: number
  y: number
  fade: number
  color: string
}

/** The glows behind a gradient choice, with real colours, for drawing outside CSS (and tests). */
export function resolvedGlows(id: number, tokens: (name: string) => string, glow = 1): { canvas: string; glows: ResolvedGlow[] } {
  const canvas = hex(tokens('canvas')) ?? '#ffffff'
  const g = GRADIENTS.find((x) => x.id === id)
  if (g?.glows) {
    return {
      canvas,
      glows: g.glows.map((l) => ({ w: l.w, h: l.h, x: l.x, y: l.y, fade: l.fade, color: mixHex(hex(tokens(l.token)) ?? canvas, canvas, l.amount * glow) })),
    }
  }
  // Palette gradients are written as radial-gradient(W% H% at X% Y%, #rrggbb 0%, transparent F%), ..., #canvas
  const css = tokens(`gradient-${g ? id : 1}`)
  const glows = [...css.matchAll(/radial-gradient\(\s*([\d.]+)% ([\d.]+)% at ([\d.-]+)% ([\d.-]+)%,\s*(#[0-9a-f]{6}) 0%,\s*transparent ([\d.]+)%\)/gi)].map((m) => ({
    w: +m[1],
    h: +m[2],
    x: +m[3],
    y: +m[4],
    color: m[5].toLowerCase(),
    fade: +m[6],
  }))
  return { canvas, glows }
}

export interface WallpaperSpec {
  width: number
  height: number
  canvas: string
  glows: ResolvedGlow[]
  pattern: PatternInfo | null
  patternColor: string
  /** Pattern opacity, 0-1. */
  patternAlpha: number
  /** Pattern tile scale (the screen's pixel ratio). */
  scale: number
}

/** An SVG of the whole background, for the "Save as wallpaper" button. */
export function wallpaperSvg(s: WallpaperSpec): string {
  const { width: W, height: H } = s
  const defs: string[] = []
  const layers: string[] = [`<rect width="${W}" height="${H}" fill="${s.canvas}"/>`]
  s.glows.forEach((g, i) => {
    const cx = (g.x / 100) * W
    const cy = (g.y / 100) * H
    const rx = (g.w / 100) * W
    const ry = (g.h / 100) * H
    defs.push(
      `<radialGradient id="g${i}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rx}" gradientTransform="translate(${cx} ${cy}) scale(1 ${ry / rx}) translate(${-cx} ${-cy})"><stop offset="0" stop-color="${g.color}"/><stop offset="${g.fade / 100}" stop-color="${g.color}" stop-opacity="0"/></radialGradient>`,
    )
    layers.push(`<rect width="${W}" height="${H}" fill="url(#g${i})"/>`)
  })
  if (s.pattern) {
    const size = s.pattern.size * s.scale
    defs.push(
      `<pattern id="p" patternUnits="userSpaceOnUse" width="${size}" height="${size}"><g transform="scale(${s.scale})" opacity="${s.patternAlpha}">${patternTile(s.pattern, s.patternColor).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></pattern>`,
    )
    layers.push(`<rect width="${W}" height="${H}" fill="url(#p)"/>`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join('')}</defs>${layers.join('')}</svg>`
}

/** Rasterises a wallpaper SVG to PNG in the page. */
export async function wallpaperPng(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the wallpaper'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}
