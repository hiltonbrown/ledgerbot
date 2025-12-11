/**
 * CSV Security Sanitisation
 *
 * Prevents CSV injection (formula injection) attacks by detecting and sanitising
 * cells that begin with formula-triggering characters.
 *
 * Formula injection occurs when user-controlled CSV data contains cells starting with:
 * - `=` (Excel formula)
 * - `+` (Excel formula)
 * - `-` (Excel formula)
 * - `@` (Excel formula)
 * - `\t` (Tab character, potential exploit)
 * - `\r` (Carriage return, potential exploit)
 *
 * When detected, we prefix the value with a single quote (') to force Excel/Sheets
 * to treat it as a literal string.
 *
 * @module lib/csv/sanitise
 */

import type {
  SpreadsheetArtifact,
  SpreadsheetCell,
  SpreadsheetRow,
} from "@/artifacts/sheet/types";

/**
 * Characters that trigger formula execution in spreadsheet applications.
 */
const FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Checks if a raw cell value requires sanitisation (formula injection prevention).
 *
 * @param rawValue - Original raw cell value
 * @returns True if value starts with formula trigger character
 */
export function requiresSanitisation(rawValue: string): boolean {
  if (!rawValue || typeof rawValue !== "string") {
    return false;
  }

  const trimmed = rawValue.trim();
  if (trimmed === "") {
    return false;
  }

  // Check if starts with formula trigger character
  return FORMULA_TRIGGER_CHARS.some((char) => trimmed.startsWith(char));
}

/**
 * Sanitises a raw cell value by prefixing with single quote if needed.
 *
 * Example:
 * - "=SUM(A1:A10)" -> "'=SUM(A1:A10)"
 * - "+1234" -> "'+1234"
 * - "Normal text" -> "Normal text" (no change)
 *
 * @param rawValue - Original raw cell value
 * @returns Sanitised value (prefixed with ' if needed)
 */
export function sanitiseRawValue(rawValue: string): string {
  if (!requiresSanitisation(rawValue)) {
    return rawValue;
  }

  // Prefix with single quote to force literal string interpretation
  return `'${rawValue.trim()}`;
}

/**
 * Sanitises a SpreadsheetCell for safe export to CSV/Excel.
 *
 * If the raw value starts with a formula trigger character:
 * - Updates `value` to include the ' prefix
 * - Adds a SECURITY_SANITISED issue
 * - Sets `securitySanitised` flag to true
 * - Preserves original `raw` value for debugging
 *
 * @param cell - Cell to sanitise
 * @returns New cell with sanitisation applied
 */
export function sanitiseCellForExport(cell: SpreadsheetCell): SpreadsheetCell {
  if (!requiresSanitisation(cell.raw)) {
    return cell;
  }

  const sanitisedValue = sanitiseRawValue(cell.raw);

  // Create new issue array (preserve existing issues)
  const issues = [...(cell.issues || [])];

  // Add SECURITY_SANITISED issue if not already present
  const alreadyFlagged = issues.some(
    (issue) => issue.code === "SECURITY_SANITISED"
  );
  if (!alreadyFlagged) {
    issues.push({
      code: "SECURITY_SANITISED",
      message: "Formula injection prevented: value prefixed with single quote",
    });
  }

  return {
    ...cell,
    value: sanitisedValue, // Update value to sanitised version
    issues,
    securitySanitised: true,
  };
}

/**
 * Sanitises all cells in a SpreadsheetRow for safe export.
 *
 * Updates row status if any cells were sanitised:
 * - If row was "valid", becomes "warning"
 * - If row was already "warning" or "error", status unchanged
 *
 * @param row - Row to sanitise
 * @returns New row with all cells sanitised
 */
export function sanitiseRowForExport(row: SpreadsheetRow): SpreadsheetRow {
  const sanitisedCells = row.cells.map(sanitiseCellForExport);

  // Check if any cells were sanitised
  const anySanitised = sanitisedCells.some((cell) => cell.securitySanitised);

  // Update row status if needed
  let newRowStatus = row.rowStatus;
  if (anySanitised && row.rowStatus === "valid") {
    newRowStatus = "warning";
  }

  return {
    ...row,
    cells: sanitisedCells,
    rowStatus: newRowStatus,
  };
}

/**
 * Sanitises an entire SpreadsheetArtifact for safe export to CSV/Excel.
 *
 * This should be called before:
 * - Exporting to CSV file
 * - Passing to external systems
 * - Displaying in downloadable formats
 *
 * Updates summary statistics if row statuses changed.
 *
 * @param artifact - Artifact to sanitise
 * @returns New artifact with all cells sanitised
 */
export function sanitiseSpreadsheetForExport(
  artifact: SpreadsheetArtifact
): SpreadsheetArtifact {
  const sanitisedRows = artifact.rows.map(sanitiseRowForExport);

  // Recalculate summary statistics
  const summary = {
    totalRows: sanitisedRows.length,
    validRows: sanitisedRows.filter((row) => row.rowStatus === "valid").length,
    warningRows: sanitisedRows.filter((row) => row.rowStatus === "warning")
      .length,
    errorRows: sanitisedRows.filter((row) => row.rowStatus === "error").length,
  };

  return {
    ...artifact,
    rows: sanitisedRows,
    summary,
  };
}

/**
 * Counts the number of cells that require sanitisation in an artifact.
 *
 * Useful for displaying warnings to users before export.
 *
 * @param artifact - Artifact to analyse
 * @returns Number of cells requiring sanitisation
 */
export function countSanitisationNeeded(artifact: SpreadsheetArtifact): number {
  let count = 0;
  for (const row of artifact.rows) {
    for (const cell of row.cells) {
      if (requiresSanitisation(cell.raw)) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * Checks if an artifact requires any sanitisation.
 *
 * @param artifact - Artifact to check
 * @returns True if any cells require sanitisation
 */
export function artifactNeedsSanitisation(
  artifact: SpreadsheetArtifact
): boolean {
  return countSanitisationNeeded(artifact) > 0;
}
