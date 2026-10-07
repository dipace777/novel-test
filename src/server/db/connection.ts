import "dotenv/config"
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"

// Reuse the pool across development reloads; never import this module in UI code.
const globalDb = globalThis as typeof globalThis & { novelTestPool?: pg.Pool }

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.")
  const pool =
    globalDb.novelTestPool ??
    new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    })
  globalDb.novelTestPool = pool
  return drizzle({ client: pool })
}

export async function closeDb() {
  await globalDb.novelTestPool?.end()
  delete globalDb.novelTestPool
}
