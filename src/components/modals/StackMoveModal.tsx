import { useMemo, useState } from 'react'
import { Modal, SecondaryButton, TextInput } from './Modal'
import { locateStack, moveBookmark, moveStack, stackLinks, subtreeIds } from '../../lib/bookmarks'
import type { Space, Stack } from '../../lib/types'
import { setCollapsed, useStackableStore } from '../../store/useStackableStore'

/** What is moving, and where to: a stack to a space or into a stack, or a link to a stack. */
export type MoveTarget =
  | { what: 'stack'; id: string; title: string; currentSpaceId: string; to: 'space' | 'stack' }
  | { what: 'bookmark'; id: string; title: string; stackId: string }

interface Row {
  key: string
  space: Space
  /** Absent for a space row (Move to space). */
  stack?: Stack
  depth: number
  label: string
  hint: string
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
// More rows than this and the list gets a filter field.
const FILTER_AT = 7

export function StackMoveModal(props: MoveTarget) {
  const close = useStackableStore((s) => s.closeModal)
  const refresh = useStackableStore((s) => s.refresh)
  const reportError = useStackableStore((s) => s.reportError)
  const tree = useStackableStore((s) => s.tree)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('')

  const moving = props.what === 'stack' ? locateStack(tree, props.id) : null
  const toSpace = props.what === 'stack' && props.to === 'space'

  const rows = useMemo<Row[]>(() => {
    const spaces = tree?.spaces ?? []
    if (toSpace) {
      // A top-level stack goes to another space; a sub-stack can also come out to the top of its own.
      const nested = !!moving?.path.length
      return spaces
        .filter((s) => nested || s.id !== moving?.space.id)
        .map((s) => ({
          key: s.id,
          space: s,
          depth: 0,
          label: s.name || 'Untitled',
          hint: s.id === moving?.space.id ? 'Top level' : plural(s.stacks.length, 'stack'),
        }))
    }
    // Into a stack: never itself or anything inside it, nor the stack it already sits in.
    const blocked = new Set<string>()
    if (props.what === 'stack' && moving) {
      for (const id of subtreeIds(moving.stack)) blocked.add(id)
      if (moving.stack.parentStackId) blocked.add(moving.stack.parentStackId)
    } else if (props.what === 'bookmark') blocked.add(props.stackId)
    const out: Row[] = []
    const visit = (space: Space, stacks: readonly Stack[], depth: number) => {
      for (const st of stacks) {
        if (!blocked.has(st.id)) {
          out.push({ key: st.id, space, stack: st, depth, label: st.title || 'Untitled', hint: plural(stackLinks(st).length, 'link') })
        }
        // A blocked stack's own sub-stacks are blocked too when it is the one moving.
        if (!(props.what === 'stack' && moving && st.id === moving.stack.id)) visit(space, st.children ?? [], depth + 1)
      }
    }
    for (const space of spaces) visit(space, space.stacks, 0)
    return out
  }, [tree, toSpace, moving, props])

  const q = filter.trim().toLowerCase()
  const shown = q ? rows.filter((r) => r.label.toLowerCase().includes(q) || r.space.name.toLowerCase().includes(q)) : rows

  const onPick = async (row: Row) => {
    if (busy) return
    setBusy(true)
    const store = useStackableStore.getState()
    const here = store.selectedSpaceId === row.space.id
    try {
      if (props.what === 'bookmark' && row.stack) {
        await moveBookmark(props.id, row.stack.id)
      } else if (row.stack) {
        await moveStack(props.id, row.stack.id)
      } else {
        // Append to the end of the destination space's stack row.
        await moveStack(props.id, row.space.id)
      }
      if (row.stack) {
        // Open the destination (and the stacks around it) so the move has somewhere to land.
        const at = locateStack(tree, row.stack.id)
        setCollapsed([...(at?.path ?? []).map((s) => s.id), row.stack.id], false)
      }
      await refresh()
      close()
      // Glow what moved if it is still on screen, else the space it went to.
      store.flashItem(here ? props.id : row.space.id)
    } catch (err) {
      reportError(props.what === 'bookmark' ? "Couldn't move the link:" : "Couldn't move the stack:", err)
    } finally {
      setBusy(false)
    }
  }

  const title =
    props.what === 'bookmark'
      ? `Move “${props.title}” to a stack`
      : toSpace
        ? `Move “${props.title}” to a space`
        : `Move “${props.title}” into a stack`

  let lastSpace = ''
  return (
    <Modal title={title} onClose={close} footer={<SecondaryButton onClick={close}>Cancel</SecondaryButton>}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          {toSpace
            ? 'There is nowhere to move this stack yet. Create another space first.'
            : 'There is no other stack to move it into yet.'}
        </p>
      ) : (
        <>
          {rows.length >= FILTER_AT && (
            <form
              className="mb-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (shown[0]) void onPick(shown[0])
              }}
            >
              <TextInput
                autoFocus
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={toSpace ? 'Filter spaces' : 'Filter stacks'}
                aria-label={toSpace ? 'Filter spaces' : 'Filter stacks'}
              />
            </form>
          )}
          <div className="flex flex-col gap-1" data-move-targets>
            {shown.map((row) => {
              // Stacks come grouped under their space.
              const heading = !toSpace && row.space.id !== lastSpace
              lastSpace = row.space.id
              return (
                <div key={row.key} className="contents">
                  {heading && (
                    <p className="mt-2 flex items-center gap-1.5 px-1 text-xs font-semibold text-muted first:mt-0">
                      <span className="text-sm leading-none">{row.space.emoji}</span>
                      {row.space.name || 'Untitled'}
                    </p>
                  )}
                  <button
                    onClick={() => onPick(row)}
                    disabled={busy}
                    data-move-target={row.key}
                    style={{ marginLeft: row.depth * 16 }}
                    className="flex items-center gap-2.5 rounded-md border border-line bg-card px-3 py-2 text-left text-sm text-fg hover:border-accent-line hover:bg-accent-soft disabled:opacity-50"
                  >
                    {toSpace && <span className="text-base leading-none">{row.space.emoji}</span>}
                    <span className="flex-1 truncate">{row.label}</span>
                    <span className="shrink-0 text-xs text-muted">{row.hint}</span>
                  </button>
                </div>
              )
            })}
            {shown.length === 0 && <p className="px-1 text-sm text-muted">Nothing matches.</p>}
          </div>
        </>
      )}
    </Modal>
  )
}
