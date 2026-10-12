import { DEFAULT_APPEARANCE, type AppearancePatch } from './appearance'

// Fork: one-click looks (Settings > Look > Presets, and the command palette). A preset sets the
// style, corners, font, density and motion together; the ones tied to a theme set the palette
// and background too, the rest keep whatever palette is chosen. Everything stays adjustable
// afterwards, so a preset is a starting point, not a mode.

export interface Preset {
  id: string
  name: string
  blurb: string
  /** Fork: Y2K looks get their own block in the grid. */
  group?: 'y2k'
  patch: AppearancePatch
}

const base: AppearancePatch = {
  style: DEFAULT_APPEARANCE.style,
  radius: DEFAULT_APPEARANCE.radius,
  font: DEFAULT_APPEARANCE.font,
  density: DEFAULT_APPEARANCE.density,
  details: DEFAULT_APPEARANCE.details,
  motion: DEFAULT_APPEARANCE.motion,
  y2k: DEFAULT_APPEARANCE.y2k,
}

export const PRESETS: readonly Preset[] = [
  {
    id: 'default',
    name: 'Stackboard',
    blurb: 'The original: flat, soft corners, gentle motion.',
    patch: { ...base },
  },
  {
    id: 'brave',
    name: 'Brave',
    blurb: 'Brave’s own Leo colours, cards and type. Feels built in.',
    patch: {
      ...base,
      palette: 'brave',
      style: 'brave',
      radius: 'soft',
      font: 'system',
      bg: { kind: 'gradient', gradient: 1, pattern: 'none' },
      motion: { level: 'full', space: 'fade', hover: 'lift', entrance: 'rise', ambient: 'none', spring: false },
    },
  },
  {
    id: 'apple',
    name: 'Apple',
    blurb: 'System colours, grouped lists, vibrancy. Calm and exact.',
    patch: {
      ...base,
      palette: 'apple',
      style: 'apple',
      radius: 'round',
      font: 'system',
      bg: { kind: 'gradient', gradient: 1, pattern: 'none' },
      motion: { level: 'full', space: 'blur', hover: 'lift', entrance: 'rise', ambient: 'none', spring: true },
    },
  },
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    blurb: 'Frosted panes over a slow aurora, rounder corners.',
    patch: {
      ...base,
      style: 'glass',
      radius: 'round',
      bg: { kind: 'gradient' },
      motion: { level: 'full', space: 'zoom', hover: 'tilt', entrance: 'stagger', ambient: 'aurora', spring: true },
    },
  },
  {
    id: 'floating',
    name: 'Floating',
    blurb: 'Panels that lift off the page, airy spacing.',
    patch: {
      ...base,
      style: 'floating',
      radius: 'round',
      density: 'spacious',
      motion: { level: 'full', space: 'slide', hover: 'lift', entrance: 'stagger', ambient: 'none', spring: true },
    },
  },
  {
    id: 'calm',
    name: 'Forest calm',
    blurb: 'Everforest greens, slow drift, nothing loud.',
    patch: {
      ...base,
      palette: 'everforest',
      style: 'floating',
      radius: 'round',
      bg: { kind: 'gradient', gradient: 2 },
      motion: { level: 'subtle', space: 'fade', hover: 'lift', entrance: 'rise', ambient: 'drift', spring: false },
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    blurb: 'Green phosphor, monospace, a blinking cursor.',
    patch: {
      ...base,
      palette: 'phosphor',
      style: 'terminal',
      radius: 'sharp',
      font: 'mono',
      bg: { kind: 'solid' },
      motion: { level: 'subtle', space: 'fade', hover: 'none', entrance: 'none', ambient: 'scanlines', spring: false },
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    blurb: "Neon sun over a moving grid, '84 colours.",
    patch: {
      ...base,
      palette: 'synthwave',
      style: 'glass',
      radius: 'soft',
      bg: { kind: 'solid' },
      motion: { level: 'full', space: 'zoom', hover: 'glow', entrance: 'stagger', ambient: 'grid', spring: true },
    },
  },
  {
    id: 'retro-os',
    name: 'Retro OS',
    blurb: 'Grey bevels and navy title bars, circa 1995.',
    patch: {
      ...base,
      palette: 'classic',
      style: 'retro',
      radius: 'sharp',
      bg: { kind: 'solid' },
      motion: { level: 'off', space: 'none', hover: 'none', entrance: 'none', ambient: 'none', spring: false },
    },
  },
  {
    id: 'game-boy',
    name: 'Game Boy',
    blurb: 'Four shades of green, chunky and sharp.',
    patch: {
      ...base,
      palette: 'gameboy',
      style: 'retro',
      radius: 'sharp',
      font: 'mono',
      bg: { kind: 'solid' },
      motion: { level: 'subtle', space: 'fade', hover: 'none', entrance: 'none', ambient: 'scanlines', spring: false },
    },
  },
  {
    id: 'compact',
    name: 'Compact',
    blurb: 'Most links on screen, quiet motion.',
    patch: {
      ...base,
      density: 'compact',
      radius: 'soft',
      motion: { level: 'subtle', space: 'none', hover: 'none', entrance: 'none', ambient: 'none', spring: false },
    },
  },
  {
    id: 'detailed',
    name: 'Detailed',
    blurb: 'Roomy cards with each link’s site underneath.',
    patch: {
      ...base,
      density: 'spacious',
      details: true,
      style: 'floating',
      motion: { level: 'full', space: 'fade', hover: 'lift', entrance: 'rise', ambient: 'none', spring: true },
    },
  },
  {
    id: 'zen',
    name: 'Zen',
    blurb: 'No motion at all, flat and still.',
    patch: {
      ...base,
      motion: { level: 'off', space: 'none', hover: 'none', entrance: 'none', ambient: 'none', spring: false },
    },
  },

  // ---------- Y2K ----------
  {
    id: 'aero',
    name: 'Frutiger Aero',
    blurb: 'Glossy sky glass, bubbles and grass greens.',
    group: 'y2k',
    patch: {
      ...base,
      palette: 'aero',
      style: 'aero',
      radius: 'round',
      font: 'rounded',
      bg: { kind: 'gradient', gradient: 1, pattern: 'none' },
      motion: { level: 'full', space: 'slide', hover: 'glow', entrance: 'stagger', ambient: 'bubbles', spring: true },
      y2k: { gloss: 72, glow: 45, glowColor: 'accent', sparkles: false, reflections: true, pill: true },
    },
  },
  {
    id: 'vista',
    name: 'Vista',
    blurb: 'Aero glass over teal black, with a slow aurora.',
    group: 'y2k',
    patch: {
      ...base,
      palette: 'vista',
      style: 'aero',
      radius: 'soft',
      bg: { kind: 'gradient', gradient: 6, pattern: 'none' },
      motion: { level: 'full', space: 'blur', hover: 'glow', entrance: 'stagger', ambient: 'aurora', spring: true },
      y2k: { gloss: 64, glow: 55, glowColor: 'mark', sparkles: false, reflections: true, pill: false },
    },
  },
  {
    id: 'aqua',
    name: 'Aqua',
    blurb: 'Pinstripes and blue gel, early Mac OS X.',
    group: 'y2k',
    patch: {
      ...base,
      palette: 'aqua',
      style: 'aqua',
      radius: 'soft',
      bg: { kind: 'solid', pattern: 'pinstripes', patternStrength: 34 },
      motion: { level: 'full', space: 'fade', hover: 'lift', entrance: 'rise', ambient: 'none', spring: true },
      y2k: { gloss: 85, glow: 20, glowColor: 'accent', sparkles: false, reflections: false, pill: true },
    },
  },
  {
    id: 'bubblegum',
    name: 'Bubblegum',
    blurb: 'Pastel pink, lilac and baby blue, with hearts.',
    group: 'y2k',
    patch: {
      ...base,
      palette: 'bubblegum',
      style: 'aqua',
      radius: 'round',
      font: 'rounded',
      bg: { kind: 'gradient', gradient: 8, pattern: 'hearts', patternStrength: 26 },
      motion: { level: 'full', space: 'slide', hover: 'lift', entrance: 'stagger', ambient: 'bubbles', spring: true },
      y2k: { gloss: 70, glow: 50, glowColor: 'brand', sparkles: true, reflections: false, pill: true },
    },
  },
  {
    id: 'y2k-chrome',
    name: 'Chrome',
    blurb: 'Brushed silver, ice blue and a sweep of light.',
    group: 'y2k',
    patch: {
      ...base,
      palette: 'chrome',
      style: 'chrome',
      radius: 'round',
      bg: { kind: 'gradient', gradient: 7, pattern: 'y2kstars', patternStrength: 14 },
      motion: { level: 'full', space: 'zoom', hover: 'tilt', entrance: 'stagger', ambient: 'stars', spring: true },
      y2k: { gloss: 80, glow: 30, glowColor: 'accent', sparkles: true, reflections: true, pill: true },
    },
  },
  {
    id: 'cyber-y2k',
    name: 'Cyber Y2K',
    blurb: 'Neon cyan and lime on black chrome.',
    group: 'y2k',
    patch: {
      ...base,
      palette: 'cyber',
      style: 'chrome',
      radius: 'soft',
      bg: { kind: 'gradient', gradient: 4, pattern: 'grid', patternStrength: 22 },
      motion: { level: 'full', space: 'zoom', hover: 'glow', entrance: 'stagger', ambient: 'grid', spring: true },
      y2k: { gloss: 45, glow: 55, glowColor: 'mark', sparkles: true, reflections: true, pill: false },
    },
  },
]
