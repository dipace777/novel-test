export type ApiHeader = { id: string; name: string; value: string }

export type WorkspaceConfig = {
  globalUrl: string
  mode: "ui" | "api"
  api: {
    authType: "none" | "bearer" | "api-key"
    bearerToken: string
    apiKeyName: string
    apiKeyValue: string
    headers: ApiHeader[]
    timeoutMs: number
    followRedirects: boolean
  }
}

export const defaultWorkspaceConfig: WorkspaceConfig = {
  globalUrl: "",
  mode: "ui",
  api: {
    authType: "none",
    bearerToken: "",
    apiKeyName: "X-API-Key",
    apiKeyValue: "",
    headers: [],
    timeoutMs: 30000,
    followRedirects: true,
  },
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
    return "Enter a valid global URL, such as https://app.example.com."
  }
  if (config.mode === "ui") return null
  const { api } = config
  if (
    !Number.isInteger(api.timeoutMs) ||
    api.timeoutMs < 100 ||
    api.timeoutMs > 120000
  )
    return "Timeout must be between 100 and 120,000 milliseconds."
  if (api.authType === "bearer" && !api.bearerToken.trim())
    return "Enter a bearer token."
  if (
    api.authType === "api-key" &&
    (!api.apiKeyName.trim() || !api.apiKeyValue.trim())
  )
    return "Enter the API key header name and value."
  const headerName = /^[!#$%&'*+.^_`|~\w-]+$/
  const names = new Set<string>()
  if (api.authType !== "none") {
    const name =
      api.authType === "bearer" ? "Authorization" : api.apiKeyName.trim()
    if (!headerName.test(name)) return "Enter a valid API key header name."
    names.add(name.toLowerCase())
  }
  if (/[\r\n]/.test(api.bearerToken + api.apiKeyValue))
    return "Authentication values must be on a single line."
  for (const header of api.headers) {
    if (!header.name.trim() && !header.value) continue
    const name = header.name.trim()
    if (!headerName.test(name)) return "Each header needs a valid name."
    if (names.has(name.toLowerCase()))
      return `The ${name} header is already configured.`
    if (/[\r\n]/.test(header.value))
      return "Header values must be on a single line."
    names.add(name.toLowerCase())
  }
  return null
}
