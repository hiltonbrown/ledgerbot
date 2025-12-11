/**
 * CSV to Spreadsheet Artifact Conversion
 *
 * Main entry point for converting CSV data into structured SpreadsheetArtifact objects.
 * Orchestrates parsing, validation, schema application, and issue tracking.
 *
 * @module lib/csv/toSpreadsheetArtifact
 */

import { nanoid } from "nanoid";
import type {
  CellIssue,
  SpreadsheetArtifact,
  SpreadsheetCell,
  SpreadsheetRow,
} from "@/artifacts/sheet/types";
import { parseCsv } from "./parser";
import { type CsvSchema, getGenericSchema, getSchemaById } from "./schema";
import { validateCell } from "./validation";

/**
 * Options for building a SpreadsheetArtifact from CSV.
 */
export interface BuildSpreadsheetArtifactOptions {
  /** CSV input (string or ArrayBuffer) */
  input: string | ArrayBuffer;
  /** Original filename (for user reference) */
  sourceFileName: string;
  /** Optional schema ID (e.g., "bank-feed-v1") - defaults to "generic" */
  importType?: string;
  /** Whether CSV has a header row (default: true) */
  hasHeader?: boolean;
}

/**
 * Determines row status based on cell issues.
 *
 * Rules:
 * - "error" if any cell has error-level issue (MISSING_REQUIRED, INVALID_TYPE, PARSING_ERROR)
 * - "warning" if any cell has warning-level issue (OUT_OF_RANGE, SECURITY_SANITISED, ENCODING_WARNING, COLUMN_MISMATCH)
 * - "valid" otherwise
 *
 * @param cells - Array of cells in row
 * @returns Row status
 */
function determineRowStatus(
  cells: SpreadsheetCell[]
): "valid" | "warning" | "error" {
  const errorCodes = ["MISSING_REQUIRED", "INVALID_TYPE", "PARSING_ERROR"];
  const warningCodes = [
    "OUT_OF_RANGE",
    "SECURITY_SANITISED",
    "ENCODING_WARNING",
    "COLUMN_MISMATCH",
  ];

  let hasError = false;
  let hasWarning = false;

  for (const cell of cells) {
    if (!cell.issues || cell.issues.length === 0) {
      continue;
    }

    for (const issue of cell.issues) {
      if (errorCodes.includes(issue.code)) {
        hasError = true;
        break;
      }
      if (warningCodes.includes(issue.code)) {
        hasWarning = true;
      }
    }

    if (hasError) {
      break;
    }
  }

  if (hasError) {
    return "error";
  }
  if (hasWarning) {
    return "warning";
  }
  return "valid";
}

/**
 * Matches CSV header columns to schema fields.
 *
 * Case-insensitive matching of column headers to schema field definitions.
 *
 * @param header - CSV header row
 * @param schema - Schema definition
 * @returns Map of column index to field definition (null for unmatched columns)
 */
function matchHeaderToSchema(
  header: string[] | null,
  schema: CsvSchema
): Map<number, (typeof schema.fields)[0] | null> {
  const fieldMap = new Map<number, (typeof schema.fields)[0] | null>();

  if (!header) {
    return fieldMap;
  }

  // Create lowercase header lookup for case-insensitive matching
  const headerLower = header.map((col) => col.toLowerCase().trim());

  // For each column, try to find matching field
  for (let colIndex = 0; colIndex < header.length; colIndex += 1) {
    const columnHeader = headerLower[colIndex];

    // Find matching field in schema
    const matchedField = schema.fields.find(
      (field) => field.columnHeader.toLowerCase().trim() === columnHeader
    );

    fieldMap.set(colIndex, matchedField || null);
  }

  return fieldMap;
}

/**
 * Builds a SpreadsheetArtifact from CSV input.
 *
 * Process:
 * 1. Parse CSV using parseCsv()
 * 2. Determine schema (from importType or use generic)
 * 3. Match header columns to schema fields
 * 4. Validate each cell according to schema
 * 5. Detect column mismatches
 * 6. Integrate parser errors as PARSING_ERROR issues
 * 7. Compute row statuses and summary statistics
 *
 * Security:
 * - Does NOT apply formula injection sanitisation (use sanitiseSpreadsheetForExport before export)
 * - Does NOT import UI components (server-safe)
 *
 * @param options - Build options
 * @returns Complete SpreadsheetArtifact with validation metadata
 */
