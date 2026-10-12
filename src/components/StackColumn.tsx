import { useEffect, useRef, useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  FolderInput,
  FolderPlus,
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { Stack } from '../lib/types'
import { stackLinks, walkStacks } from '../lib/bookmarks'
import { useStackableStore } from '../store/useStackableStore'
import { useItemMeta, useMetaFor, type ItemLayout, type ItemMeta } from '../store/useItemMeta'
import { openAllInTabs } from '../lib/tabs'
import { glow, reducedMotion } from '../lib/motion'
import { useTwoStep } from '../hooks/useTwoStep'
import { openContextMenu, type MenuItem } from './ContextMenu'
import { BookmarkCard, isMenuKey, openMenuAt, type CardVariant } from './BookmarkCard'
import { tint } from './BookmarkIcon'

/**
 * '' when this element mounts after the board's first paint (a space switch, a new stack), so
 * polish.css lets the entrance play; undefined for the board a new tab opens with, which shows
 * still. Read once at mount: flipping it later would restart the animation.
 */
export function useEntrance(): '' | undefined {
  const [enter] = useState<'' | undefined>(() => (document.documentElement.hasAttribute('data-booted') ? '' : undefined))
  return enter
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const icon = (I: typeof Pencil) => <I className="h-3.5 w-3.5" />

/** "4 links" or "2 sub-stacks, 9 links": what a delete takes with it. */
export function stackContents(stack: Stack): string {
  const subs = walkStacks(stack.children ?? []).length
  const links = plural(stackLinks(stack).length, 'link')
  return subs ? `${plural(subs, 'sub-stack')}, ${links}` : links
}

/**
 * A stack's right-click menu (header, kebab, Menu key). Sub-stacks get the same menu without
 * Width: they always fill their parent.
 */
export function stackMenu(stack: Stack, meta: ItemMeta, topLevel: boolean): MenuItem[] {
  const store = useStackableStore.getState()
  const setMeta = (patch: Partial<ItemMeta>) => useItemMeta.getState().set(stack.id, patch)
  const links = stackLinks(stack)
  const collapsed = !!meta.collapsed
  const items: MenuItem[] = [
    { label: 'Rename', icon: icon(Pencil), onSelect: () => store.openModal({ kind: 'stack-edit', id: stack.id, title: stack.title }) },
    { kind: 'separator' },
    { kind: 'colors', value: meta.color, onPick: (color) => setMeta({ color }) },
    {
      kind: 'choice',
      label: 'Layout',
      value: meta.layout ?? 'list',
      options: [
        { value: 'list', label: 'List' },
        { value: 'tiles', label: 'Tiles' },
        { value: 'compact', label: 'Compact' },
      ],
      onPick: (v) => setMeta({ layout: v === 'list' ? undefined : (v as ItemLayout) }),
    },
  ]
  if (topLevel) {
    items.push({
      kind: 'choice',
      label: 'Width',
      value: meta.span === 2 ? 'wide' : 'normal',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'wide', label: 'Wide' },
      ],
      onPick: (v) => setMeta({ span: v === 'wide' ? 2 : undefined }),
    })
  }
  items.push(
    { kind: 'separator' },
    {
      label: collapsed ? 'Expand' : 'Collapse',
      icon: icon(collapsed ? ChevronsUpDown : ChevronsDownUp),
      onSelect: () => setMeta({ collapsed: collapsed ? undefined : true }),
    },
    {
      label: 'New sub-stack',
      icon: icon(FolderPlus),
      onSelect: () =>
        store.openModal({ kind: 'stack-add', spaceId: stack.parentSpaceId, parentStackId: stack.id, parentTitle: stack.title }),
    },
    {
      label: 'Move into stack…',
      icon: icon(FolderInput),
      onSelect: () => store.openModal({ kind: 'stack-move', id: stack.id, title: stack.title, currentSpaceId: stack.parentSpaceId, to: 'stack' }),
    },
    {
      label: 'Move to space…',
      icon: icon(ArrowRightLeft),
      onSelect: () => store.openModal({ kind: 'stack-move', id: stack.id, title: stack.title, currentSpaceId: stack.parentSpaceId, to: 'space' }),
    },
    {
      label: 'Open all as tabs',
      icon: icon(ExternalLink),
      hint: links.length ? String(links.length) : undefined,
      disabled: links.length === 0,
      onSelect: () => void openAllInTabs(links, stack.title),
    },
    { kind: 'separator' },
    {
      label: 'Delete',
      icon: icon(Trash2),
      danger: true,
      onSelect: () => void store.removeWithUndo('stack', stack.id, stack.title, stackContents(stack)),
    },
  )
  return items
}

