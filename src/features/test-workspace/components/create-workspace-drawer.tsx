import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { defaultWorkspaceConfig } from "../config"
import type { WorkspaceConfig } from "../config"
import type { Workspace } from "../data"
import { WorkspaceConfigForm } from "./workspace-config-form"

type CreateWorkspaceDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaces: Workspace[]
  onCreate: (name: string, config: WorkspaceConfig) => Promise<void>
}

export function CreateWorkspaceDrawer({
  open,
  onOpenChange,
  workspaces,
  onCreate,
}: CreateWorkspaceDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]">
        <SheetHeader className="border-b border-border px-6 pt-6 pb-5">
          <SheetTitle>Create workspace</SheetTitle>
          <SheetDescription className="mt-1 text-xs">
            Set up your workspace and test configuration.
          </SheetDescription>
        </SheetHeader>
        {open && (
          <WorkspaceConfigForm
            intent="create"
            config={defaultWorkspaceConfig}
            workspaces={workspaces}
            onCancel={() => onOpenChange(false)}
            onCreate={async (name, config) => {
              await onCreate(name, config)
              onOpenChange(false)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
