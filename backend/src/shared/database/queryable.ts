import type { Pool } from "pg";

export type Queryable = Pick<Pool, "query">;

export type Database = Pick<Pool, "query" | "connect">;
