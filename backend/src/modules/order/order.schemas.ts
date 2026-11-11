import { z } from "zod";
import {
    POSTGRES_INT_MAX,
    idSchema,
} from "../../shared/validation/ids.js";

export const orderBusinessParamsSchema = z.object({
    businessId: idSchema,
});

const quantitySchema = z
    .number()
    .int()
    .min(1)
    .max(POSTGRES_INT_MAX);

const orderItemSchema = z.strictObject({
    variantId: idSchema,
    quantity: quantitySchema,
});

export const createOrderSchema = z.strictObject({
    items: z
        .array(orderItemSchema)
        .min(1, "El pedido debe tener al menos un item")
        .refine(
            (items) =>
                new Set(items.map((item) => item.variantId)).size ===
                items.length,
            {
                message:
                    "No se puede repetir la misma variante en el pedido",
            },
        ),
});

export type CreateOrderInput = z.infer<
    typeof createOrderSchema
>;