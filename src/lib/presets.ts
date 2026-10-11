import { DEFAULT_APPEARANCE, type AppearancePatch } from './appearance'

// Fork: one-click looks (Settings > Look > Presets, and the command palette). A preset sets the
// style, corners, font, density and motion together; the ones tied to a theme set the palette
// and background too, the rest keep whatever palette is chosen. Everything stays adjustable
// afterwards, so a preset is a starting point, not a mode.

export interface Preset {
  id: string
  name: string
  blurb: string
  patch: AppearancePatch
}

const base: AppearancePatch = {
  style: DEFAULT_APPEARANCE.style,
  radius: DEFAULT_APPEARANCE.radius,
  font: DEFAULT_APPEARANCE.font,
  density: DEFAULT_APPEARANCE.density,
  details: DEFAULT_APPEARANCE.details,
  motion: DEFAULT_APPEARANCE.motion,
}

export const PRESETS: readonly Preset[] = [
  {
    id: 'default',
    name: 'Stackboard',
    blurb: 'The original: flat, soft corners, gentle motion.',
    patch: { ...base },
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
    id: 'aero',
    name: 'Frutiger Aero',
    blurb: 'Glossy sky glass, bubbles and grass greens.',
    patch: {
      ...base,
      palette: 'aero',
      style: 'aero',
      radius: 'round',
      font: 'rounded',
      bg: { kind: 'gradient', gradient: 1 },
      motion: { level: 'full', space: 'slide', hover: 'glow', entrance: 'stagger', ambient: 'bubbles', spring: true },
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
]
