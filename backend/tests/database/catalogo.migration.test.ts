import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, pool as adminPool } from "../../src/config/database.js";
import { env } from "../../src/config/env.js";
import { runMigrations } from "../../src/database/migrator.js";

const schema = `test_catalogo_${Date.now()}`;
let db: Pool;

async function insertBusiness(slug: string): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO business (name, slug) VALUES ($1, $1) RETURNING id",
    [slug],
  );
  return rows[0]!.id;
}

async function insertCategory(
  businessId: number,
  name: string,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO category (business_id, name) VALUES ($1, $2) RETURNING id",
    [businessId, name],
  );
  return rows[0]!.id;
}

async function insertProduct(
  businessId: number,
  categoryId: number,
  name: string,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO product (business_id, category_id, name) VALUES ($1, $2, $3) RETURNING id",
    [businessId, categoryId, name],
  );
  return rows[0]!.id;
}

describe("migracion 001_catalogo", () => {
  beforeAll(async () => {
    await adminPool.query(`CREATE SCHEMA ${schema}`);
    db = new Pool({
      connectionString: env.DATABASE_URL,
      options: `-c search_path=${schema}`,
      max: 1,
    });
    await runMigrations(db);
  });

  afterAll(async () => {
    await db.end();
    await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);
    await closeDatabase();
  });

  it("rechaza un producto de un negocio en la categoria de otro", async () => {
    const a = await insertBusiness("fk-prod-a");
    const b = await insertBusiness("fk-prod-b");
    const categoryOfB = await insertCategory(b, "Pollos");

    await expect(
      insertProduct(a, categoryOfB, "Pollo entero"),
    ).rejects.toMatchObject({
      code: "23503",
    });
  });

  it("rechaza una variante de un negocio sobre el producto de otro", async () => {
    const a = await insertBusiness("fk-var-a");
    const b = await insertBusiness("fk-var-b");
    const categoryOfB = await insertCategory(b, "Pollos");
    const productOfB = await insertProduct(b, categoryOfB, "Pollo entero");

    await expect(
      db.query(
        "INSERT INTO product_variant (business_id, product_id, name, price_cents) VALUES ($1, $2, 'Entero', 100000)",
        [a, productOfB],
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("rechaza precios negativos", async () => {
    const a = await insertBusiness("price-a");
    const category = await insertCategory(a, "Pollos");
    const product = await insertProduct(a, category, "Pollo entero");

    await expect(
      db.query(
        "INSERT INTO product_variant (business_id, product_id, name, price_cents) VALUES ($1, $2, 'Entero', -1)",
        [a, product],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("no permite categorias con el mismo nombre en un negocio, pero si en negocios distintos", async () => {
    const a = await insertBusiness("uniq-a");
    const b = await insertBusiness("uniq-b");
    await insertCategory(a, "Empanadas");

    await expect(insertCategory(a, "Empanadas")).rejects.toMatchObject({
      code: "23505",
    });
    await expect(insertCategory(b, "Empanadas")).resolves.toBeTypeOf("number");
  });

  it("actualiza updated_at automaticamente", async () => {
    const id = await insertBusiness("trigger-a");
    await db.query("UPDATE business SET name = 'Nuevo nombre' WHERE id = $1", [
      id,
    ]);

    const { rows } = await db.query<{ changed: boolean }>(
      "SELECT updated_at > created_at AS changed FROM business WHERE id = $1",
      [id],
    );
    expect(rows[0]!.changed).toBe(true);
  });
});
