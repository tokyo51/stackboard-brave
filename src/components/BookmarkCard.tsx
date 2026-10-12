import { useEffect, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink, FolderInput, Link2, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { Bookmark } from '../lib/types'
import { parseBookmarkTitle } from '../lib/icon'
import { displayTitle, splitTitle } from '../lib/title'
import { findOpenTab } from '../lib/openTabs'
import { openHere, openInNewTab } from '../lib/tabs'
import { glow } from '../lib/motion'
import { useStackableStore } from '../store/useStackableStore'
import { useItemMeta, useMetaFor, type ItemColor } from '../store/useItemMeta'
import { openContextMenu, openContextMenuAt, type MenuItem } from './ContextMenu'
import { BookmarkIcon, tint } from './BookmarkIcon'
import { useAppearance } from '../store/useAppearance'

function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const DAY = 24 * 60 * 60 * 1000
const JUST_SAVED = 2 * 60 * 1000

/** The keyboard's way to a context menu: the Menu key, or Shift+F10. */
export function isMenuKey(e: React.KeyboardEvent): boolean {
  return e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')
}

/**
 * Opens a menu under an element. From the keyboard (the Menu key, Shift+F10, Enter on a kebab)
 * focus moves into it: ContextMenuHost tries that while the menu is still hidden for
 * positioning, so the first item gets focus again once it is on screen.
 */
export function openMenuAt(el: Element, items: MenuItem[], title: string, fromKeyboard: boolean): void {
  openContextMenuAt(el, items, title)
  if (!fromKeyboard) return
  requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-context-menu] [data-menu-item]:not([disabled])')?.focus({ preventScroll: true }))
}

/** A link's right-click menu; the kebab and the keyboard open the same one. */
export function bookmarkMenu(bookmark: Bookmark, shown: string, color: ItemColor | undefined): MenuItem[] {
  const store = useStackableStore.getState()
  return [
    { label: 'Open in new tab', icon: <ExternalLink className="h-3.5 w-3.5" />, onSelect: () => void openInNewTab(bookmark.url) },
    {
      label: 'Edit',
      icon: <Pencil className="h-3.5 w-3.5" />,
      onSelect: () =>
        store.openModal({ kind: 'bookmark-edit', id: bookmark.id, title: bookmark.title, url: bookmark.url, stackId: bookmark.parentStackId }),
    },
    { kind: 'separator' },
    { kind: 'colors', value: color, onPick: (c) => useItemMeta.getState().set(bookmark.id, { color: c }) },
    { kind: 'separator' },
    {
      label: 'Move to stack…',
      icon: <FolderInput className="h-3.5 w-3.5" />,
      onSelect: () => store.openModal({ kind: 'bookmark-move', id: bookmark.id, title: shown, stackId: bookmark.parentStackId }),
    },
    {
      label: 'Copy link',
      icon: <Link2 className="h-3.5 w-3.5" />,
      onSelect: () =>
        void navigator.clipboard
          .writeText(bookmark.url)
          .then(() => store.showToast({ verb: 'Copied', title: siteOf(bookmark.url), duration: 2200 }))
          .catch((err) => store.reportError("Couldn't copy the link:", err)),
    },
    { kind: 'separator' },
    { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, onSelect: () => void store.removeWithUndo('bookmark', bookmark.id, shown) },
  ]
}

/** How a stack lays out its links (Settings on the stack: Layout). */
export type CardVariant = 'row' | 'compact' | 'tile'

interface Props {
  bookmark: Bookmark
  /** Off in search results, where the card is only a launcher. */
  sortable?: boolean
  /** Marks the search result that Enter opens. */
  top?: boolean
  variant?: CardVariant
}

