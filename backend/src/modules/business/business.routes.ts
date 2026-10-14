import { Router } from "express";
import type { BusinessController } from "./business.controller.js";

export function createBusinessRouter(controller: BusinessController): Router {
  const router = Router();

  router.get("/:businessId", controller.getById);

  return router;
}
