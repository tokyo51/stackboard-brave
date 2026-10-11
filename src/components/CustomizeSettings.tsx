import { useId, useState, type ReactNode } from 'react'
import { Check, Download, Upload } from 'lucide-react'
import { resolveScheme, type Ambient, type Density, type Entrance, type Font, type HoverEffect, type MotionLevel, type Radius, type SpaceTransition, type Style } from '../lib/appearance'
import { PRESETS, type Preset } from '../lib/presets'
import { readThemeFile, themeFile } from '../lib/themeFile'
import { downloadJson, pickJsonFile } from '../lib/tabs'
import { ENGINES, WIDGETS, isZone, type EngineId, type WidgetId } from '../lib/widgets'
import { useAppearance } from '../store/useAppearance'
import { useWidgets } from '../store/useWidgets'
import { MiniBoard, RowLabel, Segmented } from './AppearanceSettings'

// Fork: the Settings sections beyond palette and background. Every control applies at once to
// the board behind the dialog, which is the preview.

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3 id={id} className="mb-2.5 scroll-mt-14 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </h3>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-x-3 gap-y-3.5">{children}</div>
}

export function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-4.5 w-8 rounded-full bg-line-strong transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-focus" />
        <span className="absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-card shadow-xs transition-transform peer-checked:translate-x-3.5" />
      </span>
      <span className="min-w-0 text-xs leading-snug">
        <span className="block font-medium text-fg">{props.label}</span>
        {props.hint && <span className="block text-muted">{props.hint}</span>}
      </span>
    </label>
  )
}

const input =
  'rounded-md border border-line-strong bg-card px-2 py-1 text-xs text-fg outline-none placeholder:text-muted focus:border-accent-line focus-visible:ring-2 focus-visible:ring-focus/30'

// ---------- Presets ----------

function matches(p: Preset, a: ReturnType<typeof useAppearance.getState>['appearance']): boolean {
  const x = p.patch
  return (
    (!x.palette || x.palette === a.palette) &&
    x.style === a.style &&
    x.radius === a.radius &&
    x.font === a.font &&
    x.density === a.density &&
    x.details === a.details &&
    JSON.stringify(x.motion) === JSON.stringify(a.motion)
  )
}

export function PresetSection() {
  const a = useAppearance((s) => s.appearance)
  const systemDark = useAppearance((s) => s.systemDark)
  const update = useAppearance((s) => s.update)
  return (
    <section data-presets>
      <SectionTitle id="settings-look">Presets</SectionTitle>
      <div role="radiogroup" aria-label="Presets" className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => {
          const palette = p.patch.palette ?? a.palette
          const on = matches(p, a)
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-preset={p.id}
              onClick={() => update(p.patch)}
              className={`group/preset flex min-w-0 items-center gap-2.5 rounded-lg p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                on ? 'bg-accent-soft ring-1 ring-accent-line' : 'ring-1 ring-line hover:bg-hover'
              }`}
            >
              <span className="relative block aspect-[16/10] w-14 shrink-0 overflow-hidden rounded-md ring-1 ring-line">
                <MiniBoard palette={palette} scheme={resolveScheme(a.mode, palette, systemDark)} />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="flex items-center gap-1 text-xs font-semibold text-strong">
                  <span className="truncate">{p.name}</span>
                  {on && <Check className="h-3 w-3 shrink-0 text-accent-text" />}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] text-muted">{p.blurb}</span>
              </span>
            </button>
          )
        })}
      </div>
      <ThemeTransfer />
    </section>
  )
}

function ThemeTransfer() {
  const a = useAppearance((s) => s.appearance)
  const update = useAppearance((s) => s.update)
  const [note, setNote] = useState<string | null>(null)
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          downloadJson(`stackboard-theme-${a.palette}-${a.style}.json`, themeFile(a))
          setNote('Theme saved as a file.')
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-card px-2.5 py-1 text-xs font-medium text-fg hover:bg-hover"
      >
        <Download className="h-3.5 w-3.5" />
        Export theme
      </button>
      <button
        type="button"
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
        className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-card px-2.5 py-1 text-xs font-medium text-fg hover:bg-hover"
      >
        <Upload className="h-3.5 w-3.5" />
        Import theme
      </button>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  )
}

// ---------- Style ----------

export function StyleSection() {
  const a = useAppearance((s) => s.appearance)
  const update = useAppearance((s) => s.update)
  return (
    <section data-style-settings>
      <SectionTitle id="settings-style">Style</SectionTitle>
      <Grid>
        <RowLabel>Surfaces</RowLabel>
        <Segmented<Style>
          label="Style"
          value={a.style}
          onChange={(style) => update({ style })}
          options={[
            { value: 'flat', label: 'Flat' },
            { value: 'glass', label: 'Liquid glass' },
            { value: 'aero', label: 'Aero' },
            { value: 'floating', label: 'Floating' },
            { value: 'terminal', label: 'Terminal' },
            { value: 'retro', label: 'Retro OS' },
          ]}
        />
        <RowLabel>Corners</RowLabel>
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
        <RowLabel>Font</RowLabel>
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
        <RowLabel>Density</RowLabel>
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
        <RowLabel>Cards</RowLabel>
        <Toggle label="Show each link’s site" hint="A second line under the title, like github.com." checked={a.details} onChange={(details) => update({ details })} />
      </Grid>
    </section>
  )
}

// ---------- Motion ----------

