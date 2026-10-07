import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { normalizeWorkspaceConfig, validateWorkspaceConfig } from "../config"
import type { WorkspaceConfig } from "../config"
import type { Workspace } from "../data"
import { ApiConfigFields } from "./api-config-fields"

type WorkspaceConfigFormProps = {
  config: WorkspaceConfig
  onCancel: () => void
} & (
  | {
      intent: "edit"
      onSave: (config: WorkspaceConfig) => Promise<void>
      onRequestDelete: () => void
    }
  | {
      intent: "create"
      workspaces: Workspace[]
      onCreate: (name: string, config: WorkspaceConfig) => Promise<void>
    }
)

export function WorkspaceConfigForm(props: WorkspaceConfigFormProps) {
  const { config, onCancel } = props
  const [name, setName] = useState("")
  const [draft, setDraftValue] = useState(() =>
    normalizeWorkspaceConfig(config)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setDraft(value: WorkspaceConfig) {
    setDraftValue(value)
    setError(null)
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={async (event) => {
        event.preventDefault()
        if (saving) return
        const normalizedName = name.trim().replace(/\s+/g, " ")
        if (props.intent === "create") {
          if (
            normalizedName &&
            props.workspaces.some(
              (workspace) =>
                workspace.label.toLowerCase() === normalizedName.toLowerCase()
            )
          ) {
            setError("A workspace with this name already exists.")
            return
          }
        }
        const message = validateWorkspaceConfig(draft)
        if (message) {
          setError(message)
          return
        }
        const savedConfig = normalizeWorkspaceConfig(draft)
        setSaving(true)
        setError(null)
        try {
          if (props.intent === "create")
            await props.onCreate(normalizedName, savedConfig)
          else await props.onSave(savedConfig)
        } catch (saveError) {
          setError(
            saveError instanceof Error
              ? saveError.message
              : "Could not save. Try again."
          )
        } finally {
          setSaving(false)
        }
      }}
    >
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {props.intent === "create" && (
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-xs">
              Workspace name (optional)
            </Label>
            <Input
              id="workspace-name"
              value={name}
              maxLength={64}
              placeholder="Defaults to the staging app hostname"
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="global-url" className="text-xs">
            Global URL
          </Label>
          <Input
            id="global-url"
            type="url"
            maxLength={2048}
            required
            placeholder="https://staging.example.com"
            value={draft.globalUrl}
            onChange={(event) =>
              setDraft({ ...draft, globalUrl: event.target.value })
            }
          />
          <p className="text-[11px] leading-5 text-muted-foreground">
            URL of the deployed staging app for browser interactions and API
            calls.
          </p>
        </div>
        <ApiConfigFields
          api={draft.api ?? {}}
          onChange={(api) => setDraft({ ...draft, api })}
        />
        <p className="text-[11px] leading-5 text-muted-foreground">
          Settings apply to all tests in this workspace.
        </p>
      </div>
      <div className="shrink-0 border-t border-border p-5">
        {error && (
          <p role="alert" className="mb-3 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {props.intent === "edit" && (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
              disabled={saving}
              onClick={props.onRequestDelete}
            >
              Delete workspace
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : props.intent === "create"
                ? "Create workspace"
                : "Save settings"}
          </Button>
        </div>
      </div>
    </form>
  )
}
