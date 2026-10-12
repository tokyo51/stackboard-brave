import { useState } from 'react'
import { Modal, PrimaryButton, SecondaryButton, TextInput, Label } from './Modal'
import { createStack, renameStack } from '../../lib/bookmarks'
import { setCollapsed, useStackableStore } from '../../store/useStackableStore'

interface Props {
  mode: 'add' | 'edit'
  spaceId?: string
  /** Adding inside a stack: the new one is a sub-stack (0.8.0). */
  parentStackId?: string
  parentTitle?: string
  stackId?: string
  initialTitle?: string
}

export function StackFormModal({ mode, spaceId, parentStackId, parentTitle, stackId, initialTitle = '' }: Props) {
  const close = useStackableStore((s) => s.closeModal)
  const refresh = useStackableStore((s) => s.refresh)
  const reportError = useStackableStore((s) => s.reportError)

  const [title, setTitle] = useState(initialTitle)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      if (mode === 'add' && parentStackId) {
        // Open the parent so the new sub-stack is there to see.
        setCollapsed([parentStackId], false)
        const id = await createStack(parentStackId, title.trim())
        useStackableStore.getState().flashItem(id)
      } else if (mode === 'add' && spaceId) {
        await createStack(spaceId, title.trim())
      } else if (mode === 'edit' && stackId) {
        await renameStack(stackId, title.trim())
      }
      await refresh()
      close()
    } catch (err) {
      reportError(mode === 'add' ? "Couldn't create the stack:" : "Couldn't rename the stack:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={mode === 'edit' ? 'Rename stack' : parentStackId ? 'New sub-stack' : 'New stack'}
      onClose={close}
      footer={
        <>
          <SecondaryButton onClick={close}>Cancel</SecondaryButton>
          <PrimaryButton onClick={onSubmit} disabled={!title.trim() || submitting}>
            {mode === 'add' ? 'Create' : 'Save'}
          </PrimaryButton>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        {parentStackId && parentTitle && (
          <p className="mb-3 text-xs text-muted">
            Inside <span className="font-medium text-fg">{parentTitle}</span>. It shows as a section in that stack, and stays a folder in your bookmarks.
          </p>
        )}
        <Label>{parentStackId ? 'Sub-stack name' : 'Stack name'}</Label>
        <TextInput
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Control Tower"
        />
      </form>
    </Modal>
  )
}
