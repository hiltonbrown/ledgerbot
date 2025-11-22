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

/**
 * Determine if error is retryable
 * Xero best practice: Retry transient failures with exponential backoff
 */
export function isRetryableError(parsedError: ParsedXeroError): boolean {
  // Server errors are retryable
  if (parsedError.type === "server") {
    return true;
  }

  // Rate limit errors are retryable (after waiting)
  if (parsedError.type === "rate_limit") {
    return true;
  }

  // Network errors are retryable
  if (parsedError.type === "network") {
    return true;
  }

  // 502, 503, 504 errors are retryable
  if (
    parsedError.statusCode === 502 ||
    parsedError.statusCode === 503 ||
    parsedError.statusCode === 504
  ) {
    return true;
  }

  return false;
}

/**
 * Retry configuration for Xero API calls
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
  backoffMultiplier: 2, // Exponential backoff
};

/**
 * Retry a Xero API call with exponential backoff
 * Xero best practice: Implement retry logic for transient failures
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  shouldRetry?: (error: ParsedXeroError) => boolean
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
  }: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: ParsedXeroError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const parsedError = parseXeroError(error);
      lastError = parsedError;

      // Check if we should retry
      const canRetry =
        attempt < maxRetries &&
        (shouldRetry
          ? shouldRetry(parsedError)
          : isRetryableError(parsedError));

      if (!canRetry) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * backoffMultiplier ** attempt,
        maxDelayMs
      );

      console.warn(
        `[Xero Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${delay}ms...`,
        {
          errorType: parsedError.type,
          message: parsedError.message,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw new Error(
    lastError?.userMessage ||
      "Xero API call failed after multiple retry attempts"
  );
}
