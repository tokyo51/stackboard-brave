import { useState } from 'react'
import { Check, Download, Sparkles, Upload } from 'lucide-react'
import {
  Y2K_STYLES,
  resolveScheme,
  type Ambient,
  type Density,
  type Entrance,
  type Font,
  type GlowColor,
  type HoverEffect,
  type MotionLevel,
  type Radius,
  type SpaceTransition,
  type Style,
} from '../lib/appearance'
import { PRESETS, type Preset } from '../lib/presets'
import { readThemeFile, themeFile } from '../lib/themeFile'
import { downloadJson, pickJsonFile } from '../lib/tabs'
import {
  CLOCK_EFFECTS,
  CLOCK_FONTS,
  ENGINES,
  WIDGETS,
  isZone,
  type ClockEffect,
  type ClockFont,
  type ClockPosition,
  type ClockSize,
  type EngineId,
  type WidgetId,
} from '../lib/widgets'
import { useAppearance } from '../store/useAppearance'
import { useWidgets } from '../store/useWidgets'
import { MiniBoard } from './AppearanceSettings'
import { geocodeCity } from './Widgets'
import { Actions, Button, Group, Row, Section, Segmented, Slider, SubLabel, Toggle, fieldClass } from './settings/ui'

// Fork: the Settings tabs beyond themes and background. Every control applies at once to the
// board behind the dialog, which is the preview.

// ---------- Presets (Look tab) ----------

type Look = ReturnType<typeof useAppearance.getState>['appearance']

function matches(p: Preset, a: Look): boolean {
  const x = p.patch
  return (
    (!x.palette || x.palette === a.palette) &&
    x.style === a.style &&
    x.radius === a.radius &&
    x.font === a.font &&
    x.density === a.density &&
    x.details === a.details &&
    JSON.stringify(x.motion) === JSON.stringify(a.motion) &&
    (!x.y2k || JSON.stringify(x.y2k) === JSON.stringify(a.y2k))
  )
}

/** "A, B and C" */
function listNames(names: string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function PresetSection() {
  const a = useAppearance((s) => s.appearance)
  const systemDark = useAppearance((s) => s.systemDark)
  const update = useAppearance((s) => s.update)
  const themeless = PRESETS.filter((p) => !p.patch.palette).map((p) => p.name)
  const tile = (p: Preset) => {
    const x = p.patch
    const palette = x.palette ?? a.palette
    const kind = x.bg?.kind ?? a.bg.kind
    const on = matches(p, a)
    return (
      <button
        key={p.id}
        type="button"
        role="radio"
        aria-checked={on}
        data-preset={p.id}
        onClick={() => update(p.patch)}
        className={`flex min-w-0 items-center gap-3 rounded-xl bg-raised p-2 pr-3 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          on ? 'ring-2 ring-accent' : 'ring-1 ring-line hover:ring-line-strong'
        }`}
      >
        <span className="relative block aspect-[16/10] w-20 shrink-0 overflow-hidden rounded-lg ring-1 ring-line">
          <MiniBoard
            palette={palette}
            scheme={resolveScheme(a.mode, palette, systemDark)}
            look={{
              style: x.style,
              radius: x.radius,
              density: x.density,
              gradient: kind === 'gradient' ? (x.bg?.gradient ?? a.bg.gradient) : null,
            }}
          />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-strong">
            <span className="truncate">{p.name}</span>
            {on && <Check className="h-3.5 w-3.5 shrink-0 text-accent-text" strokeWidth={2.5} />}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted">{p.blurb}</span>
        </span>
      </button>
    )
  }
  return (
    <Section data-presets title="Presets" description="A whole look in one click. Change anything afterwards.">
      {/* One radio group; the Y2K looks sit in their own block under the rest. */}
      <div role="radiogroup" aria-label="Presets" className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3">{PRESETS.filter((p) => !p.group).map(tile)}</div>
        <div data-preset-group="y2k">
          <p className="mb-2 text-xs font-medium text-soft">Y2K</p>
          <div className="grid grid-cols-3 gap-3">{PRESETS.filter((p) => p.group === 'y2k').map(tile)}</div>
        </div>
      </div>
      {themeless.length > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {listNames(themeless)} keep your current theme.
        </p>
      )}
    </Section>
  )
}

