import type { RefObject } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { TestGroup } from "../data"
import { CategoryForm } from "./category-form"

type CreateCategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: TestGroup[]
  onCreate: (name: string) => Promise<void>
  returnFocusRef: RefObject<HTMLButtonElement | null>
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
  groups,
  onCreate,
  returnFocusRef,
}: CreateCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent finalFocus={returnFocusRef}>
        <div className="px-6 pt-6 pr-12">
          <DialogTitle>Create category</DialogTitle>
          <DialogDescription className="mt-2">
            Group related test cases in this workspace.
          </DialogDescription>
        </div>
        {open && (
          <CategoryForm
            groups={groups}
            onCancel={() => onOpenChange(false)}
            onSave={async (name) => {
              await onCreate(name)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
