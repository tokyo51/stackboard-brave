import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  Calculator,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Flag,
  Gauge,
  Globe,
  ListTodo,
  NotebookPen,
  Pause,
  Play,
  Quote,
  RotateCcw,
  Search,
  Shuffle,
  SkipForward,
  Sun,
  Timer,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import {
  QUOTES,
  calculate,
  daysUntil,
  greeting,
  monthGrid,
  nextNewYear,
  progressOf,
  quoteIndexFor,
  resolveSearch,
  skyOf,
  type Sky,
  type WidgetId,
} from '../lib/widgets'
import { searchTree } from '../lib/search'
import { faviconUrl } from '../lib/favicon'
import { openHere, openInNewTab } from '../lib/tabs'
import { useStackableStore } from '../store/useStackableStore'
import { useWidgets, type Todo } from '../store/useWidgets'

// Fork: the widget band above the stacks (Settings > Widgets). A hero row with the clock and
// search, then a grid of cards. Every card is a data-surface="widget", so the board styles
// (glass, aero, floating, terminal, retro) and the entrance animation apply to it too.

/** The current time, re-rendered on the next whole second or minute. */
function useNow(every: 'second' | 'minute'): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const tick = () => {
      const d = new Date()
      setNow(d)
      const ms = every === 'second' ? 1000 - d.getMilliseconds() : 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds())
      t = setTimeout(tick, ms + 5)
    }
    tick()
    return () => clearTimeout(t)
  }, [every])
  return now
}

// The board's words are English, so dates are too (en-GB reads day-month and 24-hour naturally).
const locale = 'en-GB'

export function WidgetBand() {
  const settings = useWidgets((s) => s.settings)
  const on = settings.enabled
  if (settings.collapsed) return null
  const cards: Array<[WidgetId, () => ReactNode]> = [
    ['todo', () => <TodoCard />],
    ['notes', () => <NotesCard />],
    ['weather', () => <WeatherCard />],
    ['calendar', () => <CalendarCard />],
    ['quote', () => <QuoteCard />],
    ['pomodoro', () => <PomodoroCard />],
    ['countdown', () => <CountdownCard />],
    ['progress', () => <ProgressCard />],
    ['topsites', () => <TopSitesCard />],
    ['calculator', () => <CalculatorCard />],
  ]
  const shown = cards.filter(([id]) => on[id])
  if (!on.clock && !on.search && !shown.length) return null
  return (
    <section data-widgets aria-label="Widgets" className="mb-8 compact:mb-6">
      {(on.clock || on.search) && (
        <div className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-5 compact:mb-4">
          {on.clock && <ClockHero />}
          {on.search && <SearchBox />}
        </div>
      )}
      {shown.length > 0 && (
        <div
          data-widget-grid
          className="grid grid-cols-[repeat(auto-fill,minmax(244px,1fr))] items-start gap-6 compact:grid-cols-[repeat(auto-fill,minmax(212px,1fr))] compact:gap-4"
        >
          {shown.map(([id, render], i) => (
            <WidgetShell key={id} index={i} id={id}>
              {render()}
            </WidgetShell>
          ))}
        </div>
      )}
    </section>
  )
}

function WidgetShell({ id, index, children }: { id: WidgetId; index: number; children: ReactNode }) {
  return (
    <section
      data-surface="widget"
      data-widget={id}
      style={{ '--i': index } as CSSProperties}
      className="flex min-w-0 flex-col rounded-xl border border-line bg-card p-3.5 text-sm text-fg wallpaper:bg-panel/70 wallpaper:backdrop-blur-xl"
    >
      {children}
    </section>
  )
}

function CardHeader({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <header className="mb-2.5 flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
      <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-fg">{title}</h3>
      {children}
    </header>
  )
}

const iconButton =
  'rounded p-1 text-faint hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

// ---------- Clock ----------

