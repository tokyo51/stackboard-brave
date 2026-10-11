import { IS_EXTENSION, ensureRoot, rootTitles } from './bookmarks'
import { BROWSER_NAME } from './browser'

// Settings > Troubleshooting. Before this, a failed bookmark write left a button that
// "did nothing" and no trace of why. Errors land here and in a toast; the report shows the
// bookmark folders Stackboard depends on (ids, types, sync state), never the links in them.

const MAX_ERRORS = 10
const recent: Array<{ at: string; message: string }> = []

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return (err as { message?: string } | null)?.message ?? String(err)
}

export function recordError(err: unknown): string {
  const message = errorMessage(err)
  recent.unshift({ at: new Date().toISOString(), message })
  recent.length = Math.min(recent.length, MAX_ERRORS)
  return message
}

type Node = chrome.bookmarks.BookmarkTreeNode & { folderType?: string; syncing?: boolean }

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | string> {
  return Promise.race([p, new Promise<string>((r) => setTimeout(() => r(`${label} timed out after ${ms}ms`), ms))])
}

export async function diagnostics(): Promise<string> {
  const brands = (navigator as Navigator & { userAgentData?: { brands?: Array<{ brand: string; version: string }> } })
    .userAgentData?.brands?.map((b) => `${b.brand} ${b.version}`)
  const report: Record<string, unknown> = {
    stackboard: IS_EXTENSION ? chrome.runtime.getManifest().version : 'demo',
    browser: BROWSER_NAME,
    brands,
  }
  if (!IS_EXTENSION) return JSON.stringify(report, null, 2)

  const [tree] = (await chrome.bookmarks.getTree()) as Node[]
  const top = (tree.children ?? []) as Node[]
  report.topFolders = top.map((n) => ({
    id: n.id,
    title: n.title,
    folderType: n.folderType,
    syncing: n.syncing,
    unmodifiable: n.unmodifiable,
    children: n.children?.length ?? 0,
  }))
  report.rootFolders = top.flatMap((n) =>
    (n.children ?? [])
      .filter((c) => !c.url && rootTitles.includes(c.title))
      .map((c) => ({ id: c.id, title: c.title, in: n.title, spaces: c.children?.length ?? 0 })),
  )
  report.cachedRootId = (await chrome.storage.local.get('stackableRootId')).stackableRootId ?? null
  if (navigator.locks) {
    const q = await navigator.locks.query()
    report.locks = { held: q.held?.map((l) => l.name), pending: q.pending?.map((l) => l.name) }
  }
  report.ensureRoot = await withTimeout(ensureRoot().then((id) => `ok ${id}`, (e) => `error ${errorMessage(e)}`), 5000, 'ensureRoot')
  report.recentErrors = recent
  return JSON.stringify(report, null, 2)
}
