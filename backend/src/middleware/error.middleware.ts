import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import {
  AppError,
  NotFoundError,
  ValidationError,
} from "../shared/errors/AppError.js";

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

function toBody(code: string, message: string, details?: unknown): ErrorBody {
  return {
    error: { code, message, ...(details !== undefined && { details }) },
  };
}

function isBodyParseError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.parse.failed"
  );
}

export const notFoundMiddleware: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.path}`));
};

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json(toBody(err.code, err.message, err.details));
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const error = new ValidationError("Request invalido", details);
    res
      .status(error.statusCode)
      .json(toBody(error.code, error.message, error.details));
    return;
  }

  if (isBodyParseError(err)) {
    const error = new ValidationError("El body no es un JSON valido");
    res.status(error.statusCode).json(toBody(error.code, error.message));
    return;
  }

  console.error(err);
  res.status(500).json(toBody("INTERNAL_ERROR", "Error interno del servidor"));
};
