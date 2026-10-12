import type { Bookmark, Space, Stack, StackableTree, BookmarkBackup } from './types'
import { buildSpaceTitle, parseSpaceTitle } from './icon'
import { DEMO_TREE } from './demoTree'
import { batchFlags } from './fresh'

const ROOT_TITLE = 'Stackboard'
// The folder was "Stackable" before 0.3.0; ensureRoot renames it in place.
const LEGACY_ROOT_TITLES = ['Stackable']
const LEGACY_OTHER_BOOKMARKS_ID = '2' // "Other bookmarks" before folderType existed (Chrome < 134)
const ROOT_ID_KEY = 'stackableRootId' // predates the rename; kept so existing caches still hit
// How long a new tab waits for another tab's root lookup before going ahead without the lock.
const LOCK_WAIT_MS = 3000

/** Folder names Stackboard has used for its root; the importer never copies these. */
export const rootTitles: readonly string[] = [ROOT_TITLE, ...LEGACY_ROOT_TITLES]

// True when running inside a Chrome extension. False under `vite preview`, dev server, etc.
// In non-extension contexts we serve DEMO_TREE so the UI can be screenshotted / iterated on.
export const IS_EXTENSION =
  typeof chrome !== 'undefined' &&
  !!(chrome as { bookmarks?: unknown }).bookmarks

type Node = chrome.bookmarks.BookmarkTreeNode & { folderType?: string; syncing?: boolean }

function isFolder(n: Node): boolean {
  return !n.url
}

async function getRootIdFromStorage(): Promise<string | null> {
  const r = await chrome.storage.local.get(ROOT_ID_KEY)
  return (r[ROOT_ID_KEY] as string) ?? null
}

async function setRootIdInStorage(id: string): Promise<void> {
  await chrome.storage.local.set({ [ROOT_ID_KEY]: id })
}

async function getNode(id: string): Promise<Node | null> {
  try {
    const [node] = await chrome.bookmarks.get(id)
    return node ?? null
  } catch {
    return null
  }
}

async function childCount(id: string): Promise<number> {
  try {
    return (await chrome.bookmarks.getChildren(id)).length
  } catch {
    return 0
  }
}

/** The browser's own top-level folders (bar, other, mobile; twice when account storage is on). */
async function topFolders(): Promise<Node[]> {
  const [tree] = (await chrome.bookmarks.getTree()) as Node[]
  return ((tree?.children ?? []) as Node[]).filter((n) => isFolder(n) && n.folderType !== 'managed')
}

/**
 * Where a new root goes: "Other bookmarks". Found by folderType (Chrome 134+, Brave), not by
 * the id '2', which is only a convention. With two "Other bookmarks" folders (Chrome account
 * storage) the syncing one wins, so the board travels with the account as the README promises.
 */
async function otherBookmarksId(): Promise<string> {
  const top = await topFolders()
  const others = top.filter(
    (n) => n.folderType === 'other' || (!n.folderType && n.id === LEGACY_OTHER_BOOKMARKS_ID),
  )
  const pick = others.find((n) => n.syncing) ?? others[0] ?? top.find((n) => !n.unmodifiable)
  if (!pick) throw new Error('No bookmarks folder Stackboard can write to')
  return pick.id
}

// Root folders in any top-level folder: the one holding the most spaces wins, the current
// name breaks ties. Two can exist for a while: a device still on an old version can
// recreate an empty "Stackable" after another device renamed the synced folder.
async function findRootByScan(): Promise<string | null> {
  const top = await topFolders()
  const children = (await Promise.all(top.map((t) => chrome.bookmarks.getChildren(t.id)))).flat()
  const candidates = children.filter(
    (c) => isFolder(c) && (c.title === ROOT_TITLE || LEGACY_ROOT_TITLES.includes(c.title)),
  )
  if (candidates.length === 0) return null
  const sized = await Promise.all(candidates.map(async (c) => ({ c, n: await childCount(c.id) })))
  sized.sort(
    (a, b) => b.n - a.n || Number(b.c.title === ROOT_TITLE) - Number(a.c.title === ROOT_TITLE),
  )
  return sized[0].c.id
}

/** The cached root when it is clearly the right one: no lock needed, so every refresh stays cheap. */
async function cachedRoot(): Promise<string | null> {
  const cached = await getRootIdFromStorage()
  const node = cached ? await getNode(cached) : null
  if (!node || !isFolder(node) || node.title !== ROOT_TITLE) return null
  return (await childCount(node.id)) > 0 ? node.id : null
}

