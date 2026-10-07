export type ApiHeader = { id: string; name: string; value: string }

export type ApiConfig = {
  authType?: "none" | "bearer" | "api-key"
  bearerToken?: string
  apiKeyName?: string
  apiKeyValue?: string
  headers?: ApiHeader[]
  timeoutMs?: number
  followRedirects?: boolean
}

export type WorkspaceConfig = {
  globalUrl: string
  api?: ApiConfig
}

export const defaultWorkspaceConfig: WorkspaceConfig = { globalUrl: "" }

// Explicit fields also discard the former mode property in existing records.
export function normalizeWorkspaceConfig(
  config: WorkspaceConfig
): WorkspaceConfig {
  const api = config.api ?? {}
  const headers = (api.headers ?? [])
    .filter((header) => header.name.trim() || header.value)
    .map((header) => ({ ...header, name: header.name.trim() }))
  const normalized: ApiConfig = {
    authType: api.authType === "none" ? undefined : api.authType,
    bearerToken: api.bearerToken || undefined,
    apiKeyName: api.apiKeyName?.trim() || undefined,
    apiKeyValue: api.apiKeyValue || undefined,
    headers: headers.length ? headers : undefined,
    timeoutMs: api.timeoutMs ?? undefined,
    followRedirects: api.followRedirects ?? undefined,
  }
  return {
    globalUrl: config.globalUrl.trim(),
    ...(Object.values<unknown>(normalized).some((value) => value !== undefined)
      ? { api: normalized }
      : {}),
  }
}

export function validateWorkspaceConfig(
  config: WorkspaceConfig
): string | null {
  try {
    const url = new URL(config.globalUrl)
    if (!["http:", "https:"].includes(url.protocol))
      return "Use an HTTP or HTTPS URL."
    if (url.username || url.password)
      return "Add credentials in the authentication settings instead of the URL."
  } catch {
    return "Enter a valid global URL, such as https://staging.example.com."
  }
  const api = config.api ?? {}
  if (
    api.timeoutMs !== undefined &&
    (!Number.isInteger(api.timeoutMs) ||
      api.timeoutMs < 100 ||
      api.timeoutMs > 120000)
  )
    return "Timeout must be between 100 and 120,000 milliseconds."
  const headerName = /^[!#$%&'*+.^_`|~\w-]+$/
  const names = new Set<string>()
  if (api.apiKeyName?.trim() && !headerName.test(api.apiKeyName.trim()))
    return "Enter a valid API key header name."
  if (api.authType === "bearer" && api.bearerToken) names.add("authorization")
  if (api.authType === "api-key" && api.apiKeyName?.trim() && api.apiKeyValue)
    names.add(api.apiKeyName.trim().toLowerCase())
  if (/[\r\n]/.test((api.bearerToken ?? "") + (api.apiKeyValue ?? "")))
    return "Authentication values must be on a single line."
  for (const header of api.headers ?? []) {
    if (!header.name.trim() && !header.value) continue
    const name = header.name.trim()
    if (!headerName.test(name)) return "Each added header needs a valid name."
    if (names.has(name.toLowerCase()))
      return `The ${name} header is already configured.`
    if (/[\r\n]/.test(header.value))
      return "Header values must be on a single line."
    names.add(name.toLowerCase())
  }
  return null
}
