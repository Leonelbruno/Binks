import { z } from "zod";
import { POSTGRES_INT_MAX, idSchema } from "../../shared/validation/ids.js";

export const productParamsSchema = z.object({
    businessId: idSchema,
    productId: idSchema,
});

export const productVariantParamsSchema = productParamsSchema.extend({
    variantId: idSchema,
});

const nameSchema = z.string().trim().min(1).max(100);
const priceCentsSchema = z.number().int().min(0).max(POSTGRES_INT_MAX);
const sortOrderSchema = z.number().int().min(0).max(POSTGRES_INT_MAX);

export const createProductVariantSchema = z.strictObject({
    name: nameSchema,
    priceCents: priceCentsSchema,
    sortOrder: sortOrderSchema.optional(),
});

export const updateProductVariantSchema = z
    .strictObject({
        name: nameSchema,
        priceCents: priceCentsSchema,
        sortOrder: sortOrderSchema,
        active: z.boolean(),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: "Debe enviar al menos un campo para modificar",
    });

export const listProductVariantsQuerySchema = z.object({
    active: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
});

export type CreateProductVariantInput = z.infer<
    typeof createProductVariantSchema
>;

export type UpdateProductVariantInput = z.infer<
    typeof updateProductVariantSchema
>;