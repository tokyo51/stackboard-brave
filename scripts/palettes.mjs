// Generates the extra palettes (fork): node scripts/palettes.mjs
//
// The four original palettes in src/styles/palettes.css are hand-tuned. The extra ones are many,
// so each variant is described by its official colours below and every --sb-* token is derived
// from them: surfaces, text ramp, accent, danger, toast, tints and gradients. Any token that
// misses the contrast tests/unit.test.ts asks for is nudged toward the palette's strongest text
// colour until it clears, so the official hues stay where they already pass.
//
// Output: the block between the @generated markers in src/styles/palettes.css, and
// src/lib/palettes.generated.ts (names and groups for Settings).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---------- colour maths (same definitions as tests/contrast.ts) ----------

const hex2 = (h) => {
  const n = parseInt(h.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
const ch = (v) => {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const lum = (h) => {
  const [r, g, b] = hex2(h)
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}
const contrast = (a, b) => {
  const x = lum(a)
  const y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
/** color-mix(in srgb, a t, b) */
const mix = (a, b, t) => {
  const A = hex2(a)
  const B = hex2(b)
  return toHex(A.map((v, i) => v * t + B[i] * (1 - t)))
}
/** The colour, moved toward `toward` until it clears `ratio` on every background. */
function ensure(c, bgs, ratio, toward) {
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const x = t ? mix(toward, c, t) : c
    if (bgs.every((b) => contrast(x, b) >= ratio)) return x
  }
  return toward
}
const WHITE = '#ffffff'
const BLACK = '#000000'

// ---------- the palettes ----------
// hues: orange, yellow, green, teal, blue, purple, pink, neutral (the 8 monogram tints).
// grads: three pairs of hues for the background gradients.

const P = [
  // Dev favourites
  { id: 'dracula', name: 'Dracula', group: 'Dev', light: 'Alucard', dark: 'Dracula',
    v: {
      dark: { canvas: '#282a36', panel: '#21222c', card: '#343746', raised: '#3b3e50', strong: '#fdfdf8', fg: '#f8f8f2', muted: '#a9b1d6', accent: '#bd93f9', accent2: '#ff79c6', mark: '#ff79c6', red: '#ff5555',
        hues: ['#ffb86c', '#f1fa8c', '#50fa7b', '#8be9fd', '#6272a4', '#bd93f9', '#ff79c6', '#f8f8f2'], grads: [['#bd93f9', '#ff79c6'], ['#8be9fd', '#bd93f9'], ['#50fa7b', '#ffb86c']] },
      light: { canvas: '#fffbeb', panel: '#f6f2e1', card: '#fffdf6', strong: '#1f1f1f', fg: '#2b2b2b', muted: '#6c664b', accent: '#644ac9', accent2: '#a3144d', mark: '#a3144d', red: '#cb3a2a',
        hues: ['#a34d14', '#846e15', '#14710a', '#036a96', '#3d63b8', '#644ac9', '#a3144d', '#6c664b'], grads: [['#644ac9', '#a3144d'], ['#036a96', '#644ac9'], ['#14710a', '#a34d14']] },
    } },
  { id: 'tokyonight', name: 'Tokyo Night', group: 'Dev', light: 'Tokyo Night Day', dark: 'Tokyo Night',
    v: {
      dark: { canvas: '#1a1b26', panel: '#16161e', card: '#24283b', raised: '#292e42', strong: '#c8d3f5', fg: '#c0caf5', muted: '#9aa5ce', accent: '#7aa2f7', accent2: '#bb9af7', mark: '#ff9e64', red: '#f7768e',
        hues: ['#ff9e64', '#e0af68', '#9ece6a', '#73daca', '#7aa2f7', '#bb9af7', '#f7768e', '#a9b1d6'], grads: [['#7aa2f7', '#bb9af7'], ['#73daca', '#7aa2f7'], ['#bb9af7', '#ff9e64']] },
      light: { canvas: '#e1e2e7', panel: '#d5d6db', card: '#eef0f6', strong: '#273c7d', fg: '#3760bf', muted: '#6172b0', accent: '#2e7de9', accent2: '#9854f1', mark: '#b15c00', red: '#f52a65',
        hues: ['#b15c00', '#8c6c3e', '#587539', '#118c74', '#2e7de9', '#9854f1', '#f52a65', '#6172b0'], grads: [['#2e7de9', '#9854f1'], ['#118c74', '#2e7de9'], ['#9854f1', '#b15c00']] },
    } },
  { id: 'rosepine', name: 'Rosé Pine', group: 'Dev', light: 'Rosé Pine Dawn', dark: 'Rosé Pine',
    v: {
      dark: { canvas: '#191724', panel: '#1f1d2e', card: '#26233a', raised: '#2a273f', strong: '#e0def4', fg: '#e0def4', muted: '#908caa', accent: '#c4a7e7', accent2: '#ebbcba', mark: '#f6c177', red: '#eb6f92',
        hues: ['#ebbcba', '#f6c177', '#31748f', '#9ccfd8', '#3e8fb0', '#c4a7e7', '#eb6f92', '#908caa'], grads: [['#c4a7e7', '#eb6f92'], ['#9ccfd8', '#31748f'], ['#f6c177', '#ebbcba']] },
      light: { canvas: '#faf4ed', panel: '#f2e9e1', card: '#fffaf3', strong: '#464261', fg: '#575279', muted: '#797593', accent: '#907aa9', accent2: '#d7827e', mark: '#ea9d34', red: '#b4637a',
        hues: ['#d7827e', '#ea9d34', '#286983', '#56949f', '#3e8fb0', '#907aa9', '#b4637a', '#9893a5'], grads: [['#907aa9', '#b4637a'], ['#56949f', '#286983'], ['#ea9d34', '#d7827e']] },
    } },
  { id: 'onedark', name: 'One', group: 'Dev', light: 'One Light', dark: 'One Dark',
    v: {
      dark: { canvas: '#282c34', panel: '#21252b', card: '#2c313a', raised: '#333842', strong: '#e6e8ec', fg: '#abb2bf', muted: '#8b929e', accent: '#61afef', accent2: '#c678dd', mark: '#e5c07b', red: '#e06c75',
        hues: ['#d19a66', '#e5c07b', '#98c379', '#56b6c2', '#61afef', '#c678dd', '#e06c75', '#abb2bf'], grads: [['#61afef', '#c678dd'], ['#56b6c2', '#98c379'], ['#e5c07b', '#e06c75']] },
      light: { canvas: '#fafafa', panel: '#f0f0f1', card: '#ffffff', strong: '#232324', fg: '#383a42', muted: '#696c77', accent: '#4078f2', accent2: '#a626a4', mark: '#c18401', red: '#e45649',
        hues: ['#986801', '#c18401', '#50a14f', '#0184bc', '#4078f2', '#a626a4', '#ca1243', '#696c77'], grads: [['#4078f2', '#a626a4'], ['#0184bc', '#50a14f'], ['#c18401', '#e45649']] },
    } },
  { id: 'monokai', name: 'Monokai', group: 'Dev', dark: 'Monokai',
    v: {
      dark: { canvas: '#272822', panel: '#1e1f1c', card: '#31322c', raised: '#3e3d32', strong: '#f8f8f2', fg: '#f8f8f2', muted: '#a59f85', accent: '#a6e22e', accent2: '#66d9ef', mark: '#f92672', red: '#f92672',
        hues: ['#fd971f', '#e6db74', '#a6e22e', '#66d9ef', '#819aff', '#ae81ff', '#f92672', '#a59f85'], grads: [['#a6e22e', '#66d9ef'], ['#ae81ff', '#f92672'], ['#fd971f', '#e6db74']] },
    } },
  { id: 'solarized', name: 'Solarized', group: 'Dev', light: 'Solarized Light', dark: 'Solarized Dark',
    v: {
      dark: { canvas: '#002b36', panel: '#00252e', card: '#073642', raised: '#0a3d4a', strong: '#eee8d5', fg: '#93a1a1', muted: '#839496', accent: '#268bd2', accent2: '#2aa198', mark: '#b58900', red: '#dc322f',
        hues: ['#cb4b16', '#b58900', '#859900', '#2aa198', '#268bd2', '#6c71c4', '#d33682', '#93a1a1'], grads: [['#268bd2', '#2aa198'], ['#6c71c4', '#d33682'], ['#b58900', '#cb4b16']] },
      light: { canvas: '#fdf6e3', panel: '#eee8d5', card: '#fffbee', strong: '#073642', fg: '#586e75', muted: '#657b83', accent: '#268bd2', accent2: '#2aa198', mark: '#b58900', red: '#dc322f',
        hues: ['#cb4b16', '#b58900', '#859900', '#2aa198', '#268bd2', '#6c71c4', '#d33682', '#657b83'], grads: [['#268bd2', '#2aa198'], ['#6c71c4', '#d33682'], ['#b58900', '#cb4b16']] },
    } },

  // Calm, natural
  { id: 'everforest', name: 'Everforest', group: 'Calm', light: 'Everforest Light', dark: 'Everforest Dark',
    v: {
      dark: { canvas: '#2d353b', panel: '#272e33', card: '#343f44', raised: '#3d484d', strong: '#e8dfc8', fg: '#d3c6aa', muted: '#9da9a0', accent: '#a7c080', accent2: '#83c092', mark: '#dbbc7f', red: '#e67e80',
        hues: ['#e69875', '#dbbc7f', '#a7c080', '#83c092', '#7fbbb3', '#d699b6', '#e67e80', '#9da9a0'], grads: [['#a7c080', '#83c092'], ['#7fbbb3', '#a7c080'], ['#dbbc7f', '#e69875']] },
      light: { canvas: '#fdf6e3', panel: '#f4f0d9', card: '#fffbef', strong: '#3a464c', fg: '#5c6a72', muted: '#829181', accent: '#8da101', accent2: '#35a77c', mark: '#dfa000', red: '#f85552',
        hues: ['#f57d26', '#dfa000', '#8da101', '#35a77c', '#3a94c5', '#df69ba', '#f85552', '#939f91'], grads: [['#8da101', '#35a77c'], ['#3a94c5', '#8da101'], ['#dfa000', '#f57d26']] },
    } },
  { id: 'kanagawa', name: 'Kanagawa', group: 'Calm', light: 'Kanagawa Lotus', dark: 'Kanagawa Wave',
    v: {
      dark: { canvas: '#1f1f28', panel: '#16161d', card: '#2a2a37', raised: '#363646', strong: '#e6e1c4', fg: '#dcd7ba', muted: '#a6a69c', accent: '#7e9cd8', accent2: '#957fb8', mark: '#e6c384', red: '#e46876',
        hues: ['#ffa066', '#e6c384', '#98bb6c', '#7aa89f', '#7fb4ca', '#957fb8', '#d27e99', '#c8c093'], grads: [['#7e9cd8', '#957fb8'], ['#7aa89f', '#98bb6c'], ['#e6c384', '#ffa066']] },
      light: { canvas: '#f2ecbc', panel: '#e5ddb0', card: '#f8f3d4', strong: '#2f2f45', fg: '#545464', muted: '#716e61', accent: '#4d699b', accent2: '#624c83', mark: '#cc6d00', red: '#c84053',
        hues: ['#cc6d00', '#77713f', '#6f894e', '#597b75', '#4d699b', '#624c83', '#b35b79', '#8a8980'], grads: [['#4d699b', '#624c83'], ['#597b75', '#6f894e'], ['#cc6d00', '#b35b79']] },
    } },

  // Retro
  { id: 'synthwave', name: "Synthwave '84", group: 'Retro', dark: "Synthwave '84",
    v: {
      dark: { canvas: '#262335', panel: '#241b2f', card: '#2a2139', raised: '#34294f', strong: '#fdfdff', fg: '#f4eefa', muted: '#b6b1d8', accent: '#ff7edb', accent2: '#36f9f6', mark: '#fede5d', red: '#fe4450',
        hues: ['#ff8b39', '#fede5d', '#72f1b8', '#36f9f6', '#03edf9', '#b893ce', '#ff7edb', '#848bbd'], grads: [['#ff7edb', '#ff8b39'], ['#36f9f6', '#b893ce'], ['#ff8b39', '#fede5d']] },
    } },
  { id: 'vaporwave', name: 'Vaporwave', group: 'Retro', dark: 'Vaporwave',
    v: {
      dark: { canvas: '#1b1034', panel: '#150c2a', card: '#26174a', raised: '#2e1c58', strong: '#fdf6ff', fg: '#ece0ff', muted: '#b9a6e0', accent: '#ff71ce', accent2: '#01cdfe', mark: '#05ffa1', red: '#ff5e7e',
        hues: ['#ff9a8b', '#fffb96', '#05ffa1', '#01cdfe', '#7b8cff', '#b967ff', '#ff71ce', '#c8b8e8'], grads: [['#ff71ce', '#b967ff'], ['#01cdfe', '#05ffa1'], ['#fffb96', '#ff71ce']] },
    } },
  { id: 'phosphor', name: 'Phosphor', group: 'Retro', dark: 'Green CRT',
    v: {
      dark: { canvas: '#0a120c', panel: '#07100a', card: '#0f1d13', raised: '#142619', strong: '#b6ffc7', fg: '#7dff9a', muted: '#45c463', accent: '#33ff66', accent2: '#00cc44', mark: '#ccff66', red: '#ff5f56',
        hues: ['#ffb000', '#ccff66', '#33ff66', '#2ee6a6', '#4dd0ff', '#a0ff80', '#ff6f61', '#7dff9a'], grads: [['#33ff66', '#00cc44'], ['#2ee6a6', '#33ff66'], ['#ccff66', '#33ff66']] },
    } },
  { id: 'amber', name: 'Amber', group: 'Retro', dark: 'Amber CRT',
    v: {
      dark: { canvas: '#140d02', panel: '#0f0a01', card: '#1f1505', raised: '#2a1d07', strong: '#ffe0a3', fg: '#ffc457', muted: '#d39a38', accent: '#ffb000', accent2: '#ff7a00', mark: '#fff1c1', red: '#ff5a3c',
        hues: ['#ff7a00', '#ffd166', '#c8e66a', '#7ad7c7', '#9ec5ff', '#e0a3ff', '#ff8a8a', '#ffc457'], grads: [['#ffb000', '#ff7a00'], ['#ffd166', '#ffb000'], ['#ff7a00', '#ff5a3c']] },
    } },
  { id: 'gameboy', name: 'Game Boy', group: 'Retro', light: 'DMG',
    v: {
      light: { canvas: '#9bbc0f', panel: '#8bac0f', card: '#b0cc3c', raised: '#bcd65a', strong: '#0f380f', fg: '#0f380f', muted: '#1f4a1f', accent: '#306230', accent2: '#0f380f', mark: '#0f380f', red: '#5a1e0f',
        hues: ['#306230', '#0f380f', '#306230', '#0f380f', '#306230', '#0f380f', '#306230', '#0f380f'], grads: [['#8bac0f', '#9bbc0f'], ['#8bac0f', '#9bbc0f'], ['#8bac0f', '#9bbc0f']] },
    } },
  { id: 'classic', name: 'Classic', group: 'Retro', light: 'Windows Classic',
    v: {
      light: { canvas: '#c3c7cb', panel: '#c0c0c0', card: '#d4d0c8', raised: '#dcd8d0', strong: '#0a0a0a', fg: '#111111', muted: '#3c3c3c', accent: '#000080', accent2: '#1084d0', mark: '#008080', red: '#a00000',
        hues: ['#a05000', '#808000', '#008000', '#008080', '#000080', '#800080', '#a00050', '#404040'], grads: [['#008080', '#1084d0'], ['#008080', '#008080'], ['#1084d0', '#000080']] },
    } },

  // Y2K
  { id: 'aero', name: 'Frutiger Aero', group: 'Y2K', light: 'Aero Sky', dark: 'Aero Night',
    v: {
      light: { canvas: '#e8f6ff', panel: '#f4fbff', card: '#ffffff', strong: '#0b2a45', fg: '#14395c', muted: '#3d6380', accent: '#1597e5', accent2: '#5cc73a', mark: '#7ed957', red: '#d93a3a',
        hues: ['#ff9f1c', '#ffd23f', '#5cc73a', '#22c3d6', '#1597e5', '#7b6cf6', '#ff6fb5', '#6b8aa3'], grads: [['#7fd3ff', '#a8e66b'], ['#5ce1e6', '#4aa8ff'], ['#b6f0ff', '#c9f2a5']] },
      dark: { canvas: '#06182b', panel: '#0a2138', card: '#0e2a45', raised: '#123354', strong: '#eaf7ff', fg: '#cfe9fb', muted: '#8fb6d1', accent: '#38b6ff', accent2: '#7ed957', mark: '#7ed957', red: '#ff6b6b',
        hues: ['#ffb347', '#ffe066', '#7ed957', '#4fe3e8', '#38b6ff', '#9d8cff', '#ff85c0', '#8fb6d1'], grads: [['#1a6fb5', '#2f8f3a'], ['#127a9e', '#1a4fb5'], ['#2b79c2', '#4fa83a']] },
    } },
]

// ---------- derivation ----------

function variant(s) {
  const dark = lum(s.canvas) < 0.2
  const { canvas, panel, card } = s
  const raised = s.raised ?? card
  const sunken = s.sunken ?? (dark ? mix(BLACK, canvas, 0.15) : mix(s.strong, canvas, 0.03))
  const hover = mix(s.fg, card, dark ? 0.07 : 0.045)
  const selected = mix(s.fg, card, dark ? 0.12 : 0.08)
  const extreme = dark ? WHITE : BLACK
  const surfaces = [canvas, panel, card, raised, sunken, hover, selected]
  const strong = ensure(s.strong, surfaces, 4.5, extreme)
  const fg = ensure(s.fg, surfaces, 4.5, strong)
  const muted = ensure(s.muted, [canvas, panel, card, raised, sunken], 4.5, strong)
  const soft = ensure(mix(fg, muted, 0.5), [canvas, panel, card, raised], 4.5, strong)
  const faint = ensure(mix(muted, card, 0.7), [canvas, panel, card, raised, sunken], 3, strong)
  const ghost = mix(faint, canvas, 0.6)
  const line = mix(fg, card, dark ? 0.13 : 0.11)
  const lineStrong = mix(fg, card, dark ? 0.22 : 0.2)

  let accent = ensure(s.accent, [card, panel, canvas], 3, strong)
  const onCandidates = [canvas, strong, s.fg, '#ffffff', '#111111']
  const onAccent = onCandidates.reduce((best, c) => (contrast(c, accent) > contrast(best, accent) ? c : best))
  const away = (c) => (lum(c) < 0.18 ? WHITE : '#101010')
  if (contrast(onAccent, accent) < 4.5) accent = ensure(accent, [onAccent], 4.5, away(onAccent))
  let accentHover = dark ? mix(strong, accent, 0.18) : mix(BLACK, accent, 0.14)
  accentHover = ensure(accentHover, [onAccent], 4.5, away(onAccent))
  let softAmt = dark ? 0.16 : 0.12
  let accentSoft = mix(accent, card, softAmt)
  while (contrast(strong, accentSoft) < 4.5 && softAmt > 0.02) accentSoft = mix(accent, card, (softAmt -= 0.02))
  const accentLine = mix(accent, card, 0.55)
  const accentText = ensure(accent, [canvas, card, raised], 4.5, strong)
  const accentMark = s.mark ?? accent
  const focus = ensure(accent, [card, canvas], 3, strong)

  const dangerSoft = mix(s.red, card, dark ? 0.14 : 0.1)
  const danger = ensure(s.red, [canvas, card, raised, dangerSoft], 4.5, strong)
  const onDanger = dark ? strong : '#ffffff'
  const dangerFill = ensure(dark ? mix(s.red, canvas, 0.72) : mix(BLACK, s.red, 0.1), [onDanger], 4.5, away(onDanger))
  const dangerFillHover = ensure(mix(away(onDanger), dangerFill, 0.1), [onDanger], 4.5, away(onDanger))

  let inverse, onInverse, inverseStrong, inverseMuted, inverseAccent
  if (dark) {
    inverse = mix(fg, raised, 0.16)
    onInverse = ensure(fg, [inverse], 4.5, WHITE)
    inverseStrong = ensure(strong, [inverse], 4.5, WHITE)
    inverseMuted = ensure(muted, [inverse], 4.5, WHITE)
    inverseAccent = ensure(mix(accent, strong, 0.6), [inverse], 4.5, WHITE)
  } else {
    inverse = strong
    onInverse = ensure(canvas, [inverse], 4.5, WHITE)
    inverseStrong = ensure('#fcfcfc', [inverse], 4.5, WHITE)
    inverseMuted = ensure(mix(canvas, inverse, 0.6), [inverse], 4.5, WHITE)
    inverseAccent = ensure(mix(accent, WHITE, 0.5), [inverse], 4.5, WHITE)
  }

  const tints = s.hues.map((h) => {
    const bg = mix(h, card, dark ? 0.28 : 0.3)
    return [bg, ensure(h, [bg], 3, strong)]
  })

  const textOn = (stop) => [strong, fg, muted].every((t) => contrast(t, stop) >= 4.5)
  const stop = (h, start) => {
    for (let t = start; t > 0; t -= 0.02) {
      const c = mix(h, canvas, t)
      if (textOn(c)) return c
    }
    return canvas
  }
  const g = s.grads.map(([a, b], i) => [stop(a, [0.34, 0.3, 0.32][i]), stop(b, [0.26, 0.24, 0.24][i])])
  const gradients = [
    `radial-gradient(95% 80% at 0% 0%, ${g[0][0]} 0%, transparent 70%),\n    radial-gradient(85% 75% at 100% 100%, ${g[0][1]} 0%, transparent 70%),\n    ${canvas}`,
    `radial-gradient(130% 65% at 50% 0%, ${g[1][0]} 0%, transparent 72%),\n    radial-gradient(80% 70% at 0% 100%, ${g[1][1]} 0%, transparent 68%),\n    ${canvas}`,
    `radial-gradient(110% 95% at 100% 0%, ${g[2][0]} 0%, transparent 74%),\n    radial-gradient(70% 60% at 15% 100%, ${g[2][1]} 0%, transparent 70%),\n    ${canvas}`,
  ]

  const t = {
    canvas, panel, card, raised, well: `${card}66`, hover, selected, sunken,
    strong, fg, soft, muted, faint, ghost,
    line, 'line-strong': lineStrong,
    accent, 'accent-hover': accentHover, 'on-accent': onAccent, 'accent-soft': accentSoft, 'accent-line': accentLine,
    'accent-text': accentText, 'accent-mark': accentMark, focus,
    danger, 'danger-fill': dangerFill, 'danger-fill-hover': dangerFillHover, 'on-danger': onDanger, 'danger-soft': dangerSoft,
    inverse, 'on-inverse': onInverse, 'inverse-strong': inverseStrong, 'inverse-muted': inverseMuted, 'inverse-accent': inverseAccent,
    scrim: dark ? '#0000008c' : `${strong}4d`,
    shade: dark ? '#000000' : mix(BLACK, accent, 0.5),
    'brand-from': accent, 'brand-to': s.accent2, 'brand-ink': onAccent,
  }
  tints.forEach(([bg, fgc], i) => {
    t[`tint-${i}-bg`] = bg
    t[`tint-${i}-fg`] = fgc
  })
  gradients.forEach((v, i) => (t[`gradient-${i + 1}`] = v))
  return t
}

// ---------- write ----------

let css = '/* @generated palettes:start (scripts/palettes.mjs, do not edit by hand) */\n'
for (const p of P) {
  for (const scheme of ['light', 'dark']) {
    const spec = p.v[scheme]
    if (!spec) continue
    const tokens = variant(spec)
    css += `\n/* ${scheme === 'light' ? p.light : p.dark} */\n[data-palette="${p.id}"][data-scheme="${scheme}"] {\n`
    for (const [k, v] of Object.entries(tokens)) css += `  --sb-${k}:${k.startsWith('gradient') ? '\n    ' : ' '}${v};\n`
    css += '}\n'
  }
}
css += '\n/* @generated palettes:end */\n'

const cssPath = path.join(ROOT, 'src/styles/palettes.css')
let file = fs.readFileSync(cssPath, 'utf8')
const start = file.indexOf('/* @generated palettes:start')
file = (start >= 0 ? file.slice(0, start) : file.trimEnd() + '\n\n') + css
fs.writeFileSync(cssPath, file)

const ts = `// Generated by scripts/palettes.mjs. Do not edit by hand.
export const GENERATED_PALETTES = ${JSON.stringify(
  P.map(({ id, name, group, light, dark }) => ({ id, name, group, ...(light ? { light } : {}), ...(dark ? { dark } : {}) })),
  null,
  2,
)} as const

export type GeneratedPaletteId = (typeof GENERATED_PALETTES)[number]['id']
`
fs.writeFileSync(path.join(ROOT, 'src/lib/palettes.generated.ts'), ts)
console.log(`${P.length} palettes, ${P.reduce((n, p) => n + Object.keys(p.v).length, 0)} variants`)
