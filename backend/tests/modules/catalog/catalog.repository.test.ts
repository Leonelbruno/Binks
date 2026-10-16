import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    closeDatabase,
    pool as adminPool,
} from "../../../src/config/database.js";
import { env } from "../../../src/config/env.js";
import { runMigrations } from "../../../src/database/migrator.js";
import { createCatalogRepository } from "../../../src/modules/catalog/catalog.repository.js";

const schema = `test_catalog_repo_${process.pid}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

let db: Pool;
let repo: ReturnType<typeof createCatalogRepository>;

let businessCounter = 0;
let categoryCounter = 0;
let productCounter = 0;
let variantCounter = 0;

async function newBusiness(): Promise<number> {
    businessCounter += 1;

    const { rows } = await db.query<{ id: number }>(
        "INSERT INTO business (name, slug) VALUES ($1, $1) RETURNING id",
        [`negocio-${businessCounter}`],
    );

    return rows[0]!.id;
}

async function newCategory(
    businessId: number,
    sortOrder = 0,
): Promise<number> {
    categoryCounter += 1;

    const { rows } = await db.query<{ id: number }>(
        `INSERT INTO category (business_id, name, sort_order)
     VALUES ($1, $2, $3)
     RETURNING id`,
        [
            businessId,
            `categoria-${categoryCounter}`,
            sortOrder,
        ],
    );

    return rows[0]!.id;
}

async function newProduct(
    businessId: number,
    categoryId: number,
    sortOrder = 0,
): Promise<number> {
    productCounter += 1;

    const { rows } = await db.query<{ id: number }>(
        `INSERT INTO product (
      business_id,
      category_id,
      name,
      sort_order
    )
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
        [
            businessId,
            categoryId,
            `producto-${productCounter}`,
            sortOrder,
        ],
    );

    return rows[0]!.id;
}

async function newVariant(
    businessId: number,
    productId: number,
    priceCents: number,
    sortOrder = 0,
): Promise<number> {
    variantCounter += 1;

    const { rows } = await db.query<{ id: number }>(
        `INSERT INTO product_variant (
      business_id,
      product_id,
      name,
      price_cents,
      sort_order
    )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
        [
            businessId,
            productId,
            `variante-${variantCounter}`,
            priceCents,
            sortOrder,
        ],
    );

    return rows[0]!.id;
}

describe("catalog repository", () => {
    beforeAll(async () => {
        await adminPool.query(`CREATE SCHEMA ${schema}`);

        db = new Pool({
            connectionString: env.DATABASE_URL,
            options: `-c search_path=${schema}`,
            max: 1,
        });

        await runMigrations(db);
        repo = createCatalogRepository(db);
    });

    afterAll(async () => {
        await db.end();
        await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);
        await closeDatabase();
    });

    it("agrupa categorias, productos y variantes", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);

        const product = await newProduct(
            business,
            category,
        );

        await newVariant(
            business,
            product,
            900000,
            0,
        );

        await newVariant(
            business,
            product,
            1600000,
            1,
        );

        const catalog = await repo.getByBusiness(business);

        expect(catalog.categories).toHaveLength(1);
        expect(catalog.categories[0]!.products).toHaveLength(1);
        expect(
            catalog.categories[0]!.products[0]!.variants,
        ).toHaveLength(2);

        expect(
            catalog.categories[0]!.products[0]!.variants.map(
                (variant) => variant.priceCents,
            ),
        ).toEqual([900000, 1600000]);
    });

    it("respeta el orden de categorias, productos y variantes", async () => {
        const business = await newBusiness();

        const categorySecond = await newCategory(
            business,
            2,
        );

        const categoryFirst = await newCategory(
            business,
            1,
        );

        const productSecond = await newProduct(
            business,
            categoryFirst,
            2,
        );

        const productFirst = await newProduct(
            business,
            categoryFirst,
            1,
        );

        await newVariant(
            business,
            productFirst,
            2000,
            2,
        );

        await newVariant(
            business,
            productFirst,
            1000,
            1,
        );

        const catalog = await repo.getByBusiness(business);

        expect(
            catalog.categories.map((category) => category.id),
        ).toEqual([
            categoryFirst,
            categorySecond,
        ]);

        expect(
            catalog.categories[0]!.products.map(
                (product) => product.id,
            ),
        ).toEqual([
            productFirst,
            productSecond,
        ]);

        expect(
            catalog.categories[0]!.products[0]!.variants.map(
                (variant) => variant.priceCents,
            ),
        ).toEqual([1000, 2000]);
    });

    it("no devuelve datos de otro negocio", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryA = await newCategory(a);
        const categoryB = await newCategory(b);

        const productA = await newProduct(
            a,
            categoryA,
        );

        const productB = await newProduct(
            b,
            categoryB,
        );

        await newVariant(
            a,
            productA,
            1000,
        );

        await newVariant(
            b,
            productB,
            999999,
        );

        const catalog = await repo.getByBusiness(a);

        expect(catalog.categories).toHaveLength(1);

        expect(
            catalog.categories[0]!.products[0]!.variants[0]!
                .priceCents,
        ).toBe(1000);
    });

    it("excluye categorias inactivas", async () => {
        const business = await newBusiness();

        const activeCategory = await newCategory(business);
        const inactiveCategory = await newCategory(business);

        await db.query(
            "UPDATE category SET active = false WHERE id = $1",
            [inactiveCategory],
        );

        const catalog = await repo.getByBusiness(business);

        expect(
            catalog.categories.map((category) => category.id),
        ).toEqual([activeCategory]);
    });

    it("excluye productos inactivos", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);

        const activeProduct = await newProduct(
            business,
            category,
        );

        const inactiveProduct = await newProduct(
            business,
            category,
        );

        await db.query(
            "UPDATE product SET active = false WHERE id = $1",
            [inactiveProduct],
        );

        const catalog = await repo.getByBusiness(business);

        expect(
            catalog.categories[0]!.products.map(
                (product) => product.id,
            ),
        ).toEqual([activeProduct]);
    });

    it("excluye variantes inactivas", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(
            business,
            category,
        );

        const activeVariant = await newVariant(
            business,
            product,
            1000,
        );

        const inactiveVariant = await newVariant(
            business,
            product,
            2000,
        );

        await db.query(
            "UPDATE product_variant SET active = false WHERE id = $1",
            [inactiveVariant],
        );

        const catalog = await repo.getByBusiness(business);

        expect(
            catalog.categories[0]!.products[0]!.variants.map(
                (variant) => variant.id,
            ),
        ).toEqual([activeVariant]);
    });

    it("mantiene categorias sin productos y productos sin variantes", async () => {
        const business = await newBusiness();

        const emptyCategory = await newCategory(
            business,
            1,
        );

        const categoryWithProduct = await newCategory(
            business,
            2,
        );

        const productWithoutVariants = await newProduct(
            business,
            categoryWithProduct,
        );

        const catalog = await repo.getByBusiness(business);

        const firstCategory = catalog.categories.find(
            (category) => category.id === emptyCategory,
        );

        const secondCategory = catalog.categories.find(
            (category) => category.id === categoryWithProduct,
        );

        expect(firstCategory?.products).toEqual([]);

        expect(
            secondCategory?.products[0],
        ).toMatchObject({
            id: productWithoutVariants,
            variants: [],
        });
    });
});