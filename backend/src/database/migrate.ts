import { closeDatabase, pool } from "../config/database.js";
import { runMigrations } from "./migrator.js";

try {
  const applied = await runMigrations(pool);

  if (applied.length === 0) {
    console.log("No hay migraciones pendientes");
  } else {
    console.log(
      `Migraciones aplicadas:\n${applied.map((n) => `  - ${n}`).join("\n")}`,
    );
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
