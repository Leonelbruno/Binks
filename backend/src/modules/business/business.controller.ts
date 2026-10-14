import type { Request, Response } from "express";
import { businessParamsSchema } from "./business.schemas.js";
import type { BusinessService } from "./business.service.js";

export function createBusinessController(service: BusinessService) {
  async function getById(req: Request, res: Response): Promise<void> {
    const { businessId } = businessParamsSchema.parse(req.params);

    const business = await service.getById(businessId);
    res.json({ data: business });
  }

  return { getById };
}

export type BusinessController = ReturnType<typeof createBusinessController>;
