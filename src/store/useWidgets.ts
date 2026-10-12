import { create } from 'zustand'
import { DEFAULT_WIDGETS, parseWidgets, type WidgetId, type WidgetSettings } from '../lib/widgets'

// Fork: widget settings and widget content. Both live in chrome.storage.local, so every open
// tab shows the same to-dos and timer; a localStorage copy lets the first frame render them
// without waiting for the async storage read.

const SETTINGS_KEY = 'widgets'
const DATA_KEY = 'widgetData'
const SETTINGS_MIRROR = 'stackboard:widgets'
const DATA_MIRROR = 'stackboard:widgetData'
const HAS_STORAGE = typeof chrome !== 'undefined' && !!chrome.storage?.local

export interface Todo {
  id: string
  text: string
  done: boolean
}

export interface PomodoroState {
  phase: 'work' | 'rest'
  /** When the running round ends (ms since epoch), or null while stopped or paused. */
  endsAt: number | null
  /** Time left while paused, in ms; null when the round hasn't started. */
  left: number | null
}

export interface WidgetData {
  todos: Todo[]
  notes: string
  pomodoro: PomodoroState
}

export function parseWidgetData(raw: unknown): WidgetData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const todos = Array.isArray(o.todos)
    ? o.todos
        .filter((t): t is Todo => !!t && typeof t === 'object' && typeof (t as Todo).text === 'string')
        .slice(0, 100)
        .map((t) => ({ id: String(t.id ?? Math.random()), text: t.text.slice(0, 200), done: !!t.done }))
    : []
  const p = o.pomodoro && typeof o.pomodoro === 'object' ? (o.pomodoro as Record<string, unknown>) : {}
  const ms = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
  return {
    todos,
    notes: typeof o.notes === 'string' ? o.notes.slice(0, 20_000) : '',
    pomodoro: { phase: p.phase === 'rest' ? 'rest' : 'work', endsAt: ms(p.endsAt), left: ms(p.left) },
  }
}

function readMirror<T>(key: string, parse: (raw: unknown) => T): T {
  try {
    return parse(JSON.parse(localStorage.getItem(key) ?? 'null'))
  } catch {
    return parse(null)
  }
}

function writeMirror(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // blocked storage: the next tab waits for chrome.storage instead
  }
}

export type WidgetPatch = Partial<Omit<WidgetSettings, 'enabled' | 'weather' | 'countdown' | 'pomodoro' | 'clock'>> & {
  enabled?: Partial<Record<WidgetId, boolean>>
  clock?: Partial<WidgetSettings['clock']>
  weather?: Partial<WidgetSettings['weather']>
  countdown?: Partial<WidgetSettings['countdown']>
  pomodoro?: Partial<WidgetSettings['pomodoro']>
}

export function mergeWidgets(s: WidgetSettings, patch: WidgetPatch): WidgetSettings {
  return parseWidgets({
    ...s,
    ...patch,
    enabled: { ...s.enabled, ...patch.enabled },
    weather: { ...s.weather, ...patch.weather },
    countdown: { ...s.countdown, ...patch.countdown },
    pomodoro: { ...s.pomodoro, ...patch.pomodoro },
    clock: { ...s.clock, ...patch.clock },
  })
}

interface WidgetState {
  settings: WidgetSettings
  data: WidgetData
  update: (patch: WidgetPatch) => void
  setData: (fn: (d: WidgetData) => WidgetData) => void
}

let lastSettings = ''
let lastData = ''
let dataTimer: ReturnType<typeof setTimeout> | undefined

export const useWidgets = create<WidgetState>((set, get) => ({
  settings: readMirror(SETTINGS_MIRROR, parseWidgets),
  data: readMirror(DATA_MIRROR, parseWidgetData),

  update: (patch) => {
    const settings = mergeWidgets(get().settings, patch)
    set({ settings })
    writeMirror(SETTINGS_MIRROR, settings)
    if (!HAS_STORAGE) return
    lastSettings = JSON.stringify(settings)
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }).catch(() => {})
  },

  setData: (fn) => {
    const data = parseWidgetData(fn(get().data))
    set({ data })
    writeMirror(DATA_MIRROR, data)
    if (!HAS_STORAGE) return
    // Typing in Notes would otherwise write on every key.
    clearTimeout(dataTimer)
    dataTimer = setTimeout(() => {
      lastData = JSON.stringify(data)
      chrome.storage.local.set({ [DATA_KEY]: data }).catch(() => {})
    }, 300)
  },
}))

let started = false

/** Once per page: catch up with chrome.storage and follow other tabs. */
export function initWidgets(): void {
  if (started || !HAS_STORAGE) return
  started = true
  chrome.storage.local
    .get([SETTINGS_KEY, DATA_KEY])
    .then((got) => {
      const patch: Partial<WidgetState> = {}
      if (got[SETTINGS_KEY]) patch.settings = parseWidgets(got[SETTINGS_KEY])
      if (got[DATA_KEY]) patch.data = parseWidgetData(got[DATA_KEY])
      useWidgets.setState(patch)
      if (patch.settings) writeMirror(SETTINGS_MIRROR, patch.settings)
      if (patch.data) writeMirror(DATA_MIRROR, patch.data)
    })
    .catch(() => {})
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    const s = changes[SETTINGS_KEY]?.newValue
    if (s && JSON.stringify(s) !== lastSettings) {
      const settings = parseWidgets(s)
      useWidgets.setState({ settings })
      writeMirror(SETTINGS_MIRROR, settings)
    }
    const d = changes[DATA_KEY]?.newValue
    if (d && JSON.stringify(d) !== lastData) {
      const data = parseWidgetData(d)
      useWidgets.setState({ data })
      writeMirror(DATA_MIRROR, data)
    }
  })
}

export { DEFAULT_WIDGETS }
