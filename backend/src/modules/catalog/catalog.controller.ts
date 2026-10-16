import type { Request, Response } from "express";
import { z } from "zod";
import { idSchema } from "../../shared/validation/ids.js";
import type { CatalogService } from "./catalog.service.js";

const catalogParamsSchema = z.object({
    businessId: idSchema,
});

export function createCatalogController(
    service: CatalogService,
) {
    async function getByBusiness(
        req: Request,
        res: Response,
    ): Promise<void> {
        const { businessId } = catalogParamsSchema.parse(
            req.params,
        );

        const catalog = await service.getByBusiness(
            businessId,
        );

        res.json({
            data: catalog,
        });
    }

    return {
        getByBusiness,
    };
}

export type CatalogController = ReturnType<
    typeof createCatalogController
>;