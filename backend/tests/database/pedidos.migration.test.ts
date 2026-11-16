import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, pool as adminPool } from "../../src/config/database.js";
import { env } from "../../src/config/env.js";
import { runMigrations } from "../../src/database/migrator.js";

const schema = `test_pedidos_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
let db: Pool;
let counter = 0;

function next(): number {
  counter += 1;
  return counter;
}

async function newBusiness(): Promise<number> {
  const slug = `negocio-${next()}`;
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO business (name, slug) VALUES ($1, $1) RETURNING id",
    [slug],
  );
  return rows[0]!.id;
}

async function newVariant(businessId: number): Promise<number> {
  const suffix = next();
  const category = await db.query<{ id: number }>(
    "INSERT INTO category (business_id, name) VALUES ($1, $2) RETURNING id",
    [businessId, `Categoria ${suffix}`],
  );
  const product = await db.query<{ id: number }>(
    "INSERT INTO product (business_id, category_id, name) VALUES ($1, $2, $3) RETURNING id",
    [businessId, category.rows[0]!.id, `Producto ${suffix}`],
  );
  const variant = await db.query<{ id: number }>(
    "INSERT INTO product_variant (business_id, product_id, name, price_cents) VALUES ($1, $2, 'Entero', 1000) RETURNING id",
    [businessId, product.rows[0]!.id],
  );
  return variant.rows[0]!.id;
}

async function newOrder(
  businessId: number,
  orderNumber: number,
  overrides: { source?: string; status?: string; totalCents?: number } = {},
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO orders (business_id, order_number, source, status, total_cents)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      businessId,
      orderNumber,
      overrides.source ?? "LOCAL",
      overrides.status ?? "IN_PROGRESS",
      overrides.totalCents ?? 0,
    ],
  );
  return rows[0]!.id;
}

async function newItem(
  businessId: number,
  orderId: number,
  variantId: number,
  quantity = 1,
  unitPriceCents = 1000,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO order_item
       (business_id, order_id, variant_id, product_name, variant_name, quantity, unit_price_cents)
     VALUES ($1, $2, $3, 'Pollo', 'Entero', $4, $5) RETURNING id`,
    [businessId, orderId, variantId, quantity, unitPriceCents],
  );
  return rows[0]!.id;
}

describe("migracion 002_pedidos", () => {
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

  it("rechaza un estado invalido", async () => {
    const business = await newBusiness();

    await expect(
      newOrder(business, 1, { status: "PENDING" }),
    ).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("rechaza un origen invalido", async () => {
    const business = await newBusiness();

    await expect(
      newOrder(business, 1, { source: "TELEFONO" }),
    ).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("rechaza un total negativo", async () => {
    const business = await newBusiness();

    await expect(
      newOrder(business, 1, { totalCents: -1 }),
    ).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("no permite repetir el numero de pedido en un negocio, pero si en otro", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    await newOrder(a, 1);

    await expect(newOrder(a, 1)).rejects.toMatchObject({ code: "23505" });
    await expect(newOrder(b, 1)).resolves.toBeTypeOf("number");
  });

  it("rechaza un item con una variante de otro negocio", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    const orderOfA = await newOrder(a, 1);
    const variantOfB = await newVariant(b);

    await expect(newItem(a, orderOfA, variantOfB)).rejects.toMatchObject({
      code: "23503",
    });
  });

  it("rechaza un item con un pedido de otro negocio", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    const orderOfB = await newOrder(b, 1);
    const variantOfA = await newVariant(a);

    await expect(newItem(a, orderOfB, variantOfA)).rejects.toMatchObject({
      code: "23503",
    });
  });

  it("rechaza la misma variante dos veces en un pedido", async () => {
    const a = await newBusiness();
    const order = await newOrder(a, 1);
    const variant = await newVariant(a);
    await newItem(a, order, variant);

    await expect(newItem(a, order, variant)).rejects.toMatchObject({
      code: "23505",
    });
  });

  it("rechaza una cantidad menor a uno", async () => {
    const a = await newBusiness();
    const order = await newOrder(a, 1);
    const variant = await newVariant(a);

    await expect(newItem(a, order, variant, 0)).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("calcula subtotal_cents a partir del precio y la cantidad", async () => {
    const a = await newBusiness();
    const order = await newOrder(a, 1);
    const variant = await newVariant(a);
    const item = await newItem(a, order, variant, 3, 1250);

    const { rows } = await db.query<{ subtotal_cents: number }>(
      "SELECT subtotal_cents FROM order_item WHERE id = $1",
      [item],
    );

    expect(rows[0]!.subtotal_cents).toBe(3750);
  });
});
