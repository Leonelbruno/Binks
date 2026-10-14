import { Router } from "express";
import { pool } from "./config/database.js";
import { createBusinessController } from "./modules/business/business.controller.js";
import { createBusinessRepository } from "./modules/business/business.repository.js";
import { createBusinessRouter } from "./modules/business/business.routes.js";
import { createBusinessService } from "./modules/business/business.service.js";
import { createCategoryController } from "./modules/category/category.controller.js";
import { createCategoryRepository } from "./modules/category/category.repository.js";
import { createCategoryRouter } from "./modules/category/category.routes.js";
import { createCategoryService } from "./modules/category/category.service.js";

const businesses = createBusinessRepository(pool);
const categories = createCategoryRepository(pool);

const businessService = createBusinessService({ businesses });
const businessController = createBusinessController(businessService);

const categoryService = createCategoryService({ businesses, categories });
const categoryController = createCategoryController(categoryService);

export const apiRouter = Router();

apiRouter.use(
  "/businesses/:businessId/categories",
  createCategoryRouter(categoryController),
);
apiRouter.use("/businesses", createBusinessRouter(businessController));
