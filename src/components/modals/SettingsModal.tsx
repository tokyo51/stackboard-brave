import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  Check,
  ClipboardCopy,
  Database,
  Download,
  FolderInput,
  LayoutGrid,
  Link2,
  Package,
  Palette,
  Shapes,
  Star,
  Upload,
  Wind,
  X,
  type LucideIcon,
} from 'lucide-react'
import { exportBackup, importBackup } from '../../lib/bookmarks'
import { downloadJson, openInNewTab, pickJsonFile } from '../../lib/tabs'
import { REVIEWS_URL, SHARE_URL } from '../../lib/onboarding'
import { prefs } from '../../lib/prefs'
import type { BookmarkBackup } from '../../lib/types'
import { useStackableStore } from '../../store/useStackableStore'
import { AppearanceSettings } from '../AppearanceSettings'
import { BOOKMARKS_PAGE, BROWSER_NAME } from '../../lib/browser'
import { diagnostics } from '../../lib/diagnostics'
import { MotionSection, PresetSection, StyleSection, ThemeTransfer, WidgetSection } from '../CustomizeSettings'
import { Actions, Button, Group, Row, Section } from '../settings/ui'

// Fork: Settings is a window with real tabs. Only the open tab is rendered; the window keeps one
// height so switching never makes it jump, and the open tab is remembered for the session.

type TabId = 'look' | 'style' | 'motion' | 'widgets' | 'data'

const TABS: ReadonlyArray<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'look', label: 'Look', icon: Palette },
  { id: 'style', label: 'Style', icon: Shapes },
  { id: 'motion', label: 'Motion', icon: Wind },
  { id: 'widgets', label: 'Widgets', icon: LayoutGrid },
  { id: 'data', label: 'Data', icon: Database },
]

/** The tab Settings opens on: the last one used in this page. */
let lastTab: TabId = 'look'

