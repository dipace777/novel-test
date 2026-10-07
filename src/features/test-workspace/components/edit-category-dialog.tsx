import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { TestGroup } from "../data"
import { CategoryForm } from "./category-form"

type EditCategoryDialogProps = {
  category: TestGroup
  groups: TestGroup[]
  onCancel: () => void
  onSave: (name: string) => Promise<void>
}

export function EditCategoryDialog({
  category,
  groups,
  onCancel,
  onSave,
}: EditCategoryDialogProps) {
  const [saving, setSaving] = useState(false)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onCancel()
      }}
    >
      <DialogContent>
        <div className="px-6 pt-6 pr-12">
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription className="mt-2">
            Rename this category.
          </DialogDescription>
        </div>
        <CategoryForm
          category={category}
          groups={groups}
          onCancel={onCancel}
          onSave={async (name) => {
            setSaving(true)
            try {
              await onSave(name)
            } finally {
              setSaving(false)
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
