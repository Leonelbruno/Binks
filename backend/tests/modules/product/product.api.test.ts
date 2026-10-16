import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/app.js";
import { closeDatabase, pool } from "../../../src/config/database.js";
import { runMigrations } from "../../../src/database/migrator.js";

const runId = `${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
const createdBusinessIds: number[] = [];
let businessCounter = 0;

async function newBusiness(): Promise<number> {
    businessCounter += 1;

    const slug = `product-api-${runId}-${businessCounter}`;

    const { rows } = await pool.query<{ id: number }>(
        "INSERT INTO business (name, slug) VALUES ($1, $1) RETURNING id",
        [slug],
    );

    const id = rows[0]!.id;
    createdBusinessIds.push(id);

    return id;
}

function categoryUrl(businessId: number): string {
    return `/api/businesses/${businessId}/categories`;
}

function productUrl(
    businessId: number | string,
    productId?: number,
): string {
    const base = `/api/businesses/${businessId}/products`;

    return productId === undefined ? base : `${base}/${productId}`;
}

async function createCategory(
    businessId: number,
    name: string,
): Promise<number> {
    const response = await request(app)
        .post(categoryUrl(businessId))
        .send({ name });

    return response.body.data.id as number;
}

async function createProduct(
    businessId: number,
    categoryId: number,
    name: string,
): Promise<number> {
    const response = await request(app)
        .post(productUrl(businessId))
        .send({
            categoryId,
            name,
        });

    return response.body.data.id as number;
}

describe("API de productos", () => {
    beforeAll(async () => {
        await runMigrations(pool);
    });

    afterAll(async () => {
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

    it("GET lista vacia para un negocio sin productos", async () => {
        const business = await newBusiness();

        const response = await request(app).get(productUrl(business));

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: [] });
    });

    it("POST crea un producto", async () => {
        const business = await newBusiness();
        const category = await createCategory(business, "Pollos");

        const response = await request(app)
            .post(productUrl(business))
            .send({
                categoryId: category,
                name: "  Pollo con papas  ",
                description: "Pollo acompañado con papas",
            });

        expect(response.status).toBe(201);

        expect(response.body.data).toMatchObject({
            businessId: business,
            categoryId: category,
            name: "Pollo con papas",
            description: "Pollo acompañado con papas",
            active: true,
            sortOrder: 0,
        });
    });

    it("POST rechaza una categoria de otro negocio con 404", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryOfB = await createCategory(b, "Pollos");

        const response = await request(app)
            .post(productUrl(a))
            .send({
                categoryId: categoryOfB,
                name: "Pollo",
            });

        expect(response.status).toBe(404);
    });

    it("POST rechaza un nombre duplicado en la misma categoria con 409", async () => {
        const business = await newBusiness();
        const category = await createCategory(business, "Pollos");

        await createProduct(business, category, "Pollo entero");

        const response = await request(app)
            .post(productUrl(business))
            .send({
                categoryId: category,
                name: "Pollo entero",
            });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("CONFLICT");
    });

    it("POST rechaza un nombre vacio con 400", async () => {
        const business = await newBusiness();
        const category = await createCategory(business, "Pollos");

        const response = await request(app)
            .post(productUrl(business))
            .send({
                categoryId: category,
                name: "   ",
            });

        expect(response.status).toBe(400);
        expect(response.body.error.details).toBeDefined();
    });

    it("POST rechaza campos desconocidos con 400", async () => {
        const business = await newBusiness();
        const category = await createCategory(business, "Pollos");

        const response = await request(app)
            .post(productUrl(business))
            .send({
                categoryId: category,
                name: "Pollo",
                businessId: 999,
            });

        expect(response.status).toBe(400);
    });

    it("devuelve 404 si el negocio no existe", async () => {
        const response = await request(app).get(
            productUrl(2147483647),
        );

        expect(response.status).toBe(404);
    });

    it("devuelve 400 si el businessId no es un numero", async () => {
        const response = await request(app).get(
            productUrl("abc"),
        );

        expect(response.status).toBe(400);
    });

    it("GET por id devuelve 404 si el producto es de otro negocio", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryOfB = await createCategory(b, "Pollos");
        const productOfB = await createProduct(
            b,
            categoryOfB,
            "Pollo",
        );

        const response = await request(app).get(
            productUrl(a, productOfB),
        );

        expect(response.status).toBe(404);
    });

    it("PATCH modifica un producto", async () => {
        const business = await newBusiness();
        const category = await createCategory(business, "Pollos");

        const product = await createProduct(
            business,
            category,
            "Pollo",
        );

        const response = await request(app)
            .patch(productUrl(business, product))
            .send({
                name: "Pollo con papas",
                active: false,
            });

        expect(response.status).toBe(200);

        expect(response.body.data).toMatchObject({
            name: "Pollo con papas",
            active: false,
        });
    });

    it("PATCH permite mover un producto a otra categoria del mismo negocio", async () => {
        const business = await newBusiness();

        const pollos = await createCategory(business, "Pollos");
        const promociones = await createCategory(
            business,
            "Promociones",
        );

        const product = await createProduct(
            business,
            pollos,
            "Combo",
        );

        const response = await request(app)
            .patch(productUrl(business, product))
            .send({
                categoryId: promociones,
            });

        expect(response.status).toBe(200);

        expect(response.body.data.categoryId).toBe(promociones);
    });

    it("PATCH rechaza mover un producto a una categoria de otro negocio", async () => {
        const a = await newBusiness();
        const b = await newBusiness();

        const categoryA = await createCategory(a, "Pollos");
        const categoryB = await createCategory(b, "Bebidas");

        const product = await createProduct(
            a,
            categoryA,
            "Pollo",
        );

        const response = await request(app)
            .patch(productUrl(a, product))
            .send({
                categoryId: categoryB,
            });

        expect(response.status).toBe(404);
    });

    it("PATCH rechaza un body vacio con 400", async () => {
        const business = await newBusiness();
        const category = await createCategory(business, "Pollos");

        const product = await createProduct(
            business,
            category,
            "Pollo",
        );

        const response = await request(app)
            .patch(productUrl(business, product))
            .send({});

        expect(response.status).toBe(400);
    });

    it("PATCH rechaza renombrar a un nombre ya usado en la categoria con 409", async () => {
        const business = await newBusiness();
        const category = await createCategory(business, "Pollos");

        await createProduct(
            business,
            category,
            "Pollo entero",
        );

        const product = await createProduct(
            business,
            category,
            "Pollo medio",
        );

        const response = await request(app)
            .patch(productUrl(business, product))
            .send({
                name: "Pollo entero",
            });

        expect(response.status).toBe(409);
    });

    it("GET filtra por active", async () => {
        const business = await newBusiness();
        const category = await createCategory(business, "Pollos");

        await createProduct(
            business,
            category,
            "Activo",
        );

        const inactive = await createProduct(
            business,
            category,
            "Inactivo",
        );

        await request(app)
            .patch(productUrl(business, inactive))
            .send({
                active: false,
            });

        const response = await request(app).get(
            `${productUrl(business)}?active=false`,
        );

        expect(response.status).toBe(200);

        expect(
            response.body.data.map(
                (product: { name: string }) => product.name,
            ),
        ).toEqual(["Inactivo"]);
    });

    it("GET rechaza un valor invalido de active con 400", async () => {
        const business = await newBusiness();

        const response = await request(app).get(
            `${productUrl(business)}?active=quizas`,
        );

        expect(response.status).toBe(400);
    });
});