import { Pool } from "pg";
import { env } from "./env.js";

export const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de Postgres", err);
});

export async function checkDatabase(): Promise<void> {
  await pool.query("SELECT 1");
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
