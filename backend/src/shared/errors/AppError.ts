export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Request invalido", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado", details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(message = "Transicion de estado invalida", details?: unknown) {
    super(message, 409, "INVALID_STATE_TRANSITION", details);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message = "Regla de negocio incumplida", details?: unknown) {
    super(message, 422, "BUSINESS_RULE_VIOLATION", details);
  }
}
