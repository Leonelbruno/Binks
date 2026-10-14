import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/app.js";
import { closeDatabase, pool } from "../../../src/config/database.js";
import { runMigrations } from "../../../src/database/migrator.js";

const slug = `business-api-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
let businessId: number;

describe("API de negocios", () => {
  beforeAll(async () => {
    await runMigrations(pool);
    const { rows } = await pool.query<{ id: number }>(
      "INSERT INTO business (name, slug) VALUES ('Negocio de prueba', $1) RETURNING id",
      [slug],
    );
    businessId = rows[0]!.id;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM business WHERE id = $1", [businessId]);
    await closeDatabase();
  });

  it("GET devuelve el negocio", async () => {
    const response = await request(app).get(`/api/businesses/${businessId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: businessId,
      name: "Negocio de prueba",
      slug,
      active: true,
    });
  });

  it("GET devuelve 404 si el negocio no existe", async () => {
    const response = await request(app).get("/api/businesses/2147483647");

    expect(response.status).toBe(404);
  });

  it("GET devuelve 400 si el id no es un numero", async () => {
    const response = await request(app).get("/api/businesses/abc");

    expect(response.status).toBe(400);
  });
});
