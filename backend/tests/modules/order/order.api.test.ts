
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
let categoryCounter = 0;

async function newBusiness(): Promise<number> {
    businessCounter += 1;

    const slug = `order-api-${runId}-${businessCounter}`;

    const { rows } = await pool.query<{ id: number }>(
        "INSERT INTO business (name, slug) VALUES ($1, $1) RETURNING id",
        [slug],
    );

    const id = rows[0]!.id;
    createdBusinessIds.push(id);

    return id;
}

async function newVariant(
    businessId: number,
    options: {
        productName?: string;
        variantName?: string;
        priceCents?: number;
        active?: boolean;
    } = {},
): Promise<number> {
    const {
        productName = "Pollo con papas",
        variantName = "Entero",
        priceCents = 1200000,
        active = true,
    } = options;

    categoryCounter += 1;

    const { rows: categories } = await pool.query<{
        id: number;
    }>(
        `INSERT INTO category (business_id, name)
         VALUES ($1, $2)
         RETURNING id`,
        [businessId, `Categoria ${categoryCounter}`],
    );

    const { rows: products } = await pool.query<{
        id: number;
    }>(
        `INSERT INTO product (business_id, category_id, name)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [businessId, categories[0]!.id, productName],
    );

    const { rows: variants } = await pool.query<{
        id: number;
    }>(
        `INSERT INTO product_variant (
            business_id,
            product_id,
            name,
            price_cents,
            active
         )
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
            businessId,
            products[0]!.id,
            variantName,
            priceCents,
            active,
        ],
    );

    return variants[0]!.id;
}

function url(businessId: number | string): string {
    return `/api/businesses/${businessId}/orders`;
}

describe("API de pedidos", () => {
    beforeAll(async () => {
        await runMigrations(pool);
    });

    afterAll(async () => {
        await pool.query(
            "DELETE FROM order_item WHERE business_id = ANY($1::int[])",
            [createdBusinessIds],
        );

        await pool.query(
            "DELETE FROM orders WHERE business_id = ANY($1::int[])",
            [createdBusinessIds],
        );

        await pool.query(
            "DELETE FROM order_counter WHERE business_id = ANY($1::int[])",
            [createdBusinessIds],
        );

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

    it("POST crea un pedido y calcula el total usando los precios del backend", async () => {
        const business = await newBusiness();
        const variant = await newVariant(business);

        const response = await request(app)
            .post(url(business))
            .send({
                items: [
                    {
                        variantId: variant,
                        quantity: 2,
                    },
                ],
            });

        expect(response.status).toBe(201);

        expect(response.body.data).toMatchObject({
            businessId: business,
            orderNumber: 1,
            source: "LOCAL",
            status: "IN_PROGRESS",
            totalCents: 2400000,
            items: [
                expect.objectContaining({
                    variantId: variant,
                    productName: "Pollo con papas",
                    variantName: "Entero",
                    quantity: 2,
                    unitPriceCents: 1200000,
                    subtotalCents: 2400000,
                }),
            ],
        });

        const { rows } = await pool.query(
            `SELECT
                o.total_cents,
                oi.quantity,
                oi.unit_price_cents
             FROM orders o
             INNER JOIN order_item oi
                ON oi.business_id = o.business_id
                AND oi.order_id = o.id
             WHERE o.business_id = $1
               AND o.id = $2`,
            [business, response.body.data.id],
        );

        expect(rows).toHaveLength(1);

        expect(rows[0]).toMatchObject({
            total_cents: 2400000,
            quantity: 2,
            unit_price_cents: 1200000,
        });
    });

    it("POST devuelve 400 si el pedido no contiene items", async () => {
        const business = await newBusiness();

        const response = await request(app)
            .post(url(business))
            .send({
                items: [],
            });

        expect(response.status).toBe(400);
    });

    it("POST devuelve 400 si una variante está repetida", async () => {
        const business = await newBusiness();
        const variant = await newVariant(business);

        const response = await request(app)
            .post(url(business))
            .send({
                items: [
                    { variantId: variant, quantity: 1 },
                    { variantId: variant, quantity: 2 },
                ],
            });

        expect(response.status).toBe(400);
    });

    it("POST devuelve 400 si el frontend intenta enviar un precio", async () => {
        const business = await newBusiness();
        const variant = await newVariant(business);

        const response = await request(app)
            .post(url(business))
            .send({
                items: [
                    {
                        variantId: variant,
                        quantity: 1,
                        unitPriceCents: 100,
                    },
                ],
            });

        expect(response.status).toBe(400);
    });

    it("POST devuelve 404 si el negocio no existe", async () => {
        const response = await request(app)
            .post(url(2147483647))
            .send({
                items: [
                    { variantId: 1, quantity: 1 },
                ],
            });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("POST devuelve 404 si la variante no existe", async () => {
        const business = await newBusiness();

        const response = await request(app)
            .post(url(business))
            .send({
                items: [
                    { variantId: 2147483647, quantity: 1 },
                ],
            });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("POST devuelve 404 si la variante pertenece a otro negocio", async () => {
        const businessA = await newBusiness();
        const businessB = await newBusiness();

        const variantOfB = await newVariant(businessB);

        const response = await request(app)
            .post(url(businessA))
            .send({
                items: [
                    { variantId: variantOfB, quantity: 1 },
                ],
            });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("POST devuelve 409 si la variante está inactiva", async () => {
    const business = await newBusiness();

    const variant = await newVariant(business, {
        active: false,
    });

    const response = await request(app)
        .post(url(business))
        .send({
            items: [
                { variantId: variant, quantity: 1 },
            ],
        });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
});
});
