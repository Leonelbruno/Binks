import type { PoolClient } from "pg";
import { closeDatabase, pool } from "../config/database.js";
import { env } from "../config/env.js";

type VariantSeed = { name: string; priceCents: number; active?: boolean };
type ProductSeed = {
  name: string;
  description?: string;
  active?: boolean;
  variants: VariantSeed[];
};
type CategorySeed = {
  name: string;
  description?: string;
  products: ProductSeed[];
};
type BusinessSeed = { name: string; slug: string; categories: CategorySeed[] };

const businesses: BusinessSeed[] = [
  {
    name: "Rotisería Demo",
    slug: "rotiseria-demo",
    categories: [
      {
        name: "Pollos",
        description: "Pollo a la parrilla",
        products: [
          {
            name: "Pollo a la parrilla",
            variants: [
              { name: "Entero", priceCents: 1200000 },
              { name: "Medio", priceCents: 650000 },
              { name: "Cuarto", priceCents: 350000 },
            ],
          },
          {
            name: "Pollo al disco",
            description: "Producto inactivo para probar filtros",
            active: false,
            variants: [{ name: "Porción", priceCents: 900000 }],
          },
        ],
      },
      {
        name: "Empanadas",
        products: [
          { name: "Carne", variants: [{ name: "Unidad", priceCents: 200000 }] },
          {
            name: "Jamón y queso",
            variants: [{ name: "Unidad", priceCents: 200000 }],
          },
        ],
      },
      {
        name: "Guarniciones",
        products: [
          {
            name: "Papas fritas",
            variants: [{ name: "Porción", priceCents: 400000 }],
          },
          {
            name: "Ensalada mixta",
            variants: [
              { name: "Porción", priceCents: 300000 },
              { name: "Familiar", priceCents: 550000, active: false },
            ],
          },
        ],
      },
      {
        name: "Bebidas",
        products: [
          {
            name: "Gaseosa",
            variants: [
              { name: "Lata", priceCents: 150000 },
              { name: "1,5 L", priceCents: 300000 },
            ],
          },
          { name: "Agua", variants: [{ name: "500 ml", priceCents: 120000 }] },
        ],
      },
    ],
  },
  {
    name: "Negocio Demo 2",
    slug: "negocio-demo-2",
    categories: [
      {
        name: "Pollos",
        products: [
          {
            name: "Pollo a la parrilla",
            variants: [{ name: "Entero", priceCents: 1500000 }],
          },
        ],
      },
    ],
  },
];

async function upsertBusiness(
  db: PoolClient,
  name: string,
  slug: string,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO business (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, slug],
  );
  return rows[0]!.id;
}

async function upsertCategory(
  db: PoolClient,
  businessId: number,
  name: string,
  description: string | null,
  sortOrder: number,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO category (business_id, name, description, sort_order)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (business_id, name)
     DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order
     RETURNING id`,
    [businessId, name, description, sortOrder],
  );
  return rows[0]!.id;
}

async function upsertProduct(
  db: PoolClient,
  businessId: number,
  categoryId: number,
  product: ProductSeed,
  sortOrder: number,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO product (business_id, category_id, name, description, active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (business_id, category_id, name)
     DO UPDATE SET description = EXCLUDED.description,
                   active = EXCLUDED.active,
                   sort_order = EXCLUDED.sort_order
     RETURNING id`,
    [
      businessId,
      categoryId,
      product.name,
      product.description ?? null,
      product.active ?? true,
      sortOrder,
    ],
  );
  return rows[0]!.id;
}

async function upsertVariant(
  db: PoolClient,
  businessId: number,
  productId: number,
  variant: VariantSeed,
  sortOrder: number,
): Promise<void> {
  await db.query(
    `INSERT INTO product_variant (business_id, product_id, name, price_cents, active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (product_id, name)
     DO UPDATE SET price_cents = EXCLUDED.price_cents,
                   active = EXCLUDED.active,
                   sort_order = EXCLUDED.sort_order`,
    [
      businessId,
      productId,
      variant.name,
      variant.priceCents,
      variant.active ?? true,
      sortOrder,
    ],
  );
}

async function seed(): Promise<void> {
  if (env.NODE_ENV === "production") {
    throw new Error("El seed de desarrollo no puede correr en produccion");
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    for (const business of businesses) {
      const businessId = await upsertBusiness(db, business.name, business.slug);
      for (const [categoryIndex, category] of business.categories.entries()) {
        const categoryId = await upsertCategory(
          db,
          businessId,
          category.name,
          category.description ?? null,
          categoryIndex,
        );
        for (const [productIndex, product] of category.products.entries()) {
          const productId = await upsertProduct(
            db,
            businessId,
            categoryId,
            product,
            productIndex,
          );
          for (const [variantIndex, variant] of product.variants.entries()) {
            await upsertVariant(
              db,
              businessId,
              productId,
              variant,
              variantIndex,
            );
          }
        }
      }
    }
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }

  console.log(`Seed aplicado: ${businesses.length} negocios`);
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
