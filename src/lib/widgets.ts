// Fork: widgets in the spirit of r/startpages (clock, greeting, search with bangs, weather,
// to-dos, notes, quotes, calendar, pomodoro, countdown, progress, top sites, calculator).
// Pure: no DOM, no chrome.*, so tests/unit.test.ts covers the rules. Rendering lives in
// components/Widgets.tsx, persistence in store/useWidgets.ts.

export type WidgetId =
  | 'clock'
  | 'search'
  | 'todo'
  | 'notes'
  | 'quote'
  | 'calendar'
  | 'pomodoro'
  | 'countdown'
  | 'progress'
  | 'weather'
  | 'topsites'
  | 'calculator'

export interface WidgetInfo {
  id: WidgetId
  name: string
  blurb: string
  /** Hero widgets sit in the band above the stacks; the rest are cards. */
  zone: 'hero' | 'card'
  /** Talks to the network (only once switched on). */
  network?: boolean
  /** Needs an optional permission, asked for when switched on. */
  permission?: 'topSites'
}

export const WIDGETS: readonly WidgetInfo[] = [
  { id: 'clock', name: 'Clock and greeting', blurb: 'Time, date and a hello by name.', zone: 'hero' },
  { id: 'search', name: 'Search', blurb: 'Your engine, !bangs, and your own links as you type.', zone: 'hero' },
  { id: 'todo', name: 'To-do', blurb: 'A short list that syncs across your tabs.', zone: 'card' },
  { id: 'notes', name: 'Notes', blurb: 'A scratchpad that saves as you type.', zone: 'card' },
  { id: 'quote', name: 'Quote', blurb: 'A new line each day, offline.', zone: 'card' },
  { id: 'calendar', name: 'Calendar', blurb: 'This month at a glance.', zone: 'card' },
  { id: 'pomodoro', name: 'Focus timer', blurb: 'Pomodoro rounds with a soft chime.', zone: 'card' },
  { id: 'countdown', name: 'Countdown', blurb: 'Days until something you care about.', zone: 'card' },
  { id: 'progress', name: 'Progress', blurb: 'How much of the day, week and year is gone.', zone: 'card' },
  { id: 'weather', name: 'Weather', blurb: 'Forecast from Open-Meteo, no account. Nothing is fetched until you switch it on.', zone: 'card', network: true },
  { id: 'topsites', name: 'Most visited', blurb: 'Your top sites from the browser.', zone: 'card', permission: 'topSites' },
  { id: 'calculator', name: 'Calculator', blurb: 'Type a sum, see the answer.', zone: 'card' },
]

/** Fork: the cards in their first order (the order the board always showed them in). */
export const CARD_ORDER: readonly WidgetId[] = ['todo', 'notes', 'weather', 'calendar', 'quote', 'pomodoro', 'countdown', 'progress', 'topsites', 'calculator']

// ---------- Clock look (right-click the clock, or Settings > Widgets) ----------

export type ClockPosition = 'left' | 'center' | 'right'
export type ClockSize = 's' | 'm' | 'l' | 'xl'
export type ClockFont = 'system' | 'bold' | 'thin' | 'serif' | 'mono' | 'rounded'
export type ClockEffect = 'none' | 'glow' | 'neon' | 'shadow' | 'outline' | 'glass'

export const CLOCK_POSITIONS: readonly ClockPosition[] = ['left', 'center', 'right']
export const CLOCK_SIZES: readonly ClockSize[] = ['s', 'm', 'l', 'xl']
export const CLOCK_FONTS: readonly ClockFont[] = ['system', 'bold', 'thin', 'serif', 'mono', 'rounded']
export const CLOCK_EFFECTS: readonly ClockEffect[] = ['none', 'glow', 'neon', 'shadow', 'outline', 'glass']

export interface ClockSettings {
  position: ClockPosition
  size: ClockSize
  font: ClockFont
  effect: ClockEffect
  /** A soft accent glow while the pointer is on the clock. */
  hoverGlow: boolean
  /** The colon between hours and minutes blinks once a second (never with motion off). */
  blink: boolean
  greeting: boolean
  date: boolean
  seconds: boolean
  h24: boolean
}

