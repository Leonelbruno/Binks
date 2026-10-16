import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/app.js";
import {
    closeDatabase,
    pool,
} from "../../../src/config/database.js";
import { runMigrations } from "../../../src/database/migrator.js";

const runId = `${process.pid}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const createdBusinessIds: number[] = [];
let businessCounter = 0;

async function newBusiness(): Promise<number> {
    businessCounter += 1;

    const slug = `catalog-api-${runId}-${businessCounter}`;

    const { rows } = await pool.query<{ id: number }>(
        "INSERT INTO business (name, slug) VALUES ($1, $1) RETURNING id",
        [slug],
    );

    const id = rows[0]!.id;
    createdBusinessIds.push(id);

    return id;
}

function url(
    businessId: number | string,
): string {
    return `/api/businesses/${businessId}/catalog`;
}

describe("API de catalogo", () => {
    beforeAll(async () => {
        await runMigrations(pool);
    });

    afterAll(async () => {
        await pool.query(
            "DELETE FROM product_variant WHERE business_id = ANY($1::int[])",
            [createdBusinessIds],
        );

        await pool.query(
            "DELETE FROM product WHERE business_id = ANY($1::int[])",
            [createdBusinessIds],
        );

        await pool.query(
            "DELETE FROM category WHERE business_id = ANY($1::int[])",
            [createdBusinessIds],
        );

        await pool.query(
            "DELETE FROM business WHERE id = ANY($1::int[])",
            [createdBusinessIds],
        );

        await closeDatabase();
    });

    it("GET devuelve un catalogo vacio para un negocio sin categorias", async () => {
        const business = await newBusiness();

        const response = await request(app).get(
            url(business),
        );

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            data: {
                categories: [],
            },
        });
    });

    it("GET devuelve categorias con productos y variantes activas", async () => {
        const business = await newBusiness();

        const { rows: categories } = await pool.query<{
            id: number;
        }>(
            `INSERT INTO category (
        business_id,
        name,
        sort_order
      )
       VALUES ($1, 'Pollos', 0)
       RETURNING id`,
            [business],
        );

        const categoryId = categories[0]!.id;

        const { rows: products } = await pool.query<{
            id: number;
        }>(
            `INSERT INTO product (
        business_id,
        category_id,
        name,
        sort_order
      )
       VALUES (
         $1,
         $2,
         'Pollo con papas',
         0
       )
       RETURNING id`,
            [business, categoryId],
        );

        const productId = products[0]!.id;

        await pool.query(
            `INSERT INTO product_variant (
        business_id,
        product_id,
        name,
        price_cents,
        sort_order
      )
       VALUES
         ($1, $2, '1/4', 900000, 0),
         ($1, $2, '1/2', 1600000, 1)`,
            [business, productId],
        );

        const response = await request(app).get(
            url(business),
        );

        expect(response.status).toBe(200);

        expect(response.body.data.categories).toHaveLength(1);

        expect(
            response.body.data.categories[0],
        ).toMatchObject({
            id: categoryId,
            name: "Pollos",
            sortOrder: 0,
        });

        expect(
            response.body.data.categories[0].products[0],
        ).toMatchObject({
            id: productId,
            name: "Pollo con papas",
            sortOrder: 0,
        });

        expect(
            response.body.data.categories[0].products[0].variants,
        ).toEqual([
            expect.objectContaining({
                name: "1/4",
                priceCents: 900000,
            }),
            expect.objectContaining({
                name: "1/2",
                priceCents: 1600000,
            }),
        ]);
    });

    it("GET devuelve 404 si el negocio no existe", async () => {
        const response = await request(app).get(
            url(2147483647),
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("GET devuelve 400 si businessId no es valido", async () => {
        const response = await request(app).get(
            url("abc"),
        );

        expect(response.status).toBe(400);
    });
});