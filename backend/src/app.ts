import express from "express";
import cors from "cors";
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

app.use(notFoundMiddleware);
app.use(errorMiddleware);
