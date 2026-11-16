import { Router } from "express";

import type { OrderController } from "./order.controller.js";

export function createOrderRouter(controller: OrderController) {
    const router = Router({
        mergeParams: true,
    });

    router.post("/", controller.create);

    return router;
}