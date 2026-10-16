import { Router } from "express";
import type { ProductController } from "./product.controller.js";

export function createProductRouter(controller: ProductController): Router {
    const router = Router({ mergeParams: true });

    router.get("/", controller.list);
    router.get("/:productId", controller.getById);
    router.post("/", controller.create);
    router.patch("/:productId", controller.update);

    return router;
}