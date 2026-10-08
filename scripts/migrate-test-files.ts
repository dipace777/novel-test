import { closeDb } from "../src/server/db/connection"
import { migrateTestFiles } from "../src/server/workspace-repository.server"

try {
  await migrateTestFiles()
  console.log(
    "Test folders migrated to readable names; prompt.md files removed."
  )
} finally {
  await closeDb()
}
