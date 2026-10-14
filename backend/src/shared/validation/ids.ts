import { z } from "zod";

export const POSTGRES_INT_MAX = 2_147_483_647;

export const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(POSTGRES_INT_MAX);
