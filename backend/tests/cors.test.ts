import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";

describe("CORS", () => {
  it("permite un origen configurado", async () => {
    const allowed = env.CORS_ORIGIN[0]!;
    const response = await request(app)
      .get("/api/health")
      .set("Origin", allowed);

    expect(response.headers["access-control-allow-origin"]).toBe(allowed);
  });

  it("no habilita un origen no configurado", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "http://sitio-no-autorizado.example");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
