import { expect, test } from "@playwright/test"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { eq } from "drizzle-orm"
import { getDb, closeDb } from "../../src/server/db/connection"
import { workspaces } from "../../src/server/db/schema"
import { deleteWorkspace } from "../../src/server/workspace-repository.server"
import { testDirectory } from "../../src/server/test-files"

async function removeWorkspace(name: string) {
  const rows = await getDb()
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.name, name))
  for (const row of rows) await deleteWorkspace(row.id)
}

test("workspace, category, test, settings and draft survive a reload", async ({
  page,
}) => {
  const workspaceName = `Persistence ${crypto.randomUUID()}`
  const browserErrors: string[] = []
  page.on("pageerror", (error) => browserErrors.push(error.message))
  try {
    await page.goto("/")
    await page.getByRole("combobox", { name: "Switch workspace" }).click()
    await page
      .getByRole("option", { name: "Create workspace", exact: true })
      .click()
    const drawer = page.getByRole("dialog", {
      name: "Create workspace",
      exact: true,
    })
    await drawer.getByLabel("Workspace name").fill(workspaceName)
    await drawer.getByLabel("Global URL").fill("https://api.example.com/v1")
    await drawer
      .getByRole("button", { name: "Create workspace", exact: true })
      .click()
    await expect(drawer).toBeHidden()
    await expect(
      page.getByRole("combobox", { name: "Switch workspace" })
    ).toContainText(workspaceName)

    await page.getByRole("button", { name: "New test", exact: true }).click()
    const testDrawer = page.getByRole("dialog", {
      name: "New test",
      exact: true,
    })
    await testDrawer.getByLabel("Test case name").fill("Reject expired tokens")
    await testDrawer
      .getByRole("combobox", { name: "Category", exact: true })
      .click()
    await page
      .getByRole("option", { name: "Create category…", exact: true })
      .click()
    const categoryDialog = page.getByRole("dialog", {
      name: "Create category",
      exact: true,
    })
    await categoryDialog
      .getByLabel("Category name", { exact: true })
      .fill("Authentication")
    await categoryDialog
      .getByRole("button", { name: "Create category", exact: true })
      .click()
    await expect(categoryDialog).toBeHidden()
    await expect(
      testDrawer.getByRole("combobox", { name: "Category", exact: true })
    ).toContainText("Authentication")
    await testDrawer
      .getByRole("button", { name: "Create test", exact: true })
      .click()
    await expect(testDrawer).toBeHidden()

    const { testCases, categories } = await import("../../src/server/db/schema")
    const [created] = await getDb()
      .select({ category: categories, test: testCases })
      .from(testCases)
      .innerJoin(categories, eq(categories.id, testCases.categoryId))
      .innerJoin(workspaces, eq(workspaces.id, categories.workspaceId))
      .where(eq(workspaces.name, workspaceName))
    const directory = await testDirectory(
      { id: created.category.workspaceId, name: workspaceName },
      created.category,
      created.test
    )
    expect((await readdir(directory)).sort()).toEqual(["test.json"])

    await page
      .getByLabel("Describe your test")
      .fill("Verify an expired bearer token returns 401.")
    await page
      .getByRole("button", { name: "Workspace settings", exact: true })
      .click()
    const settings = page.getByRole("dialog", {
      name: "Workspace settings",
      exact: true,
    })
    await settings.getByLabel("Global URL").fill("https://api.example.com/v2")
    await settings.getByRole("spinbutton", { name: /timeout/i }).fill("15000")
    await settings
      .getByRole("button", { name: "Save settings", exact: true })
      .click()
    await expect(settings).toBeHidden()
    await expect
      .poll(async () => {
        const db = getDb()
        const rows = await db
          .select({ prompt: testCases.prompt })
          .from(testCases)
          .innerJoin(categories, eq(categories.id, testCases.categoryId))
          .innerJoin(workspaces, eq(workspaces.id, categories.workspaceId))
          .where(eq(workspaces.name, workspaceName))
        return rows[0]?.prompt
      })
      .toBe("Verify an expired bearer token returns 401.")
    await expect(
      readFile(path.join(directory, "prompt.md"))
    ).rejects.toMatchObject({ code: "ENOENT" })

    await page.reload()
    await page.getByRole("combobox", { name: "Switch workspace" }).click()
    await page.getByRole("option", { name: workspaceName, exact: true }).click()
    await page
      .getByRole("button", { name: "Reject expired tokens", exact: true })
      .click()
    await expect(page.getByLabel("Describe your test")).toHaveValue(
      "Verify an expired bearer token returns 401."
    )
    await page
      .getByRole("button", { name: "Workspace settings", exact: true })
      .click()
    await expect(settings.getByLabel("Global URL")).toHaveValue(
      "https://api.example.com/v2"
    )
    await expect(
      settings.getByRole("spinbutton", { name: /timeout/i })
    ).toHaveValue("15000")
    await settings.getByRole("button", { name: "Cancel", exact: true }).click()
    const testButton = page.getByRole("button", {
      name: "Reject expired tokens",
      exact: true,
    })
    await testButton.hover()
    await page
      .getByRole("button", {
        name: "Delete Reject expired tokens",
        exact: true,
      })
      .click()
    const deletion = page.getByRole("dialog", {
      name: "Delete test case?",
      exact: true,
    })
    await deletion.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(testButton).toBeVisible()
    await expect(page.getByLabel("Describe your test")).toBeVisible()
    await testButton.hover()
    await page
      .getByRole("button", {
        name: "Delete Reject expired tokens",
        exact: true,
      })
      .click()
    await page.route("**/_serverFn/**", (route) => route.abort())
    await deletion
      .getByRole("button", { name: "Delete test", exact: true })
      .click()
    await expect(deletion.getByRole("alert")).toBeVisible()
    await expect(
      page.getByRole("button", {
        name: "Reject expired tokens",
        exact: true,
        includeHidden: true,
      })
    ).toBeAttached()
    await page.unroute("**/_serverFn/**")
    await deletion
      .getByRole("button", { name: "Delete test", exact: true })
      .click()
    await expect(deletion).toBeHidden()
    await expect(readdir(directory)).rejects.toMatchObject({ code: "ENOENT" })
    await expect(testButton).toHaveCount(0)
    await expect(page.getByLabel("Describe your test")).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Authentication", exact: true })
    ).toBeVisible()
    await page.reload()
    await page.getByRole("combobox", { name: "Switch workspace" }).click()
    await page.getByRole("option", { name: workspaceName, exact: true }).click()
    await expect(testButton).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Authentication", exact: true })
    ).toBeVisible()
    expect(browserErrors).toEqual([])
  } finally {
    await removeWorkspace(workspaceName)
    await closeDb()
  }
})

