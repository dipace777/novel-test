import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { WorkspaceConfig } from "../config"

type ApiConfigFieldsProps = {
  api: WorkspaceConfig["api"]
  onChange: (api: WorkspaceConfig["api"]) => void
}

const authOptions = [
  { value: "none", label: "No authentication" },
  { value: "bearer", label: "Bearer token" },
  { value: "api-key", label: "API key" },
] as const

export function ApiConfigFields({ api, onChange }: ApiConfigFieldsProps) {
  function update(values: Partial<WorkspaceConfig["api"]>) {
    onChange({ ...api, ...values })
  }

  return (
    <section
      className="space-y-6 border-t border-border pt-6"
      aria-labelledby="api-config-title"
    >
      <div>
        <h3 id="api-config-title" className="text-sm font-medium">
          API configuration
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Defaults for requests in this workspace.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="api-auth" className="text-xs">
          Authentication
        </Label>
        <Select
          items={authOptions}
          value={api.authType}
          onValueChange={(value) => {
            if (value) update({ authType: value })
          }}
        >
          <SelectTrigger id="api-auth" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {authOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {api.authType === "bearer" && (
        <div className="space-y-2">
          <Label htmlFor="bearer-token" className="text-xs">
            Bearer token
          </Label>
          <Input
            id="bearer-token"
            type="password"
            autoComplete="off"
            value={api.bearerToken}
            onChange={(event) => update({ bearerToken: event.target.value })}
            placeholder="Enter token"
            required
          />
        </div>
      )}
      {api.authType === "api-key" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="api-key-name" className="text-xs">
              API key header
            </Label>
            <Input
              id="api-key-name"
              value={api.apiKeyName}
              onChange={(event) => update({ apiKeyName: event.target.value })}
              placeholder="X-API-Key"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key-value" className="text-xs">
              API key value
            </Label>
            <Input
              id="api-key-value"
              type="password"
              autoComplete="off"
              value={api.apiKeyValue}
              onChange={(event) => update({ apiKeyValue: event.target.value })}
              placeholder="Enter key"
              required
            />
          </div>
        </div>
      )}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-medium">Default headers</h4>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() =>
              update({
                headers: [
                  ...api.headers,
                  { id: crypto.randomUUID(), name: "", value: "" },
                ],
              })
            }
          >
            <Plus /> Add header
          </Button>
        </div>
        {api.headers.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No custom headers added.
          </p>
        )}
        {api.headers.map((header, index) => (
          <div key={header.id} className="flex items-center gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <Input
                aria-label={`Header ${index + 1} name`}
                placeholder="Header name"
                value={header.name}
                onChange={(event) =>
                  update({
                    headers: api.headers.map((item) =>
                      item.id === header.id
                        ? { ...item, name: event.target.value }
                        : item
                    ),
                  })
                }
              />
              <Input
                aria-label={`Header ${index + 1} value`}
                placeholder="Value"
                value={header.value}
                onChange={(event) =>
                  update({
                    headers: api.headers.map((item) =>
                      item.id === header.id
                        ? { ...item, value: event.target.value }
                        : item
                    ),
                  })
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove header ${index + 1}`}
              onClick={() =>
                update({
                  headers: api.headers.filter((item) => item.id !== header.id),
                })
              }
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="request-timeout" className="text-xs">
          Request timeout (ms)
        </Label>
        <Input
          id="request-timeout"
          type="number"
          min={100}
          max={120000}
          step={1}
          required
          value={Number.isNaN(api.timeoutMs) ? "" : api.timeoutMs}
          onChange={(event) =>
            update({ timeoutMs: event.target.valueAsNumber })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          How long a request can wait for a response.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="follow-redirects" className="text-xs">
            Follow redirects
          </Label>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            Automatically follow HTTP redirects.
          </p>
        </div>
        <Switch
          id="follow-redirects"
          checked={api.followRedirects}
          onCheckedChange={(checked) => update({ followRedirects: checked })}
        />
      </div>
    </section>
  )
}
