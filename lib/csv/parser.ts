/**
 * CSV Parser Wrapper
 *
 * Centralised CSV parsing using PapaParse with robust error handling,
 * encoding detection, and delimiter detection.
 *
 * Features:
 * - Supports both string and ArrayBuffer input
 * - Detects encoding issues (� character)
 * - Detects CSV delimiter (comma, semicolon, tab)
 * - Never auto-infers types (always returns strings)
 * - Captures all parsing errors with line numbers
 * - Handles malformed rows, quoting issues, etc.
 *
 * @module lib/csv/parser
 */

import { parse as papaParse } from "papaparse";

/**
 * Result of CSV parsing operation.
 */
export interface ParsedCsv {
  /** Header row (null if hasHeader=false or parsing failed) */
  header: string[] | null;
  /** Array of data rows (each row is an array of string values) */
  rows: string[][];
  /** Detected delimiter (e.g., ",", ";", "\t") */
  delimiter: string;
  /** Detected encoding: "utf-8" or "unknown" if corruption detected */
  encoding: "utf-8" | "unknown";
  /** Array of parsing errors with line numbers */
  parseErrors: { lineNumber: number; message: string }[];
}

/**
 * Options for CSV parsing.
 */
export interface ParseCsvOptions {
  /** Whether the first row is a header (default: true) */
  hasHeader?: boolean;
  /** Expected delimiter (default: auto-detect) */
  delimiter?: string;
}

/**
 * Detects encoding issues by checking for replacement character (�).
 *
 * @param content - CSV content as string
 * @returns "utf-8" if no issues, "unknown" if corruption detected
 */
function detectEncoding(content: string): "utf-8" | "unknown" {
  return content.includes("�") ? "unknown" : "utf-8";
}

/**
 * Converts ArrayBuffer to string using TextDecoder.
 *
 * @param buffer - Input ArrayBuffer
 * @returns Decoded string (UTF-8)
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
}

/**
 * Parses CSV content into structured data with full error handling.
 *
 * Behavior:
 * - Accepts string or ArrayBuffer input
 * - Auto-detects delimiter if not specified
 * - Never auto-infers types (all values are strings)
 * - Detects encoding corruption (� character)
 * - Captures all parser errors with line numbers
 * - Handles malformed rows gracefully
 *
 * Example:
 * ```ts
 * const result = parseCsv(csvContent, { hasHeader: true });
 * if (result.encoding === "unknown") {
 *   console.warn("Encoding issues detected");
 * }
 * if (result.parseErrors.length > 0) {
 *   console.error("Parse errors:", result.parseErrors);
 * }
 * ```
 *
 * @param input - CSV content (string or ArrayBuffer)
 * @param options - Parsing options
 * @returns Parsed CSV data with metadata and errors
 */
export function parseCsv(
  input: string | ArrayBuffer,
  options: ParseCsvOptions = {}
): ParsedCsv {
  const { hasHeader = true, delimiter } = options;

  // Convert ArrayBuffer to string if needed
  const content =
    typeof input === "string" ? input : arrayBufferToString(input);

  // Detect encoding issues
  const encoding = detectEncoding(content);

  // Parse with PapaParse
  const parseResult = papaParse<string[]>(content, {
    delimiter: delimiter, // undefined = auto-detect
    header: false, // We handle header manually
    skipEmptyLines: false, // We need to preserve empty lines for accurate line numbers
    dynamicTyping: false, // NEVER auto-infer types
    transformHeader: undefined, // No header transformation
    transform: undefined, // No value transformation
  });

  // Extract delimiter (PapaParse auto-detects if not specified)
  const detectedDelimiter = parseResult.meta.delimiter || ",";

  // Extract errors with line numbers
  const parseErrors = parseResult.errors.map((error) => ({
    lineNumber: error.row !== undefined ? error.row + 1 : 0, // 1-based line numbers
    message: error.message || "Unknown parsing error",
  }));

  // Extract header and data rows
  let header: string[] | null = null;
  let rows: string[][] = [];

  if (parseResult.data.length === 0) {
    // Empty CSV
    return {
      header: null,
      rows: [],
      delimiter: detectedDelimiter,
      encoding,
      parseErrors,
    };
  }

  // Handle header row
  if (hasHeader && parseResult.data.length > 0) {
    const headerRow = parseResult.data[0];
    if (headerRow && headerRow.length > 0) {
      header = headerRow.map((cell) => (cell || "").trim());
      rows = parseResult.data.slice(1);
    } else {
      // Empty header row
      rows = parseResult.data.slice(1);
    }
  } else {
    rows = parseResult.data;
  }

  // Filter out completely empty rows (all cells are empty strings)
  rows = rows.filter((row) => {
    return row.some((cell) => (cell || "").trim() !== "");
  });

  return {
    header,
    rows,
    delimiter: detectedDelimiter,
    encoding,
    parseErrors,
  };
}
