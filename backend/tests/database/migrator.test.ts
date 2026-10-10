import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Pool } from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, pool as adminPool } from "../../src/config/database.js";
import { env } from "../../src/config/env.js";
import { runMigrations } from "../../src/database/migrator.js";

let schema: string;
let dir: string;
let pool: Pool;

async function write(name: string, sql: string) {
  await writeFile(path.join(dir, name), sql);
}

beforeEach(async () => {
  schema = `test_migrator_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    options: `-c search_path=${schema}`,
  });
  dir = await mkdtemp(path.join(tmpdir(), "migrations-"));
});

afterEach(async () => {
  await pool.end();
  await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);
  await rm(dir, { recursive: true, force: true });
});

afterAll(async () => {
  await closeDatabase();
});

describe("runMigrations", () => {
  it("aplica las migraciones en orden por nombre", async () => {
    await write("002_insert.sql", "INSERT INTO items (name) VALUES ('uno');");
    await write(
      "001_create.sql",
      "CREATE TABLE items (id SERIAL PRIMARY KEY, name TEXT NOT NULL);",
    );

    const applied = await runMigrations(pool, dir);

    expect(applied).toEqual(["001_create.sql", "002_insert.sql"]);
    const { rows } = await pool.query("SELECT name FROM items");
    expect(rows).toEqual([{ name: "uno" }]);
  });

  it("no repite las migraciones ya aplicadas", async () => {
    await write(
      "001_create.sql",
      "CREATE TABLE items (id SERIAL PRIMARY KEY);",
    );

    await runMigrations(pool, dir);
    const second = await runMigrations(pool, dir);

    expect(second).toEqual([]);
  });

  it("hace rollback completo si una migracion falla", async () => {
    await write(
      "001_boom.sql",
      "CREATE TABLE partial (id INT); SELECT * FROM tabla_que_no_existe;",
    );

    await expect(runMigrations(pool, dir)).rejects.toThrow(
      "Fallo la migracion 001_boom.sql",
    );

    const table = await pool.query("SELECT to_regclass($1) AS t", [
      `${schema}.partial`,
    ]);
    expect(table.rows[0]?.t).toBeNull();

    const registered = await pool.query("SELECT name FROM schema_migrations");
    expect(registered.rows).toEqual([]);
  });

  it("rechaza una migracion ya aplicada que fue modificada", async () => {
    await write(
      "001_create.sql",
      "CREATE TABLE items (id SERIAL PRIMARY KEY);",
    );
    await runMigrations(pool, dir);

    await write("001_create.sql", "CREATE TABLE items (id INT);");

    await expect(runMigrations(pool, dir)).rejects.toThrow("fue modificada");
  });
});
