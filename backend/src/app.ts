import express from "express";
import cors from "cors";
import { checkDatabase } from "./config/database.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middleware/error.middleware.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Binks API funcionando",
  });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    await checkDatabase();
    res.json({ status: "ok", database: "ok" });
  } catch (err) {
    console.error(err);
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);
