import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { WorkspaceConfig } from "../config"
import { WorkspaceConfigForm } from "./workspace-config-form"

type WorkspaceSettingsProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceName: string
  config: WorkspaceConfig
  onSave: (config: WorkspaceConfig) => void
}

export function WorkspaceSettings({
  open,
  onOpenChange,
  workspaceName,
  config,
  onSave,
}: WorkspaceSettingsProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            onCancel={() => onOpenChange(false)}
            onSave={(value) => {
              onSave(value)
              onOpenChange(false)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
