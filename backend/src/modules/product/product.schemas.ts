import { z } from "zod";
import { POSTGRES_INT_MAX, idSchema } from "../../shared/validation/ids.js";

export const businessParamsSchema = z.object({
    businessId: idSchema,
});

export const productParamsSchema = businessParamsSchema.extend({
    productId: idSchema,
});

const nameSchema = z.string().trim().min(1).max(100);
const descriptionSchema = z.string().trim().max(500).nullable();
const sortOrderSchema = z.number().int().min(0).max(POSTGRES_INT_MAX);

export const createProductSchema = z.strictObject({
    categoryId: idSchema,
    name: nameSchema,
    description: descriptionSchema.optional(),
    sortOrder: sortOrderSchema.optional(),
});

export const updateProductSchema = z
    .strictObject({
        categoryId: idSchema,
        name: nameSchema,
        description: descriptionSchema,
        sortOrder: sortOrderSchema,
        active: z.boolean(),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: "Debe enviar al menos un campo para modificar",
    });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const listProductsQuerySchema = z.object({
    active: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
});