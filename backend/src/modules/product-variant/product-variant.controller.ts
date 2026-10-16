import type { Request, Response } from "express";
import {
    createProductVariantSchema,
    listProductVariantsQuerySchema,
    productParamsSchema,
    productVariantParamsSchema,
    updateProductVariantSchema,
} from "./product-variant.schemas.js";
import type { ProductVariantService } from "./product-variant.service.js";

export function createProductVariantController(
    service: ProductVariantService,
) {
    async function list(
        req: Request,
        res: Response,
    ): Promise<void> {
        const { businessId, productId } =
            productParamsSchema.parse(req.params);

        const { active } =
            listProductVariantsQuerySchema.parse(req.query);

        const variants = await service.list(
            businessId,
            productId,
            { active },
        );

        res.json({ data: variants });
    }

    async function getById(
        req: Request,
        res: Response,
    ): Promise<void> {
        const { businessId, productId, variantId } =
            productVariantParamsSchema.parse(req.params);

        const variant = await service.getById(
            businessId,
            productId,
            variantId,
        );

        res.json({ data: variant });
    }

    async function create(
        req: Request,
        res: Response,
    ): Promise<void> {
        const { businessId, productId } =
            productParamsSchema.parse(req.params);

        const input =
            createProductVariantSchema.parse(req.body);

        const variant = await service.create(
            businessId,
            productId,
            input,
        );

        res.status(201).json({ data: variant });
    }

    async function update(
        req: Request,
        res: Response,
    ): Promise<void> {
        const { businessId, productId, variantId } =
            productVariantParamsSchema.parse(req.params);

        const input =
            updateProductVariantSchema.parse(req.body);

        const variant = await service.update(
            businessId,
            productId,
            variantId,
            input,
        );

        res.json({ data: variant });
    }

    return {
        list,
        getById,
        create,
        update,
    };
}

export type ProductVariantController = ReturnType<
    typeof createProductVariantController
>;