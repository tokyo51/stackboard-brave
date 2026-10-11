import { useState } from 'react'
import { useStackableStore } from '../store/useStackableStore'
import { useWidgets } from '../store/useWidgets'
import { WidgetCards, WidgetHero } from './Widgets'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Download, Check, LayoutDashboard } from 'lucide-react'
import type { Space } from '../lib/types'
import { StackColumn } from './StackColumn'
import { AddStackPlaceholder } from './AddStackPlaceholder'
import { OpenTabsButton } from './OpenTabsButton'
import { exportBackup } from '../lib/bookmarks'
import { downloadJson } from '../lib/tabs'

interface Props {
  space: Space
}

export function SpaceView({ space }: Props) {
  const [copied, setCopied] = useState(false)
  const widgetsHidden = useWidgets((s) => s.settings.collapsed)
  const updateWidgets = useWidgets((s) => s.update)

  const onExport = async () => {
    const backup = await exportBackup().catch((err) => {
      useStackableStore.getState().reportError("Couldn't export:", err)
      return null
    })
    if (!backup) return
    const date = new Date().toISOString().slice(0, 10)
    downloadJson(`stackboard-backup-${date}.json`, backup)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Header actions stay quiet: icon buttons with tooltips, so the stacks carry the page. Open tabs
  // keeps its words and count because it acts on every link at once.
  const quiet = 'flex h-8 w-8 items-center justify-center rounded-md hover:bg-hover hover:text-strong'

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ viewTransitionName: 'board' }}>
      {/* 0.5.0: stacks wrap into rows that use the whole width (they used to be one row of fixed
          260px columns that scrolled sideways and left the bottom of the screen empty).
          Polish: the header is sticky inside the scroller; polish.css tints it once the board
          scrolls under it, instead of slicing the clock at a hard edge. Order: hero (clock and
          search), stacks, then the widget cards, so the first bookmarks are above the fold. */}
      <div data-board-scroll className="no-scrollbar flex-1 overflow-y-auto px-8 pb-8 compact:px-6 compact:pb-6">
        <header
          data-surface="header"
          className="sticky top-0 z-10 -mx-8 flex items-center justify-between gap-4 px-8 py-4 compact:-mx-6 compact:px-6 compact:py-3"
        >
          <div className="on-wallpaper flex min-w-0 items-center gap-2.5">
            <span className="text-2xl leading-none">{space.emoji}</span>
            <h1 className="truncate text-2xl font-bold text-strong">{space.name}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => updateWidgets({ collapsed: !widgetsHidden })}
              aria-pressed={!widgetsHidden}
              aria-label="Widgets"
              title={widgetsHidden ? 'Show widgets' : 'Hide widgets'}
              data-widgets-toggle
              className={`${quiet} ${widgetsHidden ? 'text-muted' : 'text-accent-text'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
            </button>
            <button
              onClick={onExport}
              aria-label={copied ? 'Exported' : 'Export a backup'}
              title={copied ? 'Exported' : 'Download a JSON backup of every space'}
              className={`${quiet} text-muted`}
            >
              {copied ? <Check className="h-4 w-4 text-accent-text" /> : <Download className="h-4 w-4" />}
            </button>
            <OpenTabsButton space={space} />
          </div>
        </header>
        <WidgetHero />
        <SortableContext items={space.stacks.map((s) => `st:${s.id}`)} strategy={rectSortingStrategy}>
          <div
            data-stack-grid
            className="grid grid-cols-[repeat(auto-fill,minmax(244px,1fr))] items-start gap-x-6 gap-y-7 compact:grid-cols-[repeat(auto-fill,minmax(212px,1fr))] compact:gap-x-4 compact:gap-y-5 wallpaper:gap-y-6 compact:wallpaper:gap-y-4"
          >
            {space.stacks.map((stack, i) => (
              <StackColumn key={stack.id} stack={stack} index={i} />
            ))}
            <AddStackPlaceholder spaceId={space.id} />
          </div>
        </SortableContext>
        <WidgetCards />
      </div>
    </div>
  )
}
