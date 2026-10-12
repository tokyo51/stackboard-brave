import { create } from 'zustand'

// Fork: per-item design (right-click a space, stack, link or widget): colour, collapsed state,
// layout and width. Chrome bookmarks have no room for this, so it lives in chrome.storage.local
// keyed by bookmark id (or "widget:<id>"), with a localStorage copy for the first frame.
// Bookmark ids are per profile, so these choices stay on this device; the bookmarks still sync.

export type ItemColor = 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'gray' | 'accent'

/**
 * Each colour maps to the active palette's own tint pair, so it suits every theme and keeps the
 * contrast the palette tests guarantee (tint fg on tint bg >= 3:1). Red uses the danger tokens.
 */
export const ITEM_COLORS: ReadonlyArray<{ id: ItemColor; name: string; bg: string; fg: string }> = [
  { id: 'red', name: 'Red', bg: 'var(--sb-danger-soft)', fg: 'var(--sb-danger)' },
  { id: 'orange', name: 'Orange', bg: 'var(--sb-tint-0-bg)', fg: 'var(--sb-tint-0-fg)' },
  { id: 'yellow', name: 'Yellow', bg: 'var(--sb-tint-1-bg)', fg: 'var(--sb-tint-1-fg)' },
  { id: 'green', name: 'Green', bg: 'var(--sb-tint-2-bg)', fg: 'var(--sb-tint-2-fg)' },
  { id: 'teal', name: 'Teal', bg: 'var(--sb-tint-3-bg)', fg: 'var(--sb-tint-3-fg)' },
  { id: 'blue', name: 'Blue', bg: 'var(--sb-tint-4-bg)', fg: 'var(--sb-tint-4-fg)' },
  { id: 'purple', name: 'Purple', bg: 'var(--sb-tint-5-bg)', fg: 'var(--sb-tint-5-fg)' },
  { id: 'pink', name: 'Pink', bg: 'var(--sb-tint-6-bg)', fg: 'var(--sb-tint-6-fg)' },
  { id: 'gray', name: 'Gray', bg: 'var(--sb-tint-7-bg)', fg: 'var(--sb-tint-7-fg)' },
  { id: 'accent', name: 'Theme accent', bg: 'var(--sb-accent-soft)', fg: 'var(--sb-accent-text)' },
]

export type ItemLayout = 'list' | 'tiles' | 'compact'

export interface ItemMeta {
  color?: ItemColor
  collapsed?: boolean
  /** Stacks: how their links are laid out. */
  layout?: ItemLayout
  /** Stacks and widgets: 2 spans two grid columns. */
  span?: 1 | 2
}

const KEY = 'itemMeta'
const MIRROR = 'stackboard:itemMeta'
const HAS_STORAGE = typeof chrome !== 'undefined' && !!chrome.storage?.local
const COLORS = new Set<string>(ITEM_COLORS.map((c) => c.id))
const LAYOUTS = new Set<string>(['list', 'tiles', 'compact'])

/** Whatever storage holds, back as clean metadata: unknown keys and values are dropped. */
export function parseItemMeta(raw: unknown): Record<string, ItemMeta> {
  const out: Record<string, ItemMeta> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object' || id.length > 80) continue
    const o = v as Record<string, unknown>
    const m: ItemMeta = {}
    if (typeof o.color === 'string' && COLORS.has(o.color)) m.color = o.color as ItemColor
    if (o.collapsed === true) m.collapsed = true
    if (typeof o.layout === 'string' && LAYOUTS.has(o.layout) && o.layout !== 'list') m.layout = o.layout as ItemLayout
    if (o.span === 2) m.span = 2
    if (Object.keys(m).length) out[id] = m
  }
  return out
}

function readMirror(): Record<string, ItemMeta> {
  try {
    return parseItemMeta(JSON.parse(localStorage.getItem(MIRROR) ?? 'null'))
  } catch {
    return {}
  }
}

interface ItemMetaState {
  meta: Record<string, ItemMeta>
  /** Merge a change into one item; undefined values clear that field. */
  set: (id: string, patch: Partial<Record<keyof ItemMeta, ItemMeta[keyof ItemMeta] | undefined>>) => void
  /** Copy an item's settings to a new id (undo recreates bookmarks with new ids). */
  copy: (from: string, to: string) => void
}

// Every write this tab made recently: storage.onChanged echoes each one back, possibly after a
// newer one, so comparing against only the last write replayed stale states (Collapse all lost stacks).
const mine: string[] = []

function persist(meta: Record<string, ItemMeta>): void {
  try {
    localStorage.setItem(MIRROR, JSON.stringify(meta))
  } catch {
    // blocked storage: chrome.storage still has it
  }
  if (!HAS_STORAGE) return
  mine.push(JSON.stringify(meta))
  if (mine.length > 50) mine.shift()
  chrome.storage.local.set({ [KEY]: meta }).catch(() => {})
}

export const useItemMeta = create<ItemMetaState>((set, get) => ({
  meta: readMirror(),
  set: (id, patch) => {
    const next = { ...get().meta }
    const merged: Record<string, unknown> = { ...next[id], ...patch }
    for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k]
    const clean = parseItemMeta({ [id]: merged })[id]
    if (clean) next[id] = clean
    else delete next[id]
    set({ meta: next })
    persist(next)
  },
  copy: (from, to) => {
    const m = get().meta[from]
    if (m) get().set(to, m)
  },
}))

const EMPTY: ItemMeta = {}

/** The settings for one item (an empty object when it has none). */
export function useMetaFor(id: string): ItemMeta {
  return useItemMeta((s) => s.meta[id]) ?? EMPTY
}

export function colorOf(c: ItemColor | undefined) {
  return c ? ITEM_COLORS.find((x) => x.id === c) : undefined
}

let started = false

/** Once per page: catch up with chrome.storage and follow other tabs. */
export function initItemMeta(): void {
  if (started || !HAS_STORAGE) return
  started = true
  chrome.storage.local
    .get(KEY)
    .then((got) => {
      if (got[KEY]) useItemMeta.setState({ meta: parseItemMeta(got[KEY]) })
    })
    .catch(() => {})
  chrome.storage.onChanged.addListener((changes, area) => {
    const v = area === 'local' ? changes[KEY]?.newValue : undefined
    if (!v) return
    const i = mine.indexOf(JSON.stringify(v))
    if (i >= 0) {
      mine.splice(0, i + 1)
      return
    }
    useItemMeta.setState({ meta: parseItemMeta(v) })
  })
}