/** Data tab: the look as a file, to keep or to share. */
export function ThemeTransfer() {
  const a = useAppearance((s) => s.appearance)
  const update = useAppearance((s) => s.update)
  const [note, setNote] = useState<string | null>(null)
  return (
    <Row
      data-theme-transfer
      label="Theme"
      hint={<span aria-live="polite">{note ?? 'Palette, style, motion and background in one small file. A picture stays on this device.'}</span>}
    >
      <Actions>
        <Button
          onClick={() => {
            downloadJson(`stackboard-theme-${a.palette}-${a.style}.json`, themeFile(a))
            setNote('Theme saved as a file.')
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Export theme
        </Button>
        <Button
          onClick={async () => {
            try {
              const patch = readThemeFile(await pickJsonFile())
              if (!patch) return setNote('That file is not a Stackboard theme.')
              update(patch)
              setNote('Theme applied.')
            } catch (err) {
              setNote(`Couldn't read it: ${err instanceof Error ? err.message : String(err)}`)
            }
          }}
        >
          <Upload className="h-3.5 w-3.5" />
          Import theme
        </Button>
      </Actions>
    </Row>
  )
}

// ---------- Style tab ----------

export function StyleSection() {
  const a = useAppearance((s) => s.appearance)
  const update = useAppearance((s) => s.update)
  return (
    <div data-style-settings className="flex flex-col gap-9">
      <Section title="Surfaces" description="How panels, cards and dialogs are drawn. Colours always come from your theme.">
        <Group>
          <Row label="Style">
            <Segmented<Style>
              label="Style"
              columns={5}
              value={a.style}
              onChange={(style) => update({ style })}
              options={[
                { value: 'flat', label: 'Flat' },
                { value: 'glass', label: 'Liquid glass' },
                { value: 'floating', label: 'Floating' },
                { value: 'apple', label: 'Apple' },
                { value: 'brave', label: 'Brave' },
                { value: 'terminal', label: 'Terminal' },
                { value: 'retro', label: 'Retro OS' },
                { value: 'aero', label: 'Aero' },
                { value: 'chrome', label: 'Chrome' },
                { value: 'aqua', label: 'Aqua' },
              ]}
            />
          </Row>
          <Row label="Corners">
            <Segmented<Radius>
              label="Corners"
              value={a.radius}
              onChange={(radius) => update({ radius })}
              options={[
                { value: 'sharp', label: 'Sharp' },
                { value: 'soft', label: 'Soft' },
                { value: 'round', label: 'Round' },
              ]}
            />
          </Row>
        </Group>
      </Section>

      <Y2KSection />

      <Section title="Text and layout">
        <Group>
          <Row label="Font">
            <Segmented<Font>
              label="Font"
              value={a.font}
              onChange={(font) => update({ font })}
              options={[
                { value: 'system', label: 'System' },
                { value: 'rounded', label: 'Rounded' },
                { value: 'mono', label: 'Mono' },
                { value: 'serif', label: 'Serif' },
              ]}
            />
          </Row>
          <Row label="Density">
            <Segmented<Density>
              label="Density"
              value={a.density}
              onChange={(density) => update({ density })}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'spacious', label: 'Spacious' },
              ]}
            />
          </Row>
          <Row label="Cards">
            <Toggle
              label="Show each link’s site"
              hint="A second line under the title, like github.com."
              checked={a.details}
              onChange={(details) => update({ details })}
            />
          </Row>
        </Group>
      </Section>
    </div>
  )
}

/**
 * Gloss, glow, sparkles, reflections and pill shapes. In full for Aero, Chrome and Aqua; glass
 * takes the gloss and glow lightly; any other style gets a shortcut to the three.
 */