test("a failed save preserves the form and can be retried", async ({
  page,
}) => {
  const workspaceName = `Retry ${crypto.randomUUID()}`
  try {
    await page.goto("/")
    await page.getByRole("combobox", { name: "Switch workspace" }).click()
    await page
      .getByRole("option", { name: "Create workspace", exact: true })
      .click()
    const drawer = page.getByRole("dialog", {
      name: "Create workspace",
      exact: true,
    })
    await drawer.getByLabel("Workspace name").fill(workspaceName)
    await drawer.getByLabel("Global URL").fill("https://example.com")
    await page.route("**/_serverFn/**", (route) => route.abort())
    await drawer
      .getByRole("button", { name: "Create workspace", exact: true })
      .click()
    await expect(drawer.getByRole("alert")).toBeVisible()
    await expect(drawer.getByLabel("Workspace name")).toHaveValue(workspaceName)
    await expect(drawer.getByLabel("Global URL")).toHaveValue(
      "https://example.com"
    )
    const rows = await getDb()
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.name, workspaceName))
    expect(rows).toHaveLength(0)
    await page.unroute("**/_serverFn/**")
    await drawer
      .getByRole("button", { name: "Create workspace", exact: true })
      .click()
    await expect(drawer).toBeHidden()
    await expect(
      page.getByRole("combobox", { name: "Switch workspace" })
    ).toContainText(workspaceName)
  } finally {
    await removeWorkspace(workspaceName)
    await closeDb()
  }
})
