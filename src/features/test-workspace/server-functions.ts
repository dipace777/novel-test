import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const id = z.string().min(1).max(128)
const name = (max: number) =>
  z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(1).max(max))
const config = z.object({
  globalUrl: z.string().max(2048),
  api: z
    .object({
      authType: z.enum(["none", "bearer", "api-key"]).optional(),
      bearerToken: z.string().max(8192).optional(),
      apiKeyName: z.string().max(256).optional(),
      apiKeyValue: z.string().max(8192).optional(),
      headers: z
        .array(
          z.object({
            id,
            name: z.string().max(256),
            value: z.string().max(8192),
          })
        )
        .max(100)
        .optional(),
      timeoutMs: z.number().int().min(100).max(120000).optional(),
      followRedirects: z.boolean().optional(),
    })
    .optional(),
})

export const getWorkspaceData = createServerFn({ method: "GET" }).handler(
  async () => {
    const repo = await import("../../server/workspace-repository.server")
    try {
      return { data: await repo.loadWorkspaceSnapshot(), error: null }
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
  }
)

export const createWorkspace = createServerFn({ method: "POST" })
  .validator(z.object({ name: name(64).optional(), config }))
  .handler(async ({ data }) => {
    const repo = await import("../../server/workspace-repository.server")
    try {
      return {
        data: await repo.createWorkspace(data.name, data.config),
        error: null,
      }
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
  })

export const saveWorkspaceConfig = createServerFn({ method: "POST" })
  .validator(z.object({ workspaceId: id, config }))
  .handler(async ({ data }) => {
    const repo = await import("../../server/workspace-repository.server")
    try {
      return {
        data: await repo.saveWorkspaceConfig(data.workspaceId, data.config),
        error: null,
      }
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
  })

export const deleteWorkspace = createServerFn({ method: "POST" })
  .validator(z.object({ workspaceId: id }))
  .handler(async ({ data }) => {
    const repo = await import("../../server/workspace-repository.server")
    try {
      return {
        data: await repo.deleteWorkspace(data.workspaceId),
        error: null,
      }
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
  })

export const createCategory = createServerFn({ method: "POST" })
  .validator(z.object({ workspaceId: id, name: name(64) }))
  .handler(async ({ data }) => {
    const repo = await import("../../server/workspace-repository.server")
    try {
      return {
        data: await repo.createCategory(data.workspaceId, data.name),
        error: null,
      }
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
  })

export const renameCategory = createServerFn({ method: "POST" })
  .validator(z.object({ workspaceId: id, categoryId: id, name: name(64) }))
  .handler(async ({ data }) => {
    const repo = await import("../../server/workspace-repository.server")
    try {
      return {
        data: await repo.renameCategory(
          data.workspaceId,
          data.categoryId,
          data.name
        ),
        error: null,
      }
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
  })

export const deleteCategory = createServerFn({ method: "POST" })
  .validator(z.object({ workspaceId: id, categoryId: id }))
  .handler(async ({ data }) => {
    const repo = await import("../../server/workspace-repository.server")
    try {
      return {
        data: await repo.deleteCategory(data.workspaceId, data.categoryId),
        error: null,
      }
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
  })

export const createTest = createServerFn({ method: "POST" })
  .validator(z.object({ workspaceId: id, categoryId: id, name: name(120) }))
  .handler(async ({ data }) => {
    const repo = await import("../../server/workspace-repository.server")
    try {
      return {
        data: await repo.createTest(
          data.workspaceId,
          data.categoryId,
          data.name
        ),
        error: null,
      }
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
  })

export const deleteTest = createServerFn({ method: "POST" })
  .validator(z.object({ workspaceId: id, testId: id }))
  .handler(async ({ data }) => {
    const repo = await import("../../server/workspace-repository.server")
    try {
      return {
        data: await repo.deleteTest(data.workspaceId, data.testId),
        error: null,
      }
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
  })

function agentFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "The agent failed."
  if (message.startsWith("Set XAI_API_KEY")) return message
  if (
    /incorrect api key|invalid api key|invalid_api_key|unauthorized|\b401\b/i.test(
      message
    )
  )
    return "xAI rejected XAI_API_KEY. Create a key at https://console.x.ai and put that value in .env. xAI keys start with xai-."
  return message.length > 300
    ? "The agent failed while handling that command."
    : message
}

export const getAgentStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const agent = await import("../../server/agent.server")
    agent.startAgent()
    return { data: agent.agentStatus(), error: null }
  }
)

export const sendAgentCommand = createServerFn({ method: "POST" })
  .validator(
    z.object({
      workspaceId: id,
      testId: id,
      command: z
        .string()
        .max(50000)
        .transform((value) => value.trim())
        .pipe(z.string().min(1)),
    })
  )
  .handler(async ({ data }) => {
    const repo = await import("../../server/workspace-repository.server")
    let context: Awaited<ReturnType<typeof repo.loadTestCommandContext>>
    try {
      context = await repo.loadTestCommandContext(data.workspaceId, data.testId)
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
    try {
      const agent = await import("../../server/agent.server")
      const reply = await agent.submitCommand({
        command: data.command,
        testFolder: context.testFolder,
        testName: context.testName,
        globalUrl: context.globalUrl,
      })
      return { data: { reply }, error: null }
    } catch (error) {
      return { data: null, error: agentFailure(error) }
    }
  })

export const savePrompt = createServerFn({ method: "POST" })
  .validator(
    z.object({ workspaceId: id, testId: id, prompt: z.string().max(50000) })
  )
  .handler(async ({ data }) => {
    const repo = await import("../../server/workspace-repository.server")
    try {
      return {
        data: await repo.savePrompt(data.workspaceId, data.testId, data.prompt),
        error: null,
      }
    } catch (error) {
      return { data: null, error: repo.publicError(error) }
    }
  })
