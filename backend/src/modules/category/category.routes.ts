import { Router } from "express";
import type { CategoryController } from "./category.controller.js";

export function createCategoryRouter(controller: CategoryController): Router {
  const router = Router({ mergeParams: true });

  router.get("/", controller.list);
  router.get("/:categoryId", controller.getById);
  router.post("/", controller.create);
  router.patch("/:categoryId", controller.update);

  return router;
}
