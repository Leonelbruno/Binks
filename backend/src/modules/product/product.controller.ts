import type { Request, Response } from "express";
import {
    businessParamsSchema,
    productParamsSchema,
    createProductSchema,
    listProductsQuerySchema,
    updateProductSchema,
} from "./product.schemas.js";
import type { ProductService } from "./product.service.js";

export function createProductController(service: ProductService) {
    async function list(req: Request, res: Response): Promise<void> {
        const { businessId } = businessParamsSchema.parse(req.params);
        const { active } = listProductsQuerySchema.parse(req.query);

        const products = await service.list(businessId, { active });

        res.json({ data: products });
    }

    async function getById(req: Request, res: Response): Promise<void> {
        const { businessId, productId } = productParamsSchema.parse(req.params);

        const product = await service.getById(businessId, productId);

        res.json({ data: product });
    }

    async function create(req: Request, res: Response): Promise<void> {
        const { businessId } = businessParamsSchema.parse(req.params);
        const input = createProductSchema.parse(req.body);

        const product = await service.create(businessId, input);

        res.status(201).json({ data: product });
    }

    async function update(req: Request, res: Response): Promise<void> {
        const { businessId, productId } = productParamsSchema.parse(req.params);
        const input = updateProductSchema.parse(req.body);

        const product = await service.update(businessId, productId, input);

        res.json({ data: product });
    }

    return {
        list,
        getById,
        create,
        update,
    };
}

export type ProductController = ReturnType<typeof createProductController>;