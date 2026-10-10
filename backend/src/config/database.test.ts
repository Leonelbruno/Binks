import { afterAll, describe, expect, it } from "vitest";
import { checkDatabase, closeDatabase, pool } from "./database.js";

describe("database", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("se conecta a la base de tests y no a la de desarrollo", async () => {
    await expect(checkDatabase()).resolves.toBeUndefined();

    const { rows } = await pool.query<{ db: string }>(
      "SELECT current_database() AS db",
    );
    expect(rows[0]?.db).toBe("binks_test");
  });
});
