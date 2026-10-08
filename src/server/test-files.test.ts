import assert from "node:assert/strict"
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { test } from "node:test"
import {
  categoryDirectory,
  folderName,
  testDirectory,
  workspaceDirectory,
  TestFiles,
} from "./test-files"

const workspace = { id: "workspace-1", name: "Reddit" }
const category = {
  id: "category-1",
  workspaceId: workspace.id,
  name: "Reddit Market Study",
}
const testCase = {
  id: "test-1",
  name: "Search reddit",
  description: "",
  steps: [],
  expectedResult: "",
  prompt: "Dynamic prompt",
}

async function fixture(run: (root: string) => Promise<void>) {
  const temporary = await mkdtemp(path.join(tmpdir(), "novel-test-files-"))
  try {
    await run(path.join(temporary, "tests"))
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

async function create(root: string) {
  const files = new TestFiles(workspace, root)
  await files.createTest(category, testCase)
  await files.commit()
  return testDirectory(workspace, category, testCase, root)
}

test("uses readable paths, stores only metadata and preserves automation code", async () => {
  await fixture(async (root) => {
    const directory = await create(root)
    assert.equal(
      directory,
      path.join(root, "reddit", "reddit-market-study", "search-reddit")
    )
    assert.deepEqual(await readdir(directory), ["test.json"])
    const metadata = JSON.parse(
      await readFile(path.join(directory, "test.json"), "utf8")
    )
    assert.equal(metadata.id, testCase.id)
    assert.equal(metadata.categoryId, category.id)
    assert.equal("prompt" in metadata, false)
    await writeFile(
      path.join(directory, "test.spec.ts"),
      "// Agent-authored code\n"
    )
    const save = new TestFiles(workspace, root)
    await save.createTest(category, {
      ...testCase,
      prompt: "Another dynamic prompt",
    })
    await save.commit()
    assert.equal(
      await readFile(path.join(directory, "test.spec.ts"), "utf8"),
      "// Agent-authored code\n"
    )
    assert.deepEqual((await readdir(directory)).sort(), [
      "test.json",
      "test.spec.ts",
    ])
  })
})

test("adds a short suffix only for collisions at each level; paths remain stable", async () => {
  await fixture(async (root) => {
    await create(root)
    const secondWorkspace = { id: "workspace-2", name: "Réddit!" }
    const second = new TestFiles(secondWorkspace, root)
    await second.createWorkspace()
    await second.commit()
    assert.match(
      path.basename(await workspaceDirectory(secondWorkspace, root)),
      /^reddit--[a-f0-9]{6}$/
    )
    const secondCategory = {
      ...category,
      id: "category-2",
      name: "Reddit Market/Study",
    }
    const secondTest = { ...testCase, id: "test-2", name: "Search/reddit" }
    const files = new TestFiles(workspace, root)
    await files.createCategory(secondCategory)
    await files.createTest(category, secondTest)
    await files.commit()
    assert.match(
      path.basename(await categoryDirectory(workspace, secondCategory, root)),
      /^reddit-market-study--[a-f0-9]{6}$/
    )
    const secondDirectory = await testDirectory(
      workspace,
      category,
      secondTest,
      root
    )
    assert.match(path.basename(secondDirectory), /^search-reddit--[a-f0-9]{6}$/)
    const deletion = new TestFiles(workspace, root)
    await deletion.deleteTest(category, testCase)
    await deletion.commit()
    const save = new TestFiles(workspace, root)
    await save.createTest(category, secondTest)
    await save.commit()
    assert.equal(
      await testDirectory(workspace, category, secondTest, root),
      secondDirectory
    )
    const occupied = path.join(
      await categoryDirectory(workspace, category, root),
      "unmanaged"
    )
    await mkdir(occupied)
    await writeFile(path.join(occupied, "notes.txt"), "Keep this")
    const third = new TestFiles(workspace, root)
    await third.createTest(category, {
      ...testCase,
      id: "test-3",
      name: "Unmanaged",
    })
    await third.commit()
    assert.equal(
      await readFile(path.join(occupied, "notes.txt"), "utf8"),
      "Keep this"
    )
  })
})

test("renaming into a slug collision preserves both categories and can roll back", async () => {
  await fixture(async (root) => {
    const directory = await create(root)
    const otherCategory = { ...category, id: "category-2", name: "Other" }
    const setup = new TestFiles(workspace, root)
    await setup.createCategory(otherCategory)
    await setup.commit()
    const original = await categoryDirectory(workspace, category, root)
    const change = new TestFiles(workspace, root)
    await change.renameCategory(category, "Other!")
    assert.match(
      path.basename(await categoryDirectory(workspace, category, root)),
      /^other--[a-f0-9]{6}$/
    )
    await change.rollback()
    assert.equal(await categoryDirectory(workspace, category, root), original)
    assert.deepEqual(await readdir(directory), ["test.json"])
    const next = new TestFiles(workspace, root)
    await next.renameCategory(category, "Other!")
    await next.commit()
    assert.equal(
      JSON.parse(
        await readFile(
          path.join(
            await categoryDirectory(workspace, category, root),
            "category.json"
          ),
          "utf8"
        )
      ).name,
      "Other!"
    )
    assert.equal(
      path.basename(await categoryDirectory(workspace, otherCategory, root)),
      "other"
    )
  })
})

test("migrates full-ID folders and removes prompt files reversibly, preserving code", async () => {
  await fixture(async (root) => {
    const directory = await create(root)
    await writeFile(path.join(directory, "prompt.md"), "Legacy draft")
    await writeFile(
      path.join(directory, "test.json"),
      JSON.stringify({
        ...testCase,
        workspaceId: workspace.id,
        categoryId: category.id,
      })
    )
    await writeFile(
      path.join(directory, "test.spec.ts"),
      "// Existing automation"
    )
    const legacyTestName = `${folderName(testCase.name)}--${testCase.id}`
    const legacyCategoryName = `${folderName(category.name)}--${category.id}`
    const legacyWorkspace = path.join(
      root,
      `${folderName(workspace.name)}--${workspace.id}`
    )
    await rename(directory, path.join(path.dirname(directory), legacyTestName))
    const categoryPath = await categoryDirectory(workspace, category, root)
    await rename(
      categoryPath,
      path.join(path.dirname(categoryPath), legacyCategoryName)
    )
    await rename(await workspaceDirectory(workspace, root), legacyWorkspace)
    const legacyDirectory = path.join(
      legacyWorkspace,
      legacyCategoryName,
      legacyTestName
    )
    const migration = new TestFiles(workspace, root)
    await migration.migrate([{ ...category, tests: [testCase] }])
    assert.equal(
      await testDirectory(workspace, category, testCase, root),
      directory
    )
    await assert.rejects(readFile(path.join(directory, "prompt.md")), {
      code: "ENOENT",
    })
    await migration.rollback()
    assert.equal(
      await readFile(path.join(legacyDirectory, "prompt.md"), "utf8"),
      "Legacy draft"
    )
    const retry = new TestFiles(workspace, root)
    await retry.migrate([{ ...category, tests: [testCase] }])
    await retry.commit()
    assert.equal(
      await readFile(path.join(directory, "test.spec.ts"), "utf8"),
      "// Existing automation"
    )
    assert.equal(
      "prompt" in
        JSON.parse(await readFile(path.join(directory, "test.json"), "utf8")),
      false
    )
    const again = new TestFiles(workspace, root)
    await again.migrate([{ ...category, tests: [testCase] }])
    await again.commit()
    assert.equal(
      await testDirectory(workspace, category, testCase, root),
      directory
    )
    assert.equal((await readdir(root)).length, 1)
  })
})

test("rollback restores metadata and deletion; removes only newly created files", async () => {
  await fixture(async (root) => {
    const directory = await create(root)
    const before = await readFile(path.join(directory, "test.json"), "utf8")
    const update = new TestFiles(workspace, root)
    await update.createTest(category, {
      ...testCase,
      description: "Uncommitted",
    })
    await update.createTest(category, {
      ...testCase,
      id: "test-2",
      name: "New test",
    })
    await update.deleteWorkspace()
    await update.rollback()
    assert.equal(
      await readFile(path.join(directory, "test.json"), "utf8"),
      before
    )
    assert.equal(
      (await readdir(await categoryDirectory(workspace, category, root)))
        .length,
      2
    )
    const deletion = new TestFiles(workspace, root)
    await deletion.deleteTest(category, testCase)
    await deletion.commit()
    assert.deepEqual(
      await readdir(await categoryDirectory(workspace, category, root)),
      ["category.json"]
    )
    const workspaceDeletion = new TestFiles(workspace, root)
    await workspaceDeletion.deleteWorkspace()
    await workspaceDeletion.commit()
    assert.deepEqual(await readdir(root), [])
  })
  await fixture(async (root) => {
    const files = new TestFiles(workspace, root)
    await files.createTest(category, testCase)
    await writeFile(path.join(root, "unrelated.txt"), "Keep")
    await files.rollback()
    assert.deepEqual(await readdir(root), ["unrelated.txt"])
  })
})

test("unsafe names stay inside tests, and symlinks and invalid ownership are rejected", async () => {
  assert.equal(folderName("../../outside\\test"), "outside-test")
  await fixture(async (root) => {
    const files = new TestFiles(workspace, root)
    await assert.rejects(
      files.createCategory({ ...category, workspaceId: "other" }),
      /another workspace/
    )
    await assert.rejects(
      files.createWorkspace.call(
        new TestFiles({ ...workspace, id: "../escape" }, root)
      ),
      /Invalid test ID/
    )
    await files.rollback()
    const directory = await create(root)
    const external = path.join(path.dirname(root), "external.json")
    await writeFile(external, "Do not change")
    await rm(path.join(directory, "test.json"))
    await symlink(external, path.join(directory, "test.json"))
    const save = new TestFiles(workspace, root)
    await assert.rejects(save.createTest(category, testCase), /symbolic links/)
    await save.rollback()
    assert.equal(await readFile(external, "utf8"), "Do not change")
    await rm(directory, { recursive: true })
    await symlink(path.dirname(root), directory)
    const deletion = new TestFiles(workspace, root)
    await assert.rejects(
      deletion.deleteTest(category, testCase),
      /symbolic links/
    )
    await deletion.rollback()
  })
})
