import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TestGroup } from "../data"

export function CategoryForm({
  groups,
  onCancel,
  onSave,
  category,
}: {
  groups: TestGroup[]
  onCancel: () => void
  onSave: (name: string) => Promise<void>
  category?: { id: string; name: string }
}) {
  const [name, setName] = useState(category?.name ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        if (saving) return
        const normalizedName = name.trim().replace(/\s+/g, " ")
        if (!normalizedName) {
          setError("Enter a category name.")
          return
        }
        if (
          groups.some(
            (group) =>
              group.id !== category?.id &&
              group.name.toLowerCase() === normalizedName.toLowerCase()
          )
        ) {
          setError("A category with this name already exists.")
          return
        }
        setSaving(true)
        setError(null)
        try {
          await onSave(normalizedName)
        } catch (saveError) {
          setError(
            saveError instanceof Error
              ? saveError.message
              : "Could not save category. Try again."
          )
        } finally {
          setSaving(false)
        }
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
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : category ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  )
}