function isLockTimeout(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name
  return name === 'TimeoutError' || name === 'AbortError'
}

/**
 * Ensure the Stackboard root folder exists, returning its id.
 * Uses the chrome.storage.local cache, falls back to a scan, creates if missing, and
 * renames a pre-0.3.0 "Stackable" folder in place.
 */
export async function ensureRoot(): Promise<string> {
  const fast = await cachedRoot()
  if (fast) return fast
  // On a fresh profile the install tab and another new tab can load together; without the
  // lock each finds no root and creates its own. Web Locks span every page of the extension.
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (!locks) return ensureRootNow()
  try {
    return await locks.request(
      'stackboard-root',
      { signal: AbortSignal.timeout(LOCK_WAIT_MS) },
      ensureRootNow,
    )
  } catch (err) {
    if (!isLockTimeout(err)) throw err
    // Another Stackboard tab holds the lock and never lets go (a frozen or hung background
    // tab). Waiting forever made every button silently do nothing; go ahead without it.
    console.warn('Stackboard: root lock busy, continuing without it')
    return ensureRootNow()
  }
}

async function ensureRootNow(): Promise<string> {
  const cached = await getRootIdFromStorage()
  const cachedNode = cached ? await getNode(cached) : null
  let root: Node | null = cachedNode && isFolder(cachedNode) ? cachedNode : null

  // An empty cached root while a fuller one exists means we cached a stray duplicate.
  if (root && (await childCount(root.id)) === 0) {
    const scanned = await findRootByScan()
    if (scanned && scanned !== root.id && (await childCount(scanned)) > 0) root = await getNode(scanned)
  }
  if (!root) {
    const scanned = await findRootByScan()
    root = scanned ? await getNode(scanned) : null
  }
  if (!root) {
    root = await chrome.bookmarks.create({ parentId: await otherBookmarksId(), title: ROOT_TITLE })
  }

  if (root.id !== cached) await setRootIdInStorage(root.id)
  if (LEGACY_ROOT_TITLES.includes(root.title)) {
    await chrome.bookmarks.update(root.id, { title: ROOT_TITLE })
  }
  return root.id
}

/** The parts of a chrome.bookmarks node the board reads; tests build these by hand. */
export interface TreeNode {
  id: string
  title: string
  url?: string
  index?: number
  dateAdded?: number
  children?: TreeNode[]
}

const byIndex = (a: TreeNode, b: TreeNode) => (a.index ?? 0) - (b.index ?? 0)

function mapStack(node: TreeNode, spaceId: string, parentStackId?: string): Stack {
  const kids = (node.children ?? []).slice().sort(byIndex)
  const links = kids.filter((c) => !!c.url)
  const batch = batchFlags(links.map((b) => b.dateAdded))
  return {
    id: node.id,
    title: node.title,
    parentSpaceId: spaceId,
    index: node.index,
    ...(parentStackId ? { parentStackId } : {}),
    bookmarks: links.map((b, i) => ({
      id: b.id,
      title: b.title || b.url || 'Untitled',
      url: b.url!,
      parentStackId: node.id,
      index: b.index,
      dateAdded: b.dateAdded,
      batch: batch[i],
    })),
    // 0.8.0: a folder inside a stack used to vanish from the board; it is a sub-stack now.
    children: kids.filter((c) => !c.url).map((c) => mapStack(c, spaceId, node.id)),
  }
}

/**
 * The Stackboard root folder as a typed tree: space folders, their stack folders, and every
 * folder below those as sub-stacks. Pure, so the unit tests can feed it hand-made nodes.
 * Links sitting straight in the root or in a space folder have no stack and are left out.
 */
export function mapTree(root: TreeNode): StackableTree {
  const spaces: Space[] = (root.children ?? [])
    .filter((n) => !n.url)
    .sort(byIndex)
    .map((spaceNode) => {
      const parsed = parseSpaceTitle(spaceNode.title)
      return {
        id: spaceNode.id,
        rawTitle: spaceNode.title,
        name: parsed.name,
        emoji: parsed.emoji,
        stacks: (spaceNode.children ?? [])
          .filter((n) => !n.url)
          .sort(byIndex)
          .map((stackNode) => mapStack(stackNode, spaceNode.id)),
      }
    })
  return { rootId: root.id, rootDateAdded: root.dateAdded, spaces }
}

/**
 * Build the entire Stackboard tree as a typed object.
 * Cheap: the subtree is small (hundreds of items, not thousands).
 */
