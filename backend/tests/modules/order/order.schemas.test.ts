
import { describe, expect, it } from "vitest";
import { createOrderSchema } from "../../../src/modules/order/order.schemas.js";

describe("createOrderSchema", () => {
    it("acepta un pedido válido con varios productos", () => {
        const result = createOrderSchema.safeParse({
            items: [
                { variantId: 1, quantity: 2 },
                { variantId: 6, quantity: 1 },
            ],
        });

        expect(result.success).toBe(true);
    });

    it("rechaza un pedido sin productos", () => {
        const result = createOrderSchema.safeParse({
            items: [],
        });

        expect(result.success).toBe(false);
    });

    it("rechaza cantidades iguales a cero", () => {
        const result = createOrderSchema.safeParse({
            items: [{ variantId: 1, quantity: 0 }],
        });

        expect(result.success).toBe(false);
    });

    it("rechaza cantidades decimales", () => {
        const result = createOrderSchema.safeParse({
            items: [{ variantId: 1, quantity: 1.5 }],
        });

        expect(result.success).toBe(false);
    });

    it("rechaza IDs de variantes inválidos", () => {
        const result = createOrderSchema.safeParse({
            items: [{ variantId: 0, quantity: 1 }],
        });

        expect(result.success).toBe(false);
    });

    it("rechaza variantes repetidas", () => {
        const result = createOrderSchema.safeParse({
            items: [
                { variantId: 1, quantity: 1 },
                { variantId: 1, quantity: 2 },
            ],
        });

        expect(result.success).toBe(false);
    });

    it("rechaza precios enviados desde el frontend", () => {
        const result = createOrderSchema.safeParse({
            items: [
                {
                    variantId: 1,
                    quantity: 2,
                    priceCents: 100,
                },
            ],
        });

        expect(result.success).toBe(false);
    });

    it("rechaza propiedades desconocidas en el pedido", () => {
        const result = createOrderSchema.safeParse({
            items: [{ variantId: 1, quantity: 2 }],
            totalCents: 100,
        });

        expect(result.success).toBe(false);
    });
});
