import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    closeDatabase,
    pool as adminPool,
} from "../../../src/config/database.js";
import { env } from "../../../src/config/env.js";
import { runMigrations } from "../../../src/database/migrator.js";
import { createProductRepository } from "../../../src/modules/product/product.repository.js";

const schema = `test_product_repo_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;

let db: Pool;
let repo: ReturnType<typeof createProductRepository>;
let businessCounter = 0;
let categoryCounter = 0;

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

describe("product repository", () => {
    beforeAll(async () => {
        await adminPool.query(`CREATE SCHEMA ${schema}`);

        db = new Pool({
            connectionString: env.DATABASE_URL,
            options: `-c search_path=${schema}`,
            max: 1,
        });

        await runMigrations(db);
        repo = createProductRepository(db);
    });

    afterAll(async () => {
        await db.end();
        await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);
        await closeDatabase();
    });

    it("list devuelve solo los productos del negocio indicado, ordenados", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryA = await newCategory(a);
        const categoryB = await newCategory(b);

        await repo.create(a, {
            categoryId: categoryA,
            name: "Coca Cola",
            sortOrder: 2,
        });

        await repo.create(a, {
            categoryId: categoryA,
            name: "Sprite",
            sortOrder: 1,
        });

        await repo.create(b, {
            categoryId: categoryB,
            name: "Producto secreto",
        });

        const products = await repo.list(a);

        expect(products.map((product) => product.name)).toEqual([
            "Sprite",
            "Coca Cola",
        ]);
    });

    it("list filtra por active", async () => {
        const a = await newBusiness();
        const category = await newCategory(a);

        await repo.create(a, {
            categoryId: category,
            name: "Activo",
        });

        const inactive = await repo.create(a, {
            categoryId: category,
            name: "Inactivo",
        });

        await repo.update(a, inactive.id, {
            active: false,
        });

        const onlyInactive = await repo.list(a, { active: false });
        const onlyActive = await repo.list(a, { active: true });

        expect(onlyInactive.map((product) => product.name)).toContain("Inactivo");
        expect(onlyActive.map((product) => product.name)).toContain("Activo");
    });

    it("findById no devuelve un producto de otro negocio", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryB = await newCategory(b);

        const productOfB = await repo.create(b, {
            categoryId: categoryB,
            name: "Pollo",
        });

        expect(await repo.findById(a, productOfB.id)).toBeNull();
        expect(await repo.findById(b, productOfB.id)).not.toBeNull();
    });

    it("update no modifica un producto de otro negocio", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryB = await newCategory(b);

        const productOfB = await repo.create(b, {
            categoryId: categoryB,
            name: "Pollo",
        });

        const result = await repo.update(a, productOfB.id, {
            name: "Modificado",
        });

        expect(result).toBeNull();

        expect((await repo.findById(b, productOfB.id))?.name).toBe("Pollo");
    });

    it("create sin sortOrder agrega el producto al final dentro de su categoria", async () => {
        const a = await newBusiness();

        const categoryA = await newCategory(a);
        const otherCategory = await newCategory(a);

        await repo.create(a, {
            categoryId: categoryA,
            name: "Uno",
        });

        await repo.create(a, {
            categoryId: categoryA,
            name: "Dos",
        });

        await repo.create(a, {
            categoryId: otherCategory,
            name: "Otro producto",
            sortOrder: 50,
        });

        const third = await repo.create(a, {
            categoryId: categoryA,
            name: "Tres",
        });

        expect(third.sortOrder).toBe(2);
    });

    it("update permite limpiar la descripcion y desactivar", async () => {
        const a = await newBusiness();
        const category = await newCategory(a);

        const product = await repo.create(a, {
            categoryId: category,
            name: "Pollo con papas",
            description: "Descripción inicial",
        });

        const updated = await repo.update(a, product.id, {
            description: null,
            active: false,
        });

        expect(updated).toMatchObject({
            description: null,
            active: false,
            name: "Pollo con papas",
        });
    });
}); 