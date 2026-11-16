import {
    ConflictError,
    NotFoundError,
} from "../../shared/errors/AppError.js";

import type { BusinessRepository } from "../business/business.repository.js";
import type { ProductVariantRepository } from "../product-variant/product-variant.repository.js";

import type {
    NewOrder,
    Order,
    OrderRepository,
} from "./order.repository.js";

import type { CreateOrderInput } from "./order.schemas.js";

type Dependencies = {
    businesses: BusinessRepository;
    variants: ProductVariantRepository;
    orders: OrderRepository;
};

export function createOrderService({
    businesses,
    variants,
    orders,
}: Dependencies) {
    async function create(
        businessId: number,
        input: CreateOrderInput,
    ): Promise<Order> {
        const business = await businesses.findById(businessId);

        if (!business) {
            throw new NotFoundError("Negocio no encontrado");
        }

        const variantIds = input.items.map(
            (item) => item.variantId,
        );

        const foundVariants =
            await variants.findOrderableByIds(
                businessId,
                variantIds,
            );

        const variantsById = new Map(
            foundVariants.map((variant) => [
                variant.id,
                variant,
            ]),
        );

        for (const item of input.items) {
            const variant = variantsById.get(
                item.variantId,
            );

            if (!variant) {
                throw new NotFoundError(
                    `Variante no encontrada: ${item.variantId}`,
                );
            }

            if (!variant.active) {
                throw new ConflictError(
                    `La variante ${item.variantId} no está disponible para la venta`,
                );
            }
        }

        const orderItems: NewOrder["items"] =
            input.items.map((item) => {
                const variant = variantsById.get(
                    item.variantId,
                )!;

                return {
                    variantId: variant.id,
                    productName: variant.productName,
                    variantName: variant.variantName,
                    quantity: item.quantity,
                    unitPriceCents: variant.priceCents,
                };
            });

        const newOrder: NewOrder = {
            source: "LOCAL",
            status: "IN_PROGRESS",
            items: orderItems,
        };

        return orders.create(
            businessId,
            newOrder,
        );
    }

    return {
        create,
    };
}

export type OrderService = ReturnType<
    typeof createOrderService
>;