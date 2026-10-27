import { env } from "../src/config/env";
import { pool } from "../src/config/db";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const migrationDir = path.join(currentDir, "migrations");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
                  CREATE TABLE IF NOT EXISTS schema_migrations (
                      name TEXT PRIMARY KEY,
                      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                  )
              `);

    const files = readdirSync(migrationDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const existing = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [file],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        console.log(`Skipping ${file}. Already applied`);
        continue;
      }

      const sql = readFileSync(path.join(migrationDir, file), "utf-8");

      await client.query("BEGIN");
      console.log(`Appliying ${file}`);

      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");

        console.log(`Applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.log(`Migration failed: ${file}`, err);
        throw err;
      }
    }

    console.log("Database migrations completed");
  } finally {
    client.release();
  }
}

migrate().catch((err) => {
  console.error("Migration runner failed", err);
  process.exitCode = 1;
});
