import { Router } from "express";
import { pool } from "./config/database.js";
import { createBusinessRepository } from "./modules/business/business.repository.js";
import { createCategoryController } from "./modules/category/category.controller.js";
import { createCategoryRepository } from "./modules/category/category.repository.js";
import { createCategoryRouter } from "./modules/category/category.routes.js";
import { createCategoryService } from "./modules/category/category.service.js";

const businesses = createBusinessRepository(pool);
const categories = createCategoryRepository(pool);

const categoryService = createCategoryService({ businesses, categories });
const categoryController = createCategoryController(categoryService);

export const apiRouter = Router();

apiRouter.use(
  "/businesses/:businessId/categories",
  createCategoryRouter(categoryController),
);
