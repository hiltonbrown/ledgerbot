/**
 * CSV Validation and Normalisation
 *
 * Provides utilities for validating and normalising CSV cell values
 * according to schema definitions.
 *
 * @module lib/csv/validation
 */

import { parse as parseDate } from "date-fns";
import type {
  CellIssue,
  CellType,
  SpreadsheetCell,
} from "@/lib/artifacts/spreadsheet/types";
import type { CsvFieldDefinition, CsvFieldType } from "./schema";

/**
 * Normalises a string value to a number.
 *
 * Handles:
 * - Comma and space thousand separators (e.g., "1,000" -> 1000)
 * - Currency symbols (e.g., "$1000" -> 1000)
 * - Parentheses for negative numbers (e.g., "(1000)" -> -1000)
 * - Percentage (e.g., "50%" -> 50)
 *
 * @param value - Raw string value
 * @returns Parsed number or null if invalid
 */
export function normaliseNumber(value: string): number | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  let cleaned = value.trim();

  // Handle empty
  if (cleaned === "") {
    return null;
  }

  // Handle parentheses for negative numbers (accounting format)
  const isNegative = cleaned.startsWith("(") && cleaned.endsWith(")");
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove currency symbols ($, £, €, AUD, etc.)
  cleaned = cleaned.replace(/[$£€A-Z]/g, "");

  // Remove commas and spaces (thousand separators)
  cleaned = cleaned.replace(/[,\s]/g, "");

  // Handle percentage
  const isPercentage = cleaned.endsWith("%");
  if (isPercentage) {
    cleaned = cleaned.slice(0, -1);
  }

  // Try to parse
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) {
    return null;
  }

  // Apply negative if needed
  const result = isNegative ? -parsed : parsed;

  return result;
}

/**
 * Normalises a string value to a Date.
 *
 * Tries multiple date formats in order.
 * Supports Australian (DD/MM/YYYY), ISO (YYYY-MM-DD), and US (MM/DD/YYYY) formats.
 *
 * @param value - Raw string value
 * @param formats - Array of date-fns format strings to try
 * @returns Parsed Date or null if invalid
 */
export function normaliseDate(
  value: string,
  formats: string[] = ["dd/MM/yyyy", "yyyy-MM-dd", "MM/dd/yyyy"]
): Date | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();
  if (cleaned === "") {
    return null;
  }

  // Try each format in order
  for (const format of formats) {
    try {
      const parsed = parseDate(cleaned, format, new Date());
      // Check if valid date (not NaN)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      // Continue to next format
    }
  }

  return null;
}

/**
 * Normalises a string value to a boolean.
 *
 * Accepts:
 * - true: "true", "yes", "y", "1", "on"
 * - false: "false", "no", "n", "0", "off"
 * (case-insensitive)
 *
 * @param value - Raw string value
 * @returns Parsed boolean or null if invalid
 */
export function normaliseBoolean(value: string): boolean | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim().toLowerCase();
  if (cleaned === "") {
    return null;
  }

  const trueValues = ["true", "yes", "y", "1", "on"];
  const falseValues = ["false", "no", "n", "0", "off"];

  if (trueValues.includes(cleaned)) {
    return true;
  }
  if (falseValues.includes(cleaned)) {
    return false;
  }

  return null;
}

/**
 * Validates that a cell is not empty (required field validation).
 *
 * @param value - Cell value
 * @param field - Field definition
 * @returns CellIssue if validation fails, null otherwise
 */
export function validateRequired(
  value: string | number | Date | boolean | null,
  field: CsvFieldDefinition
): CellIssue | null {
  if (!field.required) {
    return null;
  }

  if (value === null || value === "") {
    return {
      code: "MISSING_REQUIRED",
      message: `${field.columnHeader} is required`,
      field: field.name,
    };
  }

  return null;
}

/**
 * Validates that a numeric value is within range.
 *
 * @param value - Numeric value
 * @param field - Field definition with min/max
 * @returns CellIssue if validation fails, null otherwise
 */
