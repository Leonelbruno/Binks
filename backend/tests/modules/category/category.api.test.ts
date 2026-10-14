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
  const slug = `api-${runId}-${businessCounter}`;
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO business (name, slug) VALUES ($1, $1) RETURNING id",
    [slug],
  );
  const id = rows[0]!.id;
  createdBusinessIds.push(id);
  return id;
}

function url(businessId: number | string, categoryId?: number): string {
  const base = `/api/businesses/${businessId}/categories`;
  return categoryId === undefined ? base : `${base}/${categoryId}`;
}

async function createCategory(
  businessId: number,
  name: string,
): Promise<number> {
  const response = await request(app).post(url(businessId)).send({ name });
  return response.body.data.id as number;
}

describe("API de categorias", () => {
  beforeAll(async () => {
    await runMigrations(pool);
  });

  afterAll(async () => {
    await pool.query(
      "DELETE FROM category WHERE business_id = ANY($1::int[])",
      [createdBusinessIds],
    );
    await pool.query("DELETE FROM business WHERE id = ANY($1::int[])", [
      createdBusinessIds,
    ]);
    await closeDatabase();
  });

  it("GET lista vacia para un negocio sin categorias", async () => {
    const business = await newBusiness();

    const response = await request(app).get(url(business));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
  });

  it("POST crea una categoria", async () => {
    const business = await newBusiness();

    const response = await request(app)
      .post(url(business))
      .send({ name: "  Pollos  ", description: "Parrilla" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      businessId: business,
      name: "Pollos",
      description: "Parrilla",
      active: true,
      sortOrder: 0,
    });
  });

  it("POST rechaza un nombre duplicado en el mismo negocio con 409", async () => {
    const business = await newBusiness();
    await createCategory(business, "Pollos");

    const response = await request(app)
      .post(url(business))
      .send({ name: "Pollos" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("POST rechaza un nombre vacio con 400", async () => {
    const business = await newBusiness();

    const response = await request(app)
      .post(url(business))
      .send({ name: "   " });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toBeDefined();
  });

  it("POST rechaza campos desconocidos con 400", async () => {
    const business = await newBusiness();

    const response = await request(app)
      .post(url(business))
      .send({ name: "Pollos", businessId: 999 });

    expect(response.status).toBe(400);
  });

  it("devuelve 404 si el negocio no existe", async () => {
    const response = await request(app).get(url(2147483647));

    expect(response.status).toBe(404);
  });

  it("devuelve 400 si el businessId no es un numero", async () => {
    const response = await request(app).get(url("abc"));

    expect(response.status).toBe(400);
  });

  it("GET por id devuelve 404 si la categoria es de otro negocio", async () => {
    const a = await newBusiness();
    const b = await newBusiness();
    const categoryOfB = await createCategory(b, "Pollos");

    const response = await request(app).get(url(a, categoryOfB));

    expect(response.status).toBe(404);
  });

  it("PATCH modifica una categoria", async () => {
    const business = await newBusiness();
    const id = await createCategory(business, "Pollos");

    const response = await request(app)
      .patch(url(business, id))
      .send({ name: "Pollos a la parrilla", active: false });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      name: "Pollos a la parrilla",
      active: false,
    });
  });

  it("PATCH rechaza un body vacio con 400", async () => {
    const business = await newBusiness();
    const id = await createCategory(business, "Pollos");

    const response = await request(app).patch(url(business, id)).send({});

    expect(response.status).toBe(400);
  });

  it("PATCH rechaza renombrar a un nombre ya usado con 409", async () => {
    const business = await newBusiness();
    await createCategory(business, "Pollos");
    const id = await createCategory(business, "Bebidas");

    const response = await request(app)
      .patch(url(business, id))
      .send({ name: "Pollos" });

    expect(response.status).toBe(409);
  });

  it("GET filtra por active", async () => {
    const business = await newBusiness();
    await createCategory(business, "Activa");
    const inactive = await createCategory(business, "Inactiva");
    await request(app).patch(url(business, inactive)).send({ active: false });

    const response = await request(app).get(`${url(business)}?active=false`);

    expect(response.status).toBe(200);
    expect(
      response.body.data.map((category: { name: string }) => category.name),
    ).toEqual(["Inactiva"]);
  });

  it("GET rechaza un valor invalido de active con 400", async () => {
    const business = await newBusiness();

    const response = await request(app).get(`${url(business)}?active=quizas`);

    expect(response.status).toBe(400);
  });
});
