import { useState } from "react"
import { Code2, Monitor } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { validateWorkspaceConfig } from "../config"
import type { WorkspaceConfig } from "../config"
import type { Workspace } from "../data"
import { ApiConfigFields } from "./api-config-fields"

type WorkspaceConfigFormProps = {
  config: WorkspaceConfig
  onCancel: () => void
} & (
  | { intent: "edit"; onSave: (config: WorkspaceConfig) => void }
  | {
      intent: "create"
      workspaces: Workspace[]
      onCreate: (name: string, config: WorkspaceConfig) => void
    }
)

export function WorkspaceConfigForm(props: WorkspaceConfigFormProps) {
  const { config, onCancel } = props
  const [name, setName] = useState("")
  const [draft, setDraftValue] = useState(config)
  const [error, setError] = useState<string | null>(null)

  function setDraft(value: WorkspaceConfig) {
    setDraftValue(value)
    setError(null)
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        const normalizedName = name.trim().replace(/\s+/g, " ")
        if (props.intent === "create") {
          if (!normalizedName) {
            setError("Enter a workspace name.")
            return
          }
          if (
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
        const savedConfig: WorkspaceConfig = {
          ...draft,
          globalUrl: draft.globalUrl.trim(),
          api: {
            ...draft.api,
            headers: draft.api.headers
              .filter((header) => header.name.trim() || header.value)
              .map((header) => ({ ...header, name: header.name.trim() })),
          },
        }
        if (props.intent === "create")
          props.onCreate(normalizedName, savedConfig)
        else props.onSave(savedConfig)
      }}
    >
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {props.intent === "create" && (
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-xs">
              Workspace name
            </Label>
            <Input
              id="workspace-name"
              value={name}
              maxLength={64}
              required
              placeholder="e.g. Customer portal"
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
            required
            placeholder={
              draft.mode === "api"
                ? "https://api.example.com/v1"
                : "https://app.example.com"
            }
            value={draft.globalUrl}
            onChange={(event) =>
              setDraft({ ...draft, globalUrl: event.target.value })
            }
          />
          <p className="text-[11px] leading-5 text-muted-foreground">
            {draft.mode === "api"
              ? "Base URL for API requests in this workspace."
              : "Starting URL for browser tests in this workspace."}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="api-mode" className="text-xs">
                Test mode
              </Label>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {draft.mode === "api"
                  ? "Test endpoints and responses."
                  : "Test user journeys in the browser."}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={
                  draft.mode === "ui" ? "font-medium" : "text-muted-foreground"
                }
              >
                UI
              </span>
              <Switch
                id="api-mode"
                aria-label="API mode"
                checked={draft.mode === "api"}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, mode: checked ? "api" : "ui" })
                }
              />
              <span
                className={
                  draft.mode === "api" ? "font-medium" : "text-muted-foreground"
                }
              >
                API
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
            {draft.mode === "api" ? (
              <Code2 className="size-3.5" />
            ) : (
              <Monitor className="size-3.5" />
            )}
            {draft.mode === "api"
              ? "HTTP requests, status codes, and response data"
              : "Pages, interactions, and visible results"}
          </div>
        </div>
        {draft.mode === "api" && (
          <ApiConfigFields
            api={draft.api}
            onChange={(api) => setDraft({ ...draft, api })}
          />
        )}
        <p className="text-[11px] leading-5 text-muted-foreground">
          Settings apply to all tests in this workspace. Saved for this session.
        </p>
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
          <Button type="submit">
            {props.intent === "create" ? "Create workspace" : "Save settings"}
          </Button>
        </div>
      </div>
    </form>
  )
}