function ClockHero() {
  const { name, h24, seconds, zones } = useWidgets((s) => s.settings)
  const now = useNow(seconds ? 'second' : 'minute')
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: !h24 }).formatToParts(now)
  const main = time.filter((p) => p.type !== 'dayPeriod').map((p) => p.value).join('').trim()
  const period = time.find((p) => p.type === 'dayPeriod')?.value
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  return (
    <div data-clock className="on-wallpaper min-w-0">
      <p className="text-sm font-medium text-muted">
        {greeting(now.getHours())}
        {name ? `, ${name}` : ''}
      </p>
      <p className="mt-0.5 flex items-baseline gap-1.5 font-semibold leading-none tracking-tight text-strong tabular-nums">
        <span className="text-[56px] compact:text-[44px]">{main}</span>
        {seconds && <span className="text-2xl text-muted">{String(now.getSeconds()).padStart(2, '0')}</span>}
        {period && <span className="text-xl text-muted">{period}</span>}
      </p>
      <p className="mt-1.5 text-sm text-soft">{date}</p>
      {zones.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted tabular-nums">
          {zones.map((z) => (
            <span key={z}>
              {z.split('/').pop()?.replace(/_/g, ' ')}{' '}
              <span className="text-fg">
                {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: !h24, timeZone: z }).format(now)}
              </span>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}

// ---------- Search ----------

function SearchBox() {
  const engine = useWidgets((s) => s.settings.engine)
  const tree = useStackableStore((s) => s.tree)
  const openTabs = useStackableStore((s) => s.openTabs)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(-1)
  const hits = useMemo(() => {
    if (!tree || q.trim().length < 2 || q.includes('!')) return []
    return searchTree(tree, q)
      .flatMap((g) => g.hits.map((b) => ({ b, where: `${g.space.name} › ${g.stack.title}` })))
      .slice(0, 5)
  }, [tree, q])
  const target = resolveSearch(q, engine)

  const go = (newTab: boolean) => {
    const url = active >= 0 && hits[active] ? hits[active].b.url : target?.url
    if (!url) return
    if (newTab) void openInNewTab(url, false)
    else void openHere(url, openTabs)
    if (newTab) setQ('')
  }

  return (
    <div data-search className="relative min-w-[260px] max-w-2xl flex-1">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          go(false)
        }}
        className="flex items-center gap-2 rounded-xl border border-line-strong bg-card px-3.5 py-2.5 shadow-xs focus-within:border-accent-line focus-within:ring-2 focus-within:ring-focus/30 wallpaper:bg-panel/80 wallpaper:backdrop-blur-xl"
      >
        <Search className="h-4 w-4 shrink-0 text-faint" aria-hidden />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(-1)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && hits.length) {
              e.preventDefault()
              setActive((a) => (a + 1) % hits.length)
            } else if (e.key === 'ArrowUp' && hits.length) {
              e.preventDefault()
              setActive((a) => (a <= 0 ? hits.length - 1 : a - 1))
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              go(true)
            } else if (e.key === 'Escape') {
              setQ('')
            }
          }}
          aria-label="Search the web or your links"
          placeholder="Search, type an address, or try !yt, !gh, !w"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-strong outline-none placeholder:text-muted"
        />
        {target && (
          <span className="shrink-0 rounded-md bg-sunken px-1.5 py-0.5 text-[11px] text-muted ring-1 ring-line">
            {active >= 0 ? 'Your link' : target.via}
          </span>
        )}
      </form>
      {hits.length > 0 && (
        <ul
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-line bg-raised py-1 shadow-float"
        >
          {hits.map(({ b, where }, i) => (
            <li key={b.id} role="option" aria-selected={i === active}>
              <a
                href={b.url}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center gap-2.5 px-3 py-1.5 text-sm ${i === active ? 'bg-selected text-strong' : 'text-fg'}`}
              >
                <img src={faviconUrl(b.url, 16)} alt="" className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{b.title}</span>
                <span className="shrink-0 truncate text-xs text-muted">{where}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------- To-do ----------

function TodoCard() {
  const todos = useWidgets((s) => s.data.todos)
  const setData = useWidgets((s) => s.setData)
  const [text, setText] = useState('')
  const left = todos.filter((t) => !t.done).length
  const change = (fn: (t: Todo[]) => Todo[]) => setData((d) => ({ ...d, todos: fn(d.todos) }))
  return (
    <>
      <CardHeader icon={ListTodo} title="To-do">
        <span className="text-xs tabular-nums text-muted">{todos.length ? `${left} left` : ''}</span>
        {todos.some((t) => t.done) && (
          <button className="ml-1 text-xs text-muted hover:text-fg" onClick={() => change((t) => t.filter((x) => !x.done))}>
            Clear done
          </button>
        )}
      </CardHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const v = text.trim()
          if (!v) return
          change((t) => [...t, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: v, done: false }])
          setText('')
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task and press Enter"
          aria-label="New task"
          className="w-full rounded-md border border-line bg-sunken px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-accent-line"
        />
      </form>
      {todos.length > 0 && (
        <ul className="no-scrollbar mt-2 flex max-h-56 flex-col gap-0.5 overflow-y-auto">
          {todos.map((t) => (
            <li key={t.id} className="group/todo flex items-center gap-2 rounded-md px-1 py-1 hover:bg-hover">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => change((all) => all.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                className="h-3.5 w-3.5 shrink-0 accent-accent"
                aria-label={`Done: ${t.text}`}
              />
              <span className={`min-w-0 flex-1 truncate ${t.done ? 'text-muted line-through' : ''}`}>{t.text}</span>
              <button
                onClick={() => change((all) => all.filter((x) => x.id !== t.id))}
                className={`${iconButton} opacity-0 group-hover/todo:opacity-100 focus-visible:opacity-100`}
                aria-label={`Delete ${t.text}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ---------- Notes ----------

function NotesCard() {
  const notes = useWidgets((s) => s.data.notes)
  const setData = useWidgets((s) => s.setData)
  return (
    <>
      <CardHeader icon={NotebookPen} title="Notes">
        <span className="text-xs tabular-nums text-muted">{notes ? `${notes.length.toLocaleString()} chars` : ''}</span>
      </CardHeader>
      <textarea
        value={notes}
        onChange={(e) => {
          const v = e.target.value
          setData((d) => ({ ...d, notes: v }))
        }}
        rows={6}
        placeholder="Anything worth keeping. Saved as you type."
        aria-label="Notes"
        className="no-scrollbar w-full resize-y rounded-md border border-line bg-sunken px-2.5 py-2 text-sm leading-relaxed text-fg outline-none placeholder:text-muted focus:border-accent-line"
      />
    </>
  )
}

// ---------- Quote ----------

function QuoteCard() {
  const now = useNow('minute')
  const [offset, setOffset] = useState(0)
  const q = QUOTES[(quoteIndexFor(now) + offset) % QUOTES.length]
  return (
    <>
      <CardHeader icon={Quote} title="Quote of the day">
        <button className={iconButton} onClick={() => setOffset((o) => o + 1)} aria-label="Another quote" title="Another quote">
          <Shuffle className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      <blockquote className="text-[15px] leading-snug text-strong text-pretty">“{q.text}”</blockquote>
      <p className="mt-2 text-xs text-muted">{q.by}</p>
    </>
  )
}

// ---------- Calendar ----------

function CalendarCard() {
  const now = useNow('minute')
  const [shift, setShift] = useState(0)
  const view = new Date(now.getFullYear(), now.getMonth() + shift, 1)
  const weeks = monthGrid(view.getFullYear(), view.getMonth())
  const isThisMonth = shift === 0
  const dayNames = useMemo(() => {
    const monday = new Date(2024, 0, 1) // a Monday
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(monday.getTime() + i * 86_400_000)),
    )
  }, [])
  return (
    <>
      <CardHeader icon={CalendarDays} title={new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(view)}>
        <button className={iconButton} onClick={() => setShift((s) => s - 1)} aria-label="Previous month">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {!isThisMonth && (
          <button className="text-xs text-muted hover:text-fg" onClick={() => setShift(0)}>
            Today
          </button>
        )}
        <button className={iconButton} onClick={() => setShift((s) => s + 1)} aria-label="Next month">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      <table className="w-full table-fixed text-center text-xs tabular-nums">
        <thead>
          <tr>
            {dayNames.map((d, i) => (
              <th key={i} className="pb-1 font-medium text-muted">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, i) => (
            <tr key={i}>
              {w.map((d, j) => {
                const today = isThisMonth && d === now.getDate()
                return (
                  <td key={j} className="p-0.5">
                    {d && (
                      <span
                        className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${
                          today ? 'bg-accent font-semibold text-on-accent' : j >= 5 ? 'text-muted' : 'text-fg'
                        }`}
                      >
                        {d}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

// ---------- Focus timer ----------

function chime(): void {
  try {
    const ctx = new AudioContext()
    const play = (freq: number, at: number) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = freq
      o.type = 'sine'
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at)
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.9)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + at)
      o.stop(ctx.currentTime + at + 1)
    }
    play(880, 0)
    play(1318.5, 0.18)
    setTimeout(() => void ctx.close(), 1600)
  } catch {
    // no audio: the phase still flips
  }
}

function PomodoroCard() {
  const { work, rest } = useWidgets((s) => s.settings.pomodoro)
  const p = useWidgets((s) => s.data.pomodoro)
  const setData = useWidgets((s) => s.setData)
  const running = p.endsAt !== null
  const now = useNow('second')
  const total = (p.phase === 'work' ? work : rest) * 60_000
  const left = running ? Math.max(0, p.endsAt! - now.getTime()) : (p.left ?? total)
  const done = useRef(false)

  useEffect(() => {
    if (!running || left > 0) {
      done.current = false
      return
    }
    if (done.current) return
    done.current = true
    chime()
    const next = p.phase === 'work' ? 'rest' : 'work'
    setData((d) => ({ ...d, pomodoro: { phase: next, endsAt: null, left: null } }))
  }, [running, left, p.phase, setData])

  const set = (pomodoro: typeof p) => setData((d) => ({ ...d, pomodoro }))
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0')
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0')
  const R = 34
  const C = 2 * Math.PI * R
  const frac = total ? left / total : 0
  return (
    <>
      <CardHeader icon={Timer} title={p.phase === 'work' ? 'Focus' : 'Break'}>
        <span className="text-xs text-muted">
          {work}/{rest} min
        </span>
      </CardHeader>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0 -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={R} fill="none" stroke="var(--sb-line)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke={p.phase === 'work' ? 'var(--sb-accent)' : 'var(--sb-brand-to)'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            style={{ transition: 'stroke-dashoffset 900ms linear' }}
          />
        </svg>
        <div className="min-w-0">
          <p className="text-3xl font-semibold tabular-nums text-strong" aria-live="polite">
            {mm}:{ss}
          </p>
          <div className="mt-1.5 flex gap-1">
            <button
              onClick={() => set(running ? { ...p, endsAt: null, left } : { ...p, endsAt: Date.now() + left, left: null })}
              className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-on-accent hover:bg-accent-hover"
            >
              {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {running ? 'Pause' : p.left ? 'Resume' : 'Start'}
            </button>
            <button className={iconButton} onClick={() => set({ phase: p.phase, endsAt: null, left: null })} aria-label="Reset" title="Reset">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              className={iconButton}
              onClick={() => set({ phase: p.phase === 'work' ? 'rest' : 'work', endsAt: null, left: null })}
              aria-label="Skip to next round"
              title="Skip"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- Countdown ----------

function CountdownCard() {
  const { label, date } = useWidgets((s) => s.settings.countdown)
  const now = useNow('minute')
  const target = date || nextNewYear(now)
  const days = daysUntil(target, now) ?? 0
  const pretty = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${target}T00:00`))
  return (
    <>
      <CardHeader icon={Flag} title={label || 'Countdown'} />
      <p className="text-4xl font-semibold leading-none tabular-nums text-strong">
        {Math.abs(days).toLocaleString()}
        <span className="ml-1.5 text-base font-medium text-muted">{Math.abs(days) === 1 ? 'day' : 'days'}</span>
      </p>
      <p className="mt-1.5 text-xs text-muted">
        {days > 0 ? `until ${pretty}` : days === 0 ? `Today is the day` : `since ${pretty}`}
      </p>
    </>
  )
}

// ---------- Progress ----------

function ProgressCard() {
  const now = useNow('minute')
  const p = progressOf(now)
  const rows: Array<[string, number]> = [
    ['Day', p.day],
    ['Week', p.week],
    ['Month', p.month],
    ['Year', p.year],
  ]
  return (
    <>
      <CardHeader icon={Gauge} title="Progress" />
      <dl className="flex flex-col gap-2">
        {rows.map(([label, v]) => (
          <div key={label} className="grid grid-cols-[3.25rem_minmax(0,1fr)_2.75rem] items-center gap-2 text-xs">
            <dt className="text-muted">{label}</dt>
            <dd className="h-1.5 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(v * 100).toFixed(1)}%` }} />
            </dd>
            <dd className="text-right tabular-nums text-fg">{Math.floor(v * 100)}%</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

// ---------- Weather ----------

const SKY_ICON: Record<Sky, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
}

interface Forecast {
  temp: number
  feels: number
  code: number
  days: Array<{ date: string; code: number; max: number; min: number }>
}

const WEATHER_CACHE = 'weatherCache'
const WEATHER_TTL = 30 * 60_000

async function fetchForecast(lat: number, lon: number, unit: 'c' | 'f'): Promise<Forecast> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)},${unit}`
  const hasStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local
  if (hasStorage) {
    const got = (await chrome.storage.local.get(WEATHER_CACHE))[WEATHER_CACHE] as { key: string; at: number; data: Forecast } | undefined
    if (got && got.key === key && Date.now() - got.at < WEATHER_TTL) return got.data
  }
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,apparent_temperature,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=4&timezone=auto' +
    (unit === 'f' ? '&temperature_unit=fahrenheit' : '')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather service answered ${res.status}`)
  const j = await res.json()
  const data: Forecast = {
    temp: j.current.temperature_2m,
    feels: j.current.apparent_temperature,
    code: j.current.weather_code,
    days: (j.daily.time as string[]).slice(1, 4).map((date, i) => ({
      date,
      code: j.daily.weather_code[i + 1],
      max: j.daily.temperature_2m_max[i + 1],
      min: j.daily.temperature_2m_min[i + 1],
    })),
  }
  if (hasStorage) await chrome.storage.local.set({ [WEATHER_CACHE]: { key, at: Date.now(), data } })
  return data
}

export async function geocodeCity(name: string): Promise<{ city: string; lat: number; lon: number } | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=${encodeURIComponent(locale.slice(0, 2))}&format=json`,
  )
  if (!res.ok) throw new Error(`Place search answered ${res.status}`)
  const r = (await res.json()).results?.[0]
  return r ? { city: [r.name, r.country_code].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude } : null
}

function WeatherCard() {
  const w = useWidgets((s) => s.settings.weather)
  const update = useWidgets((s) => s.update)
  const [data, setData] = useState<Forecast | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const now = useNow('minute')
  const stamp = Math.floor(now.getTime() / WEATHER_TTL)

  useEffect(() => {
    if (w.lat === null || w.lon === null) return
    let live = true
    fetchForecast(w.lat, w.lon, w.unit)
      .then((d) => live && (setData(d), setError(null)))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      live = false
    }
  }, [w.lat, w.lon, w.unit, stamp])

  if (w.lat === null || w.lon === null) {
    return (
      <>
        <CardHeader icon={CloudSun} title="Weather" />
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!city.trim()) return
            setBusy(true)
            setError(null)
            try {
              const hit = await geocodeCity(city.trim())
              if (!hit) setError(`No place called "${city.trim()}" found.`)
              else update({ weather: { city: hit.city, lat: hit.lat, lon: hit.lon } })
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Your city, then Enter"
            aria-label="City for the weather"
            disabled={busy}
            className="w-full rounded-md border border-line bg-sunken px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-accent-line"
          />
        </form>
        <p className="mt-2 text-xs text-muted">{error ?? 'Forecast from Open-Meteo. Only your city is sent.'}</p>
      </>
    )
  }

  const { sky, label } = skyOf(data?.code ?? 0)
  const Icon = SKY_ICON[sky]
  const deg = '°'
  return (
    <>
      <CardHeader icon={CloudSun} title={w.city || 'Weather'} />
      {data ? (
        <>
          <div className="flex items-center gap-3">
            <Icon className="h-10 w-10 shrink-0 text-accent-text" strokeWidth={1.5} aria-hidden />
            <div>
              <p className="text-3xl font-semibold leading-none tabular-nums text-strong">
                {Math.round(data.temp)}
                {deg}
              </p>
              <p className="mt-1 text-xs text-muted">
                {label}, feels {Math.round(data.feels)}
                {deg}
              </p>
            </div>
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-1.5 text-center text-xs">
            {data.days.map((d) => {
              const DayIcon = SKY_ICON[skyOf(d.code).sky]
              return (
                <li key={d.date} className="rounded-md bg-sunken px-1 py-1.5">
                  <p className="text-muted">{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(`${d.date}T12:00`))}</p>
                  <DayIcon className="mx-auto my-1 h-4 w-4 text-fg" aria-hidden />
                  <p className="tabular-nums text-fg">
                    {Math.round(d.max)}
                    {deg} <span className="text-muted">{Math.round(d.min)}{deg}</span>
                  </p>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="text-xs text-muted">{error ?? 'Loading the forecast...'}</p>
      )}
    </>
  )
}

// ---------- Most visited ----------

function TopSitesCard() {
  const [sites, setSites] = useState<chrome.topSites.MostVisitedURL[] | null>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const openTabs = useStackableStore((s) => s.openTabs)

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.permissions) return setAllowed(false)
    void chrome.permissions.contains({ permissions: ['topSites'] }).then(setAllowed)
  }, [])
  useEffect(() => {
    if (!allowed || !chrome.topSites) return
    void chrome.topSites.get().then((s) => setSites(s.slice(0, 8)))
  }, [allowed])

  return (
    <>
      <CardHeader icon={Globe} title="Most visited" />
      {allowed === false && (
        <button
          onClick={() => void chrome.permissions.request({ permissions: ['topSites'] }).then(setAllowed)}
          className="rounded-md border border-line-strong px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-hover"
        >
          Allow access to most visited sites
        </button>
      )}
      {sites && (
        <ul className="grid grid-cols-2 gap-1">
          {sites.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                  e.preventDefault()
                  void openHere(s.url, openTabs)
                }}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs text-fg hover:bg-hover"
                title={s.url}
              >
                <img src={faviconUrl(s.url, 16)} alt="" className="h-4 w-4 shrink-0" />
                <span className="truncate">{s.title || new URL(s.url).hostname}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ---------- Calculator ----------

function CalculatorCard() {
  const [expr, setExpr] = useState('')
  const [history, setHistory] = useState<Array<[string, string]>>([])
  const result = calculate(expr)
  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 10 })
  return (
    <>
      <CardHeader icon={Calculator} title="Calculator" />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (result === null) return
          setHistory((h) => [[expr, fmt(result)] as [string, string], ...h].slice(0, 3))
          setExpr(String(result))
        }}
      >
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="12 * (4 + 3) ^ 2"
          aria-label="Sum to work out"
          className="w-full rounded-md border border-line bg-sunken px-2.5 py-1.5 font-mono text-sm text-fg outline-none placeholder:text-muted focus:border-accent-line"
        />
      </form>
      <p className="mt-2 min-h-7 text-right text-2xl font-semibold tabular-nums text-strong">{result !== null && expr ? `= ${fmt(result)}` : ''}</p>
      {history.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 text-right text-xs text-muted">
          {history.map(([e, r], i) => (
            <li key={i} className="truncate tabular-nums">
              {e} = <span className="text-fg">{r}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
