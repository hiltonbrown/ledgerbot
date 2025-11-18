import "server-only";

/**
 * Template variables available for substitution in system prompts
 */
export type TemplateVariables = {
  // From Clerk (fetched at runtime)
  FIRST_NAME?: string;
  LAST_NAME?: string;

  // From UserSettings database
  COMPANY_NAME?: string;
  INDUSTRY_CONTEXT?: string;
  CHART_OF_ACCOUNTS?: string;

  // From Xero connection (organisation metadata - Xero best practice fields)
  BASE_CURRENCY?: string; // ISO 4217 currency code (e.g., AUD, GBP, NZD)
  ORGANISATION_TYPE?: string; // COMPANY, ACCOUNTING_PRACTICE, etc.
  IS_DEMO_COMPANY?: string; // "true" or "false" - identifies demo organisations
  XERO_SHORT_CODE?: string; // For deep linking (e.g., !TJ7Tb)

  // Custom instructions (user-editable additions to locked base prompts)
  CUSTOM_SYSTEM_INSTRUCTIONS?: string;
  CUSTOM_CODE_INSTRUCTIONS?: string;
  CUSTOM_SHEET_INSTRUCTIONS?: string;

  // Custom user-defined variables
  [key: string]: string | undefined;
};

/**
 * Substitutes template variables in a template string
 * Replaces {{VARIABLE_NAME}} with corresponding values from the variables object
 *
 * @param template - The template string containing {{VARIABLE_NAME}} placeholders
 * @param variables - Object containing variable names and their values
 * @returns Template with all variables substituted
 *
 * @example
 * ```typescript
 * const template = "Hello {{FIRST_NAME}} from {{COMPANY_NAME}}!";
 * const variables = { FIRST_NAME: "John", COMPANY_NAME: "Acme Pty Ltd" };
 * const result = substituteTemplateVariables(template, variables);
 * // Returns: "Hello John from Acme Pty Ltd!"
 * ```
 */
export function substituteTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;

  // Replace each variable placeholder with its value
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    // Replace all occurrences of the placeholder
    // If value is undefined or empty, replace with empty string
    result = result.replaceAll(placeholder, value || "");
  }

  // Clean up any remaining unsubstituted placeholders
  // This handles cases where a placeholder doesn't have a corresponding variable
  result = result.replace(/\{\{[^}]+\}\}/g, "");

  return result;
}

/**
 * Validates template variables in a template string
 * Checks for unknown variables and provides helpful error messages
 *
 * @param template - The template string to validate
 * @param availableVariables - Array of variable names that are available
 * @returns Validation result with success status and any errors found
 *
 * @example
 * ```typescript
 * const template = "Hello {{FIRST_NAME}} from {{UNKNOWN}}!";
 * const available = ["FIRST_NAME", "LAST_NAME", "COMPANY_NAME"];
 * const result = validateTemplateVariables(template, available);
 * // Returns: { valid: false, errors: ["Unknown variable: {{UNKNOWN}}"] }
 * ```
 */
export function validateTemplateVariables(
  template: string,
  availableVariables: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Extract all {{VARIABLE}} patterns from the template
  const usedVariables = template.match(/\{\{([^}]+)\}\}/g) || [];

  // Check each used variable against the available variables
  for (const variable of usedVariables) {
    const varName = variable.replace(/\{\{|\}\}/g, "");

    if (!availableVariables.includes(varName)) {
      errors.push(`Unknown variable: ${variable}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gets the list of standard template variables
 * These are the predefined variables available to all users
 *
 * @returns Array of standard variable names
 */
export function getStandardTemplateVariables(): string[] {
  return [
    "FIRST_NAME",
    "LAST_NAME",
    "COMPANY_NAME",
    "INDUSTRY_CONTEXT",
    "CHART_OF_ACCOUNTS",
    // Xero organisation metadata (Xero best practice fields)
    "BASE_CURRENCY",
    "ORGANISATION_TYPE",
    "IS_DEMO_COMPANY",
    "XERO_SHORT_CODE",
    // Custom instructions
    "CUSTOM_SYSTEM_INSTRUCTIONS",
    "CUSTOM_CODE_INSTRUCTIONS",
    "CUSTOM_SHEET_INSTRUCTIONS",
  ];
}

/**
 * Extracts all variable names used in a template
 * Useful for showing users which variables are used in their template
 *
 * @param template - The template string to analyze
 * @returns Array of unique variable names found in the template
 *
 * @example
 * ```typescript
 * const template = "Hello {{FIRST_NAME}} from {{COMPANY_NAME}}!";
 * const variables = extractTemplateVariables(template);
 * // Returns: ["FIRST_NAME", "COMPANY_NAME"]
 * ```
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
  const variableNames = matches.map((match) => match.replace(/\{\{|\}\}/g, ""));

  // Return unique variable names
  return [...new Set(variableNames)];
}