function Y2KSection() {
  const a = useAppearance((s) => s.appearance)
  const update = useAppearance((s) => s.update)
  const y = a.y2k
  const full = Y2K_STYLES.includes(a.style)
  const light = a.style === 'glass'
  const dot = (v: string) => <span aria-hidden className="h-2.5 w-2.5 rounded-full ring-1 ring-line-strong" style={{ background: v }} />
  const strengths = (
    <>
      <Row label="Gloss" hint={light ? 'Glass takes it lightly: the sheen on each pane.' : 'Highlights on panels, headers and buttons.'}>
        <Slider label="Gloss" value={y.gloss} max={100} unit="%" onChange={(gloss) => update({ y2k: { gloss } }, { gentle: true })} />
      </Row>
      <Row label="Glow" hint={light ? 'A faint halo around each pane.' : 'A soft halo around stacks and widgets.'}>
        <Slider label="Glow" value={y.glow} max={100} unit="%" onChange={(glow) => update({ y2k: { glow } }, { gentle: true })} />
      </Row>
      <Row label="Glow colour">
        <Segmented<GlowColor>
          label="Glow colour"
          value={y.glowColor}
          onChange={(glowColor) => update({ y2k: { glowColor } })}
          options={[
            { value: 'accent', label: 'Accent', icon: dot('var(--sb-accent)') },
            { value: 'brand', label: 'Second', icon: dot('var(--sb-brand-to)') },
            { value: 'mark', label: 'Highlight', icon: dot('var(--sb-accent-mark)') },
            { value: 'white', label: 'White', icon: dot('#ffffff') },
          ]}
        />
      </Row>
    </>
  )
  return (
    <Section
      data-y2k-settings
      data-active={full ? '' : undefined}
      title={
        <span className="inline-flex items-center gap-1.5">
          <Sparkles aria-hidden className={`h-3.5 w-3.5 ${full ? 'text-accent-text' : 'text-faint'}`} />
          Y2K
        </span>
      }
      description={
        full
          ? 'Gloss, glow and the little extras. Every change shows on the board behind this window.'
          : light
            ? 'Liquid glass takes gloss and glow lightly. The extras need Aero, Chrome or Aqua.'
            : 'Glossy panels, glows, sparkles and reflections come with the Aero, Chrome and Aqua styles.'
      }
    >
      {full && (
        <Group>
          {strengths}
          <Row label="Extras">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Toggle label="Sparkles" hint="Small four-point stars twinkle on panel corners." checked={y.sparkles} onChange={(sparkles) => update({ y2k: { sparkles } })} />
              <Toggle label="Reflections" hint="A soft mirror image under each stack and widget." checked={y.reflections} onChange={(reflections) => update({ y2k: { reflections } })} />
              <Toggle label="Pill shapes" hint="Buttons and headers turn into capsules." checked={y.pill} onChange={(pill) => update({ y2k: { pill } })} />
            </div>
          </Row>
        </Group>
      )}
      {light && <Group>{strengths}</Group>}
      {!full && (
        <Group className={light ? 'mt-3' : ''}>
          <Row label="Try a style">
            <Actions>
              {(['aero', 'chrome', 'aqua'] as const).map((style) => (
                <Button key={style} data-y2k-style={style} onClick={() => update({ style })}>
                  {style === 'aero' ? 'Aero' : style === 'chrome' ? 'Chrome' : 'Aqua'}
                </Button>
              ))}
            </Actions>
          </Row>
        </Group>
      )}
    </Section>
  )
}

// ---------- Motion tab ----------

