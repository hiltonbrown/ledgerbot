/**
 * CSV Processing Module
 *
 * Central export point for all CSV parsing, validation, schema, and sanitisation utilities.
 *
 * @module lib/csv
 */

// Parser
export { parseCsv } from "./parser";
export type { ParsedCsv, ParseCsvOptions } from "./parser";

// Schema
export {
  getSchemaById,
  getGenericSchema,
  getAllSchemaIds,
  registerSchema,
  GENERIC_SCHEMA,
  BANK_FEED_SCHEMA_V1,
  INVOICE_IMPORT_SCHEMA_V1,
  CHART_OF_ACCOUNTS_SCHEMA_V1,
} from "./schema";
export type { CsvFieldType, CsvFieldDefinition, CsvSchema } from "./schema";

// Validation
export {
  normaliseNumber,
  normaliseDate,
  normaliseBoolean,
  validateRequired,
  validateRange,
  validateCell,
  cellTypeFromFieldType,
} from "./validation";

// Sanitisation
export {
  requiresSanitisation,
  sanitiseRawValue,
  sanitiseCellForExport,
  sanitiseRowForExport,
  sanitiseSpreadsheetForExport,
  countSanitisationNeeded,
  artifactNeedsSanitisation,
} from "./sanitise";

// Main conversion function
export { buildSpreadsheetArtifactFromCsv } from "./toSpreadsheetArtifact";
export type { BuildSpreadsheetArtifactOptions } from "./toSpreadsheetArtifact";
