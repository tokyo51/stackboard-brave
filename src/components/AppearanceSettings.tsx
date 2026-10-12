import { useEffect, useRef, useState } from 'react'
import { Check, Download, ImagePlus, Monitor, Moon, Sun } from 'lucide-react'
import {
  BLUR_MAX,
  DIM_MAX,
  PALETTES,
  PALETTE_GROUPS,
  onlyScheme,
  paletteInfo,
  resolveScheme,
  variantName,
  type BgKind,
  type Density,
  type Mode,
  type PaletteId,
  type Radius,
  type Scheme,
  type Style,
} from '../lib/appearance'
import { GRADIENTS, PATTERNS, gradientCss, patternMaskUrl, type PatternId, type PatternInfo } from '../lib/backgrounds'
import { deleteBgImage, loadBgImage, prepareBgImage, saveBgImage } from '../lib/bgImage'
import { useAppearance } from '../store/useAppearance'
import { Actions, Button, Group, Row, Section, Segmented, Slider, SubLabel } from './settings/ui'
import { saveWallpaper, wallpaperSize } from './settings/wallpaper'

/**
 * Settings > Look: themes, mode and background (0.5.0, redesigned for the tabbed window).
 * Every change applies to the board behind the dialog at once, which is the preview; the
 * palette swatches are small boards drawn in their own palette.
 */
