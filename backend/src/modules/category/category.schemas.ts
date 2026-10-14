import { z } from "zod";

const POSTGRES_INT_MAX = 2_147_483_647;

const idSchema = z.coerce.number().int().positive().max(POSTGRES_INT_MAX);

export const businessParamsSchema = z.object({
  businessId: idSchema,
});

export const categoryParamsSchema = businessParamsSchema.extend({
  categoryId: idSchema,
});

const nameSchema = z.string().trim().min(1).max(100);
const descriptionSchema = z.string().trim().max(500).nullable();
const sortOrderSchema = z.number().int().min(0).max(POSTGRES_INT_MAX);

export const createCategorySchema = z.strictObject({
  name: nameSchema,
  description: descriptionSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
});

export const updateCategorySchema = z
  .strictObject({
    name: nameSchema,
    description: descriptionSchema,
    sortOrder: sortOrderSchema,
    active: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debe enviar al menos un campo para modificar",
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const listCategoriesQuerySchema = z.object({
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
