import { Plus } from 'lucide-react'
import { useStackableStore } from '../store/useStackableStore'

interface Props {
  spaceId: string
}

export function AddStackPlaceholder({ spaceId }: Props) {
  const openModal = useStackableStore((s) => s.openModal)
  return (
    <div data-add-stack className="flex min-w-0 flex-col">
      {/* Holds the height of a stack header (h3 line + its margin), so on the flat board the
          button lines up with the top of the link lists instead of a hard-coded offset. Styles
          that draw stacks as panes hide it in polish.css: there the pane tops line up instead. */}
      <span aria-hidden data-add-stack-spacer className="mb-3 block h-5 compact:mb-2 wallpaper:hidden" />
      <button
        onClick={() => openModal({ kind: 'stack-add', spaceId })}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-well px-4 py-3 text-sm text-muted hover:border-accent-line hover:bg-accent-soft hover:text-accent-text compact:py-2 wallpaper:bg-panel/60 wallpaper:backdrop-blur-md"
      >
        <Plus className="h-4 w-4" />
        New stack
      </button>
    </div>
  )
}
