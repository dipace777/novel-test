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
import type { ApiConfig } from "../config"

type ApiConfigFieldsProps = {
  api: ApiConfig
  onChange: (api: ApiConfig) => void
}

const authOptions = [
  { value: "none", label: "No authentication" },
  { value: "bearer", label: "Bearer token" },
  { value: "api-key", label: "API key" },
] as const

const redirectOptions = [
  { value: "default", label: "Use test defaults" },
  { value: "follow", label: "Follow redirects" },
  { value: "stop", label: "Do not follow" },
] as const

export function ApiConfigFields({ api, onChange }: ApiConfigFieldsProps) {
  const headers = api.headers ?? []
  function update(values: Partial<ApiConfig>) {
    onChange({ ...api, ...values })
  }

  return (
    <section
      className="space-y-6 border-t border-border pt-6"
      aria-labelledby="api-config-title"
    >
      <div>
        <h3 id="api-config-title" className="text-sm font-medium">
          API configuration (optional)
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Optional defaults for API calls in your tests.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="api-auth" className="text-xs">
          Authentication
        </Label>
        <Select
          items={authOptions}
          value={api.authType ?? "none"}
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
            value={api.bearerToken ?? ""}
            onChange={(event) => update({ bearerToken: event.target.value })}
            placeholder="Enter token"
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
              value={api.apiKeyName ?? ""}
              onChange={(event) => update({ apiKeyName: event.target.value })}
              placeholder="X-API-Key"
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
              value={api.apiKeyValue ?? ""}
              onChange={(event) => update({ apiKeyValue: event.target.value })}
              placeholder="Enter key"
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
                  ...headers,
                  { id: crypto.randomUUID(), name: "", value: "" },
                ],
              })
            }
          >
            <Plus /> Add header
          </Button>
        </div>
        {headers.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No custom headers added.
          </p>
        )}
        {headers.map((header, index) => (
          <div key={header.id} className="flex items-center gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <Input
                aria-label={`Header ${index + 1} name`}
                placeholder="Header name"
                value={header.name}
                onChange={(event) =>
                  update({
                    headers: headers.map((item) =>
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
                    headers: headers.map((item) =>
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
                  headers: headers.filter((item) => item.id !== header.id),
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
          placeholder="Use test defaults"
          value={api.timeoutMs ?? ""}
          onChange={(event) =>
            update({
              timeoutMs: Number.isNaN(event.target.valueAsNumber)
                ? undefined
                : event.target.valueAsNumber,
            })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          How long a request can wait for a response.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Label htmlFor="follow-redirects" className="text-xs">
            Follow redirects
          </Label>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            Automatically follow HTTP redirects.
          </p>
        </div>
        <Select
          items={redirectOptions}
          value={
            api.followRedirects === undefined
              ? "default"
              : api.followRedirects
                ? "follow"
                : "stop"
          }
          onValueChange={(value) => {
            if (value)
              update({
                followRedirects:
                  value === "default" ? undefined : value === "follow",
              })
          }}
        >
          <SelectTrigger
            id="follow-redirects"
            className="w-[170px] shrink-0 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {redirectOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  )
}
