import { useState } from "react"
import type { RefObject } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TestGroup } from "../data"

type CreateCategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: TestGroup[]
  onCreate: (name: string) => void
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
            onCreate={(name) => {
              onCreate(name)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({
  groups,
  onCancel,
  onCreate,
}: {
  groups: TestGroup[]
  onCancel: () => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const normalizedName = name.trim().replace(/\s+/g, " ")
        if (!normalizedName) {
          setError("Enter a category name.")
          return
        }
        if (
          groups.some(
            (group) => group.name.toLowerCase() === normalizedName.toLowerCase()
          )
        ) {
          setError("A category with this name already exists.")
          return
        }
        onCreate(normalizedName)
      }}
    >
      <div className="space-y-3 px-6 py-6">
        <Label htmlFor="category-name" className="text-xs">
          Category name
        </Label>
        <Input
          id="category-name"
          value={name}
          maxLength={64}
          required
          placeholder="e.g. Billing"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "category-name-error" : undefined}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
        />
        {error && (
          <p
            id="category-name-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-border p-5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create category</Button>
      </div>
    </form>
  )
}
