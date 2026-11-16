import { describe, expect, it, vi } from "vitest";

import { createOrderService } from "../../../src/modules/order/order.service.js";

describe("order service", () => {
    function makeDependencies() {
        const businesses = {
            findById: vi.fn(),
        };

        const variants = {
            findOrderableByIds: vi.fn(),
        };

        const orders = {
            create: vi.fn(),
        };

        return {
            businesses,
            variants,
            orders,
        };
    }

    it("crea un pedido LOCAL e IN_PROGRESS usando precios y nombres del backend", async () => {
        const deps = makeDependencies();

        deps.businesses.findById.mockResolvedValue({
            id: 1,
        });

        deps.variants.findOrderableByIds.mockResolvedValue([
            {
                id: 10,
                productName: "Pollo a la parrilla",
                variantName: "Entero",
                priceCents: 1200000,
                active: true,
            },
            {
                id: 20,
                productName: "Empanada de carne",
                variantName: "Unidad",
                priceCents: 200000,
                active: true,
            },
        ]);

        const createdOrder = {
            id: 100,
            businessId: 1,
            orderNumber: 1,
            source: "LOCAL",
            status: "IN_PROGRESS",
            totalCents: 2600000,
            items: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        deps.orders.create.mockResolvedValue(createdOrder);

        const service = createOrderService(
            deps as never,
        );

        const result = await service.create(1, {
            items: [
                {
                    variantId: 10,
                    quantity: 2,
                },
                {
                    variantId: 20,
                    quantity: 1,
                },
            ],
        });

        expect(
            deps.variants.findOrderableByIds,
        ).toHaveBeenCalledWith(
            1,
            [10, 20],
        );

        expect(deps.orders.create).toHaveBeenCalledWith(
            1,
            {
                source: "LOCAL",
                status: "IN_PROGRESS",
                items: [
                    {
                        variantId: 10,
                        productName: "Pollo a la parrilla",
                        variantName: "Entero",
                        quantity: 2,
                        unitPriceCents: 1200000,
                    },
                    {
                        variantId: 20,
                        productName: "Empanada de carne",
                        variantName: "Unidad",
                        quantity: 1,
                        unitPriceCents: 200000,
                    },
                ],
            },
        );

        expect(result).toBe(createdOrder);
    });

    it("devuelve 404 si el negocio no existe", async () => {
        const deps = makeDependencies();

        deps.businesses.findById.mockResolvedValue(
            null,
        );

        const service = createOrderService(
            deps as never,
        );

        await expect(
            service.create(999, {
                items: [
                    {
                        variantId: 10,
                        quantity: 1,
                    },
                ],
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
            code: "NOT_FOUND",
        });

        expect(
            deps.variants.findOrderableByIds,
        ).not.toHaveBeenCalled();

        expect(
            deps.orders.create,
        ).not.toHaveBeenCalled();
    });

    it("devuelve 404 si una variante no existe o pertenece a otro negocio", async () => {
        const deps = makeDependencies();

        deps.businesses.findById.mockResolvedValue({
            id: 1,
        });

        deps.variants.findOrderableByIds.mockResolvedValue([
            {
                id: 10,
                productName: "Pollo",
                variantName: "Entero",
                priceCents: 1200000,
                active: true,
            },
        ]);

        const service = createOrderService(
            deps as never,
        );

        await expect(
            service.create(1, {
                items: [
                    {
                        variantId: 10,
                        quantity: 1,
                    },
                    {
                        variantId: 999,
                        quantity: 1,
                    },
                ],
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
            code: "NOT_FOUND",
        });

        expect(
            deps.orders.create,
        ).not.toHaveBeenCalled();
    });

    it("devuelve 409 si una variante no esta disponible", async () => {
        const deps = makeDependencies();

        deps.businesses.findById.mockResolvedValue({
            id: 1,
        });

        deps.variants.findOrderableByIds.mockResolvedValue([
            {
                id: 10,
                productName: "Pollo",
                variantName: "Entero",
                priceCents: 1200000,
                active: false,
            },
        ]);

        const service = createOrderService(
            deps as never,
        );

        await expect(
            service.create(1, {
                items: [
                    {
                        variantId: 10,
                        quantity: 1,
                    },
                ],
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            code: "CONFLICT",
        });

        expect(
            deps.orders.create,
        ).not.toHaveBeenCalled();
    });

    it("no usa precios enviados por frontend", async () => {
        const deps = makeDependencies();

        deps.businesses.findById.mockResolvedValue({
            id: 1,
        });

        deps.variants.findOrderableByIds.mockResolvedValue([
            {
                id: 10,
                productName: "Pollo",
                variantName: "Entero",
                priceCents: 1500000,
                active: true,
            },
        ]);

        deps.orders.create.mockResolvedValue({
            id: 1,
        });

        const service = createOrderService(
            deps as never,
        );

        await service.create(1, {
            items: [
                {
                    variantId: 10,
                    quantity: 2,
                },
            ],
        });

        expect(deps.orders.create).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                items: [
                    expect.objectContaining({
                        variantId: 10,
                        quantity: 2,
                        unitPriceCents: 1500000,
                    }),
                ],
            }),
        );
    });
});