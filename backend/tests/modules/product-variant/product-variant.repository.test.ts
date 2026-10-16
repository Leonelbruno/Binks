import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    closeDatabase,
    pool as adminPool,
} from "../../../src/config/database.js";
import { env } from "../../../src/config/env.js";
import { runMigrations } from "../../../src/database/migrator.js";
import { createProductVariantRepository } from "../../../src/modules/product-variant/product-variant.repository.js";

const schema = `test_product_variant_repo_${process.pid}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

let db: Pool;
let repo: ReturnType<typeof createProductVariantRepository>;

let businessCounter = 0;
let categoryCounter = 0;
let productCounter = 0;

async function newBusiness(): Promise<number> {
    businessCounter += 1;

    const { rows } = await db.query<{ id: number }>(
        "INSERT INTO business (name, slug) VALUES ($1, $1) RETURNING id",
        [`negocio-${businessCounter}`],
    );

    return rows[0]!.id;
}

async function newCategory(businessId: number): Promise<number> {
    categoryCounter += 1;

    const { rows } = await db.query<{ id: number }>(
        `INSERT INTO category (business_id, name)
     VALUES ($1, $2)
     RETURNING id`,
        [businessId, `categoria-${categoryCounter}`],
    );

    return rows[0]!.id;
}

async function newProduct(
    businessId: number,
    categoryId: number,
): Promise<number> {
    productCounter += 1;

    const { rows } = await db.query<{ id: number }>(
        `INSERT INTO product (business_id, category_id, name)
     VALUES ($1, $2, $3)
     RETURNING id`,
        [businessId, categoryId, `producto-${productCounter}`],
    );

    return rows[0]!.id;
}

describe("product variant repository", () => {
    beforeAll(async () => {
        await adminPool.query(`CREATE SCHEMA ${schema}`);

        db = new Pool({
            connectionString: env.DATABASE_URL,
            options: `-c search_path=${schema}`,
            max: 1,
        });

        await runMigrations(db);
        repo = createProductVariantRepository(db);
    });

    afterAll(async () => {
        await db.end();
        await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);
        await closeDatabase();
    });

    it("list devuelve solo las variantes del producto indicado, ordenadas", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);

        const productA = await newProduct(business, category);
        const productB = await newProduct(business, category);

        await repo.create(business, productA, {
            name: "Entero",
            priceCents: 1980000,
            sortOrder: 2,
        });

        await repo.create(business, productA, {
            name: "Medio",
            priceCents: 1080000,
            sortOrder: 1,
        });

        await repo.create(business, productB, {
            name: "Secreta",
            priceCents: 500000,
        });

        const variants = await repo.list(business, productA);

        expect(variants.map((variant) => variant.name)).toEqual([
            "Medio",
            "Entero",
        ]);
    });

    it("list filtra por active", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        await repo.create(business, product, {
            name: "Activa",
            priceCents: 1000,
        });

        const inactive = await repo.create(business, product, {
            name: "Inactiva",
            priceCents: 2000,
        });

        await repo.update(business, product, inactive.id, {
            active: false,
        });

        const onlyInactive = await repo.list(business, product, {
            active: false,
        });

        const onlyActive = await repo.list(business, product, {
            active: true,
        });

        expect(onlyInactive.map((variant) => variant.name)).toEqual([
            "Inactiva",
        ]);

        expect(onlyActive.map((variant) => variant.name)).toEqual([
            "Activa",
        ]);
    });

    it("findById no devuelve una variante de otro negocio", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryA = await newCategory(a);
        const categoryB = await newCategory(b);

        const productA = await newProduct(a, categoryA);
        const productB = await newProduct(b, categoryB);

        const variantOfB = await repo.create(b, productB, {
            name: "Entero",
            priceCents: 1980000,
        });

        expect(
            await repo.findById(a, productA, variantOfB.id),
        ).toBeNull();

        expect(
            await repo.findById(b, productB, variantOfB.id),
        ).not.toBeNull();
    });

    it("update no modifica una variante de otro negocio", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryA = await newCategory(a);
        const categoryB = await newCategory(b);

        const productA = await newProduct(a, categoryA);
        const productB = await newProduct(b, categoryB);

        const variantOfB = await repo.create(b, productB, {
            name: "Entero",
            priceCents: 1980000,
        });

        const result = await repo.update(
            a,
            productA,
            variantOfB.id,
            {
                name: "Modificada",
            },
        );

        expect(result).toBeNull();

        expect(
            (await repo.findById(b, productB, variantOfB.id))?.name,
        ).toBe("Entero");
    });

    it("create sin sortOrder agrega la variante al final dentro de su producto", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);

        const productA = await newProduct(business, category);
        const productB = await newProduct(business, category);

        await repo.create(business, productA, {
            name: "Uno",
            priceCents: 1000,
        });

        await repo.create(business, productA, {
            name: "Dos",
            priceCents: 2000,
        });

        await repo.create(business, productB, {
            name: "Otra",
            priceCents: 3000,
            sortOrder: 50,
        });

        const third = await repo.create(business, productA, {
            name: "Tres",
            priceCents: 4000,
        });

        expect(third.sortOrder).toBe(2);
    });

    it("update permite cambiar precio y desactivar", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        const variant = await repo.create(business, product, {
            name: "Entero",
            priceCents: 1980000,
        });

        const updated = await repo.update(
            business,
            product,
            variant.id,
            {
                priceCents: 2050000,
                active: false,
            },
        );

        expect(updated).toMatchObject({
            name: "Entero",
            priceCents: 2050000,
            active: false,
        });
    });
});