export async function readTree(): Promise<StackableTree> {
  if (!IS_EXTENSION) return DEMO_TREE
  const rootId = await ensureRoot()
  const [root] = await chrome.bookmarks.getSubTree(rootId)
  return mapTree(root)
}

// ---------- Nested stacks (0.8.0) ----------

/** A stack and every sub-stack below it, depth first, in board order. */
export function walkStacks(stacks: readonly Stack[]): Stack[] {
  return stacks.flatMap((s) => [s, ...walkStacks(s.children ?? [])])
}

/** Every link in a stack, its sub-stacks' links included, in board order. */
export function stackLinks(stack: Stack): Bookmark[] {
  return [...stack.bookmarks, ...(stack.children ?? []).flatMap(stackLinks)]
}

/** Ids of a stack and everything below it: the places it cannot be moved into. */
export function subtreeIds(stack: Stack): Set<string> {
  return new Set(walkStacks([stack]).map((s) => s.id))
}

export interface StackLocation {
  space: Space
  stack: Stack
  /** The stacks it sits in, outermost first ([] for a top-level stack). */
  path: Stack[]
}

/** Where a stack (at any depth) lives. */
export function locateStack(tree: StackableTree | null, id: string): StackLocation | null {
  if (!tree) return null
  const visit = (stacks: readonly Stack[], space: Space, path: Stack[]): StackLocation | null => {
    for (const stack of stacks) {
      if (stack.id === id) return { space, stack, path }
      const found = visit(stack.children ?? [], space, [...path, stack])
      if (found) return found
    }
    return null
  }
  for (const space of tree.spaces) {
    const found = visit(space.stacks, space, [])
    if (found) return found
  }
  return null
}

/** The stack (at any depth) holding a bookmark. */
export function stackOfBookmark(tree: StackableTree | null, bookmarkId: string): Stack | null {
  if (!tree) return null
  for (const space of tree.spaces) {
    for (const stack of walkStacks(space.stacks)) {
      if (stack.bookmarks.some((b) => b.id === bookmarkId)) return stack
    }
  }
  return null
}

// ---------- Spaces ----------

export async function createSpace(name: string, emoji: string): Promise<string> {
  if (!IS_EXTENSION) return 'demo-noop'
  const rootId = await ensureRoot()
  const node = await chrome.bookmarks.create({
    parentId: rootId,
    title: buildSpaceTitle(emoji, name),
  })
  return node.id
}

export async function renameSpace(id: string, name: string, emoji: string): Promise<void> {
  if (!IS_EXTENSION) return
  await chrome.bookmarks.update(id, { title: buildSpaceTitle(emoji, name) })
}

export async function deleteSpace(id: string): Promise<void> {
  if (!IS_EXTENSION) return
  await chrome.bookmarks.removeTree(id)
}

export async function moveSpace(id: string, newIndex: number): Promise<void> {
  if (!IS_EXTENSION) return
  const rootId = await ensureRoot()
  await chrome.bookmarks.move(id, { parentId: rootId, index: newIndex })
}

// ---------- Stacks ----------

/** A new stack in a space, or a sub-stack when parentId is a stack. */
export async function createStack(parentId: string, title: string): Promise<string> {
  if (!IS_EXTENSION) return 'demo-noop'
  const node = await chrome.bookmarks.create({ parentId, title })
  return node.id
}

export async function renameStack(id: string, title: string): Promise<void> {
  if (!IS_EXTENSION) return
  await chrome.bookmarks.update(id, { title })
}

export async function deleteStack(id: string): Promise<void> {
  if (!IS_EXTENSION) return
  await chrome.bookmarks.removeTree(id)
}

/**
 * Moves a stack into a space (a top-level stack) or into another stack (a sub-stack).
 * Without an index it goes last.
 */
export async function moveStack(id: string, newParentId: string, newIndex?: number): Promise<void> {
  if (!IS_EXTENSION) return
  await chrome.bookmarks.move(
    id,
    newIndex === undefined ? { parentId: newParentId } : { parentId: newParentId, index: newIndex },
  )
}

// ---------- Bookmarks ----------

export async function createBookmark(
  stackId: string,
  title: string,
  url: string,
): Promise<string> {
  if (!IS_EXTENSION) return 'demo-noop'
  const node = await chrome.bookmarks.create({ parentId: stackId, title, url })
  return node.id
}

export async function updateBookmark(
  id: string,
  title: string,
  url: string,
): Promise<void> {
  if (!IS_EXTENSION) return
  await chrome.bookmarks.update(id, { title, url })
}