export function validateRange(
  value: number,
  field: CsvFieldDefinition
): CellIssue | null {
  if (field.type !== "number") {
    return null;
  }

  if (field.min !== undefined && value < field.min) {
    return {
      code: "OUT_OF_RANGE",
      message: `${field.columnHeader} must be at least ${field.min}`,
      field: field.name,
    };
  }

  if (field.max !== undefined && value > field.max) {
    return {
      code: "OUT_OF_RANGE",
      message: `${field.columnHeader} must be at most ${field.max}`,
      field: field.name,
    };
  }

  return null;
}

/**
 * Validates and normalises a cell value according to field definition.
 *
 * Returns a SpreadsheetCell with:
 * - raw: original value
 * - value: normalised typed value (or null if parsing failed)
 * - type: detected type
 * - issues: array of validation issues
 *
 * @param rawValue - Raw string value from CSV
 * @param field - Field definition (or null for generic string cell)
 * @returns SpreadsheetCell with validation metadata
 */
export function validateCell(
  rawValue: string,
  field: CsvFieldDefinition | null
): SpreadsheetCell {
  const issues: CellIssue[] = [];

  // Default to string type if no field definition
  if (!field) {
    const trimmed = rawValue.trim();
    return {
      raw: rawValue,
      value: trimmed || null,
      type: trimmed === "" ? "empty" : "string",
      issues: [],
    };
  }

  const trimmed = rawValue.trim();

  // Check for empty
  if (trimmed === "") {
    const requiredIssue = validateRequired(null, field);
    if (requiredIssue) {
      issues.push(requiredIssue);
    }
    return {
      raw: rawValue,
      value: null,
      type: "empty",
      issues,
    };
  }

  // Normalise based on expected type
  let normalisedValue: string | number | Date | boolean | null = null;
  let detectedType: CellType = "string";

  switch (field.type) {
    case "number": {
      normalisedValue = normaliseNumber(trimmed);
      if (normalisedValue === null) {
        issues.push({
          code: "INVALID_TYPE",
          message: `${field.columnHeader} must be a valid number`,
          field: field.name,
        });
        detectedType = "string"; // Fallback
      } else {
        detectedType = "number";
        // Validate range
        const rangeIssue = validateRange(normalisedValue, field);
        if (rangeIssue) {
          issues.push(rangeIssue);
        }
      }
      break;
    }

    case "date": {
      normalisedValue = normaliseDate(trimmed, field.dateFormats);
      if (normalisedValue === null) {
        issues.push({
          code: "INVALID_TYPE",
          message: `${field.columnHeader} must be a valid date`,
          field: field.name,
        });
        detectedType = "string"; // Fallback
      } else {
        detectedType = "date";
      }
      break;
    }

    case "boolean": {
      normalisedValue = normaliseBoolean(trimmed);
      if (normalisedValue === null) {
        issues.push({
          code: "INVALID_TYPE",
          message: `${field.columnHeader} must be a valid boolean (true/false)`,
          field: field.name,
        });
        detectedType = "string"; // Fallback
      } else {
        detectedType = "boolean";
      }
      break;
    }

    case "string":
    default: {
      normalisedValue = trimmed;
      detectedType = "string";
      break;
    }
  }

  // If normalisation failed, fallback to string
  if (normalisedValue === null) {
    normalisedValue = trimmed;
    detectedType = "string";
  }

  // Validate required
  const requiredIssue = validateRequired(normalisedValue, field);
  if (requiredIssue) {
    issues.push(requiredIssue);
  }

  return {
    raw: rawValue,
    value: normalisedValue,
    type: detectedType,
    issues,
  };
}

/**
 * Determines cell type from expected field type.
 *
 * @param fieldType - CSV field type
 * @returns Corresponding cell type
 */
export function cellTypeFromFieldType(fieldType: CsvFieldType): CellType {
  switch (fieldType) {
    case "number":
      return "number";
    case "date":
      return "date";
    case "boolean":
      return "boolean";
    case "string":
    default:
      return "string";
  }
}
