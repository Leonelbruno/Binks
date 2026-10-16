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

import { createProductController } from "./modules/product/product.controller.js";
import { createProductRepository } from "./modules/product/product.repository.js";
import { createProductRouter } from "./modules/product/product.routes.js";
import { createProductService } from "./modules/product/product.service.js";

import { createProductVariantController } from "./modules/product-variant/product-variant.controller.js";
import { createProductVariantRepository } from "./modules/product-variant/product-variant.repository.js";
import { createProductVariantRouter } from "./modules/product-variant/product-variant.routes.js";
import { createProductVariantService } from "./modules/product-variant/product-variant.service.js";

import { createCatalogController } from "./modules/catalog/catalog.controller.js";
import { createCatalogRepository } from "./modules/catalog/catalog.repository.js";
import { createCatalogRouter } from "./modules/catalog/catalog.routes.js";
import { createCatalogService } from "./modules/catalog/catalog.service.js";

const businesses = createBusinessRepository(pool);
const categories = createCategoryRepository(pool);
const products = createProductRepository(pool);
const variants = createProductVariantRepository(pool);
const catalog = createCatalogRepository(pool);

const businessService = createBusinessService({ businesses });
const businessController = createBusinessController(businessService);

const categoryService = createCategoryService({
  businesses,
  categories,
});
const categoryController = createCategoryController(categoryService);

const catalogService = createCatalogService({
  businesses,
  catalog,
});

const catalogController =
  createCatalogController(catalogService);

const productService = createProductService({
  businesses,
  categories,
  products,
});
const productController = createProductController(productService);

const productVariantService =
  createProductVariantService({
    businesses,
    products,
    variants,
  });

const productVariantController =
  createProductVariantController(
    productVariantService,
  );

export const apiRouter = Router();

apiRouter.use(
  "/businesses/:businessId/categories",
  createCategoryRouter(categoryController),
);

apiRouter.use(
  "/businesses/:businessId/products/:productId/variants",
  createProductVariantRouter(productVariantController),
);

apiRouter.use(
  "/businesses/:businessId/products",
  createProductRouter(productController),
);

apiRouter.use(
  "/businesses/:businessId/catalog",
  createCatalogRouter(catalogController),
);

apiRouter.use(
  "/businesses",
  createBusinessRouter(businessController),
);