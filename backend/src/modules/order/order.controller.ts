import type { Request, Response } from "express";

import type { OrderService } from "./order.service.js";
import {
    createOrderSchema,
    orderBusinessParamsSchema,
} from "./order.schemas.js";

export function createOrderController(service: OrderService) {
    async function create(
        req: Request,
        res: Response,
    ): Promise<void> {
        const { businessId } =
            orderBusinessParamsSchema.parse(req.params);

        const input = createOrderSchema.parse(
            req.body,
        );

        const order = await service.create(
            businessId,
            input,
        );

        res.status(201).json({
            data: order,
        });
    }

    return {
        create,
    };
}

export type OrderController = ReturnType<
    typeof createOrderController
>;