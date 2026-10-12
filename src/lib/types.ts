export interface Bookmark {
  id: string
  title: string
  url: string
  parentStackId: string
  /** Position among all of its folder's children (sub-stack folders count too), for moves. */
  index?: number
  /** ms since epoch, straight from chrome.bookmarks. Drives the "new" accent. */
  dateAdded?: number
  /** Added together with other links in its stack (an import, a pack, an undo): no accent. */
  batch?: boolean
}

export interface Stack {
  id: string
  title: string
  parentSpaceId: string
  /** Position among all of its parent folder's children, for moves (0.8.0). */
  index?: number
  /** Set on a sub-stack: the stack folder it sits in (0.8.0). */
  parentStackId?: string
  bookmarks: Bookmark[]
  /** Folders inside this folder, shown as sub-stacks inside it, in bookmark order (0.8.0). */
  children?: Stack[]
}

export interface Space {
  id: string
  rawTitle: string
  name: string
  emoji: string
  stacks: Stack[]
}

export interface StackableTree {
  rootId: string
  /** When the Stackboard bookmarks folder was created: the best guess at install age (0.4.1). */
  rootDateAdded?: number
  spaces: Space[]
}

export interface BookmarkBackup {
  version: 1
  exportedAt: string
  spaces: Array<{
    emoji: string
    name: string
    stacks: Array<{
      name: string
      bookmarks: Array<{ title: string; url: string }>
    }>
  }>
}