export async function deleteBookmark(id: string): Promise<void> {
  if (!IS_EXTENSION) return
  await chrome.bookmarks.remove(id)
}

/** Moves a link into a stack at a folder index; without one it goes last. */
export async function moveBookmark(id: string, newStackId: string, newIndex?: number): Promise<void> {
  if (!IS_EXTENSION) return
  await chrome.bookmarks.move(
    id,
    newIndex === undefined ? { parentId: newStackId } : { parentId: newStackId, index: newIndex },
  )
}

// ---------- Undo ----------

// Everything needed to recreate a deleted node and its subtree in place. Chrome keeps no
// bookmark trash, so the undo toast holds one of these for a few seconds after a delete.
export interface NodeSnapshot {
  /** The id it had, so per-item settings (colour, layout) can follow it to its new id. */
  id?: string
  parentId: string
  index: number
  title: string
  url?: string
  children?: NodeSnapshot[]
}

function toSnapshot(n: Node): NodeSnapshot {
  return {
    id: n.id,
    parentId: n.parentId ?? '',
    index: n.index ?? 0,
    title: n.title,
    url: n.url,
    children: n.url
      ? undefined
      : (n.children ?? [])
          .slice()
          .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          .map(toSnapshot),
  }
}

export async function snapshotNode(id: string): Promise<NodeSnapshot | null> {
  // Demo mode deletes nothing, so a stub snapshot is enough to exercise the toast.
  if (!IS_EXTENSION) return { parentId: '', index: 0, title: '' }
  const [node] = await chrome.bookmarks.getSubTree(id)
  return node ? toSnapshot(node) : null
}

/** Told about every node an undo recreates: its old id and its new one. */
export type OnRestored = (oldId: string, newId: string) => void

async function createFromSnapshot(
  s: NodeSnapshot,
  parentId: string,
  index: number | undefined,
  onRestored?: OnRestored,
): Promise<string> {
  const node = await chrome.bookmarks.create({ parentId, index, title: s.title, url: s.url })
  if (s.id) onRestored?.(s.id, node.id)
  for (const child of s.children ?? []) {
    await createFromSnapshot(child, node.id, undefined, onRestored)
  }
  return node.id
}

/**
 * Recreates a deleted node and everything in it where it was. Returns the new id (ids never
 * come back); onRestored hears each old id and its new one, sub-stacks and links included.
 */
export async function restoreSnapshot(s: NodeSnapshot, onRestored?: OnRestored): Promise<string | null> {
  if (!IS_EXTENSION) return null
  // Siblings may have been deleted since, so clamp the original index.
  const siblings = await chrome.bookmarks.getChildren(s.parentId)
  return createFromSnapshot(s, s.parentId, Math.min(s.index, siblings.length), onRestored)
}

// ---------- Backup ----------

export async function exportBackup(): Promise<BookmarkBackup> {
  const tree = await readTree()
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    spaces: tree.spaces.map((s) => ({
      emoji: s.emoji,
      name: s.name,
      // The v1 format has one level of stacks: a sub-stack goes in as "Parent › Child", the
      // name the importer gives nested folders too.
      stacks: flattenForBackup(s.stacks, ''),
    })),
  }
}

function flattenForBackup(
  stacks: readonly Stack[],
  prefix: string,
): BookmarkBackup['spaces'][number]['stacks'] {
  return stacks.flatMap((st) => {
    const name = prefix + st.title
    return [
      { name, bookmarks: st.bookmarks.map((b) => ({ title: b.title, url: b.url })) },
      ...flattenForBackup(st.children ?? [], `${name} › `),
    ]
  })
}

export async function importBackup(backup: BookmarkBackup): Promise<void> {
  if (!IS_EXTENSION) return
  if (backup.version !== 1) {
    throw new Error(`Unsupported backup version: ${backup.version}`)
  }
  const rootId = await ensureRoot()
  for (const space of backup.spaces) {
    const spaceNode = await chrome.bookmarks.create({
      parentId: rootId,
      title: buildSpaceTitle(space.emoji, space.name),
    })
    for (const stack of space.stacks) {
      const stackNode = await chrome.bookmarks.create({
        parentId: spaceNode.id,
        title: stack.name,
      })
      for (const bm of stack.bookmarks) {
        await chrome.bookmarks.create({
          parentId: stackNode.id,
          title: bm.title,
          url: bm.url,
        })
      }
    }
  }
}
