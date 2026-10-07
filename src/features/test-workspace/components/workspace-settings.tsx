import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { WorkspaceConfig } from "../config"
import { WorkspaceConfigForm } from "./workspace-config-form"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"

type WorkspaceSettingsProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceName: string
  config: WorkspaceConfig
  onSave: (config: WorkspaceConfig) => Promise<void>
  onDelete: () => Promise<void>
}

export function WorkspaceSettings({
  open,
  onOpenChange,
  workspaceName,
  config,
  onSave,
  onDelete,
}: WorkspaceSettingsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  function changeOpen(value: boolean) {
    if (!value) setDeleteOpen(false)
    onOpenChange(value)
  }

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]">
        <SheetHeader className="border-b border-border px-6 pt-6 pb-5">
          <SheetTitle>Workspace settings</SheetTitle>
          <SheetDescription className="mt-1 text-xs">
            {workspaceName}
          </SheetDescription>
        </SheetHeader>
        {open && (
          <WorkspaceConfigForm
            intent="edit"
            config={config}
            onCancel={() => changeOpen(false)}
            onRequestDelete={() => setDeleteOpen(true)}
            onSave={async (value) => {
              await onSave(value)
              changeOpen(false)
            }}
          />
        )}
        {open && deleteOpen && (
          <DeleteConfirmationDialog
            title="Delete workspace?"
            description={`Delete “${workspaceName}”? All categories, test cases, and saved prompts in this workspace will also be permanently deleted. This cannot be undone.`}
            actionLabel="Delete workspace"
            onCancel={() => setDeleteOpen(false)}
            onDelete={async () => {
              await onDelete()
              changeOpen(false)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
