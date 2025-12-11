/**
 * Spreadsheet Artifact Type System
 *
 * This module defines the complete type hierarchy for LedgerBot's spreadsheet artifacts.
 * Spreadsheet artifacts are structured data objects created from CSV files or generated
 * by AI agents, with comprehensive validation, typing, and issue tracking.
 *
 * @module lib/artifacts/spreadsheet/types
 */

/**
 * Supported cell data types after normalisation.
 * - `string`: Text content (default fallback)
 * - `number`: Numeric values (parsed from various formats)
 * - `date`: Date/time values (parsed from configured formats)
 * - `boolean`: Boolean values (true/false, yes/no, 1/0)
 * - `empty`: Explicitly empty cell (null or whitespace-only)
 */
export type CellType = "string" | "number" | "date" | "boolean" | "empty";

/**
 * Issue codes for cell-level and row-level validation problems.
 *
 * Usage:
 * - UI should render visual indicators (icons, colors) based on severity
 * - Agents should filter or flag rows based on issue codes
 * - Export functions should handle or warn about security issues
 */
export type CellIssueCode =
  | "MISSING_REQUIRED" // Required field is empty (severity: error)
  | "INVALID_TYPE" // Value doesn't match expected type (severity: error)
  | "OUT_OF_RANGE" // Numeric value outside min/max bounds (severity: warning)
  | "COLUMN_MISMATCH" // Row has different column count than expected (severity: warning)
  | "SECURITY_SANITISED" // Formula injection detected and sanitised (severity: warning)
  | "ENCODING_WARNING" // Encoding corruption detected (� character) (severity: warning)
  | "PARSING_ERROR"; // CSV parser encountered malformed data (severity: error)

/**
 * Represents a validation or processing issue for a specific cell.
 *
 * Examples:
 * - { code: "MISSING_REQUIRED", message: "Invoice date is required", field: "invoice_date" }
 * - { code: "SECURITY_SANITISED", message: "Formula prefix removed", field: "description" }
 */
export interface CellIssue {
  /** Standardised issue code for programmatic handling */
  code: CellIssueCode;
  /** Human-readable description of the issue */
  message: string;
  /** Optional field name from schema (useful for field-specific validation) */
  field?: string;
}

/**
 * Represents a single cell in a spreadsheet with full metadata.
 *
 * Structure:
 * - `raw`: Original unparsed value from CSV (preserved for debugging/export)
 * - `value`: Normalised, typed value (null if parsing failed or empty)
 * - `type`: Detected or validated type
 * - `issues`: Array of validation/processing issues (empty if valid)
 * - `securitySanitised`: Flag indicating formula injection prevention was applied
 *
 * Example:
 * ```ts
 * {
 *   raw: "=SUM(A1:A10)",
 *   value: "'=SUM(A1:A10)",
 *   type: "string",
 *   issues: [{ code: "SECURITY_SANITISED", message: "Formula prefix removed" }],
 *   securitySanitised: true
 * }
 * ```
 */
export interface SpreadsheetCell {
  /** Original raw value from CSV before any processing */
  raw: string;
  /** Normalised and typed value (string | number | Date | boolean | null) */
  value: string | number | Date | boolean | null;
  /** Detected or validated cell type */
  type: CellType;
  /** Array of validation/processing issues (empty for valid cells) */
  issues?: CellIssue[];
  /** True if security sanitisation was applied (formula injection prevention) */
  securitySanitised?: boolean;
}

/**
 * Represents a single row in a spreadsheet with status aggregation.
 *
 * Row Status Rules:
 * - `valid`: No issues in any cell
 * - `warning`: Contains warnings (SECURITY_SANITISED, OUT_OF_RANGE, COLUMN_MISMATCH, ENCODING_WARNING)
 * - `error`: Contains errors (MISSING_REQUIRED, INVALID_TYPE, PARSING_ERROR)
 *
 * Usage:
 * - UI should color-code rows based on `rowStatus`
 * - Agents should typically filter to only `valid` rows or explicitly handle warnings/errors
 * - Export functions should warn users about error rows before export
 */
