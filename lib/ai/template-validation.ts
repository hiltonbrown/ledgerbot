/**
 * Template variable validation utilities
 */

export type VariableValidationResult = {
  isValid: boolean;
  undefinedVariables: string[];
  unusedVariables: string[];
  totalVariablesFound: number;
};

const VARIABLE_REGEX = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;

/**
 * Extract all variable names from text
 * @param text Text containing {{VARIABLE}} placeholders
 * @returns Array of unique variable names found
 */
export function extractVariableNames(text: string): string[] {
  const matches = text.matchAll(VARIABLE_REGEX);
  const variableNames = new Set<string>();

  for (const match of matches) {
    if (match[1]) {
      variableNames.add(match[1]);
    }
  }

  return Array.from(variableNames);
}

/**
 * Validate variables in text against defined variables
 * @param text Text containing {{VARIABLE}} placeholders
 * @param definedVariables Available variable names (standard + custom)
 * @returns Validation result with undefined and unused variables
 */
export function validateVariables(
  text: string,
  definedVariables: string[]
): VariableValidationResult {
  const usedVariables = extractVariableNames(text);
  const definedSet = new Set(definedVariables);
  const usedSet = new Set(usedVariables);

  // Find undefined variables (used but not defined)
  const undefinedVariables = usedVariables.filter(
    (varName) => !definedSet.has(varName)
  );

  // Find unused variables (defined but not used)
  const unusedVariables = definedVariables.filter(
    (varName) => !usedSet.has(varName)
  );

  return {
    isValid: undefinedVariables.length === 0,
    undefinedVariables,
    unusedVariables,
    totalVariablesFound: usedVariables.length,
  };
}

/**
 * Check if a custom variable name is valid
 * Must be uppercase letters, numbers, and underscores only
 * Must start with a letter or underscore
 */
export function isValidVariableName(name: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/.test(name);
}

/**
 * Sanitize a variable name by converting to uppercase and replacing invalid characters
 */
export function sanitizeVariableName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/^[0-9]/, "_$&"); // Ensure it doesn't start with a number
}

/**
 * Get all standard template variable names
 */
export function getStandardVariables(): string[] {
  return [
    "FIRST_NAME",
    "LAST_NAME",
    "COMPANY_NAME",
    "INDUSTRY_CONTEXT",
    "CHART_OF_ACCOUNTS",
    "CUSTOM_SYSTEM_INSTRUCTIONS",
    "CUSTOM_CODE_INSTRUCTIONS",
    "CUSTOM_SHEET_INSTRUCTIONS",
  ];
}
