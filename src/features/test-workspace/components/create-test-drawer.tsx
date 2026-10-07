import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { TestGroup } from "../data"
import { CreateCategoryDialog } from "./create-category-dialog"

const NEW_CATEGORY = "__new_category__"

export type NewTestInput = {
  name: string
  category: { id: string }
}

type CreateTestDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: TestGroup[]
  initialCategoryId?: string
  chatInputRef: RefObject<HTMLTextAreaElement | null>
  onCreate: (test: NewTestInput) => void
  onCreateCategory: (name: string) => string
}

export function CreateTestDrawer({
  open,
  onOpenChange,
  groups,
  initialCategoryId,
  chatInputRef,
  onCreate,
  onCreateCategory,
}: CreateTestDrawerProps) {
  const created = useRef(false)
  useEffect(() => {
    if (open) created.current = false
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="gap-0 data-[side=left]:w-full data-[side=left]:sm:max-w-[400px]"
        finalFocus={() => (created.current ? chatInputRef.current : true)}
      >
        <SheetHeader className="border-b border-border px-6 pt-6 pb-5">
          <SheetTitle>New test</SheetTitle>
          <SheetDescription className="mt-1 text-xs">
            Name the test and choose a category before opening the chat.
          </SheetDescription>
        </SheetHeader>
        {open && (
          <CreateTestForm
            groups={groups}
            initialCategoryId={initialCategoryId}
            onCreateCategory={onCreateCategory}
            onCancel={() => onOpenChange(false)}
            onCreate={(test) => {
              created.current = true
              onCreate(test)
              onOpenChange(false)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function CreateTestForm({
  groups,
  initialCategoryId,
  onCancel,
  onCreate,
  onCreateCategory,
}: {
  groups: TestGroup[]
  initialCategoryId?: string
  onCancel: () => void
  onCreate: (test: NewTestInput) => void
  onCreateCategory: (name: string) => string
}) {
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState(
    initialCategoryId ?? (groups.length > 0 ? groups[0].id : "")
  )
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const categoryTriggerRef = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState<string | null>(null)
  const options = [
    ...groups.map((group) => ({ value: group.id, label: group.name })),
    { value: NEW_CATEGORY, label: "Create category…" },
  ]

  return (
    <>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          const testName = name.trim().replace(/\s+/g, " ")
          if (!testName) {
            setError("Enter a test case name.")
            return
          }
          const group = groups.find((item) => item.id === categoryId)
          if (!group) {
            setError("Select a category.")
            return
          }
          if (
            group.tests.some(
              (test) => test.name.toLowerCase() === testName.toLowerCase()
            )
          ) {
            setError("A test with this name already exists in this category.")
            return
          }
          onCreate({
            name: testName,
            category: { id: categoryId },
          })
        }}
      >
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="new-test-name" className="text-xs">
              Test case name
            </Label>
            <Input
              id="new-test-name"
              value={name}
              maxLength={120}
              required
              placeholder="e.g. Reject expired sessions"
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-test-category" className="text-xs">
              Category
            </Label>
            <Select
              items={options}
              value={categoryId || null}
              onValueChange={(value) => {
                if (value === NEW_CATEGORY) setCategoryDialogOpen(true)
                else if (value) {
                  setCategoryId(value)
                  setError(null)
                }
              }}
            >
              <SelectTrigger
                ref={categoryTriggerRef}
                id="new-test-category"
                className="w-full"
              >
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {groups.map((group) => (
                    <SelectItem
                      key={group.id}
                      value={group.id}
                      title={group.name}
                    >
                      <span className="max-w-[calc(var(--anchor-width)-3rem)] truncate">
                        {group.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                {groups.length > 0 && <SelectSeparator className="mx-1" />}
                <SelectGroup>
                  <SelectItem value={NEW_CATEGORY}>
                    <Plus className="size-3.5" /> Create category…
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="shrink-0 border-t border-border p-5">
          {error && (
            <p role="alert" className="mb-3 text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Create test</Button>
          </div>
        </div>
      </form>
      <CreateCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        groups={groups}
        returnFocusRef={categoryTriggerRef}
        onCreate={(categoryName) => {
          setCategoryId(onCreateCategory(categoryName))
          setError(null)
        }}
      />
    </>
  )
}
