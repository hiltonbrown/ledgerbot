/**
 * CSV Processing Module
 *
 * Central export point for all CSV parsing, validation, schema, and sanitisation utilities.
 *
 * @module lib/csv
 */

export type { ParseCsvOptions, ParsedCsv } from "./parser";
// Parser
export { parseCsv } from "./parser";
// Sanitisation
export {
  artifactNeedsSanitisation,
  countSanitisationNeeded,
  requiresSanitisation,
  sanitiseCellForExport,
  sanitiseRawValue,
  sanitiseRowForExport,
  sanitiseSpreadsheetForExport,
} from "./sanitise";
export type { CsvFieldDefinition, CsvFieldType, CsvSchema } from "./schema";
// Schema
export {
  BANK_FEED_SCHEMA_V1,
  CHART_OF_ACCOUNTS_SCHEMA_V1,
  GENERIC_SCHEMA,
  getAllSchemaIds,
  getGenericSchema,
  getSchemaById,
  INVOICE_IMPORT_SCHEMA_V1,
  registerSchema,
} from "./schema";
export type { BuildSpreadsheetArtifactOptions } from "./toSpreadsheetArtifact";

// Main conversion function
export { buildSpreadsheetArtifactFromCsv } from "./toSpreadsheetArtifact";
// Validation
export {
  cellTypeFromFieldType,
  normaliseBoolean,
  normaliseDate,
  normaliseNumber,
  validateCell,
  validateRange,
  validateRequired,
} from "./validation";
