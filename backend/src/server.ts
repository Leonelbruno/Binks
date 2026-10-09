import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(
    `Binks API running on http://localhost:${env.PORT} (${env.NODE_ENV})`,
  );
});