export type EngineId = 'brave' | 'google' | 'duckduckgo' | 'startpage' | 'kagi' | 'ecosia' | 'bing'

export const ENGINES: Record<EngineId, { name: string; url: string }> = {
  brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=%s' },
  google: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  startpage: { name: 'Startpage', url: 'https://www.startpage.com/do/search?q=%s' },
  kagi: { name: 'Kagi', url: 'https://kagi.com/search?q=%s' },
  ecosia: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=%s' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
}

/** !bang shortcuts, typed anywhere in the query ("!yt lofi" or "lofi !yt"). */
export const BANGS: Record<string, { name: string; url: string }> = {
  g: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
  b: { name: 'Brave Search', url: 'https://search.brave.com/search?q=%s' },
  ddg: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  yt: { name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s' },
  gh: { name: 'GitHub', url: 'https://github.com/search?q=%s' },
  w: { name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s' },
  wde: { name: 'Wikipedia (Deutsch)', url: 'https://de.wikipedia.org/w/index.php?search=%s' },
  r: { name: 'Reddit', url: 'https://www.reddit.com/search/?q=%s' },
  a: { name: 'Amazon', url: 'https://www.amazon.com/s?k=%s' },
  m: { name: 'Maps', url: 'https://www.google.com/maps/search/%s' },
  tr: { name: 'Translate', url: 'https://translate.google.com/?sl=auto&text=%s' },
  so: { name: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=%s' },
  mdn: { name: 'MDN', url: 'https://developer.mozilla.org/search?q=%s' },
  npm: { name: 'npm', url: 'https://www.npmjs.com/search?q=%s' },
  imdb: { name: 'IMDb', url: 'https://www.imdb.com/find/?q=%s' },
  sp: { name: 'Spotify', url: 'https://open.spotify.com/search/%s' },
  wa: { name: 'Wolfram Alpha', url: 'https://www.wolframalpha.com/input?i=%s' },
  x: { name: 'X', url: 'https://x.com/search?q=%s' },
}

export interface WidgetSettings {
  enabled: Record<WidgetId, boolean>
  /** For the greeting. */
  name: string
  /** Fork: the clock's look and what it shows (24-hour and seconds moved in here). */
  clock: ClockSettings
  /** Fork: the cards' order on the board; always every card id, once. */
  order: WidgetId[]
  /** Extra clocks: IANA zones such as "America/New_York". */
  zones: string[]
  engine: EngineId
  weather: { city: string; lat: number | null; lon: number | null; unit: 'c' | 'f' }
  countdown: { label: string; date: string }
  pomodoro: { work: number; rest: number }
  /** The widget band folded away from the board header. */
  collapsed: boolean
}

export const DEFAULT_WIDGETS: WidgetSettings = {
  enabled: {
    clock: true,
    search: true,
    todo: true,
    notes: false,
    quote: true,
    calendar: true,
    pomodoro: false,
    countdown: false,
    progress: true,
    weather: false,
    topsites: false,
    calculator: false,
  },
  name: '',
  clock: {
    position: 'left',
    size: 'm',
    font: 'system',
    effect: 'none',
    hoverGlow: false,
    blink: false,
    greeting: true,
    date: true,
    seconds: false,
    h24: true,
  },
  order: [...CARD_ORDER],
  zones: [],
  engine: 'brave',
  weather: { city: '', lat: null, lon: null, unit: 'c' },
  countdown: { label: 'New Year', date: '' },
  pomodoro: { work: 25, rest: 5 },
  collapsed: false,
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})
const str = (v: unknown, fallback: string, max = 120) => (typeof v === 'string' ? v.slice(0, max) : fallback)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
const oneOf = <T extends string>(v: unknown, all: readonly T[], fallback: T): T =>
  typeof v === 'string' && (all as readonly string[]).includes(v) ? (v as T) : fallback
const coord = (v: unknown, lim: number) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim ? v : null)

/** Whatever storage holds, back as complete, valid settings. */
export function parseWidgets(raw: unknown): WidgetSettings {
  const d = DEFAULT_WIDGETS
  const o = obj(raw)
  const en = obj(o.enabled)
  const w = obj(o.weather)
  const c = obj(o.countdown)
  const p = obj(o.pomodoro)
  const k = obj(o.clock)
  const dk = d.clock
  const enabled = { ...d.enabled }
  for (const k of Object.keys(enabled) as WidgetId[]) enabled[k] = bool(en[k], d.enabled[k])
  const zones = Array.isArray(o.zones) ? o.zones.filter((z): z is string => typeof z === 'string' && isZone(z)).slice(0, 4) : d.zones
  const date = str(c.date, '', 10)
  return {
    enabled,
    name: str(o.name, d.name, 40),
    clock: {
      position: oneOf(k.position, CLOCK_POSITIONS, dk.position),
      size: oneOf(k.size, CLOCK_SIZES, dk.size),
      font: oneOf(k.font, CLOCK_FONTS, dk.font),
      effect: oneOf(k.effect, CLOCK_EFFECTS, dk.effect),
      hoverGlow: bool(k.hoverGlow, dk.hoverGlow),
      blink: bool(k.blink, dk.blink),
      greeting: bool(k.greeting, dk.greeting),
      date: bool(k.date, dk.date),
      // Before the clock had its own settings these two sat at the top level.
      seconds: bool(k.seconds, bool(o.seconds, dk.seconds)),
      h24: bool(k.h24, bool(o.h24, dk.h24)),
    },
    order: parseOrder(o.order),
    zones,
    engine: typeof o.engine === 'string' && o.engine in ENGINES ? (o.engine as EngineId) : d.engine,
    weather: {
      city: str(w.city, '', 80),
      lat: coord(w.lat, 90),
      lon: coord(w.lon, 180),
      unit: w.unit === 'f' ? 'f' : 'c',
    },
    countdown: { label: str(c.label, d.countdown.label, 40), date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '' },
    pomodoro: { work: num(p.work, 1, 120, d.pomodoro.work), rest: num(p.rest, 1, 60, d.pomodoro.rest) },
    collapsed: bool(o.collapsed, d.collapsed),
  }
}

/** Known card ids once each, in the stored order, then any the list missed in their first order. */
function parseOrder(raw: unknown): WidgetId[] {
  const seen = new Set<WidgetId>()
  if (Array.isArray(raw)) for (const id of raw) if (CARD_ORDER.includes(id as WidgetId)) seen.add(id as WidgetId)
  for (const id of CARD_ORDER) seen.add(id)
  return [...seen]
}

/**
 * Move a card one place earlier (-1) or later (1) among the cards on screen: it trades places
 * with its visible neighbour, and hidden cards keep their spots. Unchanged at either end.
 */
export function moveWidget(order: readonly WidgetId[], id: WidgetId, dir: -1 | 1, shown: readonly WidgetId[]): WidgetId[] {
  const visible = order.filter((x) => shown.includes(x))
  const i = visible.indexOf(id)
  const other = visible[i + dir]
  if (i < 0 || !other) return [...order]
  return order.map((x) => (x === id ? other : x === other ? id : x))
}

export function isZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

// ---------- Search ----------

/** Looks like an address someone wants to open, not words to search for. */
export function looksLikeUrl(input: string): boolean {
  const s = input.trim()
  if (!s || /\s/.test(s)) return false
  if (/^(https?|file|brave|chrome):\/\//i.test(s)) return true
  return /^(localhost(:\d+)?|[\w-]+(\.[\w-]+)+)(:\d+)?(\/\S*)?$/i.test(s)
}

/** Where the search box sends this input: an address, a !bang, or the chosen engine. */
export function resolveSearch(input: string, engine: EngineId): { url: string; via: string } | null {
  const s = input.trim()
  if (!s) return null
  if (looksLikeUrl(s)) {
    const url = /^[a-z]+:\/\//i.test(s) ? s : `https://${s}`
    return { url, via: 'Open' }
  }
  const bang = s.match(/(?:^|\s)!([a-z]+)(?=\s|$)/i)
  if (bang && BANGS[bang[1].toLowerCase()]) {
    const b = BANGS[bang[1].toLowerCase()]
    const rest = s.replace(bang[0], ' ').trim()
    const target = rest ? b.url.replace('%s', encodeURIComponent(rest)) : new URL(b.url.replace('%s', '')).origin
    return { url: target, via: b.name }
  }
  const e = ENGINES[engine]
  return { url: e.url.replace('%s', encodeURIComponent(s)), via: e.name }
}

// ---------- Clock, greeting, progress ----------

export function greeting(hour: number): string {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Share of the day, week (from Monday), month and year that has passed, 0 to 1. */
export function progressOf(now: Date): { day: number; week: number; month: number; year: number } {
  const t = now.getTime()
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  const dow = (now.getDay() + 6) % 7
  const startWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).getTime()
  const endWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + 7).getTime()
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
  const startYear = new Date(now.getFullYear(), 0, 1).getTime()
  const endYear = new Date(now.getFullYear() + 1, 0, 1).getTime()
  const f = (a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)))
  return { day: f(startDay, endDay), week: f(startWeek, endWeek), month: f(startMonth, endMonth), year: f(startYear, endYear) }
}