export function MotionSection() {
  const m = useAppearance((s) => s.appearance.motion)
  const update = useAppearance((s) => s.update)
  const off = m.level === 'off'
  return (
    <div data-motion-settings className="flex flex-col gap-9">
      <Section
        title="Movement"
        description={off ? 'Everything stays still.' : 'If your system asks for reduced motion, that always wins.'}
        action={
          <Segmented<MotionLevel>
            label="Motion"
            value={m.level}
            onChange={(level) => update({ motion: { level } })}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'subtle', label: 'Subtle' },
              { value: 'full', label: 'Full' },
            ]}
          />
        }
      >
        <Group>
          <Row label="Space switch">
            <Segmented<SpaceTransition>
              label="Space switch"
              value={m.space}
              onChange={(space) => update({ motion: { space } })}
              options={[
                { value: 'none', label: 'Instant' },
                { value: 'fade', label: 'Fade' },
                { value: 'slide', label: 'Slide' },
                { value: 'zoom', label: 'Zoom' },
                { value: 'swipe', label: 'Swipe' },
                { value: 'blur', label: 'Blur' },
              ]}
            />
          </Row>
          <Row label="Card hover">
            <Segmented<HoverEffect>
              label="Card hover"
              value={m.hover}
              onChange={(hover) => update({ motion: { hover } })}
              options={[
                { value: 'none', label: 'None' },
                { value: 'lift', label: 'Lift' },
                { value: 'tilt', label: '3D tilt' },
                { value: 'glow', label: 'Glow' },
              ]}
            />
          </Row>
          <Row label="Entrance">
            <Segmented<Entrance>
              label="Entrance"
              value={m.entrance}
              onChange={(entrance) => update({ motion: { entrance } })}
              options={[
                { value: 'none', label: 'None' },
                { value: 'rise', label: 'Rise' },
                { value: 'stagger', label: 'Cascade' },
              ]}
            />
          </Row>
          <Row label="Drag and drop">
            <Toggle label="Springy drop" hint="Cards land with a small bounce." checked={m.spring} onChange={(spring) => update({ motion: { spring } })} />
          </Row>
        </Group>
      </Section>

      <Section title="Animated background" description="A slow layer behind your board, in your theme’s colours.">
        <Group>
          <Row label="Effect">
            <Segmented<Ambient>
              label="Animated background"
              columns={5}
              value={m.ambient}
              onChange={(ambient) => update({ motion: { ambient } })}
              options={[
                { value: 'none', label: 'None' },
                { value: 'aurora', label: 'Aurora' },
                { value: 'drift', label: 'Drift' },
                { value: 'bubbles', label: 'Bubbles' },
                { value: 'grid', label: 'Synth grid' },
                { value: 'scanlines', label: 'CRT lines' },
                { value: 'stars', label: 'Stars' },
                { value: 'waves', label: 'Waves' },
                { value: 'fireflies', label: 'Fireflies' },
                { value: 'lava', label: 'Lava' },
              ]}
            />
          </Row>
        </Group>
      </Section>
    </div>
  )
}

// ---------- Widgets tab ----------