export interface SpreadsheetRow {
  /** 1-based line number from original CSV (for error reporting) */
  lineNumber: number;
  /** Array of cells (length should match header or expected column count) */
  cells: SpreadsheetCell[];
  /** Aggregate status: valid, warning, or error (derived from cell issues) */
  rowStatus: "valid" | "warning" | "error";
}

/**
 * Summary statistics for the entire spreadsheet.
 *
 * Used by:
 * - UI to display aggregate status banner
 * - Agents to decide whether to proceed with processing
 * - Logging/telemetry
 *
 * Example:
 * ```ts
 * {
 *   totalRows: 150,
 *   validRows: 142,
 *   warningRows: 5,
 *   errorRows: 3
 * }
 * ```
 */
export interface SpreadsheetSummary {
  /** Total number of data rows (excluding header) */
  totalRows: number;
  /** Number of rows with rowStatus === "valid" */
  validRows: number;
  /** Number of rows with rowStatus === "warning" */
  warningRows: number;
  /** Number of rows with rowStatus === "error" */
  errorRows: number;
}

/**
 * The canonical spreadsheet artifact structure.
 *
 * This is the primary data structure for all CSV ingestion, AI-generated spreadsheets,
 * and data validation workflows in LedgerBot.
 *
 * Structure:
 * - `id`: Unique identifier (nanoid or UUID)
 * - `title`: Human-readable title (e.g., "Bank Feed Import - 2024-Q1")
 * - `sourceFileName`: Original filename (for user reference)
 * - `encoding`: Detected encoding (warn user if "unknown")
 * - `delimiter`: Detected CSV delimiter (usually ",")
 * - `schemaId`: Optional schema identifier (e.g., "bank-feed-v1")
 * - `createdAt`: ISO 8601 timestamp
 * - `header`: Optional header row (column names)
 * - `rows`: Array of data rows with full metadata
 * - `summary`: Aggregate statistics
 *
 * Usage:
 * - Store in database `Document` table with kind="sheet" and content=JSON.stringify(artifact)
 * - Pass to UI components for rendering with validation indicators
 * - Pass to Vercel AI SDK agents for structured data access
 * - Export to CSV with security sanitisation applied
 *
 * Example:
 * ```ts
 * const artifact: SpreadsheetArtifact = {
 *   id: "doc_abc123",
 *   title: "Bank Feed Import",
 *   sourceFileName: "bank_feed_2024_q1.csv",
 *   encoding: "utf-8",
 *   delimiter: ",",
 *   schemaId: "bank-feed-v1",
 *   createdAt: "2024-01-15T10:30:00Z",
 *   header: ["date", "description", "amount", "balance"],
 *   rows: [...],
 *   summary: { totalRows: 150, validRows: 142, warningRows: 5, errorRows: 3 }
 * };
 * ```
 */
export interface SpreadsheetArtifact {
  /** Unique artifact identifier (nanoid or UUID) */
  id: string;
  /** Human-readable title for UI display */
  title: string;
  /** Original source filename (for user reference and debugging) */
  sourceFileName: string;
  /** Detected encoding: "utf-8" or "unknown" (warn user if unknown) */
  encoding: "utf-8" | "unknown";
  /** Detected CSV delimiter (usually "," or ";") */
  delimiter: string;
  /** Optional schema identifier (e.g., "bank-feed-v1", "invoice-import-v1") */
  schemaId?: string;
  /** ISO 8601 timestamp of artifact creation */
  createdAt: string;
  /** Optional header row (column names) - null if CSV has no header */
  header?: string[];
  /** Array of data rows with full validation metadata */
  rows: SpreadsheetRow[];
  /** Aggregate summary statistics for UI and agent decision-making */
  summary: SpreadsheetSummary;
}
