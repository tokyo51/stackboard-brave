import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Command, CornerDownLeft, Monitor, Moon, Palette, Plus, Search, Settings, Sparkles, Sun, LayoutDashboard, Globe } from 'lucide-react'
import { PALETTES, type Mode } from '../lib/appearance'
import { PRESETS } from '../lib/presets'
import { searchTree } from '../lib/search'
import { faviconUrl } from '../lib/favicon'
import { openHere, openInNewTab } from '../lib/tabs'
import { resolveSearch } from '../lib/widgets'
import { useAppearance } from '../store/useAppearance'
import { useStackableStore } from '../store/useStackableStore'
import { useWidgets } from '../store/useWidgets'

// Fork: Cmd/Ctrl+K. One list for links, spaces, looks and actions, driven from the keyboard.

interface Item {
  id: string
  group: string
  label: string
  hint?: string
  icon: ReactNode
  /** newTab is true for Cmd/Ctrl+Enter, which only links care about. */
  run: (newTab: boolean) => void
}

export const PALETTE_EVENT = 'stackboard:palette'

export function CommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onEvent = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(PALETTE_EVENT, onEvent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(PALETTE_EVENT, onEvent)
    }
  }, [])

  return open ? <PaletteDialog onClose={() => setOpen(false)} /> : null
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const tree = useStackableStore((s) => s.tree)
  const openTabs = useStackableStore((s) => s.openTabs)
  const selectSpace = useStackableStore((s) => s.selectSpace)
  const openModal = useStackableStore((s) => s.openModal)
  const update = useAppearance((s) => s.update)
  const engine = useWidgets((s) => s.settings.engine)
  const collapsed = useWidgets((s) => s.settings.collapsed)
  const updateWidgets = useWidgets((s) => s.update)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement | null>(null)

  const items = useMemo<Item[]>(() => {
    const out: Item[] = []
    const query = q.trim()
    if (tree && query) {
      for (const g of searchTree(tree, query).slice(0, 4)) {
        for (const b of g.hits.slice(0, 3)) {
          out.push({
            id: `bm:${b.id}`,
            group: 'Links',
            label: b.title,
            hint: `${g.space.name} › ${g.stack.title}`,
            icon: <img src={faviconUrl(b.url, 16)} alt="" className="h-4 w-4" />,
            run: (newTab) => (newTab ? void openInNewTab(b.url, false) : void openHere(b.url, openTabs)),
          })
        }
      }
    }
    for (const s of tree?.spaces ?? []) {
      out.push({ id: `sp:${s.id}`, group: 'Spaces', label: `Go to ${s.name}`, icon: <span className="text-sm leading-none">{s.emoji}</span>, run: () => selectSpace(s.id) })
    }
    const actions: Array<[string, string, ReactNode, () => void]> = [
      ['new-space', 'New space', <Plus className="h-4 w-4" />, () => openModal({ kind: 'space-add' })],
      ['settings', 'Open settings', <Settings className="h-4 w-4" />, () => openModal({ kind: 'settings' })],
      ['widgets', collapsed ? 'Show widgets' : 'Hide widgets', <LayoutDashboard className="h-4 w-4" />, () => updateWidgets({ collapsed: !collapsed })],
    ]
    for (const [id, label, icon, run] of actions) out.push({ id: `a:${id}`, group: 'Actions', label, icon, run })
    const modes: Array<[Mode, string, ReactNode]> = [
      ['light', 'Light mode', <Sun className="h-4 w-4" />],
      ['dark', 'Dark mode', <Moon className="h-4 w-4" />],
      ['system', 'Follow system', <Monitor className="h-4 w-4" />],
    ]
    for (const [mode, label, icon] of modes) out.push({ id: `m:${mode}`, group: 'Actions', label, icon, run: () => update({ mode }) })
    for (const p of PRESETS) {
      out.push({ id: `p:${p.id}`, group: 'Presets', label: `Preset: ${p.name}`, hint: p.blurb, icon: <Sparkles className="h-4 w-4" />, run: () => update(p.patch) })
    }
    for (const p of PALETTES) {
      out.push({ id: `t:${p.id}`, group: 'Themes', label: `Theme: ${p.name}`, hint: [p.light, p.dark].filter(Boolean).join(' / '), icon: <Palette className="h-4 w-4" />, run: () => update({ palette: p.id }) })
    }

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    const filtered = terms.length
      ? out.filter((it) => it.group === 'Links' || terms.every((t) => `${it.label} ${it.hint ?? ''} ${it.group}`.toLowerCase().includes(t)))
      : out
    const web = resolveSearch(query, engine)
    if (web) {
      filtered.push({
        id: 'web',
        group: 'Web',
        label: web.via === 'Open' ? `Open ${query}` : `Search ${web.via} for “${query}”`,
        icon: <Globe className="h-4 w-4" />,
        run: (newTab) => (newTab ? void openInNewTab(web.url, false) : void openHere(web.url, openTabs)),
      })
    }
    return filtered
  }, [q, tree, openTabs, selectSpace, openModal, update, engine, collapsed, updateWidgets])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (i: number, newTab: boolean) => {
    const it = items[i]
    if (!it) return
    onClose()
    it.run(newTab)
  }

  let lastGroup = ''
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-scrim px-4 pt-[14vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Command palette"
        data-command-palette
        data-surface="modal"
        onMouseDown={(e) => e.stopPropagation()}
        className="pop-in flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-raised text-fg shadow-2xl ring-1 ring-line"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-faint" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(items.length - 1, a + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(0, a - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                run(active, e.metaKey || e.ctrlKey)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
              }
            }}
            placeholder="Find a link, a space, a theme or an action"
            aria-label="Command"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-strong outline-none placeholder:text-muted"
          />
          <kbd className="rounded border border-line bg-sunken px-1.5 text-[11px] leading-5 text-muted">Esc</kbd>
        </div>
        <ul ref={listRef} role="listbox" className="no-scrollbar flex-1 overflow-y-auto py-1.5">
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? it.group : null
            lastGroup = it.group
            return (
              <li key={it.id} role="presentation">
                {head && <p className="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{head}</p>}
                <div
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={(e) => run(i, e.metaKey || e.ctrlKey)}
                  className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm ${i === active ? 'bg-selected text-strong' : 'text-fg'}`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">{it.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.hint && <span className="max-w-[45%] shrink-0 truncate text-xs text-muted">{it.hint}</span>}
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />}
                </div>
              </li>
            )
          })}
          {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nothing matches.</li>}
        </ul>
        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Command className="h-3 w-3" />K toggles
          </span>
          <span>↑↓ to move</span>
          <span>Enter opens</span>
          <span>Ctrl/Cmd+Enter in a new tab</span>
        </div>
      </div>
    </div>
  )
}
