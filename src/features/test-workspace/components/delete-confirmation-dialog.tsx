import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

type DeleteConfirmationDialogProps = {
  title: string
  description: string
  actionLabel: string
  onCancel: () => void
  onDelete: () => Promise<void>
}

export function DeleteConfirmationDialog({
  title,
  description,
  actionLabel,
  onCancel,
  onDelete,
}: DeleteConfirmationDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  async function confirmDelete() {
    if (deleting) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete. Try again."
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !deleting) onCancel()
      }}
    >
      <DialogContent initialFocus={cancelRef}>
        <div className="space-y-2 px-6 pt-6 pr-12 pb-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-5">
          <Button
            ref={cancelRef}
            variant="outline"
            disabled={deleting}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={confirmDelete}
          >
            {deleting ? "Deleting…" : actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
