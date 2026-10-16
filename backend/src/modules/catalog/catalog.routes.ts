import { Router } from "express";
import type { CatalogController } from "./catalog.controller.js";

export function createCatalogRouter(
    controller: CatalogController,
): Router {
    const router = Router({ mergeParams: true });

    router.get("/", controller.getByBusiness);

    return router;
}