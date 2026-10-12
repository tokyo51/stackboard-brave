import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useSensor,
  useSensors,
  type Collision,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import { Sidebar } from './components/Sidebar'
import { SpaceView } from './components/SpaceView'
import { SearchResults } from './components/SearchResults'
import { UndoToast } from './components/UndoToast'
import { Welcome } from './components/Welcome'
import { KeepItHint } from './components/KeepItHint'
import { RatingPrompt } from './components/RatingPrompt'
import { Certificate } from './components/Certificate'
import type { Bankruptcy } from './lib/stashPlan'
import { BookmarkGhost, StackGhost } from './components/DragGhosts'
import { Backdrop } from './components/Backdrop'
import { Ambient } from './components/Ambient'
import { CommandPalette } from './components/CommandPalette'
import { ContextMenuHost } from './components/ContextMenu'
import { installTilt } from './lib/tilt'
import { useAppearance } from './store/useAppearance'
import { ModalHost } from './components/modals/ModalHost'
import { BOARD, setCollapsed, useStackableStore } from './store/useStackableStore'
import { useBookmarkTree } from './hooks/useBookmarkTree'
import { useOpenTabs } from './hooks/useOpenTabs'
import {
  IS_EXTENSION,
  locateStack,
  moveBookmark,
  moveSpace,
  moveStack,
  stackOfBookmark,
  subtreeIds,
} from './lib/bookmarks'
import { takeOpenSpaceNote } from './lib/stash'
import { plural } from './lib/importPlan'
import type { Bookmark, Space, Stack } from './lib/types'

type DragItem =
  | { type: 'space'; space: Space }
  | { type: 'stack'; stack: Stack }
  | { type: 'bookmark'; bookmark: Bookmark }

type DropKind = 'sp' | 'st' | 'sub' | 'bm' | 'stack-drop' | 'nest' | 'grid'
const KINDS: readonly DropKind[] = ['stack-drop', 'nest', 'grid', 'sub', 'sp', 'st', 'bm']

// Draggable and droppable ids: sp: a sidebar space row, st: a stack, sub: a sub-stack (0.8.0),
// bm: a link, stack-drop: a stack's link list, nest: a stack or sub-stack header (drop inside),
// grid: the board of a space (a sub-stack dropped there becomes a stack).
function parseId(id: string): { kind: DropKind; rawId: string } | null {
  for (const kind of KINDS) if (id.startsWith(`${kind}:`)) return { kind, rawId: id.slice(kind.length + 1) }
  return null
}

const byPrefix = (args: Parameters<CollisionDetection>[0], ...prefixes: string[]) => ({
  ...args,
  droppableContainers: args.droppableContainers.filter((c) => prefixes.some((p) => String(c.id).startsWith(p))),
})

/**
 * The header (nest zone) under the pointer, skipping `blocked` stacks. Zones reach `slop` px
 * sideways, half the gap between columns, so a drag along a row of headers never drops
 * between two of them.
 */
function nestHit(args: Parameters<CollisionDetection>[0], blocked: ReadonlySet<string>, slop: number): Collision[] {
  const p = args.pointerCoordinates
  if (!p) return []
  for (const c of args.droppableContainers) {
    const id = String(c.id)
    if (!id.startsWith('nest:') || blocked.has(id.slice(5))) continue
    const r = args.droppableRects.get(c.id)
    if (r && p.x >= r.left - slop && p.x <= r.right + slop && p.y >= r.top && p.y <= r.bottom) {
      return [{ id: c.id, data: { droppableContainer: c, value: 0 } }]
    }
  }
  return []
}