/** Right-click, the Menu key and Shift+F10 on a stack header all open its menu. */
function menuHandlers(build: () => MenuItem[], title: string) {
  return {
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
      // A keyboard-made contextmenu event has no pointer position: open under the header.
      if (e.clientX === 0 && e.clientY === 0) {
        e.preventDefault()
        openMenuAt(e.currentTarget, build(), title, true)
      } else openContextMenu(e, build(), title)
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (!isMenuKey(e)) return
      e.preventDefault()
      e.stopPropagation()
      openMenuAt(e.currentTarget, build(), title, true)
    },
  }
}

const variantOf = (layout: ItemLayout | undefined): CardVariant =>
  layout === 'tiles' ? 'tile' : layout === 'compact' ? 'compact' : 'row'

/**
 * A stack's own links and its Add button, laid out the way the stack asks for. A sub-stack shows
 * the Add row only while it is empty; otherwise its header has a + for it.
 */
function StackLinks({ stack, layout, quietAdd, sub = false }: { stack: Stack; layout: ItemLayout | undefined; quietAdd: boolean; sub?: boolean }) {
  const openModal = useStackableStore((s) => s.openModal)
  const variant = variantOf(layout)
  const count = stack.bookmarks.length
  const showAdd = !sub || count === 0
  return (
    <>
      <SortableContext
        items={stack.bookmarks.map((b) => `bm:${b.id}`)}
        strategy={variant === 'tile' ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {stack.bookmarks.map((b) => (
          <BookmarkCard key={b.id} bookmark={b} variant={variant} />
        ))}
      </SortableContext>
      {showAdd && (
        <button
          onClick={() => openModal({ kind: 'bookmark-add', stackId: stack.id })}
          data-add-link
          // Quiet at rest: the dashed outline shows on hover, or always on an empty stack.
          className={`flex items-center gap-2 rounded-lg border border-dashed px-2.5 text-xs text-muted hover:border-accent-line hover:bg-accent-soft/60 hover:text-accent-text ${
            variant === 'tile' ? 'col-span-full mt-0.5 py-1.5' : variant === 'compact' ? 'mt-0.5 py-1' : 'mt-1 py-2 compact:py-1.5'
          } ${count === 0 && !quietAdd ? 'border-line-strong' : 'border-transparent group-hover/stack:border-line-strong'}`}
        >
          <Plus className="h-3.5 w-3.5" />
          Add bookmark
        </button>
      )}
    </>
  )
}

const LIST_INNER: Record<CardVariant, string> = {
  row: 'flex flex-col gap-1 compact:gap-0.5',
  compact: 'flex flex-col gap-px',
  tile: 'grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1',
}

/** Glow on a drop or an undo; scroll into view and glow on a reveal (sidebar, search, undo). */
function useCues(id: string, scrollRef: React.RefObject<HTMLElement | null>, glowRef: React.RefObject<HTMLElement | null>) {
  const flashSeq = useStackableStore((s) => (s.flash?.id === id ? s.flash.seq : 0))
  const revealSeq = useStackableStore((s) => (s.reveal?.id === id ? s.reveal.seq : 0))
  useEffect(() => {
    if (flashSeq) glow(glowRef.current, 120)
  }, [flashSeq])
  useEffect(() => {
    if (!revealSeq) return
    scrollRef.current?.scrollIntoView({
      behavior: reducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
    glow(glowRef.current, 280)
  }, [revealSeq])
}

function SubStacks({ stacks, collapsed, depth }: { stacks: Stack[]; collapsed: boolean; depth: number }) {
  if (stacks.length === 0) return null
  return (
    <div data-substacks data-collapse={collapsed ? 'closed' : 'open'}>
      <div>
        {stacks.map((s) => (
          <SubStack key={s.id} stack={s} depth={depth} />
        ))}
      </div>
    </div>
  )
}

interface Props {
  stack: Stack
  /** Position in the space, for the staggered entrance. */
  index?: number
}

export function StackColumn({ stack, index = 0 }: Props) {
  const openModal = useStackableStore((s) => s.openModal)
  const into = useStackableStore((s) => s.dropInto === stack.id)
  const meta = useMetaFor(stack.id)
  const collapsed = !!meta.collapsed
  const openAll = useTwoStep()
  const columnRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const links = stackLinks(stack)
  const count = links.length
  const subs = stack.children ?? []
  const enter = useEntrance()
  useCues(stack.id, columnRef, listRef)

  const { attributes, listeners, setNodeRef: setSortNode, transform, transition, isDragging } =
    useSortable({
      id: `st:${stack.id}`,
      data: { type: 'stack', stack },
    })

  const { setNodeRef: setDropNode, isOver } = useDroppable({
    id: `stack-drop:${stack.id}`,
    data: { type: 'stack-drop', stackId: stack.id },
  })
  // The header takes other stacks (and links) dropped into this one (0.8.0).
  const { setNodeRef: setNestNode } = useDroppable({ id: `nest:${stack.id}`, data: { type: 'nest', stackId: stack.id } })

  const onOpenAll = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (count === 0) return
    if (count > 15 && !openAll.armed) {
      openAll.arm()
      return
    }
    openAll.disarm()
    await openAllInTabs(links, stack.title)
  }

  const toggle = () => useItemMeta.getState().set(stack.id, { collapsed: collapsed ? undefined : true })
  const menu = () => stackMenu(stack, useItemMeta.getState().meta[stack.id] ?? {}, true)
  const colored = tint(meta.color)
  const bodyId = `stack-body-${stack.id}`

  return (
    <div
      ref={(el) => {
        columnRef.current = el
        setSortNode(el)
      }}
      // Opacity as a class, never inline: the drop animation hides the original through
      // inline style, and a re-render mustn't overwrite that mid-drop.
      style={{ ...colored.style, transform: CSS.Translate.toString(transform), transition, '--i': index } as React.CSSProperties}
      data-surface="stack"
      data-enter={enter}
      data-color={colored['data-color']}
      data-layout={meta.layout}
      data-span={meta.span === 2 ? '2' : undefined}
      data-collapsed={collapsed ? '' : undefined}
      data-drop-into={into ? '' : undefined}
      // Over a wallpaper each stack becomes a frosted tile, header included, so it reads on any photo.
      className={`group/stack flex min-w-0 flex-col wallpaper:rounded-2xl wallpaper:bg-panel/55 wallpaper:p-2 wallpaper:ring-1 wallpaper:ring-line/50 wallpaper:backdrop-blur-xl ${
        isDragging ? 'opacity-30' : ''
      }`}
      id={`stack-${stack.id}`}
    >
      {/* Pointer-only drag handle: there is no keyboard sensor, so it stays out of the tab order.
          polish.css insets it by --sb-inset, the line every stack title, link icon and widget
          icon starts on; the grip hangs in the margin left of the title, out of the flow. */}
      <div
        {...attributes}
        {...listeners}
        ref={setNestNode}
        tabIndex={-1}
        data-stack-head
        {...menuHandlers(menu, stack.title)}
        className="relative mb-3 flex items-center gap-1.5 cursor-grab active:cursor-grabbing compact:mb-2 wallpaper:mb-2"
        aria-label="Drag stack header"
      >
        <GripVertical
          aria-hidden
          className="absolute left-[calc(var(--sb-inset,18px)-19px)] top-1/2 h-4 w-4 -translate-y-1/2 text-ghost opacity-0 transition-opacity group-hover/stack:opacity-100"
        />
        <h3
          onDoubleClick={(e) => {
            e.stopPropagation()
            openModal({ kind: 'stack-edit', id: stack.id, title: stack.title })
          }}
          className="flex min-w-0 flex-1 cursor-text select-none text-sm font-semibold text-fg"
          title="Double-click to rename"
        >
          <span data-pill className="truncate">{stack.title}</span>
          {/* Folded, the header says how much it holds. */}
          {collapsed && count > 0 && (
            <span data-count className="ml-2 shrink-0 self-center text-xs font-normal tabular-nums text-muted" aria-label={plural(count, 'link')}>
              {count}
            </span>
          )}
        </h3>
        <span aria-hidden data-drop-label className="shrink-0 rounded-full px-2 text-[11px] font-semibold leading-5">
          Drop inside
        </span>
        <button
          onClick={onOpenAll}
          disabled={count === 0}
          className={`flex items-center gap-1 rounded p-0.5 disabled:opacity-30 ${
            openAll.armed
              ? 'bg-accent px-1.5 text-on-accent hover:bg-accent-hover'
              : 'text-faint opacity-0 hover:bg-card/60 hover:text-fg focus-visible:opacity-100 group-hover/stack:opacity-100'
          }`}
          aria-label={`Open all ${count} bookmark${count === 1 ? '' : 's'} as tabs`}
          title={openAll.armed ? 'Click again to open them all' : `Open all ${count} bookmarks as tabs`}
        >
          <ExternalLink className="h-4 w-4" />
          {openAll.armed && <span className="text-xs font-medium">Open {count}?</span>}
        </button>
        <button
          onClick={(e) => openMenuAt(e.currentTarget, menu(), stack.title, e.detail === 0)}
          className="rounded p-0.5 text-faint opacity-0 hover:bg-card/60 hover:text-fg focus-visible:opacity-100 group-hover/stack:opacity-100"
          aria-label="Stack options"
          aria-haspopup="menu"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        <button
          onClick={toggle}
          data-chevron
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${stack.title}`}
          title={collapsed ? 'Expand' : 'Collapse'}
          className={`rounded p-0.5 text-faint hover:bg-card/60 hover:text-fg focus-visible:opacity-100 group-hover/stack:opacity-100 ${
            collapsed ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={(el) => {
          listRef.current = el
          setDropNode(el)
        }}
        id={bodyId}
        data-stack-list
        data-collapse={collapsed ? 'closed' : 'open'}
        data-over={isOver ? '' : undefined}
        data-parent-only={stack.bookmarks.length === 0 && subs.length > 0 ? '' : undefined}
        className={`rounded-xl border p-1.5 transition-colors compact:p-1 wallpaper:p-0 ${
          isOver ? 'border-accent-line bg-accent-soft/60' : 'border-transparent bg-well wallpaper:bg-transparent'
        }`}
      >
        <div className={LIST_INNER[variantOf(meta.layout)]}>
          <StackLinks stack={stack} layout={meta.layout} quietAdd={subs.length > 0} />
        </div>
      </div>
      <SubStacks stacks={subs} collapsed={collapsed} depth={1} />
    </div>
  )
}

/**
 * A folder inside a stack: an indented section with its own small header, links, colour and
 * layout, folding on its own. Drag it by the header onto another stack's header to move it
 * there, or onto the board to make it a stack of its own.
 */
function SubStack({ stack, depth }: { stack: Stack; depth: number }) {
  const into = useStackableStore((s) => s.dropInto === stack.id)
  const meta = useMetaFor(stack.id)
  const collapsed = !!meta.collapsed
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const count = stackLinks(stack).length
  useCues(stack.id, sectionRef, listRef)

  const { attributes, listeners, setNodeRef: setDragNode, isDragging } = useDraggable({
    id: `sub:${stack.id}`,
    data: { type: 'stack', stack },
  })
  const { setNodeRef: setNestNode } = useDroppable({ id: `nest:${stack.id}`, data: { type: 'nest', stackId: stack.id } })
  const { setNodeRef: setDropNode, isOver } = useDroppable({
    id: `stack-drop:${stack.id}`,
    data: { type: 'stack-drop', stackId: stack.id },
  })

  const toggle = () => useItemMeta.getState().set(stack.id, { collapsed: collapsed ? undefined : true })
  const menu = () => stackMenu(stack, useItemMeta.getState().meta[stack.id] ?? {}, false)
  const colored = tint(meta.color)
  const bodyId = `stack-body-${stack.id}`

  return (
    <div
      ref={sectionRef}
      role="group"
      id={`stack-${stack.id}`}
      data-substack
      data-depth={depth}
      data-color={colored['data-color']}
      data-layout={meta.layout}
      data-collapsed={collapsed ? '' : undefined}
      data-drop-into={into ? '' : undefined}
      style={colored.style}
      aria-label={stack.title}
      className={`group/sub ${isDragging ? 'opacity-30' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        ref={(el) => {
          setDragNode(el)
          setNestNode(el)
        }}
        tabIndex={-1}
        data-sub-head
        {...menuHandlers(menu, stack.title)}
        aria-label="Drag sub-stack header"
        className="flex cursor-grab items-center gap-1 active:cursor-grabbing"
      >
        <button
          onClick={toggle}
          data-chevron
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${stack.title}`}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-faint hover:bg-card/60 hover:text-fg"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <h4
          onDoubleClick={(e) => {
            e.stopPropagation()
            useStackableStore.getState().openModal({ kind: 'stack-edit', id: stack.id, title: stack.title })
          }}
          className="flex min-w-0 cursor-text select-none text-[13px] font-semibold text-soft"
          title="Double-click to rename"
        >
          <span data-pill className="truncate">{stack.title}</span>
        </h4>
        <span data-count className="shrink-0 text-[11px] tabular-nums text-muted" aria-label={plural(count, 'link')}>
          {count}
        </span>
        <span className="flex-1" />
        <span aria-hidden data-drop-label className="shrink-0 rounded-full px-2 text-[11px] font-semibold leading-5">
          Drop inside
        </span>
        <button
          onClick={() => useStackableStore.getState().openModal({ kind: 'bookmark-add', stackId: stack.id })}
          className="rounded p-0.5 text-faint opacity-0 hover:bg-card/60 hover:text-fg focus-visible:opacity-100 group-hover/sub:opacity-100"
          aria-label={`Add a bookmark to ${stack.title}`}
          title="Add bookmark"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => openMenuAt(e.currentTarget, menu(), stack.title, e.detail === 0)}
          className="rounded p-0.5 text-faint opacity-0 hover:bg-card/60 hover:text-fg focus-visible:opacity-100 group-hover/sub:opacity-100"
          aria-label="Sub-stack options"
          aria-haspopup="menu"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      <div id={bodyId} data-collapse={collapsed ? 'closed' : 'open'}>
        <div>
          <div
            ref={(el) => {
              listRef.current = el
              setDropNode(el)
            }}
            data-sub-list
            data-over={isOver ? '' : undefined}
            className={`rounded-lg border transition-colors ${isOver ? 'border-accent-line bg-accent-soft/60' : 'border-transparent'}`}
          >
            <div className={LIST_INNER[variantOf(meta.layout)]}>
              <StackLinks stack={stack} layout={meta.layout} quietAdd={(stack.children ?? []).length > 0} sub />
            </div>
          </div>
          {(stack.children ?? []).map((s) => (
            <SubStack key={s.id} stack={s} depth={depth + 1} />
          ))}
        </div>
      </div>
    </div>
  )
}
