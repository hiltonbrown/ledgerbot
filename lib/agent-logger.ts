import { createAgentTrace } from "./db/queries";
import type { AgentTraceInsert } from "./db/schema";

/**
 * Agent logging utility for tracking tool execution and agent performance
 * Provides structured logging with automatic PII redaction for security
 */
export class AgentLogger {
  private chatId: string;
  private messageId: string;

  constructor(chatId: string, messageId: string) {
    this.chatId = chatId;
    this.messageId = messageId;
  }

  /**
   * Logs the start of a tool execution
   * @param toolName - Name of the tool being executed
   * @param toolArgs - Arguments passed to the tool (will be redacted)
   */
  async logToolStart(toolName: string, toolArgs: any): Promise<void> {
    try {
      const trace: AgentTraceInsert = {
        chatId: this.chatId,
        messageId: this.messageId,
        toolName,
        toolArgs: this.redactSensitiveData(toolArgs),
        status: "success", // Will be updated when tool completes
        createdAt: new Date(),
      };

      await createAgentTrace(trace);
    } catch (error) {
      // Don't throw - logging failures shouldn't break agent execution
      console.warn("[AgentLogger] Failed to log tool start:", error);
    }
  }

  /**
   * Logs the completion of a tool execution
   * @param toolName - Name of the tool that completed
   * @param toolResult - Result returned by the tool (will be redacted)
   * @param durationMs - Execution time in milliseconds
   */
  async logToolSuccess(
    toolName: string,
    toolResult: any,
    durationMs: number
  ): Promise<void> {
    try {
      const trace: AgentTraceInsert = {
        chatId: this.chatId,
        messageId: this.messageId,
        toolName,
        toolResult: this.redactSensitiveData(toolResult),
        durationMs,
        status: "success",
        createdAt: new Date(),
      };

      await createAgentTrace(trace);
    } catch (error) {
      console.warn("[AgentLogger] Failed to log tool success:", error);
    }
  }

  /**
   * Logs a tool execution error
   * @param toolName - Name of the tool that failed
   * @param toolArgs - Arguments passed to the tool (will be redacted)
   * @param error - Error that occurred during execution
   * @param durationMs - Execution time in milliseconds before failure
   */
  async logToolError(
    toolName: string,
    toolArgs: any,
    error: Error,
    durationMs?: number
  ): Promise<void> {
    try {
      const trace: AgentTraceInsert = {
        chatId: this.chatId,
        messageId: this.messageId,
        toolName,
        toolArgs: this.redactSensitiveData(toolArgs),
        durationMs,
        status: "error",
        errorDetails: this.sanitizeErrorMessage(error.message),
        createdAt: new Date(),
      };

      await createAgentTrace(trace);
    } catch (logError) {
      console.warn("[AgentLogger] Failed to log tool error:", logError);
    }
  }

  /**
   * Redacts sensitive information from data objects
   * Removes or masks PII, financial data, and credentials
   * @param data - Data object to redact
   * @returns Redacted data object
   */
  private redactSensitiveData(data: any): any {
    if (!data || typeof data !== "object") {
      return data;
    }

    // Create a deep copy to avoid modifying the original
    const redacted = JSON.parse(JSON.stringify(data));

    // Define patterns for sensitive data
    const sensitiveKeys = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /auth/i,
      /credential/i,
      /ssn/i,
      /social.?security/i,
      /credit.?card/i,
      /bank.?account/i,
      /routing.?number/i,
      /tax.?id/i,
      /ein/i,
      /abn/i, // Australian Business Number
      /acn/i, // Australian Company Number
      /tfn/i, // Tax File Number
      /api.?key/i,
      /access.?token/i,
      /refresh.?token/i,
      /authorization/i,
      /bearer/i,
      /email/i,
      /phone/i,
      /address/i,
      /zip.?code/i,
      /post.?code/i,
    ];

    const redactValue = (value: any): any => {
      if (typeof value === "string") {
        // Check for email patterns
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "[REDACTED_EMAIL]";
        }
        // Check for phone patterns
        if (/^\+?[\d\s\-()]{10,}$/.test(value)) {
          return "[REDACTED_PHONE]";
        }
        // Check for potential tokens/keys (long alphanumeric strings)
        if (/^[A-Za-z0-9]{32,}$/.test(value)) {
          return "[REDACTED_TOKEN]";
        }
        // Check for credit card patterns
        if (/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(value)) {
          return "[REDACTED_CC]";
        }
      }
      return value;
    };

    const redactObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map((item) =>
          typeof item === "object" ? redactObject(item) : redactValue(item)
        );
      }

      for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
          // Check if key matches sensitive patterns
          const isSensitive = sensitiveKeys.some((pattern) =>
            pattern.test(key)
          );

          if (isSensitive) {
            obj[key] = "[REDACTED]";
          } else if (typeof obj[key] === "object" && obj[key] !== null) {
            obj[key] = redactObject(obj[key]);
          } else {
            obj[key] = redactValue(obj[key]);
          }
        }
      }

      return obj;
    };

    return redactObject(redacted);
  }

  /**
   * Sanitizes error messages to prevent information leakage
   * @param message - Raw error message
   * @returns Sanitized error message
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove stack traces
    const withoutStack = message.split("\n")[0];

    // Remove file paths
    const withoutPaths = withoutStack.replace(/\/[^\s]+/g, "[PATH]");

    // Limit length to prevent excessive logging
    return withoutPaths.length > 500
      ? withoutPaths.substring(0, 500) + "..."
      : withoutPaths;
  }
}

/**
 * Creates an agent logger instance for a specific chat and message
 * @param chatId - The chat ID for logging
 * @param messageId - The message ID for logging
 * @returns AgentLogger instance
 */
export function createAgentLogger(
  chatId: string,
  messageId: string
): AgentLogger {
  return new AgentLogger(chatId, messageId);
}
