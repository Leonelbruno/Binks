import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorMiddleware, notFoundMiddleware } from "../../src/middleware/error.middleware.js";
import {
  BusinessRuleError,
  InvalidStateTransitionError,
} from "../../src/shared/errors/AppError.js";

function buildApp() {
  const app = express();
  app.use(express.json());

  app.get("/business-rule", () => {
    throw new BusinessRuleError("Precio invalido", { campo: "precio" });
  });
  app.get("/state", () => {
    throw new InvalidStateTransitionError();
  });
  app.post("/zod", () => {
    z.object({ name: z.string() }).parse({});
  });
  app.get("/boom", () => {
    throw new Error("secreto interno");
  });

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}

describe("error middleware", () => {
  it("devuelve 404 NOT_FOUND para una ruta inexistente", async () => {
    const res = await request(buildApp()).get("/nada");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("devuelve 422 con details para una regla de negocio", async () => {
    const res = await request(buildApp()).get("/business-rule");

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
    expect(res.body.error.details).toEqual({ campo: "precio" });
  });

  it("devuelve 409 para una transicion de estado invalida", async () => {
    const res = await request(buildApp()).get("/state");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("traduce un ZodError a 400 con el detalle por campo", async () => {
    const res = await request(buildApp()).post("/zod").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([
      { path: "name", message: expect.any(String) },
    ]);
  });

  it("devuelve 400 cuando el body no es un JSON valido", async () => {
    const res = await request(buildApp())
      .post("/zod")
      .set("Content-Type", "application/json")
      .send("{malo");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("devuelve 500 sin filtrar el mensaje interno", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(buildApp()).get("/boom");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("secreto interno");

    spy.mockRestore();
  });
});
