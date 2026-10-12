import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { Check, X } from 'lucide-react'
import { ITEM_COLORS, type ItemColor } from '../store/useItemMeta'

// Fork: one right-click menu for spaces, stacks, links and widgets. Callers build a list of
// items and call openContextMenu(event, items); <ContextMenuHost /> (in App.tsx) draws it at the
// pointer, keeps it on screen, and handles Escape, outside clicks and arrow keys.

export type MenuItem =
  | { kind?: 'action'; label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; checked?: boolean; disabled?: boolean; hint?: string }
  | { kind: 'separator' }
  | { kind: 'label'; label: string }
  /** A row of colour swatches; undefined means "no colour". */
  | { kind: 'colors'; value?: ItemColor; onPick: (c: ItemColor | undefined) => void }
  /** A small segmented choice, e.g. layout list / tiles / compact. */
  | { kind: 'choice'; label: string; value: string; options: Array<{ value: string; label: string }>; onPick: (v: string) => void }

interface MenuState {
  open: { x: number; y: number; title?: string; items: MenuItem[] } | null
  show: (x: number, y: number, items: MenuItem[], title?: string) => void
  close: () => void
}

const useMenu = create<MenuState>((set) => ({
  open: null,
  show: (x, y, items, title) => set({ open: { x, y, items, title } }),
  close: () => set({ open: null }),
}))

/** Right-click handler: opens the menu at the pointer instead of the browser's own. */
export function openContextMenu(e: { preventDefault: () => void; stopPropagation: () => void; clientX: number; clientY: number }, items: MenuItem[], title?: string): void {
  e.preventDefault()
  e.stopPropagation()
  useMenu.getState().show(e.clientX, e.clientY, items, title)
}

/** Keyboard or button entry point: opens the menu under an element. */
export function openContextMenuAt(el: Element, items: MenuItem[], title?: string): void {
  const r = el.getBoundingClientRect()
  useMenu.getState().show(r.left, r.bottom + 4, items, title)
}

export function closeContextMenu(): void {
  useMenu.getState().close()
}

export function ContextMenuHost() {
  const open = useMenu((s) => s.open)
  const close = useMenu((s) => s.close)
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  // Keep the menu inside the window: flip left/up when it would run off an edge.
  useLayoutEffect(() => {
    if (!open || !ref.current) return setPos(null)
    const r = ref.current.getBoundingClientRect()
    const left = open.x + r.width + 8 > innerWidth ? Math.max(8, open.x - r.width) : open.x
    const top = open.y + r.height + 8 > innerHeight ? Math.max(8, open.y - r.height) : open.y
    setPos({ left, top })
  }, [open])

  // Focus the first item once the menu is placed and visible (a hidden element can't take focus).
  useEffect(() => {
    if (pos) ref.current?.querySelector<HTMLElement>('[data-menu-item]:not([disabled])')?.focus({ preventScroll: true })
  }, [pos])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      const all = [...(ref.current?.querySelectorAll<HTMLElement>('[data-menu-item]:not([disabled])') ?? [])]
      const i = all.indexOf(document.activeElement as HTMLElement)
      all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus()
    }
    const onAway = () => close()
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onAway)
    window.addEventListener('blur', onAway)
    document.addEventListener('scroll', onAway, true)
    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onAway)
      window.removeEventListener('blur', onAway)
      document.removeEventListener('scroll', onAway, true)
    }
  }, [open, close])

  if (!open) return null
  const run = (fn: () => void) => {
    close()
    fn()
  }

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={open.title ?? 'Options'}
      data-context-menu
      data-surface="menu"
      className="pop-in fixed z-[60] min-w-52 max-w-[22rem] overflow-hidden rounded-xl bg-raised py-1.5 text-sm text-fg shadow-float ring-1 ring-line"
      style={{ left: pos?.left ?? open.x, top: pos?.top ?? open.y, visibility: pos ? 'visible' : 'hidden' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {open.title && <p className="truncate px-3 pb-1 pt-0.5 text-xs font-semibold text-muted">{open.title}</p>}
      {open.items.map((it, i) => {
        if (it.kind === 'separator') return <div key={i} role="separator" className="my-1 h-px bg-line" />
        if (it.kind === 'label') return <p key={i} className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{it.label}</p>
        if (it.kind === 'colors') {
          return (
            <div key={i} role="group" aria-label="Colour" className="grid grid-cols-6 gap-1.5 px-3 py-1.5">
              <button
                type="button"
                data-menu-item
                data-color-option="none"
                aria-label="No colour"
                title="No colour"
                onClick={() => run(() => it.onPick(undefined))}
                className={`flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${!it.value ? 'bg-selected' : 'bg-card'}`}
              >
                <X className="h-3 w-3 text-muted" />
              </button>
              {ITEM_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  data-menu-item
                  data-color-option={c.id}
                  aria-label={c.name}
                  aria-pressed={it.value === c.id}
                  title={c.name}
                  onClick={() => run(() => it.onPick(c.id))}
                  className="flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  style={{ background: c.bg, color: c.fg, boxShadow: `inset 0 0 0 5px ${c.bg}, inset 0 0 0 12px ${c.fg}` }}
                >
                  {it.value === c.id && <Check className="h-3 w-3" strokeWidth={3} style={{ color: c.bg }} />}
                </button>
              ))}
            </div>
          )
        }
        if (it.kind === 'choice') {
          return (
            <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5">
              <span className="text-xs text-muted">{it.label}</span>
              <div role="radiogroup" aria-label={it.label} className="inline-flex rounded-md bg-sunken p-0.5 ring-1 ring-line">
                {it.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    data-menu-item
                    aria-checked={o.value === it.value}
                    onClick={() => run(() => it.onPick(o.value))}
                    className={`rounded px-2 py-0.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${o.value === it.value ? 'bg-card text-strong shadow-xs ring-1 ring-line' : 'text-muted hover:text-fg'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            data-menu-item
            disabled={it.disabled}
            onClick={() => run(it.onSelect)}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left focus-visible:outline-none disabled:opacity-40 ${
              it.danger ? 'text-danger hover:bg-danger-soft focus:bg-danger-soft' : 'hover:bg-hover focus:bg-hover'
            }`}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted">{it.checked ? <Check className="h-3.5 w-3.5" /> : it.icon}</span>
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            {it.hint && <span className="shrink-0 text-xs text-muted">{it.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}