export function WidgetSection() {
  const w = useWidgets((s) => s.settings)
  const update = useWidgets((s) => s.update)
  const [zones, setZones] = useState(w.zones.join(', '))
  const [zoneError, setZoneError] = useState<string | null>(null)

  const toggle = async (id: WidgetId, on: boolean) => {
    const info = WIDGETS.find((x) => x.id === id)
    if (on && info?.permission && typeof chrome !== 'undefined' && chrome.permissions) {
      // Asked inside the click, as the browser requires.
      const granted = await chrome.permissions.request({ permissions: [info.permission] }).catch(() => false)
      if (!granted) return
    }
    update({ enabled: { [id]: on } })
  }

  return (
    <div data-widget-settings className="flex flex-col gap-9">
      <Section title="Widgets" description="Clock and search sit above your stacks, the cards below them.">
        <Group>
          <Row label="Widget band">
            <Toggle
              tone="accent"
              label="Show widgets"
              hint="Turn the whole band on or off."
              checked={!w.collapsed}
              onChange={(v) => update({ collapsed: !v })}
            />
          </Row>
          <Row label="Show">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {WIDGETS.map((x) => (
                <Toggle key={x.id} label={x.name} hint={x.blurb} checked={w.enabled[x.id]} onChange={(v) => void toggle(x.id, v)} />
              ))}
            </div>
          </Row>
        </Group>
      </Section>

      <ClockSection />

      <Section title="Details">
        <Group>
          <Row label="Your name" hint="For the greeting.">
            <input className={`${fieldClass} w-56`} value={w.name} maxLength={40} placeholder="Alex" aria-label="Your name" onChange={(e) => update({ name: e.target.value })} />
          </Row>
          <Row label="Other zones" hint={zoneError ?? 'Up to four, by city name in the IANA list.'}>
            <input
              className={`${fieldClass} w-full`}
              value={zones}
              placeholder="America/New_York, Asia/Tokyo"
              aria-label="Other time zones"
              onChange={(e) => setZones(e.target.value)}
              onBlur={() => {
                const list = zones.split(',').map((z) => z.trim()).filter(Boolean)
                const bad = list.filter((z) => !isZone(z))
                setZoneError(bad.length ? `Unknown zone: ${bad.join(', ')}` : null)
                update({ zones: list.filter(isZone) })
              }}
            />
          </Row>
          <Row label="Search with">
            <select className={`${fieldClass} w-56`} value={w.engine} onChange={(e) => update({ engine: e.target.value as EngineId })} aria-label="Search engine">
              {(Object.keys(ENGINES) as EngineId[]).map((id) => (
                <option key={id} value={id}>
                  {ENGINES[id].name}
                </option>
              ))}
            </select>
          </Row>
          <WeatherRow />
          <Row label="Countdown">
            <div className="flex flex-wrap gap-2">
              <input className={`${fieldClass} w-44`} value={w.countdown.label} maxLength={40} placeholder="What for" onChange={(e) => update({ countdown: { label: e.target.value } })} aria-label="Countdown label" />
              <input className={fieldClass} type="date" value={w.countdown.date} onChange={(e) => update({ countdown: { date: e.target.value } })} aria-label="Countdown date" />
            </div>
          </Row>
          <Row label="Focus timer">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <input className={`${fieldClass} w-16`} type="number" min={1} max={120} value={w.pomodoro.work} onChange={(e) => update({ pomodoro: { work: Number(e.target.value) } })} aria-label="Focus minutes" />
              <span className="mr-2">min focus</span>
              <input className={`${fieldClass} w-16`} type="number" min={1} max={60} value={w.pomodoro.rest} onChange={(e) => update({ pomodoro: { rest: Number(e.target.value) } })} aria-label="Break minutes" />
              <span>min break</span>
            </div>
          </Row>
        </Group>
      </Section>
    </div>
  )
}

const FONT_NAMES: Record<ClockFont, string> = { system: 'System', bold: 'Bold', thin: 'Thin', serif: 'Serif', mono: 'Mono', rounded: 'Rounded' }
const EFFECT_NAMES: Record<ClockEffect, string> = { none: 'None', glow: 'Glow', neon: 'Neon', shadow: 'Shadow', outline: 'Outline', glass: 'Glass' }

