/**
 * Xero API Error Handling
 *
 * Implements Xero's best practices for error handling:
 * - Extracts X-Correlation-Id from response headers
 * - Parses validation errors, authorization errors, and token errors
 * - Formats user-friendly error messages based on error type
 * - Categorizes errors for proper handling and logging
 *
 * Reference: https://developer.xero.com/documentation/guides/oauth2/auth-flow/
 */

export type XeroErrorType =
  | "validation"
  | "authorization"
  | "token"
  | "rate_limit"
  | "server"
  | "network"
  | "unknown";

export interface XeroValidationError {
  Message: string;
}

export interface XeroErrorResponse {
  Type?: string;
  Title?: string;
  Status?: number;
  Detail?: string;
  ValidationErrors?: XeroValidationError[];
  ErrorNumber?: number;
  Elements?: Array<{
    ValidationErrors?: XeroValidationError[];
  }>;
}

export interface ParsedXeroError {
  type: XeroErrorType;
  message: string;
  userMessage: string;
  correlationId?: string;
  originalError?: unknown;
  statusCode?: number;
  details?: string[];
}

/**
 * Extract X-Correlation-Id from response headers
 * This ID is crucial for support tickets and debugging
 */
export function extractCorrelationId(
  headers: Headers | Record<string, string>
): string | undefined {
  if (headers instanceof Headers) {
    return (
      headers.get("X-Correlation-Id") ||
      headers.get("x-correlation-id") ||
      undefined
    );
  }
  return (
    headers["X-Correlation-Id"] || headers["x-correlation-id"] || undefined
  );
}

/**
 * Determine error type based on status code and error content
 */
export function categorizeXeroError(
  statusCode?: number,
  errorResponse?: XeroErrorResponse,
  originalError?: unknown
): XeroErrorType {
  // Network errors
  if (
    originalError instanceof TypeError &&
    originalError.message.includes("fetch")
  ) {
    return "network";
  }

  // Rate limiting
  if (
    statusCode === 429 ||
    errorResponse?.Type === "TooManyRequestsException"
  ) {
    return "rate_limit";
  }

  // Authorization errors
  if (statusCode === 401 || statusCode === 403) {
    return "authorization";
  }

  // Token errors (OAuth errors)
  if (
    errorResponse?.Type === "invalid_grant" ||
    errorResponse?.Type === "invalid_client" ||
    errorResponse?.Type === "unauthorized_client" ||
    errorResponse?.Type === "unsupported_grant_type"
  ) {
    return "token";
  }

  // Validation errors
  if (
    statusCode === 400 ||
    errorResponse?.ValidationErrors ||
    errorResponse?.Elements?.[0]?.ValidationErrors
  ) {
    return "validation";
  }

  // Server errors
  if (statusCode && statusCode >= 500) {
    return "server";
  }

  return "unknown";
}

/**
 * Extract validation error messages from Xero error response
 */
export function extractValidationErrors(
  errorResponse: XeroErrorResponse
): string[] {
  const errors: string[] = [];

  // Direct validation errors
  if (errorResponse.ValidationErrors) {
    for (const error of errorResponse.ValidationErrors) {
      errors.push(error.Message);
    }
  }

  // Element-level validation errors
  if (errorResponse.Elements) {
    for (const element of errorResponse.Elements) {
      if (element.ValidationErrors) {
        for (const error of element.ValidationErrors) {
          errors.push(error.Message);
        }
      }
    }
  }

  return errors;
}

/**
 * Generate user-friendly error message based on error type
 */
export function generateUserMessage(
  type: XeroErrorType,
  validationErrors: string[],
  errorResponse?: XeroErrorResponse
): string {
  switch (type) {
    case "validation":
      if (validationErrors.length > 0) {
        return `Validation error: ${validationErrors.join("; ")}`;
      }
      return (
        errorResponse?.Detail ||
        "The request contained invalid data. Please check your input."
      );

    case "authorization":
      return "Your Xero connection has expired or lacks the required permissions. Please reconnect your Xero account in Settings > Integrations.";

    case "token":
      if (errorResponse?.Type === "invalid_grant") {
        return "Your Xero authorization has been revoked. Please reconnect your Xero account.";
      }
      if (errorResponse?.Type === "invalid_client") {
        return "Xero authentication configuration error. Please contact support.";
      }
      return "Your Xero connection needs to be re-authorized. Please reconnect in Settings > Integrations.";

    case "rate_limit":
      return "Too many requests to Xero. Please wait a few minutes before trying again.";

    case "server":
      return "Xero is experiencing technical difficulties. Please try again later.";

    case "network":
      return "Unable to connect to Xero. Please check your internet connection and try again.";

    default:
      return (
        errorResponse?.Detail ||
        errorResponse?.Title ||
        "An unexpected error occurred with Xero."
      );
  }
}

/**
 * Parse Xero API error into structured format
 * Implements Xero best practices for error handling
 */
export function parseXeroError(
  error: unknown,
  correlationId?: string
): ParsedXeroError {
  // Network/fetch errors
  if (error instanceof TypeError) {
    return {
      type: "network",
      message: error.message,
      userMessage:
        "Unable to connect to Xero. Please check your internet connection.",
      correlationId,
      originalError: error,
    };
  }

  // HTTP response errors
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as any).response;
    const statusCode = response?.status;
    const errorResponse: XeroErrorResponse =
      response?.body || response?.data || {};

    const type = categorizeXeroError(statusCode, errorResponse, error);
    const validationErrors = extractValidationErrors(errorResponse);
    const userMessage = generateUserMessage(
      type,
      validationErrors,
      errorResponse
    );

    // Extract message from error object safely
    const errorMessage =
      errorResponse.Detail ||
      errorResponse.Title ||
      (error instanceof Error ? error.message : String(error));

    return {
      type,
      message: errorMessage,
      userMessage,
      correlationId,
      statusCode,
      details: validationErrors.length > 0 ? validationErrors : undefined,
      originalError: error,
    };
  }

  // Generic errors
  const message = error instanceof Error ? error.message : String(error);
  return {
    type: "unknown",
    message,
    userMessage: `An unexpected error occurred: ${message}`,
    correlationId,
    originalError: error,
  };
}

/**
 * Format error for logging with all relevant details
 */
export function formatErrorForLogging(parsedError: ParsedXeroError): string {
  const parts = [`[${parsedError.type.toUpperCase()}]`, parsedError.message];

  if (parsedError.statusCode) {
    parts.push(`(Status: ${parsedError.statusCode})`);
  }

  if (parsedError.correlationId) {
    parts.push(`[Correlation-Id: ${parsedError.correlationId}]`);
  }

  if (parsedError.details && parsedError.details.length > 0) {
    parts.push(`\nValidation errors: ${parsedError.details.join(", ")}`);
  }

  return parts.join(" ");
}

/**
 * Determine if error requires immediate reconnection
 */
export function requiresReconnection(parsedError: ParsedXeroError): boolean {
  return (
    parsedError.type === "authorization" ||
    parsedError.type === "token" ||
    parsedError.statusCode === 401 ||
    parsedError.statusCode === 403
  );
}