// Type-aware collision detection.
//
// A stack's sortable node wraps its whole column, which *also* contains the
// bookmark sortables (`bm:`) and a `stack-drop:` droppable. With a single
// closestCenter scanning every droppable, dragging a stack frequently resolves
// `over` to a bookmark or the drop-zone inside the target column rather than the
// `st:` stack node — so the reorder branch in onDragEnd silently no-ops and the
// stack appears un-draggable. Restricting the candidate droppables to the kind
// that matches what's being dragged makes every drag resolve to the right
// target: stacks snap to stacks, spaces to spaces, bookmarks to bookmarks (or an
// empty stack's drop-zone).
const collisionDetectionStrategy: CollisionDetection = (args) => {
  const activeId = String(args.active.id)

  // A stack can either be reordered within its space (dropped on another `st:`)
  // or moved to a different space by dropping on a sidebar space row (`sp:`).
  // Detect the sidebar drop with the *pointer*, not closestCenter: the stack
  // DragOverlay is 260px wide, so its center can sit outside the 240px sidebar
  // even while the pointer is squarely over a space row — closestCenter would
  // then wrongly prefer a main-area stack. Pointer-within nails the sidebar
  // case; fall back to closestCenter among stacks for in-row reordering.
  if (activeId.startsWith('st:') || activeId.startsWith('sub:')) {
    const onSidebar = pointerWithin(byPrefix(args, 'sp:'))
    if (onSidebar.length > 0) return onSidebar

    // 0.8.0: over another stack's header it goes inside that stack. Never into itself, a stack
    // inside it, or the stack it already sits in.
    const stack = (args.active.data.current as { stack?: Stack } | undefined)?.stack
    const blocked = stack ? subtreeIds(stack) : new Set<string>()
    if (stack?.parentStackId) blocked.add(stack.parentStackId)
    const into = nestHit(args, blocked, 12)
    if (into.length > 0) return into

    if (activeId.startsWith('st:')) return closestCenter(byPrefix(args, 'st:'))

    // A sub-stack over the board becomes a stack of its own: before the stack under the
    // pointer, or last. Over the stack it came from it stays put.
    const home = stack ? locateStack(useStackableStore.getState().tree, stack.id)?.path[0]?.id : undefined
    const others = pointerWithin({ ...args, droppableContainers: byPrefix(args, 'st:').droppableContainers.filter((c) => c.id !== `st:${home}`) })
    if (others.length > 0) return others
    if (home && pointerWithin(byPrefix(args, `st:${home}`)).some((c) => c.id === `st:${home}`)) return []
    return pointerWithin(byPrefix(args, 'grid:'))
  }

  if (activeId.startsWith('bm:')) {
    // 0.8.0: a link dropped on another stack's header goes in last, so a folded stack still
    // takes links. Its own header is left out: reordering to the top overshoots onto it.
    const own = (args.active.data.current as { bookmark?: Bookmark } | undefined)?.bookmark?.parentStackId
    const into = nestHit(args, new Set(own ? [own] : []), 0)
    if (into.length > 0) return into
    return closestCenter(byPrefix(args, 'bm:', 'stack-drop:'))
  }

  return closestCenter(activeId.startsWith('sp:') ? byPrefix(args, 'sp:') : args)
}

/**
 * A top-level stack only goes inside another after resting on its header this long (like a
 * spring-loaded folder), so a reorder that sweeps along the header row still reorders. Links
 * and sub-stacks have nothing to reorder there and go inside at once.
 */
const NEST_DWELL_MS = 450

/** Folder index to pass chrome.bookmarks.move for "where `to` is now", within one parent. */
function moveIndex(from: { index?: number }, fromPos: number, to: { index?: number }, toPos: number, sameParent: boolean): number {
  const a = from.index ?? fromPos
  const b = to.index ?? toPos
  // Pass the target index as if the dragged item were still in the array (b for a leftward
  // move, b+1 for rightward); Chrome applies the self-removal shift.
  return sameParent && b > a ? b + 1 : b
}

// The dragged card flies to its slot and flattens out on the way (data-dropping switches
// off the tilt in index.css). The default side effect keeps the original hidden meanwhile.
// Fork: with Settings > Motion > Spring on, the card lands with a small overshoot.
const SPRING = 'linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50.1%, 1.015 55%, 1.017 63.9%, 1.001)'
const dropAnimation: DropAnimation = {
  duration: 200,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  sideEffects: (params) => {
    params.dragOverlay.node.querySelector('[data-lifted]')?.setAttribute('data-dropping', '')
    return defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } } })(params)
  },
}