export function SettingsModal() {
  const close = useStackableStore((s) => s.closeModal)
  const [tab, setTab] = useState<TabId>(lastTab)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const index = TABS.findIndex((t) => t.id === tab)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  // Keyboard users start on the tabs; a mouse user sees no ring (focus-visible).
  useEffect(() => {
    tabRefs.current[index]?.focus({ preventScroll: true })
  }, [])

  const choose = (id: TabId) => {
    lastTab = id
    setTab(id)
  }

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = TABS.length - 1
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    if (next === null) return
    e.preventDefault()
    choose(TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        data-surface="modal"
        data-settings
        className="flex h-[min(760px,88vh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-raised text-fg shadow-2xl ring-1 ring-line"
      >
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-strong">Settings</h2>

          <div
            role="tablist"
            aria-label="Settings sections"
            onKeyDown={onTabKey}
            className="relative grid grid-cols-5 rounded-lg bg-sunken p-0.5 ring-1 ring-line"
          >
            {/* The active pill slides between tabs; equal columns keep it a pure transform. */}
            <span
              aria-hidden
              className="absolute bottom-0.5 left-0.5 top-0.5 w-[calc((100%-0.25rem)/5)] rounded-md bg-card shadow-xs ring-1 ring-line transition-transform duration-220 ease-out motion-reduce:transition-none [:root[data-motion=off]_&]:transition-none"
              style={{ transform: `translateX(${index * 100}%)` }}
            />
            {TABS.map((t, i) => {
              const on = t.id === tab
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[i] = el
                  }}
                  type="button"
                  role="tab"
                  id={`settings-tab-${t.id}`}
                  aria-selected={on}
                  aria-controls={`settings-panel-${t.id}`}
                  tabIndex={on ? 0 : -1}
                  data-settings-tab={t.id}
                  onClick={() => choose(t.id)}
                  className={`relative inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                    on ? 'text-strong' : 'text-muted hover:text-fg'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={on ? 2.25 : 2} />
                  {t.label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="justify-self-end rounded-lg p-1.5 text-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Keyed by tab: a fresh panel starts at the top and plays its short entrance. */}
        <div
          key={tab}
          role="tabpanel"
          id={`settings-panel-${tab}`}
          aria-labelledby={`settings-tab-${tab}`}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-sunken"
        >
          <div className="flex flex-col gap-9 px-6 pb-8 pt-6 transition-[opacity,translate] duration-180 ease-out starting:translate-y-1.5 starting:opacity-0 motion-reduce:transition-none [:root[data-motion=off]_&]:transition-none">
            {tab === 'look' && (
              <>
                <PresetSection />
                <AppearanceSettings />
              </>
            )}
            {tab === 'style' && <StyleSection />}
            {tab === 'motion' && <MotionSection />}
            {tab === 'widgets' && <WidgetSection />}
            {tab === 'data' && <DataTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

function DataTab() {
  const openModal = useStackableStore((s) => s.openModal)
  const refresh = useStackableStore((s) => s.refresh)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [shareNote, setShareNote] = useState<string | null>(null)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1600)
    } catch {
      setShareNote(SHARE_URL)
    }
  }

  const rate = () => {
    prefs.setRating('rated')
    void openInNewTab(REVIEWS_URL, true)
  }

  const onExport = async () => {
    setBusy(true)
    try {
      const backup = await exportBackup()
      downloadJson(`stackboard-backup-${new Date().toISOString().slice(0, 10)}.json`, backup)
      setStatus('Backup downloaded.')
    } catch (err) {
      setStatus(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const onImport = async () => {
    setBusy(true)
    try {
      const parsed = (await pickJsonFile()) as BookmarkBackup
      if (!parsed || parsed.version !== 1) {
        setStatus('Unsupported file (expected backup v1).')
        return
      }
      await importBackup(parsed)
      await refresh()
      const spaceCount = parsed.spaces.length
      setStatus(`Imported ${spaceCount} space${spaceCount === 1 ? '' : 's'}.`)
    } catch (err) {
      setStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Section title="Your links" description={`Stackboard keeps everything in your ${BROWSER_NAME} bookmarks, under Other bookmarks › Stackboard.`}>
        <Group>
          <Row label="Add" hint="Bring in the bookmarks you already have, or start from a ready-made space.">
            <Actions>
              <Button onClick={() => openModal({ kind: 'import' })}>
                <FolderInput className="h-3.5 w-3.5" />
                Copy from {BROWSER_NAME} bookmarks
              </Button>
              <Button onClick={() => openModal({ kind: 'packs' })}>
                <Package className="h-3.5 w-3.5" />
                Starter packs
              </Button>
            </Actions>
          </Row>
          <Row
            label="Backup"
            hint={<span aria-live="polite">{status ?? 'A JSON snapshot of every space, to keep or to move to another browser.'}</span>}
          >
            <Actions>
              <Button onClick={() => void onExport()} disabled={busy}>
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </Button>
              <Button onClick={() => void onImport()} disabled={busy}>
                <Upload className="h-3.5 w-3.5" />
                Import JSON
              </Button>
            </Actions>
          </Row>
          <ThemeTransfer />
        </Group>
      </Section>

      <Section title="Help">
        <Group>
          <KeysRow />
          <TroubleshootingRow />
          <Row label="Share" hint={shareNote ?? 'Stackboard is free, with no ads and no account. A rating or a share is how other people find it.'}>
            <Actions>
              <Button onClick={rate}>
                <Star className="h-3.5 w-3.5" />
                Rate it
              </Button>
              <Button onClick={() => void copyLink()}>
                {linkCopied ? <Check className="h-3.5 w-3.5 text-accent-text" /> : <Link2 className="h-3.5 w-3.5" />}
                {linkCopied ? 'Link copied' : 'Copy link to share'}
              </Button>
            </Actions>
          </Row>
        </Group>
      </Section>

      <p className="text-xs leading-relaxed text-muted">
        <span className="font-medium text-fg">Tip:</span> you can also edit and inspect everything at{' '}
        <code className="rounded-md bg-raised px-1 py-0.5 text-[11px] text-fg ring-1 ring-line">{BOOKMARKS_PAGE}</code>. Changes
        there appear in Stackboard on the next new tab.
      </p>
    </>
  )
}

/** The board's keyboard shortcuts, plus the stash shortcut as the browser has it set. */
function KeysRow() {
  const [stash, setStash] = useState('')
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.commands) return
    void chrome.commands
      .getAll()
      .then((all) => setStash(all.find((c) => c.name === 'stash-window')?.shortcut ?? ''))
      .catch(() => {})
  }, [])

  const rows: Array<[string, string]> = [
    ['/', 'Search every space'],
    ['1-9', 'Jump to a space, in sidebar order'],
    ['Esc', 'Clear the search'],
  ]
  if (stash) rows.push([stash, 'Stash this window, from any tab'])

  return (
    <Row data-keys label="Keys">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 pt-0.5">
        {rows.map(([key, what]) => (
          <div key={key} className="contents">
            <dt>
              <kbd className="inline-block min-w-7 rounded-md bg-sunken px-1.5 text-center font-sans text-xs font-medium leading-6 text-fg ring-1 ring-line-strong">
                {key}
              </kbd>
            </dt>
            <dd className="text-xs text-fg">{what}</dd>
          </div>
        ))}
      </dl>
    </Row>
  )
}

/** What Stackboard sees of the bookmark folders it relies on, to paste into a bug report. */
function TroubleshootingRow() {
  const [report, setReport] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const run = async () => {
    const text = await diagnostics().catch((err) => `diagnostics failed: ${String(err)}`)
    setReport(text)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // the report is on screen to copy by hand
    }
  }

  return (
    <Row
      data-troubleshooting
      label="Diagnostics"
      hint="Something not saving? This copies the bookmark folders Stackboard uses and the last errors. No links are included."
    >
      <Actions>
        <Button onClick={() => void run()}>
          {copied ? <Check className="h-3.5 w-3.5 text-accent-text" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy diagnostics'}
        </Button>
      </Actions>
      {report && (
        <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-sunken p-3 text-[11px] leading-snug text-fg ring-1 ring-line">{report}</pre>
      )}
    </Row>
  )
}