/** Whole days from today to a YYYY-MM-DD date (negative once it has passed). */
export function daysUntil(date: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return null
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((target - today) / 86_400_000)
}

/** The next 1 January as YYYY-MM-DD, the countdown's starting target. */
export function nextNewYear(now: Date): string {
  return `${now.getFullYear() + 1}-01-01`
}

/** Monday-first weeks for a month grid; null pads the days outside the month. */
export function monthGrid(year: number, month: number): Array<Array<number | null>> {
  const first = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: Array<number | null> = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const weeks: Array<Array<number | null>> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

// ---------- Calculator ----------
// A small shunting-yard evaluator: + - * / % ^, parentheses, unary minus, × ÷ and commas as
// decimal points. No eval (extension pages forbid it anyway).

export function calculate(input: string): number | null {
  const src = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/\s+/g, '')
  if (!src || !/^[\d.+\-*/%^()]+$/.test(src)) return null
  const out: number[] = []
  const ops: string[] = []
  // Unary minus binds looser than ^, so -3^2 is -9 as in maths.
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, 'u': 2.5, '^': 3 }
  const apply = (): boolean => {
    const op = ops.pop()!
    if (op === 'u') {
      if (!out.length) return false
      out.push(-out.pop()!)
      return true
    }
    if (out.length < 2) return false
    const b = out.pop()!
    const a = out.pop()!
    out.push(op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? a / b : op === '%' ? a % b : a ** b)
    return true
  }
  let prevValue = false
  for (let i = 0; i < src.length; ) {
    const c = src[i]
    if (/[\d.]/.test(c)) {
      const m = /^\d*\.?\d+|^\d+\.?/.exec(src.slice(i))
      if (!m) return null
      out.push(parseFloat(m[0]))
      i += m[0].length
      prevValue = true
      continue
    }
    if (c === '(') {
      ops.push(c)
      prevValue = false
    } else if (c === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') if (!apply()) return null
      if (ops.pop() !== '(') return null
      prevValue = true
    } else {
      const op = !prevValue && c === '-' ? 'u' : c
      if (!prevValue && op !== 'u') return null
      const right = op === '^' || op === 'u'
      while (ops.length && ops[ops.length - 1] !== '(' && (right ? prec[ops[ops.length - 1]] > prec[op] : prec[ops[ops.length - 1]] >= prec[op])) {
        if (!apply()) return null
      }
      ops.push(op)
      prevValue = false
    }
    i++
  }
  while (ops.length) {
    if (ops[ops.length - 1] === '(') return null
    if (!apply()) return null
  }
  return out.length === 1 && Number.isFinite(out[0]) ? out[0] : null
}

