import type { Request, Response } from "express";
import {
  businessParamsSchema,
  categoryParamsSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from "./category.schemas.js";
import type { CategoryService } from "./category.service.js";

export function createCategoryController(service: CategoryService) {
  async function list(req: Request, res: Response): Promise<void> {
    const { businessId } = businessParamsSchema.parse(req.params);
    const { active } = listCategoriesQuerySchema.parse(req.query);

    const categories = await service.list(businessId, { active });
    res.json({ data: categories });
  }

  async function getById(req: Request, res: Response): Promise<void> {
    const { businessId, categoryId } = categoryParamsSchema.parse(req.params);

    const category = await service.getById(businessId, categoryId);
    res.json({ data: category });
  }

  async function create(req: Request, res: Response): Promise<void> {
    const { businessId } = businessParamsSchema.parse(req.params);
    const input = createCategorySchema.parse(req.body);

    const category = await service.create(businessId, input);
    res.status(201).json({ data: category });
  }

  async function update(req: Request, res: Response): Promise<void> {
    const { businessId, categoryId } = categoryParamsSchema.parse(req.params);
    const input = updateCategorySchema.parse(req.body);

    const category = await service.update(businessId, categoryId, input);
    res.json({ data: category });
  }

  return { list, getById, create, update };
}

export type CategoryController = ReturnType<typeof createCategoryController>;
