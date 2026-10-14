import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  closeDatabase,
  pool as adminPool,
} from "../../../src/config/database.js";
import { env } from "../../../src/config/env.js";
import { runMigrations } from "../../../src/database/migrator.js";
import { createCategoryRepository } from "../../../src/modules/category/category.repository.js";

const schema = `test_category_repo_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
let db: Pool;
let repo: ReturnType<typeof createCategoryRepository>;
let businessCounter = 0;

async function newBusiness(): Promise<number> {
  businessCounter += 1;
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO business (name, slug) VALUES ($1, $1) RETURNING id",
    [`negocio-${businessCounter}`],
  );
  return rows[0]!.id;
}

describe("category repository", () => {
  beforeAll(async () => {
    await adminPool.query(`CREATE SCHEMA ${schema}`);
    db = new Pool({
      connectionString: env.DATABASE_URL,
      options: `-c search_path=${schema}`,
      max: 1,
    });
    await runMigrations(db);
    repo = createCategoryRepository(db);
  });

  afterAll(async () => {
    await db.end();
    await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);
    await closeDatabase();
  });

  it("list devuelve solo las categorias del negocio indicado, ordenadas", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    await repo.create(a, { name: "Bebidas", sortOrder: 2 });
    await repo.create(a, { name: "Pollos", sortOrder: 1 });
    await repo.create(b, { name: "Secreta" });

    const categories = await repo.list(a);

    expect(categories.map((category) => category.name)).toEqual([
      "Pollos",
      "Bebidas",
    ]);
  });

  it("list filtra por active", async () => {
    const a = await newBusiness();
    await repo.create(a, { name: "Activa" });
    const inactive = await repo.create(a, { name: "Inactiva" });
    await repo.update(a, inactive.id, { active: false });

    const onlyInactive = await repo.list(a, { active: false });
    const onlyActive = await repo.list(a, { active: true });

    expect(onlyInactive.map((category) => category.name)).toEqual(["Inactiva"]);
    expect(onlyActive.map((category) => category.name)).toEqual(["Activa"]);
  });

  it("findById no devuelve una categoria de otro negocio", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    const categoryOfB = await repo.create(b, { name: "Pollos" });

    expect(await repo.findById(a, categoryOfB.id)).toBeNull();
    expect(await repo.findById(b, categoryOfB.id)).not.toBeNull();
  });

  it("update no modifica una categoria de otro negocio", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    const categoryOfB = await repo.create(b, { name: "Pollos" });

    const result = await repo.update(a, categoryOfB.id, { name: "Modificada" });

    expect(result).toBeNull();
    expect((await repo.findById(b, categoryOfB.id))?.name).toBe("Pollos");
  });

  it("create sin sortOrder agrega la categoria al final dentro de su negocio", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    await repo.create(a, { name: "Uno" });
    await repo.create(a, { name: "Dos" });
    await repo.create(b, { name: "De otro negocio", sortOrder: 50 });

    const third = await repo.create(a, { name: "Tres" });

    expect(third.sortOrder).toBe(2);
  });

  it("update permite limpiar la descripcion y desactivar", async () => {
    const a = await newBusiness();
    const category = await repo.create(a, {
      name: "Pollos",
      description: "Parrilla",
    });

    const updated = await repo.update(a, category.id, {
      description: null,
      active: false,
    });

    expect(updated).toMatchObject({
      description: null,
      active: false,
      name: "Pollos",
    });
  });
});