/** The clock's look. Font and effect tiles show the time the way the board will draw it. */
function ClockSection() {
  const c = useWidgets((s) => s.settings.clock)
  const update = useWidgets((s) => s.update)
  const set = (clock: Partial<typeof c>) => update({ clock })
  const sample = '12:34'
  const tile = (on: boolean) =>
    `relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-lg bg-canvas transition-shadow ${
      on ? 'ring-2 ring-accent ring-offset-2 ring-offset-raised' : 'ring-1 ring-line group-hover/tile:ring-line-strong'
    } group-focus-visible/tile:ring-2 group-focus-visible/tile:ring-focus`
  return (
    <Section data-clock-settings title="Clock" description="Right-click the clock on the board for the quick options.">
      <Group>
        <Row label="Position">
          <Segmented<ClockPosition>
            label="Clock position"
            value={c.position}
            onChange={(position) => set({ position })}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Centre' },
              { value: 'right', label: 'Right' },
            ]}
          />
        </Row>
        <Row label="Size">
          <Segmented<ClockSize>
            label="Clock size"
            value={c.size}
            onChange={(size) => set({ size })}
            options={[
              { value: 's', label: 'Small' },
              { value: 'm', label: 'Medium' },
              { value: 'l', label: 'Large' },
              { value: 'xl', label: 'Extra large' },
            ]}
          />
        </Row>
        <div className="p-4">
          <SubLabel aside={FONT_NAMES[c.font]}>Font</SubLabel>
          <div role="radiogroup" aria-label="Clock font" className="grid grid-cols-6 gap-2">
            {CLOCK_FONTS.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={c.font === f}
                aria-label={FONT_NAMES[f]}
                data-clock-font-option={f}
                onClick={() => set({ font: f })}
                className="group/tile flex min-w-0 flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none"
              >
                <span className={tile(c.font === f)} data-clock-font={f}>
                  <span data-clock-time className="text-[22px] leading-none text-strong tabular-nums">
                    <span data-clock-main>{sample}</span>
                  </span>
                </span>
                <span className={`max-w-full truncate text-[11px] ${c.font === f ? 'font-medium text-strong' : 'text-muted'}`}>{FONT_NAMES[f]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          <SubLabel aside={EFFECT_NAMES[c.effect]}>Effect</SubLabel>
          <div role="radiogroup" aria-label="Clock effect" className="grid grid-cols-6 gap-2">
            {CLOCK_EFFECTS.map((fx) => (
              <button
                key={fx}
                type="button"
                role="radio"
                aria-checked={c.effect === fx}
                aria-label={EFFECT_NAMES[fx]}
                data-clock-effect-option={fx}
                onClick={() => set({ effect: fx })}
                className="group/tile flex min-w-0 flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none"
              >
                <span className={tile(c.effect === fx)} data-clock-font={c.font}>
                  <span data-clock-effect={fx} data-clock-sample>
                    <span data-clock-time className="text-[22px] leading-none text-strong tabular-nums">
                      <span data-clock-main>{sample}</span>
                    </span>
                  </span>
                </span>
                <span className={`max-w-full truncate text-[11px] ${c.effect === fx ? 'font-medium text-strong' : 'text-muted'}`}>{EFFECT_NAMES[fx]}</span>
              </button>
            ))}
          </div>
        </div>
        <Row label="Show">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Toggle label="Greeting" checked={c.greeting} onChange={(greeting) => set({ greeting })} />
            <Toggle label="Date" checked={c.date} onChange={(date) => set({ date })} />
            <Toggle label="Seconds" checked={c.seconds} onChange={(seconds) => set({ seconds })} />
            <Toggle label="24-hour" checked={c.h24} onChange={(h24) => set({ h24 })} />
            <Toggle label="Blinking colon" hint="Rests when motion is off." checked={c.blink} onChange={(blink) => set({ blink })} />
            <Toggle label="Glow on hover" hint="A soft halo in your accent." checked={c.hoverGlow} onChange={(hoverGlow) => set({ hoverGlow })} />
          </div>
        </Row>
      </Group>
    </Section>
  )
}

/** The weather city, set right here: the Weather card may well be off. */
function WeatherRow() {
  const weather = useWidgets((s) => s.settings.weather)
  const update = useWidgets((s) => s.update)
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const find = async () => {
    const name = city.trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      const hit = await geocodeCity(name)
      if (!hit) setError(`No place called “${name}” found.`)
      else {
        update({ weather: hit })
        setCity('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const unit = (
    <Segmented<'c' | 'f'>
      label="Temperature unit"
      value={weather.unit}
      onChange={(u) => update({ weather: { unit: u } })}
      options={[
        { value: 'c', label: '°C' },
        { value: 'f', label: '°F' },
      ]}
    />
  )

  return (
    <Row label="Weather" hint={error ?? (weather.lat === null ? 'Looked up once with Open-Meteo, no account.' : undefined)}>
      {weather.lat !== null ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-fg">{weather.city}</span>
          <Button variant="quiet" onClick={() => update({ weather: { city: '', lat: null, lon: null } })}>
            Change city
          </Button>
          {unit}
        </div>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void find()
          }}
        >
          <input className={`${fieldClass} w-44`} value={city} placeholder="City" aria-label="Weather city" onChange={(e) => setCity(e.target.value)} />
          <Button type="submit" disabled={busy || !city.trim()}>
            {busy ? 'Finding…' : 'Set city'}
          </Button>
          {unit}
        </form>
      )}
    </Row>
  )
}