export function BookmarkCard({ bookmark, sortable = true, top = false, variant = 'row' }: Props) {
  const isOpen = useStackableStore((s) => findOpenTab(s.openTabs, bookmark.url) !== null)
  const flashSeq = useStackableStore((s) => (s.flash?.id === bookmark.id ? s.flash.seq : 0))
  const color = useMetaFor(bookmark.id).color
  const nodeRef = useRef<HTMLDivElement | null>(null)

  // `attributes` (role="button", tabIndex=0) are deliberately not spread: the <a> below is
  // the focusable element, and only the pointer sensor drives dragging.
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `bm:${bookmark.id}`,
    data: { type: 'bookmark', bookmark },
    disabled: !sortable,
  })

  const { emoji, text } = parseBookmarkTitle(bookmark.title)
  const shown = displayTitle(text, bookmark.url)
  const [head, tail] = splitTitle(shown)
  const details = useAppearance((s) => s.appearance.details)
  const age = bookmark.dateAdded ? Date.now() - bookmark.dateAdded : Infinity
  const isNew = age < DAY && !bookmark.batch

  // Glow after a drop or an undo, and once when a fresh save first shows up.
  useEffect(() => {
    if (flashSeq) glow(nodeRef.current, 120)
  }, [flashSeq])
  useEffect(() => {
    if (age < JUST_SAVED && !bookmark.batch) glow(nodeRef.current, 200)
  }, []) // on mount only

  // Already open somewhere: a plain click switches to that tab. Modified clicks mean
  // "open another copy", so the browser keeps them.
  const onLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isOpen || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    void openHere(bookmark.url, useStackableStore.getState().openTabs)
  }

  const menu = () => bookmarkMenu(bookmark, shown, color)
  // Our menu replaces the browser's link menu; Shift+right-click still gets the browser's own
  // (new window, incognito). A keyboard-made contextmenu event has no pointer position.
  const onContextMenu = (e: React.MouseEvent) => {
    if (e.shiftKey && e.button === 2) return
    if (e.clientX === 0 && e.clientY === 0) {
      e.preventDefault()
      openMenuAt(e.currentTarget, menu(), shown, true)
    } else openContextMenu(e, menu(), shown)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isMenuKey(e)) return
    e.preventDefault()
    e.stopPropagation()
    openMenuAt(e.currentTarget, menu(), shown, true)
  }

  const tooltip = [
    bookmark.title,
    bookmark.url,
    isOpen ? 'Already open in a tab. Click to switch to it.' : null,
    isNew ? 'Added in the last day.' : null,
  ]
    .filter(Boolean)
    .join('\n')

  const grab = sortable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
  const colored = tint(color)
  const tile = variant === 'tile'
  const compact = variant === 'compact'

  return (
    <div
      ref={(el) => {
        nodeRef.current = el
        setNodeRef(el)
      }}
      {...(sortable ? listeners : {})}
      data-color={colored['data-color']}
      style={{ ...colored.style, transform: CSS.Translate.toString(transform), transition }}
      data-drop-slot={isDragging ? '' : undefined}
      data-surface="card"
      data-variant={variant === 'row' ? undefined : variant}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      className={`group/card relative border text-fg ${tile ? 'rounded-xl text-xs' : compact ? 'rounded-md text-[13px]' : 'rounded-lg text-sm compact:text-[13px]'} ${grab} ${
        isDragging
          ? 'border-dashed border-accent-line bg-accent-soft/50' // the slot the card will drop into
          : `${tile ? 'bg-transparent' : 'bg-card'} hover:border-line hover:bg-hover wallpaper:bg-card/70 wallpaper:hover:bg-hover/90 ${top ? 'border-accent-line' : 'border-transparent'}`
      }`}
    >
      {isNew && !isDragging && !tile && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-mark"
        />
      )}
      {/* A real link, so the browser owns every open gesture: click (this tab), Ctrl/Cmd+click
          (background tab), Ctrl+Shift+click, middle-click, Shift+click (new window), Enter from
          the keyboard. draggable={false} keeps the native link drag from competing with
          dnd-kit. The kebab sits outside the link so opening the menu never navigates. */}
      {tile ? (
        <a
          href={bookmark.url}
          draggable={false}
          title={tooltip}
          onClick={onLinkClick}
          className={`flex flex-col items-center gap-1.5 rounded-xl px-1 pb-1.5 pt-2 ${grab} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
            isDragging ? 'invisible' : ''
          }`}
        >
          <span className="relative">
            <BookmarkIcon emoji={emoji} title={shown} url={bookmark.url} size="lg" />
            {isOpen && (
              <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" />
            )}
          </span>
          <span className="w-full truncate px-0.5 text-center leading-4">{shown}</span>
          {isOpen && <span className="sr-only"> (open in a tab)</span>}
        </a>
      ) : (
        <a
          href={bookmark.url}
          draggable={false}
          title={tooltip}
          onClick={onLinkClick}
          className={`flex items-center ${compact ? 'gap-2 rounded-md py-px pl-2 pr-8' : 'gap-2.5 rounded-lg py-[3px] pl-2.5 pr-9.5 compact:gap-2 compact:py-0.5'} ${grab} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
            isDragging ? 'invisible' : ''
          }`}
        >
          <span className="relative shrink-0">
            <BookmarkIcon emoji={emoji} title={shown} url={bookmark.url} size={compact ? 'sm' : 'md'} />
            {isOpen && (
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-card"
              />
            )}
          </span>
          {/* Middle truncation: the start gets the ellipsis, the last word or two stay. */}
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0">
              <span className="truncate">{head}</span>
              {tail && <span className="shrink-0 whitespace-pre">{tail}</span>}
            </span>
            {details && !compact && <span className="truncate text-[11px] leading-4 text-muted">{siteOf(bookmark.url)}</span>}
          </span>
          {isOpen && <span className="sr-only"> (open in a tab)</span>}
        </a>
      )}
      {top && !isDragging && (
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-sunken px-1 font-sans text-[10px] leading-4 text-muted group-hover/card:opacity-0"
        >
          ↵
        </kbd>
      )}
      <button
        // detail is 0 for a click made with Enter or Space.
        onClick={(e) => openMenuAt(e.currentTarget, menu(), shown, e.detail === 0)}
        className={`absolute rounded p-0.5 text-faint opacity-0 hover:bg-selected hover:text-fg focus-visible:opacity-100 group-hover/card:opacity-100 ${
          tile ? 'right-0.5 top-0.5' : compact ? 'right-1.5 top-1/2 -translate-y-1/2' : 'right-2.5 top-1/2 -translate-y-1/2'
        } ${isDragging ? 'invisible' : ''}`}
        aria-label="Bookmark options"
        aria-haspopup="menu"
      >
        <MoreVertical className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </div>
  )
}