export async function buildSpreadsheetArtifactFromCsv(
  options: BuildSpreadsheetArtifactOptions
): Promise<SpreadsheetArtifact> {
  const { input, sourceFileName, importType, hasHeader = true } = options;

  // Step 1: Parse CSV
  const parsed = parseCsv(input, { hasHeader });

  // Step 2: Determine schema
  const schema = importType
    ? getSchemaById(importType) || getGenericSchema()
    : getGenericSchema();

  // Step 3: Match header to schema fields
  const fieldMap = matchHeaderToSchema(parsed.header, schema);

  // Determine expected column count
  const expectedColumnCount = parsed.header
    ? parsed.header.length
    : schema.fields.length > 0
      ? schema.fields.length
      : undefined;

  // Step 4: Process each row
  const rows: SpreadsheetRow[] = [];

  for (let rowIndex = 0; rowIndex < parsed.rows.length; rowIndex += 1) {
    const rawRow = parsed.rows[rowIndex];
    if (!rawRow) {
      continue;
    }

    // Calculate 1-based line number (accounting for header if present)
    const lineNumber = hasHeader ? rowIndex + 2 : rowIndex + 1;

    // Detect column mismatch
    const columnMismatch =
      expectedColumnCount !== undefined &&
      rawRow.length !== expectedColumnCount;

    // Build cells
    const cells: SpreadsheetCell[] = [];

    for (let colIndex = 0; colIndex < rawRow.length; colIndex += 1) {
      const rawValue = rawRow[colIndex] || "";

      // Get field definition for this column
      const field = fieldMap.get(colIndex) || null;

      // Validate cell
      const cell = validateCell(rawValue, field);

      // Add column mismatch issue if needed (only on first cell for clarity)
      if (columnMismatch && colIndex === 0) {
        const mismatchIssue: CellIssue = {
          code: "COLUMN_MISMATCH",
          message: `Expected ${expectedColumnCount} columns, found ${rawRow.length}`,
        };
        cell.issues = [...(cell.issues || []), mismatchIssue];
      }

      // Check for encoding warnings (� character)
      if (rawValue.includes("�")) {
        const encodingIssue: CellIssue = {
          code: "ENCODING_WARNING",
          message: "Encoding corruption detected (� character)",
        };
        cell.issues = [...(cell.issues || []), encodingIssue];
      }

      cells.push(cell);
    }

    // Determine row status
    const rowStatus = determineRowStatus(cells);

    rows.push({
      lineNumber,
      cells,
      rowStatus,
    });
  }

  // Step 5: Integrate parser errors as PARSING_ERROR issues
  // Add parser errors to corresponding rows
  for (const parseError of parsed.parseErrors) {
    const rowIndex = parseError.lineNumber - (hasHeader ? 2 : 1);
    if (rowIndex >= 0 && rowIndex < rows.length) {
      const row = rows[rowIndex];
      if (row && row.cells.length > 0) {
        const firstCell = row.cells[0];
        if (firstCell) {
          const parsingIssue: CellIssue = {
            code: "PARSING_ERROR",
            message: parseError.message,
          };
          firstCell.issues = [...(firstCell.issues || []), parsingIssue];
          // Re-determine row status
          row.rowStatus = determineRowStatus(row.cells);
        }
      }
    }
  }

  // Step 6: Compute summary statistics
  const summary = {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.rowStatus === "valid").length,
    warningRows: rows.filter((row) => row.rowStatus === "warning").length,
    errorRows: rows.filter((row) => row.rowStatus === "error").length,
  };

  // Step 7: Build artifact
  const artifact: SpreadsheetArtifact = {
    id: nanoid(),
    title: sourceFileName.replace(/\.(csv|CSV)$/, ""),
    sourceFileName,
    encoding: parsed.encoding,
    delimiter: parsed.delimiter,
    schemaId: schema.id !== "generic" ? schema.id : undefined,
    createdAt: new Date().toISOString(),
    header: parsed.header || undefined,
    rows,
    summary,
  };

  return artifact;
}
