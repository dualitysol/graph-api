export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
    };
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, 'BadRequest', message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, 'NotFound', message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, 'Conflict', message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string) {
    super(500, 'InternalServerError', message);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string) {
    super(401, 'Unauthorized', message);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string) {
    super(403, 'Forbidden', message);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