export default function App() {
  useBookmarkTree()
  useOpenTabs()
  const tree = useStackableStore((s) => s.tree)
  const loading = useStackableStore((s) => s.loading)
  const error = useStackableStore((s) => s.error)
  const selectedId = useStackableStore((s) => s.selectedSpaceId)
  const search = useStackableStore((s) => s.search)
  const onboarding = useStackableStore((s) => s.onboarding)
  const flashItem = useStackableStore((s) => s.flashItem)

  const activeSpace = useMemo(
    () => tree?.spaces.find((s) => s.id === selectedId) ?? null,
    [tree, selectedId],
  )

  const [dragging, setDragging] = useState<DragItem | null>(null)
  const dwell = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // A tab opened by "Stash this window" lands on the Stash space and says what it saved.
  const loaded = !!tree
  const [certificate, setCertificate] = useState<Bankruptcy | null>(null)
  const spring = useAppearance((s) => s.appearance.motion.spring && s.appearance.motion.level !== 'off')
  useEffect(() => installTilt(), [])
  // Timing mark for the board's first paint; the e2e suite checks the wallpaper comes after it.
  useEffect(() => {
    if (loaded) performance.mark('sb:board')
  }, [loaded])
  // Entrance animations are for changes (a space switch, a new stack), not for every new tab:
  // stacks and widgets mounted before this attribute exists stay still (polish.css, useEntrance).
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => document.documentElement.setAttribute('data-booted', ''), 700)
    return () => clearTimeout(t)
  }, [loaded])
  useEffect(() => {
    if (!loaded || !IS_EXTENSION) return
    void takeOpenSpaceNote().then((note) => {
      if (!note) return
      const store = useStackableStore.getState()
      store.selectSpace(note.spaceId)
      if (note.bankruptcy) setCertificate(note.bankruptcy)
      store.showToast({ verb: 'Stashed', title: plural(note.saved, 'tab'), duration: 4000 })
      store.celebrate()
    })
  }, [loaded])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragItem | undefined
    if (data) setDragging(data)
  }

  // Lights the header a drop would go into (or the board, for a sub-stack on its way out).
  const onDragOver = (e: DragOverEvent) => {
    const store = useStackableStore.getState()
    clearTimeout(dwell.current)
    const a = String(e.active.id)
    const o = e.over ? String(e.over.id) : ''
    if (o.startsWith('nest:')) {
      const target = o.slice('nest:'.length)
      if (a.startsWith('st:')) {
        store.setDropInto(null)
        dwell.current = setTimeout(() => useStackableStore.getState().setDropInto(target), NEST_DWELL_MS)
      } else store.setDropInto(target)
      return
    }
    store.setDropInto(a.startsWith('sub:') && /^(st|grid):/.test(o) ? BOARD : null)
  }

  const endDrag = () => {
    clearTimeout(dwell.current)
    setDragging(null)
    const armed = useStackableStore.getState().dropInto
    useStackableStore.getState().setDropInto(null)
    return armed
  }

  // A failed move used to vanish silently; say so instead.
  const onDragEnd = (e: DragEndEvent) => {
    const armed = endDrag()
    applyDrop(e, armed).catch((err) => useStackableStore.getState().reportError("Couldn't move that:", err))
  }

  /** Same-space stack reorder: `overId` takes the dragged stack's place. */
  const reorderStack = async (activeId: string, overId: string) => {
    if (!tree || activeId === overId) return
    const space = tree.spaces.find((s) => s.stacks.some((st) => st.id === activeId))
    if (!space || !space.stacks.some((st) => st.id === overId)) return
    const fromIdx = space.stacks.findIndex((s) => s.id === activeId)
    const toIdx = space.stacks.findIndex((s) => s.id === overId)
    await moveStack(activeId, space.id, moveIndex(space.stacks[fromIdx], fromIdx, space.stacks[toIdx], toIdx, true))
    flashItem(activeId)
  }

  /** Puts a stack (any depth) inside another, last, and opens the target so it is seen landing. */
  const nestStack = async (id: string, targetId: string) => {
    const moving = locateStack(tree, id)
    const target = locateStack(tree, targetId)
    if (!moving || !target || subtreeIds(moving.stack).has(targetId) || moving.stack.parentStackId === targetId) return
    await moveStack(id, targetId)
    setCollapsed([...target.path.map((s) => s.id), targetId], false)
    flashItem(id)
  }

  const applyDrop = async (e: DragEndEvent, armed: string | null) => {
    const { active, over } = e
    if (!over || !tree) return

    const a = parseId(String(active.id))
    const o = parseId(String(over.id))
    if (!a || !o) return

    // --- Space reorder ---
    if (a.kind === 'sp' && o.kind === 'sp' && a.rawId !== o.rawId) {
      const spaces = tree.spaces
      const fromIdx = spaces.findIndex((s) => s.id === a.rawId)
      const toIdx = spaces.findIndex((s) => s.id === o.rawId)
      if (fromIdx < 0 || toIdx < 0) return
      // Index convention for chrome.bookmarks.move on same-parent reorder: pass the
      // target index as if the dragged item were still in the array (toIdx for a
      // leftward move, toIdx+1 for rightward); Chrome applies the self-removal shift.
      const chromeIdx = toIdx > fromIdx ? toIdx + 1 : toIdx
      await moveSpace(a.rawId, chromeIdx)
      flashItem(a.rawId)
      return
    }

    // --- Stack reorder (within same space only) ---
    if (a.kind === 'st' && o.kind === 'st') return reorderStack(a.rawId, o.rawId)

    // --- A stack or sub-stack let go on a header: it goes inside (0.8.0) ---
    if ((a.kind === 'st' || a.kind === 'sub') && o.kind === 'nest') {
      if (a.kind === 'sub' || armed === o.rawId) return nestStack(a.rawId, o.rawId)
      // A stack let go before the header lit up: a plain reorder onto that header's column.
      const column = locateStack(tree, o.rawId)
      const top = column?.path[0] ?? column?.stack
      if (top) return reorderStack(a.rawId, top.id)
      return
    }

    // --- A sub-stack dropped on the board: a stack of its own (0.8.0) ---
    if (a.kind === 'sub' && (o.kind === 'st' || o.kind === 'grid')) {
      const space = o.kind === 'grid' ? tree.spaces.find((s) => s.id === o.rawId) : tree.spaces.find((s) => s.stacks.some((st) => st.id === o.rawId))
      if (!space) return
      const before = space.stacks.findIndex((s) => s.id === o.rawId)
      const at = before >= 0 ? (space.stacks[before].index ?? before) : undefined
      await moveStack(a.rawId, space.id, at)
      flashItem(a.rawId)
      return
    }

    // --- Stack moved to a space (dropped on a sidebar space row) ---
    // A top-level stack moves to a different space; a sub-stack can also land at the top level
    // of its own space.
    if ((a.kind === 'st' || a.kind === 'sub') && o.kind === 'sp') {
      const from = locateStack(tree, a.rawId)
      const toSpace = tree.spaces.find((s) => s.id === o.rawId)
      if (!from || !toSpace || (a.kind === 'st' && from.space.id === toSpace.id)) return
      // Append to the end of the destination space's stack row — the row isn't
      // visible during the drop, so end-of-row is the only predictable target.
      await moveStack(a.rawId, toSpace.id)
      flashItem(toSpace.id) // the destination row in the sidebar glows
      return
    }

    // --- Bookmark dropped on a bookmark (reorder, possibly across stacks) ---
    if (a.kind === 'bm' && o.kind === 'bm') {
      if (a.rawId === o.rawId) return
      const fromStack = stackOfBookmark(tree, a.rawId)
      const toStack = stackOfBookmark(tree, o.rawId)
      if (!fromStack || !toStack) return
      const fromIdx = fromStack.bookmarks.findIndex((b) => b.id === a.rawId)
      const toIdx = toStack.bookmarks.findIndex((b) => b.id === o.rawId)
      if (fromIdx < 0 || toIdx < 0) return
      const sameStack = fromStack.id === toStack.id
      await moveBookmark(a.rawId, toStack.id, moveIndex(fromStack.bookmarks[fromIdx], fromIdx, toStack.bookmarks[toIdx], toIdx, sameStack))
      flashItem(a.rawId)
      return
    }

    // --- Bookmark dropped onto a stack's header (0.8.0), or an EMPTY stack's container ---
    // The container is only reachable when the target stack has no bookmarks: a non-empty
    // stack always has an inner `bm:` card whose center wins closestCenter, so those drops
    // are handled by the bm→bm branch above. Both append at the end.
    if (a.kind === 'bm' && (o.kind === 'stack-drop' || o.kind === 'nest')) {
      const target = locateStack(tree, o.rawId)
      if (!target || !stackOfBookmark(tree, a.rawId)) return
      await moveBookmark(a.rawId, target.stack.id)
      if (o.kind === 'nest') setCollapsed([...target.path.map((s) => s.id), target.stack.id], false)
      flashItem(a.rawId)
      return
    }
  }

  const searching = search.trim().length > 0
  // An empty board gets the welcome screen, which stays up while it fills the board.
  const welcoming = !!tree && !searching && (tree.spaces.length === 0 || onboarding)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={endDrag}
    >
      <div className="flex h-screen text-fg">
        <Backdrop />
        <Ambient />
        <Sidebar />
        <main className="relative flex-1 overflow-hidden">
          {loading && !tree && (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Loading…
            </div>
          )}
          {error && (
            <div className="flex h-full items-center justify-center text-sm text-danger">
              {error}
            </div>
          )}
          {welcoming && <Welcome />}
          {tree && searching && <SearchResults query={search} />}
          {activeSpace && !searching && !welcoming && <SpaceView space={activeSpace} />}
          <KeepItHint />
        </main>
        <ModalHost />
        <UndoToast />
        <CommandPalette />
        <ContextMenuHost />
        <RatingPrompt />
        {certificate && <Certificate bankruptcy={certificate} onClose={() => setCertificate(null)} />}
        <DragOverlay dropAnimation={spring ? { ...dropAnimation, duration: 420, easing: SPRING } : dropAnimation}>
          {dragging?.type === 'bookmark' && <BookmarkGhost bookmark={dragging.bookmark} />}
          {dragging?.type === 'stack' && <StackGhost stack={dragging.stack} />}
          {dragging?.type === 'space' && (
            <div
              data-lifted
              className="rounded-md border border-accent-line bg-card px-2 py-1.5 text-sm text-fg"
            >
              {dragging.space.emoji} {dragging.space.name}
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}
