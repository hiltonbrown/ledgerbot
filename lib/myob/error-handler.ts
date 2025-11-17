/**
 * MYOB API Error Handling
 *
 * Handles MYOB-specific errors and maps them to user-friendly messages
 */

export interface MyobApiError {
  message: string;
  type: string;
  statusCode?: number;
  details?: string;
  isRetryable?: boolean;
  requiresReauth?: boolean;
}

/**
 * Parse MYOB API error response
 */
export function parseMyobError(error: unknown): MyobApiError {
  // Handle fetch errors
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Network errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("econnrefused")
    ) {
      return {
        message: "Network error connecting to MYOB API",
        type: "network_error",
        details: error.message,
        isRetryable: true,
        requiresReauth: false,
      };
    }

    // Timeout errors
    if (errorMessage.includes("timeout") || errorMessage.includes("aborted")) {
      return {
        message: "Request to MYOB API timed out",
        type: "timeout_error",
        details: error.message,
        isRetryable: true,
        requiresReauth: false,
      };
    }
  }

  // Handle HTTP response errors
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;

    // Extract status code
    const statusCode =
      typeof errorObj.status === "number"
        ? errorObj.status
        : typeof errorObj.statusCode === "number"
          ? errorObj.statusCode
          : undefined;

    // Extract error message from response
    let errorMessage = "Unknown MYOB API error";
    let errorDetails: string | undefined;

    if (typeof errorObj.message === "string") {
      errorMessage = errorObj.message;
    } else if (typeof errorObj.error === "string") {
      errorMessage = errorObj.error;
    } else if (
      typeof errorObj.error === "object" &&
      errorObj.error !== null
    ) {
      const nestedError = errorObj.error as Record<string, unknown>;
      if (typeof nestedError.message === "string") {
        errorMessage = nestedError.message;
      }
    }

    // Extract additional details
    if (typeof errorObj.details === "string") {
      errorDetails = errorObj.details;
    } else if (typeof errorObj.error_description === "string") {
      errorDetails = errorObj.error_description;
    }

    // Map status codes to error types
    if (statusCode) {
      switch (statusCode) {
        case 401:
          return {
            message: "Authentication failed - please reconnect your MYOB account",
            type: "authentication_error",
            statusCode,
            details: errorDetails || errorMessage,
            isRetryable: false,
            requiresReauth: true,
          };

        case 403:
          return {
            message:
              "Access forbidden - you may not have permission to access this MYOB resource",
            type: "permission_error",
            statusCode,
            details: errorDetails || errorMessage,
            isRetryable: false,
            requiresReauth: false,
          };

        case 404:
          return {
            message: "MYOB resource not found",
            type: "not_found_error",
            statusCode,
            details: errorDetails || errorMessage,
            isRetryable: false,
            requiresReauth: false,
          };

        case 429:
          return {
            message: "MYOB API rate limit exceeded - please try again later",
            type: "rate_limit_error",
            statusCode,
            details: errorDetails || errorMessage,
            isRetryable: true,
            requiresReauth: false,
          };

        case 500:
        case 502:
        case 503:
        case 504:
          return {
            message: "MYOB API server error - please try again later",
            type: "server_error",
            statusCode,
            details: errorDetails || errorMessage,
            isRetryable: true,
            requiresReauth: false,
          };

        case 400:
          return {
            message: "Invalid request to MYOB API",
            type: "validation_error",
            statusCode,
            details: errorDetails || errorMessage,
            isRetryable: false,
            requiresReauth: false,
          };

        default:
          return {
            message: `MYOB API error (${statusCode})`,
            type: "api_error",
            statusCode,
            details: errorDetails || errorMessage,
            isRetryable: statusCode >= 500,
            requiresReauth: false,
          };
      }
    }

    // Handle OAuth-specific errors
    if (typeof errorObj.error === "string") {
      const oauthError = errorObj.error;

      if (oauthError === "invalid_grant") {
        return {
          message:
            "MYOB authorization expired - please reconnect your MYOB account",
          type: "invalid_grant",
          details: errorDetails,
          isRetryable: false,
          requiresReauth: true,
        };
      }

      if (oauthError === "invalid_client") {
        return {
          message: "MYOB API credentials are invalid",
          type: "invalid_client",
          details: errorDetails,
          isRetryable: false,
          requiresReauth: true,
        };
      }

      if (oauthError === "access_denied") {
        return {
          message: "MYOB access denied - user cancelled authorization",
          type: "access_denied",
          details: errorDetails,
          isRetryable: false,
          requiresReauth: false,
        };
      }
    }
  }

  // Fallback for unknown errors
  return {
    message: "An unexpected error occurred with MYOB integration",
    type: "unknown_error",
    details:
      error instanceof Error ? error.message : JSON.stringify(error, null, 2),
    isRetryable: false,
    requiresReauth: false,
  };
}

/**
 * Get user-friendly error message for display
 */
export function getMyobErrorMessage(error: unknown): string {
  const parsedError = parseMyobError(error);
  return parsedError.message;
}

/**
 * Check if error requires re-authentication
 */
export function requiresMyobReauth(error: unknown): boolean {
  const parsedError = parseMyobError(error);
  return parsedError.requiresReauth || false;
}

/**
 * Check if error is retryable
 */
export function isMyobErrorRetryable(error: unknown): boolean {
  const parsedError = parseMyobError(error);
  return parsedError.isRetryable || false;
}