// ---------- Quotes (all public domain, bundled so the new tab stays offline) ----------

export const QUOTES: ReadonlyArray<{ text: string; by: string }> = [
  { text: 'Well begun is half done.', by: 'Aristotle' },
  { text: 'The journey of a thousand miles begins with one step.', by: 'Lao Tzu' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', by: 'Confucius' },
  { text: 'You have power over your mind, not outside events.', by: 'Marcus Aurelius' },
  { text: 'Luck is what happens when preparation meets opportunity.', by: 'Seneca' },
  { text: 'First say to yourself what you would be; then do what you have to do.', by: 'Epictetus' },
  { text: 'Simplicity is the ultimate sophistication.', by: 'Leonardo da Vinci' },
  { text: 'Go confidently in the direction of your dreams.', by: 'Henry David Thoreau' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', by: 'Ralph Waldo Emerson' },
  { text: 'The secret of getting ahead is getting started.', by: 'Mark Twain' },
  { text: 'Well done is better than well said.', by: 'Benjamin Franklin' },
  { text: 'Whatever you do, do it well.', by: 'Walt Whitman' },
  { text: 'Knowing is not enough; we must apply.', by: 'Johann Wolfgang von Goethe' },
  { text: 'He who has a why to live can bear almost any how.', by: 'Friedrich Nietzsche' },
  { text: 'We suffer more often in imagination than in reality.', by: 'Seneca' },
  { text: 'Waste no more time arguing what a good man should be. Be one.', by: 'Marcus Aurelius' },
  { text: 'Nothing will come of nothing.', by: 'William Shakespeare' },
  { text: 'Energy and persistence conquer all things.', by: 'Benjamin Franklin' },
  { text: 'Our life is frittered away by detail. Simplify, simplify.', by: 'Henry David Thoreau' },
  { text: 'Do what you can, with what you have, where you are.', by: 'Theodore Roosevelt' },
  { text: 'The best way out is always through.', by: 'Robert Frost' },
  { text: 'Nature does not hurry, yet everything is accomplished.', by: 'Lao Tzu' },
  { text: 'I think, therefore I am.', by: 'René Descartes' },
  { text: 'An unexamined life is not worth living.', by: 'Socrates' },
  { text: 'Little by little, one travels far.', by: 'J. R. R. Tolkien' },
  { text: 'Courage is grace under pressure.', by: 'Ernest Hemingway' },
  { text: 'The only way to have a friend is to be one.', by: 'Ralph Waldo Emerson' },
  { text: 'Dwell on the beauty of life. Watch the stars, and see yourself running with them.', by: 'Marcus Aurelius' },
  { text: 'It is quality rather than quantity that matters.', by: 'Seneca' },
  { text: 'In the middle of difficulty lies opportunity.', by: 'Albert Einstein' },
]

/** The same quote all day, a new one tomorrow. */
export function quoteIndexFor(now: Date): number {
  const day = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86_400_000)
  return ((day % QUOTES.length) + QUOTES.length) % QUOTES.length
}

// ---------- Weather (Open-Meteo WMO codes) ----------

export type Sky = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

export function skyOf(code: number): { sky: Sky; label: string } {
  if (code === 0) return { sky: 'clear', label: 'Clear' }
  if (code <= 2) return { sky: 'partly', label: 'Partly cloudy' }
  if (code === 3) return { sky: 'cloudy', label: 'Overcast' }
  if (code === 45 || code === 48) return { sky: 'fog', label: 'Fog' }
  if (code >= 51 && code <= 57) return { sky: 'drizzle', label: 'Drizzle' }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { sky: 'rain', label: 'Rain' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { sky: 'snow', label: 'Snow' }
  if (code >= 95) return { sky: 'storm', label: 'Thunderstorm' }
  return { sky: 'cloudy', label: 'Cloudy' }
}