export function MotionSection() {
  const m = useAppearance((s) => s.appearance.motion)
  const update = useAppearance((s) => s.update)
  const off = m.level === 'off'
  return (
    <section data-motion-settings>
      <SectionTitle id="settings-motion">Motion</SectionTitle>
      <Grid>
        <RowLabel>Amount</RowLabel>
        <div>
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
          <p className="mt-1.5 text-xs text-muted">
            {off ? 'Everything stays still.' : 'If your system asks for reduced motion, that always wins.'}
          </p>
        </div>
        <RowLabel>Space switch</RowLabel>
        <Segmented<SpaceTransition>
          label="Space switch"
          value={m.space}
          onChange={(space) => update({ motion: { space } })}
          options={[
            { value: 'none', label: 'Instant' },
            { value: 'fade', label: 'Fade' },
            { value: 'slide', label: 'Slide' },
            { value: 'zoom', label: 'Zoom' },
          ]}
        />
        <RowLabel>Card hover</RowLabel>
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
        <RowLabel>Entrance</RowLabel>
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
        <RowLabel>Background</RowLabel>
        <Segmented<Ambient>
          label="Animated background"
          value={m.ambient}
          onChange={(ambient) => update({ motion: { ambient } })}
          options={[
            { value: 'none', label: 'None' },
            { value: 'aurora', label: 'Aurora' },
            { value: 'drift', label: 'Drift' },
            { value: 'bubbles', label: 'Bubbles' },
            { value: 'grid', label: 'Synth grid' },
            { value: 'scanlines', label: 'CRT lines' },
          ]}
        />
        <RowLabel>Drag and drop</RowLabel>
        <Toggle label="Springy drop" hint="Cards land with a small bounce." checked={m.spring} onChange={(spring) => update({ motion: { spring } })} />
      </Grid>
    </section>
  )
}

// ---------- Widgets ----------

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
    <section data-widget-settings>
      <SectionTitle id="settings-widgets">Widgets</SectionTitle>
      <div className="mb-3">
        <Toggle label="Show the widget band" hint="Clock, search and cards above your stacks." checked={!w.collapsed} onChange={(v) => update({ collapsed: !v })} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {WIDGETS.map((x) => (
          <Toggle
            key={x.id}
            label={x.name}
            hint={x.blurb}
            checked={w.enabled[x.id]}
            onChange={(v) => void toggle(x.id, v)}
          />
        ))}
      </div>

      <div className="mt-4">
        <Grid>
          <RowLabel>Your name</RowLabel>
          <input className={`${input} w-48`} value={w.name} maxLength={40} placeholder="For the greeting" onChange={(e) => update({ name: e.target.value })} />
          <RowLabel>Clock</RowLabel>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Toggle label="24-hour" checked={w.h24} onChange={(h24) => update({ h24 })} />
            <Toggle label="Seconds" checked={w.seconds} onChange={(seconds) => update({ seconds })} />
          </div>
          <RowLabel>Other zones</RowLabel>
          <div>
            <input
              className={`${input} w-full`}
              value={zones}
              placeholder="America/New_York, Asia/Tokyo"
              onChange={(e) => setZones(e.target.value)}
              onBlur={() => {
                const list = zones.split(',').map((z) => z.trim()).filter(Boolean)
                const bad = list.filter((z) => !isZone(z))
                setZoneError(bad.length ? `Unknown zone: ${bad.join(', ')}` : null)
                update({ zones: list.filter(isZone) })
              }}
            />
            <p className="mt-1 text-xs text-muted">{zoneError ?? 'Up to four, by city name in the IANA list.'}</p>
          </div>
          <RowLabel>Search with</RowLabel>
          <select className={`${input} w-48`} value={w.engine} onChange={(e) => update({ engine: e.target.value as EngineId })} aria-label="Search engine">
            {(Object.keys(ENGINES) as EngineId[]).map((id) => (
              <option key={id} value={id}>
                {ENGINES[id].name}
              </option>
            ))}
          </select>
          <RowLabel>Weather</RowLabel>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg">{w.weather.city || 'No city yet (set it on the card)'}</span>
            {w.weather.lat !== null && (
              <button type="button" className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline" onClick={() => update({ weather: { city: '', lat: null, lon: null } })}>
                Change city
              </button>
            )}
            <Segmented<'c' | 'f'>
              label="Temperature unit"
              value={w.weather.unit}
              onChange={(unit) => update({ weather: { unit } })}
              options={[
                { value: 'c', label: '°C' },
                { value: 'f', label: '°F' },
              ]}
            />
          </div>
          <RowLabel>Countdown</RowLabel>
          <div className="flex flex-wrap gap-2">
            <input className={`${input} w-40`} value={w.countdown.label} maxLength={40} placeholder="What for" onChange={(e) => update({ countdown: { label: e.target.value } })} aria-label="Countdown label" />
            <input className={input} type="date" value={w.countdown.date} onChange={(e) => update({ countdown: { date: e.target.value } })} aria-label="Countdown date" />
          </div>
          <RowLabel>Focus timer</RowLabel>
          <div className="flex items-center gap-2 text-xs text-muted">
            <input className={`${input} w-14`} type="number" min={1} max={120} value={w.pomodoro.work} onChange={(e) => update({ pomodoro: { work: Number(e.target.value) } })} aria-label="Focus minutes" />
            min focus
            <input className={`${input} w-14`} type="number" min={1} max={60} value={w.pomodoro.rest} onChange={(e) => update({ pomodoro: { rest: Number(e.target.value) } })} aria-label="Break minutes" />
            min break
          </div>
        </Grid>
      </div>
    </section>
  )
}
