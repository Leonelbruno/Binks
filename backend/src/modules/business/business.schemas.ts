import { z } from "zod";
import { idSchema } from "../../shared/validation/ids.js";

export const businessParamsSchema = z.object({
  businessId: idSchema,
});
