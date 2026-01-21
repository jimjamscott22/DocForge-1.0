export enum ErrorCode {
  AUTH_REQUIRED = "AUTH_REQUIRED",
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_INPUT = "INVALID_INPUT",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export class AppError extends Error {
  code: ErrorCode;
  severity: ErrorSeverity;
  userMessage: string;
  details?: Record<string, unknown>;
  originalError?: Error;

  constructor({
    code,
    severity = ErrorSeverity.MEDIUM,
    userMessage,
    details,
    originalError,
  }: {
    code: ErrorCode;
    severity?: ErrorSeverity;
    userMessage: string;
    details?: Record<string, unknown>;
    originalError?: Error;
  }) {
    super(userMessage);
    this.name = "AppError";
    this.code = code;
    this.severity = severity;
    this.userMessage = userMessage;
    this.details = details;
    this.originalError = originalError;
  }
}

export class AuthError extends AppError {
  constructor(message: string, originalError?: Error) {
    super({
      code: ErrorCode.AUTH_REQUIRED,
      severity: ErrorSeverity.MEDIUM,
      userMessage: message,
      originalError,
    });
    this.name = "AuthError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: ErrorCode.INVALID_INPUT,
      severity: ErrorSeverity.LOW,
      userMessage: message,
      details,
    });
    this.name = "ValidationError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string, originalError?: Error) {
    super({
      code: ErrorCode.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      userMessage: message,
      originalError,
    });
    this.name = "NetworkError";
  }
}

export class ServerError extends AppError {
  constructor(message: string, originalError?: Error) {
    super({
      code: ErrorCode.SERVER_ERROR,
      severity: ErrorSeverity.HIGH,
      userMessage: message,
      originalError,
    });
    this.name = "ServerError";
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

export const parseApiError = async (response: Response): Promise<AppError> => {
  try {
    const data = await response.json();
    const message = data.error || "An unknown error occurred";
    
    switch (response.status) {
      case 400:
        return new ValidationError(message, data.details);
      case 401:
        return new AuthError(message);
      case 413:
        return new AppError({
          code: ErrorCode.FILE_TOO_LARGE,
          userMessage: message,
        });
      case 415:
        return new AppError({
          code: ErrorCode.INVALID_FILE_TYPE,
          userMessage: message,
        });
      case 500:
        return new ServerError(message);
      default:
        return new AppError({
          code: ErrorCode.UNKNOWN_ERROR,
          severity: ErrorSeverity.MEDIUM,
          userMessage: message,
        });
    }
  } catch {
    return new ServerError("Failed to parse error response");
  }
};