export function AppearanceSettings() {
  const a = useAppearance((s) => s.appearance)
  const scheme = useAppearance((s) => s.scheme)
  const systemDark = useAppearance((s) => s.systemDark)
  const update = useAppearance((s) => s.update)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [hasImage, setHasImage] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    loadBgImage()
      .then((r) => live && setHasImage(!!r))
      .catch(() => live && setHasImage(false))
    return () => {
      live = false
    }
  }, [a.bg.imageRev])

  const chooseBackground = (kind: BgKind) => {
    setError(null)
    // No picture saved yet: picking "Image" goes straight to the file chooser.
    if (kind === 'image' && !hasImage) {
      fileRef.current?.click()
      return
    }
    update({ bg: { kind } })
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // the same file can be picked again later
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await saveBgImage(await prepareBgImage(file))
      setHasImage(true)
      update({ bg: { kind: 'image', imageRev: Date.now() } })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const removeImage = async () => {
    setError(null)
    await deleteBgImage().catch(() => {})
    setHasImage(false)
    update({ bg: { kind: 'solid', imageRev: Date.now() } })
  }

  const info = paletteInfo(a.palette)
  const only = onlyScheme(a.palette)
  const shown = variantName(a.palette, scheme)
  let note = `Showing ${shown}.`
  if (only && a.mode !== 'system' && a.mode !== only) note = `${info.name} only comes in ${only}, so it stays ${only}.`
  else if (only) note += ` It only comes in ${only}.`
  else if (a.mode === 'system') {
    note += ` Switches to ${variantName(a.palette, scheme === 'dark' ? 'light' : 'dark')} when your system turns ${scheme === 'dark' ? 'light' : 'dark'}.`
  }
  const look: MiniLook = { style: a.style, radius: a.radius, density: a.density }

  return (
    <div data-appearance className="flex flex-col gap-9">
      <Section
        title="Theme"
        description={<span data-mode-note>{note}</span>}
        action={
          <Segmented<Mode>
            label="Mode"
            value={a.mode}
            onChange={(mode) => update({ mode })}
            options={[
              { value: 'system', label: 'System', icon: <Monitor className="h-3.5 w-3.5" /> },
              { value: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> },
              { value: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      >
        <div role="radiogroup" aria-label="Palette" className="flex flex-col gap-5">
          {PALETTE_GROUPS.map((g) => {
            const members = PALETTES.filter((p) => p.group === g.id)
            if (!members.length) return null
            return (
              <div key={g.id}>
                <p className="mb-2 text-xs font-medium text-soft">{g.label}</p>
                <div className="grid grid-cols-5 gap-x-3 gap-y-4">
                  {members.map((p) => {
                    const s = resolveScheme(a.mode, p.id, systemDark)
                    return (
                      <PaletteOption
                        key={p.id}
                        id={p.id}
                        name={p.name}
                        scheme={s}
                        detail={variantLabel(p.id, s)}
                        look={look}
                        selected={p.id === a.palette}
                        onPick={() => update({ palette: p.id })}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section
        title="Background"
        description={
          a.bg.kind === 'image'
            ? 'Your own picture behind the board.'
            : 'Gradients and patterns are drawn in the theme’s own colours.'
        }
        action={
          <Segmented<BgKind>
            label="Background"
            value={a.bg.kind}
            onChange={chooseBackground}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'gradient', label: 'Gradient' },
              { value: 'image', label: busy ? 'Saving…' : 'Image' },
            ]}
          />
        }
      >
        <Group>
          {a.bg.kind === 'gradient' && <GradientPicker />}
          {a.bg.kind !== 'image' && <PatternPicker />}
          {a.bg.kind !== 'image' && <WallpaperExport />}
          {a.bg.kind === 'image' && (
            <ImageControls busy={busy} onReplace={() => fileRef.current?.click()} onRemove={() => void removeImage()} />
          )}
        </Group>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <input ref={fileRef} type="file" accept="image/*" hidden data-bg-file onChange={(e) => void onFile(e)} />
      </Section>
    </div>
  )
}

/** "Mocha", "Latte", "Dark", or "Dark only" for a palette with a single version. */
function variantLabel(id: PaletteId, scheme: Scheme): string {
  const only = onlyScheme(id)
  if (only) return only === 'dark' ? 'Dark only' : 'Light only'
  const name = paletteInfo(id).name
  const v = variantName(id, scheme)
  const rest = v.startsWith(name) ? v.slice(name.length).trim() : v
  return rest || (scheme === 'dark' ? 'Dark' : 'Light')
}

/** Selected tiles share one crisp ring, offset from the tile (the offset colour is the surface behind). */
const tileRing = (on: boolean) =>
  on ? 'ring-2 ring-accent ring-offset-2' : 'ring-1 ring-line group-hover/tile:ring-line-strong'
const tileFocus = 'group-focus-visible/tile:ring-2 group-focus-visible/tile:ring-focus group-focus-visible/tile:ring-offset-2'

// The palette's signature colours, read from its own tokens.
const DOTS = ['bg-accent', 'bg-[var(--sb-tint-0-fg)]', 'bg-[var(--sb-tint-2-fg)]', 'bg-[var(--sb-tint-4-fg)]', 'bg-[var(--sb-tint-5-fg)]']

function PaletteOption(props: {
  id: PaletteId
  name: string
  scheme: Scheme
  detail: string
  look: MiniLook
  selected: boolean
  onPick: () => void
}) {
  const { id, name, scheme, detail, look, selected, onPick } = props
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${name}, ${detail}`}
      data-palette-option={id}
      onClick={onPick}
      className="group/tile flex min-w-0 flex-col gap-2 rounded-lg text-left focus-visible:outline-none"
    >
      <span className={`relative block aspect-[16/10] rounded-lg ring-offset-sunken transition-shadow ${tileRing(selected)} ${tileFocus}`}>
        <MiniBoard palette={id} scheme={scheme} look={look} />
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent shadow-xs">
            <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
          </span>
        )}
      </span>
      <span className="flex min-w-0 items-center justify-between gap-2 px-0.5">
        <span className="min-w-0 leading-tight">
          <span className={`block truncate text-xs font-medium ${selected ? 'text-strong' : 'text-fg'}`}>{name}</span>
          <span className="block truncate text-[11px] text-muted">{detail}</span>
        </span>
        <span aria-hidden className="flex shrink-0 items-center pr-0.5">
          {DOTS.map((dot, i) => (
            <span key={dot} className={`rounded-full ring-2 ring-sunken ${i ? '-ml-1' : ''}`}>
              <span data-palette={id} data-scheme={scheme} className={`block h-2.5 w-2.5 rounded-full ${dot}`} />
            </span>
          ))}
        </span>
      </span>
    </button>
  )
}

/** What a thumbnail board borrows from a look besides its palette. */
export interface MiniLook {
  style?: Style
  radius?: Radius
  density?: Density
  /** A gradient behind the board, or none for the plain canvas. */
  gradient?: number | null
}

const STACK_RADIUS: Record<Radius, string> = { sharp: 'rounded-none', soft: 'rounded-[3px]', round: 'rounded-[6px]' }
const CARD_RADIUS: Record<Radius, string> = { sharp: 'rounded-none', soft: 'rounded-[2px]', round: 'rounded-full' }
// Rows per stack, row height and gap: denser boards fit more.
const DENSITY: Record<Density, { rows: number[]; h: string; gap: string }> = {
  compact: { rows: [4, 5, 3], h: 'h-[5px]', gap: 'gap-[2px]' },
  comfortable: { rows: [3, 4, 2], h: 'h-[7px]', gap: 'gap-[3px]' },
  spacious: { rows: [2, 3, 2], h: 'h-[9px]', gap: 'gap-[4px]' },
}

/** How each style draws a panel, in miniature: plain wells, frosted glass, lifted panels, dashes, bevels. */
function panelClass(style: Style): string {
  switch (style) {
    case 'glass':
    case 'aero':
      return 'bg-card/55 ring-1 ring-card/80 shadow-xs'
    case 'floating':
    case 'apple':
      return 'bg-panel shadow-sm ring-1 ring-line'
    case 'brave':
      return 'bg-card ring-1 ring-line'
    case 'chrome':
      return 'bg-linear-to-b from-card via-panel to-sunken ring-1 ring-line-strong shadow-xs'
    case 'aqua':
      return 'bg-card/80 ring-1 ring-line-strong shadow-xs'
    case 'terminal':
      return 'border border-dashed border-accent/60'
    case 'retro':
      return 'border border-b-line-strong border-l-card border-r-line-strong border-t-card bg-panel'
    default:
      return 'bg-well'
  }
}

/** A thumbnail board drawn with the real tokens of one palette variant, in a look's style. */
export function MiniBoard({ palette, scheme, look = {} }: { palette: PaletteId; scheme: Scheme; look?: MiniLook }) {
  const style = look.style ?? 'flat'
  const radius = look.radius ?? 'soft'
  const d = DENSITY[look.density ?? 'comfortable']
  const floatingSidebar = ['floating', 'apple', 'glass', 'aero', 'brave', 'chrome', 'aqua'].includes(style)
  const terminal = style === 'terminal'
  const retro = style === 'retro'
  return (
    <span
      aria-hidden
      data-palette={palette}
      data-scheme={scheme}
      className="absolute inset-0 overflow-hidden rounded-[inherit] bg-canvas"
      style={look.gradient ? { background: gradientCss(look.gradient) } : undefined}
    >
      <span
        className={`absolute flex flex-col gap-[3px] px-[4%] pt-[10%] ${
          floatingSidebar
            ? `inset-y-[6%] left-[3%] w-[21%] ${STACK_RADIUS[radius]} ${panelClass(style)}`
            : `inset-y-0 left-0 w-[22%] border-r ${terminal ? 'border-dashed border-accent/60' : 'border-line bg-panel'}`
        }`}
      >
        <span className="mb-[3px] h-[4px] w-[46%] rounded-full bg-accent" />
        {/* The active space: the accent as a pill, big enough to tell dark palettes apart. */}
        <span className="h-[5px] w-full rounded-full bg-accent" />
        <span className="h-[4px] w-[76%] rounded-full bg-line-strong" />
        <span className="h-[4px] w-[86%] rounded-full bg-line-strong" />
      </span>
      <span className="absolute left-[29%] right-[5%] top-[13%] grid grid-cols-3 items-start gap-[7%]">
        {d.rows.map((n, c) => (
          <span key={c} className={`flex flex-col overflow-hidden ${d.gap} ${STACK_RADIUS[radius]} ${panelClass(style)} p-[2px]`}>
            {retro && <span className="-mx-[2px] -mt-[2px] mb-[1px] h-[4px] shrink-0 bg-accent" />}
            {Array.from({ length: n }, (_, i) => (
              <span key={i} className={`flex ${d.h} shrink-0 items-center gap-[2px] px-[2px] ${terminal ? '' : `${CARD_RADIUS[radius]} bg-card`}`}>
                <span className={`h-[3px] w-[3px] shrink-0 rounded-full ${c === 0 && i === 0 ? 'bg-accent' : terminal ? 'bg-accent/60' : 'bg-faint'}`} />
                <span className={`h-[2px] flex-1 rounded-full ${terminal ? 'bg-accent/60' : 'bg-muted opacity-60'}`} />
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  )
}

function GradientPicker() {
  const current = useAppearance((s) => s.appearance.bg.gradient)
  const update = useAppearance((s) => s.update)
  const name = GRADIENTS.find((g) => g.id === current)?.name
  return (
    <div className="p-4">
      <SubLabel aside={name}>Gradient</SubLabel>
      <div role="radiogroup" aria-label="Gradient" className="grid grid-cols-9 gap-2">
        {GRADIENTS.map((g) => {
          const on = g.id === current
          return (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={g.name}
              title={g.name}
              data-gradient-option={g.id}
              onClick={() => update({ bg: { gradient: g.id } })}
              className="group/tile flex min-w-0 flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none"
            >
              {/* The board's own gradient, in whatever palette is on screen. */}
              <span
                className={`block aspect-square w-full rounded-lg ring-offset-raised transition-shadow ${tileRing(on)} ${tileFocus}`}
                style={{ background: gradientCss(g.id) }}
              />
              <span className={`max-w-full truncate text-[11px] ${on ? 'font-medium text-strong' : 'text-muted'}`}>{g.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PatternPicker() {
  const bg = useAppearance((s) => s.appearance.bg)
  const update = useAppearance((s) => s.update)
  const options: Array<{ id: PatternId; name: string; info?: PatternInfo }> = [
    { id: 'none', name: 'None' },
    ...PATTERNS.map((p) => ({ id: p.id, name: p.name, info: p })),
  ]
  const chosen = options.find((o) => o.id === bg.pattern)
  return (
    <>
      <div className="p-4">
        <SubLabel aside={chosen && chosen.id !== 'none' ? chosen.name : undefined}>Pattern</SubLabel>
        <div role="radiogroup" aria-label="Pattern" className="grid grid-cols-9 gap-x-2 gap-y-3">
          {options.map((o) => {
            const on = o.id === bg.pattern
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={o.name}
                title={o.name}
                data-pattern-option={o.id}
                onClick={() => update({ bg: { pattern: o.id } })}
                className="group/tile flex min-w-0 flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none"
              >
                <span
                  className={`relative block aspect-square w-full overflow-hidden rounded-lg bg-canvas ring-offset-raised transition-shadow ${tileRing(on)} ${tileFocus}`}
                >
                  {o.info && <PatternFill p={o.info} />}
                </span>
                <span className={`max-w-full truncate text-[11px] ${on ? 'font-medium text-strong' : 'text-muted'}`}>{o.name}</span>
              </button>
            )
          })}
        </div>
      </div>
      {bg.pattern !== 'none' && (
        <Row label="Strength">
          <Slider
            label="Strength"
            value={bg.patternStrength}
            min={1}
            max={100}
            unit="%"
            onChange={(v) => update({ bg: { patternStrength: v } }, { gentle: true })}
          />
        </Row>
      )}
    </>
  )
}

/** A pattern drawn the way the board draws it: its tile as a mask over the text colour. */
function PatternFill({ p }: { p: PatternInfo }) {
  const mask = patternMaskUrl(p)
  const size = `${Math.round(p.size * 0.75)}px`
  return (
    <span
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--sb-fg) 35%, transparent)',
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: size,
        WebkitMaskSize: size,
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}

function WallpaperExport() {
  const a = useAppearance((s) => s.appearance)
  const [busy, setBusy] = useState<'png' | 'svg' | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const { width, height } = wallpaperSize()

  const save = async (format: 'png' | 'svg') => {
    setBusy(format)
    setNote(null)
    try {
      setNote(`Saved ${await saveWallpaper(a, format)}`)
    } catch (err) {
      setNote(`Couldn't save it: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Row
      data-wallpaper
      label="Wallpaper"
      hint={<span aria-live="polite">{note ?? `This background as a ${width} × ${height} picture, sharp on this screen.`}</span>}
    >
      <Actions>
        <Button data-wallpaper-png disabled={!!busy} onClick={() => void save('png')}>
          <Download className="h-3.5 w-3.5" />
          {busy === 'png' ? 'Saving…' : 'Save as wallpaper'}
        </Button>
        <Button variant="quiet" data-wallpaper-svg disabled={!!busy} onClick={() => void save('svg')}>
          {busy === 'svg' ? 'Saving…' : 'SVG'}
        </Button>
      </Actions>
    </Row>
  )
}

function ImageControls({ busy, onReplace, onRemove }: { busy: boolean; onReplace: () => void; onRemove: () => void }) {
  const dim = useAppearance((s) => s.appearance.bg.dim)
  const blur = useAppearance((s) => s.appearance.bg.blur)
  const rev = useAppearance((s) => s.appearance.bg.imageRev)
  const update = useAppearance((s) => s.update)
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    let url: string | null = null
    void loadBgImage()
      .then((r) => {
        if (!r || !live) return
        url = URL.createObjectURL(r.blob)
        setThumb(url)
      })
      .catch(() => {})
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [rev])

  return (
    <>
      <Row label="Picture" hint="Kept on this device only. Big photos are resized to fit your screen.">
        <div className="flex flex-wrap items-center gap-3">
          {thumb ? (
            <img src={thumb} alt="" className="aspect-[16/10] w-24 shrink-0 rounded-lg object-cover ring-1 ring-line" />
          ) : (
            <span className="flex aspect-[16/10] w-24 shrink-0 items-center justify-center rounded-lg bg-sunken text-muted ring-1 ring-line">
              <ImagePlus className="h-4 w-4" />
            </span>
          )}
          <Button onClick={onReplace} disabled={busy}>
            {busy ? 'Saving…' : 'Replace'}
          </Button>
          <Button variant="quiet" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </Row>
      <Row label="Dim">
        <Slider label="Dim" value={dim} max={DIM_MAX} unit="%" onChange={(v) => update({ bg: { dim: v } }, { gentle: true })} />
      </Row>
      <Row label="Blur">
        <Slider label="Blur" value={blur} max={BLUR_MAX} unit="px" onChange={(v) => update({ bg: { blur: v } }, { gentle: true })} />
      </Row>
    </>
  )
}
