import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/app.js";
import { closeDatabase, pool } from "../../../src/config/database.js";
import { runMigrations } from "../../../src/database/migrator.js";

const runId = `${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
const createdBusinessIds: number[] = [];

let businessCounter = 0;
let categoryCounter = 0;
let productCounter = 0;

async function newBusiness(): Promise<number> {
    businessCounter += 1;

    const slug = `variant-api-${runId}-${businessCounter}`;

    const { rows } = await pool.query<{ id: number }>(
        "INSERT INTO business (name, slug) VALUES ($1, $1) RETURNING id",
        [slug],
    );

    const id = rows[0]!.id;
    createdBusinessIds.push(id);

    return id;
}

async function newCategory(businessId: number): Promise<number> {
    categoryCounter += 1;

    const { rows } = await pool.query<{ id: number }>(
        `INSERT INTO category (business_id, name)
     VALUES ($1, $2)
     RETURNING id`,
        [businessId, `categoria-${runId}-${categoryCounter}`],
    );

    return rows[0]!.id;
}

async function newProduct(
    businessId: number,
    categoryId: number,
): Promise<number> {
    productCounter += 1;

    const { rows } = await pool.query<{ id: number }>(
        `INSERT INTO product (business_id, category_id, name)
     VALUES ($1, $2, $3)
     RETURNING id`,
        [
            businessId,
            categoryId,
            `producto-${runId}-${productCounter}`,
        ],
    );

    return rows[0]!.id;
}

function url(
    businessId: number | string,
    productId: number | string,
    variantId?: number,
): string {
    const base =
        `/api/businesses/${businessId}/products/${productId}/variants`;

    return variantId === undefined
        ? base
        : `${base}/${variantId}`;
}

async function createVariant(
    businessId: number,
    productId: number,
    name: string,
    priceCents: number,
): Promise<number> {
    const response = await request(app)
        .post(url(businessId, productId))
        .send({
            name,
            priceCents,
        });

    return response.body.data.id as number;
}

describe("API de variantes de producto", () => {
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

    it("GET lista vacia para un producto sin variantes", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        const response = await request(app).get(
            url(business, product),
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: [] });
    });

    it("POST crea una variante", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        const response = await request(app)
            .post(url(business, product))
            .send({
                name: "  Entero  ",
                priceCents: 1980000,
            });

        expect(response.status).toBe(201);

        expect(response.body.data).toMatchObject({
            businessId: business,
            productId: product,
            name: "Entero",
            priceCents: 1980000,
            active: true,
            sortOrder: 0,
        });
    });

    it("POST rechaza un producto de otro negocio con 404", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryB = await newCategory(b);
        const productB = await newProduct(b, categoryB);

        const response = await request(app)
            .post(url(a, productB))
            .send({
                name: "Entero",
                priceCents: 1980000,
            });

        expect(response.status).toBe(404);
    });

    it("POST rechaza nombre duplicado en el mismo producto con 409", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        await createVariant(
            business,
            product,
            "Entero",
            1980000,
        );

        const response = await request(app)
            .post(url(business, product))
            .send({
                name: "Entero",
                priceCents: 2050000,
            });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("CONFLICT");
    });

    it("POST rechaza precio negativo con 400", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        const response = await request(app)
            .post(url(business, product))
            .send({
                name: "Entero",
                priceCents: -1,
            });

        expect(response.status).toBe(400);
    });

    it("POST rechaza campos desconocidos con 400", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        const response = await request(app)
            .post(url(business, product))
            .send({
                name: "Entero",
                priceCents: 1980000,
                businessId: 999,
            });

        expect(response.status).toBe(400);
    });

    it("GET por id devuelve 404 si la variante es de otro negocio", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryA = await newCategory(a);
        const categoryB = await newCategory(b);

        const productA = await newProduct(a, categoryA);
        const productB = await newProduct(b, categoryB);

        const variantB = await createVariant(
            b,
            productB,
            "Entero",
            1980000,
        );

        const response = await request(app).get(
            url(a, productA, variantB),
        );

        expect(response.status).toBe(404);
    });

    it("PATCH modifica una variante", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        const variant = await createVariant(
            business,
            product,
            "Entero",
            1980000,
        );

        const response = await request(app)
            .patch(url(business, product, variant))
            .send({
                priceCents: 2050000,
                active: false,
            });

        expect(response.status).toBe(200);

        expect(response.body.data).toMatchObject({
            name: "Entero",
            priceCents: 2050000,
            active: false,
        });
    });

    it("PATCH rechaza un body vacio con 400", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        const variant = await createVariant(
            business,
            product,
            "Entero",
            1980000,
        );

        const response = await request(app)
            .patch(url(business, product, variant))
            .send({});

        expect(response.status).toBe(400);
    });

    it("PATCH rechaza renombrar a una variante ya existente con 409", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        await createVariant(
            business,
            product,
            "Entero",
            1980000,
        );

        const half = await createVariant(
            business,
            product,
            "Medio",
            1080000,
        );

        const response = await request(app)
            .patch(url(business, product, half))
            .send({
                name: "Entero",
            });

        expect(response.status).toBe(409);
    });

    it("GET filtra por active", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        await createVariant(
            business,
            product,
            "Activa",
            1000,
        );

        const inactive = await createVariant(
            business,
            product,
            "Inactiva",
            2000,
        );

        await request(app)
            .patch(url(business, product, inactive))
            .send({
                active: false,
            });

        const response = await request(app).get(
            `${url(business, product)}?active=false`,
        );

        expect(response.status).toBe(200);

        expect(
            response.body.data.map(
                (variant: { name: string }) => variant.name,
            ),
        ).toEqual(["Inactiva"]);
    });

    it("GET rechaza un valor invalido de active con 400", async () => {
        const business = await newBusiness();
        const category = await newCategory(business);
        const product = await newProduct(business, category);

        const response = await request(app).get(
            `${url(business, product)}?active=quizas`,
        );

        expect(response.status).toBe(400);
    });
});