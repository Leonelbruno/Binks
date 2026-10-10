import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { closeDatabase } from "../src/config/database.js";

afterAll(async () => {
  await closeDatabase();
});

describe("app", () => {
  it("GET /api/health responde ok", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /api/health/db responde ok con la base encendida", async () => {
    const res = await request(app).get("/api/health/db");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "ok" });
  });

  it("devuelve 404 con el formato de error para una ruta inexistente", async () => {
    const res = await request(app).get("/api/nada");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
