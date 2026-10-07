import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"

type DeleteTestDialogProps = {
  testName: string
  onCancel: () => void
  onDelete: () => Promise<void>
}

export function DeleteTestDialog({
  testName,
  onCancel,
  onDelete,
}: DeleteTestDialogProps) {
  return (
    <DeleteConfirmationDialog
      title="Delete test case?"
      description={`Delete “${testName}” and its saved prompt? This cannot be undone.`}
      actionLabel="Delete test"
      onCancel={onCancel}
      onDelete={onDelete}
    />
  )
}
