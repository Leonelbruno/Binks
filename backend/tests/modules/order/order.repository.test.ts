import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  closeDatabase,
  pool as adminPool,
} from "../../../src/config/database.js";
import { env } from "../../../src/config/env.js";
import { runMigrations } from "../../../src/database/migrator.js";
import {
  createOrderRepository,
  type NewOrder,
} from "../../../src/modules/order/order.repository.js";

const schema = `test_order_repo_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
let db: Pool;
let repo: ReturnType<typeof createOrderRepository>;
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

function item(
  variantId: number,
  quantity = 1,
  unitPriceCents = 1000,
): NewOrder["items"][number] {
  return {
    variantId,
    productName: "Pollo",
    variantName: "Entero",
    quantity,
    unitPriceCents,
  };
}

function orderInput(items: NewOrder["items"]): NewOrder {
  return { source: "LOCAL", status: "IN_PROGRESS", items };
}

describe("order repository", () => {
  beforeAll(async () => {
    await adminPool.query(`CREATE SCHEMA ${schema}`);
    db = new Pool({
      connectionString: env.DATABASE_URL,
      options: `-c search_path=${schema}`,
      max: 5,
    });
    await runMigrations(db);
    repo = createOrderRepository(db);
  });

  afterAll(async () => {
    await db.end();
    await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);
    await closeDatabase();
  });

  it("crea el pedido con sus items y calcula el total desde los items guardados", async () => {
    const business = await newBusiness();
    const variantA = await newVariant(business);
    const variantB = await newVariant(business);

    const order = await repo.create(
      business,
      orderInput([item(variantA, 2, 1500), item(variantB, 1, 800)]),
    );

    expect(order).toMatchObject({
      businessId: business,
      orderNumber: 1,
      source: "LOCAL",
      status: "IN_PROGRESS",
      totalCents: 3800,
    });
    expect(order.items.map((line) => line.subtotalCents)).toEqual([3000, 800]);
    expect(order.items.map((line) => line.variantId)).toEqual([
      variantA,
      variantB,
    ]);
  });

  it("numera los pedidos de forma correlativa e independiente por negocio", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    const variantOfA = await newVariant(a);
    const variantOfB = await newVariant(b);

    const first = await repo.create(a, orderInput([item(variantOfA)]));
    const second = await repo.create(a, orderInput([item(variantOfA)]));
    const third = await repo.create(a, orderInput([item(variantOfA)]));
    const otherBusiness = await repo.create(b, orderInput([item(variantOfB)]));

    expect([first.orderNumber, second.orderNumber, third.orderNumber]).toEqual([
      1, 2, 3,
    ]);
    expect(otherBusiness.orderNumber).toBe(1);
  });

  it("no repite numeros cuando se crean pedidos en simultaneo", async () => {
    const business = await newBusiness();
    const variant = await newVariant(business);

    const orders = await Promise.all(
      Array.from({ length: 10 }, () =>
        repo.create(business, orderInput([item(variant)])),
      ),
    );

    const numbers = orders
      .map((order) => order.orderNumber)
      .sort((x, y) => x - y);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("revierte todo si un item es de otro negocio, sin dejar huecos en la numeracion", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    const variantOfA = await newVariant(a);
    const variantOfB = await newVariant(b);

    await expect(
      repo.create(a, orderInput([item(variantOfA), item(variantOfB)])),
    ).rejects.toMatchObject({ code: "23503" });

    const count = await db.query<{ total: number }>(
      "SELECT count(*)::int AS total FROM orders WHERE business_id = $1",
      [a],
    );
    const retry = await repo.create(a, orderInput([item(variantOfA)]));

    expect(count.rows[0]!.total).toBe(0);
    expect(retry.orderNumber).toBe(1);
  });

  it("revierte todo si la misma variante llega dos veces", async () => {
    const business = await newBusiness();
    const variant = await newVariant(business);

    await expect(
      repo.create(business, orderInput([item(variant), item(variant)])),
    ).rejects.toMatchObject({ code: "23505" });

    const count = await db.query<{ total: number }>(
      "SELECT count(*)::int AS total FROM orders WHERE business_id = $1",
      [business],
    );
    expect(count.rows[0]!.total).toBe(0);
  });

  it("findById no devuelve un pedido de otro negocio", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    const variantOfB = await newVariant(b);
    const orderOfB = await repo.create(b, orderInput([item(variantOfB)]));

    expect(await repo.findById(a, orderOfB.id)).toBeNull();
    expect(await repo.findById(b, orderOfB.id)).toMatchObject({
      id: orderOfB.id,
    });
  });

  it("conserva el precio y los nombres historicos aunque cambie el catalogo", async () => {
    const business = await newBusiness();
    const variant = await newVariant(business);
    const order = await repo.create(
      business,
      orderInput([item(variant, 1, 1500)]),
    );

    await db.query(
      "UPDATE product_variant SET name = 'Renombrada', price_cents = 9999 WHERE id = $1",
      [variant],
    );
    const found = await repo.findById(business, order.id);

    expect(found?.items[0]).toMatchObject({
      variantName: "Entero",
      unitPriceCents: 1500,
      subtotalCents: 1500,
    });
    expect(found?.totalCents).toBe(1500);
  });
});
