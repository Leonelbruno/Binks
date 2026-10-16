import { Router } from "express";
import type { ProductVariantController } from "./product-variant.controller.js";

export function createProductVariantRouter(
    controller: ProductVariantController,
): Router {
    const router = Router({ mergeParams: true });

    router.get("/", controller.list);
    router.get("/:variantId", controller.getById);
    router.post("/", controller.create);
    router.patch("/:variantId", controller.update);

    return router;
}