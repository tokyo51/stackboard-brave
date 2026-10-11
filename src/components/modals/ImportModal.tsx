import { Modal, SecondaryButton } from './Modal'
import { ImportPanel, useImportSources } from '../ImportPanel'
import { useStackableStore } from '../../store/useStackableStore'
import { BROWSER_NAME } from '../../lib/browser'

/** Settings > Copy from Chrome bookmarks: the welcome screen's importer for a board that has content. */
export function ImportModal() {
  const close = useStackableStore((s) => s.closeModal)
  const sources = useImportSources()
  return (
    <Modal title={`Copy from ${BROWSER_NAME} bookmarks`} onClose={close} width="md" footer={<SecondaryButton onClick={close}>Close</SecondaryButton>}>
      {sources === null ? (
        <div className="h-24 animate-pulse rounded-lg bg-sunken" />
      ) : sources.length === 0 ? (
        <p className="text-sm text-muted">{BROWSER_NAME} has no other bookmarks to copy.</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            Each folder you tick becomes a new space. Copying twice makes a second copy.
          </p>
          <ImportPanel sources={sources} variant="modal" onDone={close} />
        </>
      )}
    </Modal>
  )
}
