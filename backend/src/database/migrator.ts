import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";

const DEFAULT_DIR = path.resolve(
  import.meta.dirname,
  "../../database/migrations",
);
const LOCK_ID = 727001;

export async function runMigrations(
  pool: Pool,
  dir: string = DEFAULT_DIR,
): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];

  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);

    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const { rows } = await client.query<{ name: string; checksum: string }>(
      "SELECT name, checksum FROM schema_migrations",
    );
    const done = new Map(
      rows.map((r): [string, string] => [r.name, r.checksum]),
    );

    for (const file of files) {
      const sql = (await readFile(path.join(dir, file), "utf8")).replace(
        /\r\n/g,
        "\n",
      );
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previous = done.get(file);

      if (previous !== undefined) {
        if (previous !== checksum) {
          throw new Error(`La migracion ya aplicada fue modificada: ${file}`);
        }
        continue;
      }

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
          [file, checksum],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Fallo la migracion ${file}`, { cause: err });
      }

      applied.push(file);
    }

    return applied;
  } finally {
    await client
      .query("SELECT pg_advisory_unlock($1)", [LOCK_ID])
      .catch(() => {});
    client.release();
  }
}
