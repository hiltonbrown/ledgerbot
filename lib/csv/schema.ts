/**
 * CSV Schema Definition and Registry
 *
 * Defines expected structure and validation rules for different CSV import types.
 * Schemas are used by the validation layer to type-check and validate cells.
 *
 * @module lib/csv/schema
 */

/**
 * Supported CSV field types for validation.
 */
export type CsvFieldType = "string" | "number" | "date" | "boolean";

/**
 * Definition for a single CSV column/field.
 */
export interface CsvFieldDefinition {
  /** Field identifier (internal name) */
  name: string;
  /** Expected column header in CSV (case-insensitive match) */
  columnHeader: string;
  /** Expected data type */
  type: CsvFieldType;
  /** Whether this field is required (non-empty) */
  required?: boolean;
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Array of accepted date formats (for date-fns/parse) */
  dateFormats?: string[];
}

/**
 * Complete schema definition for a CSV import type.
 */
export interface CsvSchema {
  /** Unique schema identifier (e.g., "bank-feed-v1") */
  id: string;
  /** Human-readable description */
  description: string;
  /** Array of field definitions */
  fields: CsvFieldDefinition[];
  /** Whether to allow extra columns not in schema (default: false) */
  allowExtraColumns?: boolean;
}

/**
 * Schema registry mapping schema IDs to definitions.
 */
const SCHEMA_REGISTRY: Map<string, CsvSchema> = new Map();

/**
 * Generic schema that accepts all columns as strings (no validation).
 * Used as fallback when no specific schema is provided.
 */
export const GENERIC_SCHEMA: CsvSchema = {
  id: "generic",
  description: "Generic schema accepting all columns as strings",
  fields: [],
  allowExtraColumns: true,
};

/**
 * Bank feed CSV schema (v1).
 *
 * Expected columns:
 * - Date (required, date type, DD/MM/YYYY or YYYY-MM-DD)
 * - Description (required, string)
 * - Amount (required, number)
 * - Balance (optional, number)
 */
export const BANK_FEED_SCHEMA_V1: CsvSchema = {
  id: "bank-feed-v1",
  description: "Bank feed CSV with Date, Description, Amount, Balance",
  fields: [
    {
      name: "date",
      columnHeader: "Date",
      type: "date",
      required: true,
      dateFormats: ["dd/MM/yyyy", "yyyy-MM-dd", "MM/dd/yyyy"],
    },
    {
      name: "description",
      columnHeader: "Description",
      type: "string",
      required: true,
    },
    {
      name: "amount",
      columnHeader: "Amount",
      type: "number",
      required: true,
    },
    {
      name: "balance",
      columnHeader: "Balance",
      type: "number",
      required: false,
    },
  ],
  allowExtraColumns: false,
};

/**
 * Invoice import CSV schema (v1).
 *
 * Expected columns:
 * - Invoice Number (required, string)
 * - Invoice Date (required, date, DD/MM/YYYY)
 * - Due Date (required, date, DD/MM/YYYY)
 * - Customer Name (required, string)
 * - Amount (required, number, min: 0)
 * - Tax (optional, number, min: 0)
 * - Total (required, number, min: 0)
 */
export const INVOICE_IMPORT_SCHEMA_V1: CsvSchema = {
  id: "invoice-import-v1",
  description:
    "Invoice import CSV with Invoice Number, Date, Customer, Amount, Tax, Total",
  fields: [
    {
      name: "invoice_number",
      columnHeader: "Invoice Number",
      type: "string",
      required: true,
    },
    {
      name: "invoice_date",
      columnHeader: "Invoice Date",
      type: "date",
      required: true,
      dateFormats: ["dd/MM/yyyy", "yyyy-MM-dd"],
    },
    {
      name: "due_date",
      columnHeader: "Due Date",
      type: "date",
      required: true,
      dateFormats: ["dd/MM/yyyy", "yyyy-MM-dd"],
    },
    {
      name: "customer_name",
      columnHeader: "Customer Name",
      type: "string",
      required: true,
    },
    {
      name: "amount",
      columnHeader: "Amount",
      type: "number",
      required: true,
      min: 0,
    },
    {
      name: "tax",
      columnHeader: "Tax",
      type: "number",
      required: false,
      min: 0,
    },
    {
      name: "total",
      columnHeader: "Total",
      type: "number",
      required: true,
      min: 0,
    },
  ],
  allowExtraColumns: false,
};

/**
 * Chart of Accounts CSV schema (v1).
 *
 * Expected columns:
 * - Account Code (required, string)
 * - Account Name (required, string)
 * - Account Type (required, string)
 * - Tax Type (optional, string)
 * - Description (optional, string)
 */
export const CHART_OF_ACCOUNTS_SCHEMA_V1: CsvSchema = {
  id: "chart-of-accounts-v1",
  description: "Chart of Accounts CSV with Code, Name, Type, Tax Type",
  fields: [
    {
      name: "account_code",
      columnHeader: "Account Code",
      type: "string",
      required: true,
    },
    {
      name: "account_name",
      columnHeader: "Account Name",
      type: "string",
      required: true,
    },
    {
      name: "account_type",
      columnHeader: "Account Type",
      type: "string",
      required: true,
    },
    {
      name: "tax_type",
      columnHeader: "Tax Type",
      type: "string",
      required: false,
    },
    {
      name: "description",
      columnHeader: "Description",
      type: "string",
      required: false,
    },
  ],
  allowExtraColumns: false,
};

// Register all schemas
SCHEMA_REGISTRY.set(GENERIC_SCHEMA.id, GENERIC_SCHEMA);
SCHEMA_REGISTRY.set(BANK_FEED_SCHEMA_V1.id, BANK_FEED_SCHEMA_V1);
SCHEMA_REGISTRY.set(INVOICE_IMPORT_SCHEMA_V1.id, INVOICE_IMPORT_SCHEMA_V1);
SCHEMA_REGISTRY.set(
  CHART_OF_ACCOUNTS_SCHEMA_V1.id,
  CHART_OF_ACCOUNTS_SCHEMA_V1
);

/**
 * Retrieves a schema by ID.
 *
 * @param id - Schema identifier (e.g., "bank-feed-v1")
 * @returns Schema definition or undefined if not found
 */
export function getSchemaById(id: string): CsvSchema | undefined {
  return SCHEMA_REGISTRY.get(id);
}

/**
 * Gets the generic fallback schema.
 *
 * @returns Generic schema that accepts all columns as strings
 */
export function getGenericSchema(): CsvSchema {
  return GENERIC_SCHEMA;
}

/**
 * Gets all registered schema IDs.
 *
 * @returns Array of schema IDs
 */
export function getAllSchemaIds(): string[] {
  return Array.from(SCHEMA_REGISTRY.keys());
}

/**
 * Registers a custom schema.
 *
 * @param schema - Schema definition to register
 */
export function registerSchema(schema: CsvSchema): void {
  SCHEMA_REGISTRY.set(schema.id, schema);
}
