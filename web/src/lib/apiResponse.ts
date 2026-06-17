import { NextResponse } from "next/server";
import { AppError, ErrorCode, ServerError, isAppError } from "@/lib/errors";

export function errorResponse(error: AppError): NextResponse {
  const status =
    error.code === ErrorCode.AUTH_REQUIRED || error.code === ErrorCode.UNAUTHORIZED
      ? 401
      : error.code === ErrorCode.NOT_FOUND
        ? 404
        : error.code === ErrorCode.INVALID_INPUT ||
            error.code === ErrorCode.FILE_TOO_LARGE ||
            error.code === ErrorCode.INVALID_FILE_TYPE
          ? 400
          : 500;

  return NextResponse.json(
    {
      error: error.userMessage,
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
    },
    { status }
  );
}

/**
 * Convert an error caught at the top of an API route into a response.
 * Known {@link AppError}s pass through with their status; anything else is
 * logged and returned as a generic 500 with {@link fallbackMessage}.
 */
export function handleRouteError(err: unknown, fallbackMessage: string): NextResponse {
  if (isAppError(err)) {
    return errorResponse(err);
  }
  console.error(fallbackMessage, err);
  return errorResponse(new ServerError(fallbackMessage));
}
