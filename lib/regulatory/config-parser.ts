import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Represents a regulatory source configuration
 */
export type RegulatorySource = {
  country: string; // "AU", "NZ", etc.
  section: string; // "Fair Work (Employment Law)"
  subsection: string; // "Minimum Wages"
  sourceType: string; // "web_scraping"
  url: string;
  updateFrequency: "daily" | "weekly" | "monthly" | "quarterly";
  priority: "high" | "medium" | "low";
  category: "award" | "tax_ruling" | "payroll_tax" | "custom";
};

// Regex patterns defined at module level for performance
const COUNTRY_REGEX = /##\s+.*\(([A-Z]{2})\)/;
const SECTION_REGEX = /^###\s+/;
const SUBSECTION_REGEX = /^####\s+/;
const METADATA_REGEX = /^-\s+\*\*([^:]+):\*\*\s+(.+)$/;

/**
 * Parses the regulatory-sources.md configuration file into structured TypeScript objects
 * @returns Promise resolving to array of RegulatorySource objects
 * @throws Returns empty array if file not found or parsing fails
 */
export async function parseRegulatoryConfig(): Promise<RegulatorySource[]> {
  try {
    const configPath = join(process.cwd(), "config", "regulatory-sources.md");
    const content = await readFile(configPath, "utf-8");
    const lines = content.split("\n");

    const sources: RegulatorySource[] = [];
    let currentCountry = "";
    let currentSection = "";
    let currentSubsection = "";
    let currentSource: Partial<RegulatorySource> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and horizontal rules
      if (!trimmed || trimmed === "---") {
        continue;
      }

      // Parse country heading (## Australia (AU))
      if (trimmed.startsWith("## ")) {
        const match = trimmed.match(COUNTRY_REGEX);
        if (match) {
          currentCountry = match[1];
          currentSection = "";
          currentSubsection = "";
        }
        continue;
      }

      // Parse section heading (### Fair Work (Employment Law))
      if (trimmed.startsWith("### ")) {
        currentSection = trimmed.replace(SECTION_REGEX, "");
        currentSubsection = "";
        continue;
      }

      // Parse subsection heading (#### Minimum Wages)
      if (trimmed.startsWith("#### ")) {
        // Save previous source if it exists
        if (
          currentSource.url &&
          currentCountry &&
          currentSection &&
          currentSubsection
        ) {
          sources.push(currentSource as RegulatorySource);
        }

        // Start new source
        currentSubsection = trimmed.replace(SUBSECTION_REGEX, "");
        currentSource = {
          country: currentCountry,
          section: currentSection,
          subsection: currentSubsection,
        };
        continue;
      }

      // Parse metadata lines (- **Field:** value)
      if (trimmed.startsWith("- **")) {
        const match = trimmed.match(METADATA_REGEX);
        if (match) {
          const [, field, value] = match;
          const fieldKey = field.trim();
          const fieldValue = value.trim();

          switch (fieldKey) {
            case "Source Type":
              currentSource.sourceType = fieldValue;
              break;
            case "URL":
              currentSource.url = fieldValue;
              break;
            case "Update Frequency":
              currentSource.updateFrequency = fieldValue as
                | "daily"
                | "weekly"
                | "monthly"
                | "quarterly";
              break;
            case "Priority":
              currentSource.priority = fieldValue as "high" | "medium" | "low";
              break;
            case "Category":
              currentSource.category = fieldValue as
                | "award"
                | "tax_ruling"
                | "payroll_tax"
                | "custom";
              break;
            default:
              // Ignore unknown fields
              break;
          }
        }
      }
    }

    // Add the last source if it exists
    if (
      currentSource.url &&
      currentCountry &&
      currentSection &&
      currentSubsection
    ) {
      sources.push(currentSource as RegulatorySource);
    }

    return sources;
  } catch (error) {
    console.error("Error parsing regulatory config:", error);
    return [];
  }
}

/**
 * Gets regulatory sources filtered by country code
 * @param country - Two-letter country code (e.g., "AU", "NZ")
 * @returns Promise resolving to array of RegulatorySource objects for the specified country
 */
export async function getSourcesByCountry(
  country: string
): Promise<RegulatorySource[]> {
  const sources = await parseRegulatoryConfig();
  return sources.filter(
    (source) => source.country.toLowerCase() === country.toLowerCase()
  );
}

/**
 * Gets regulatory sources filtered by category
 * @param category - Category type ("award", "tax_ruling", "payroll_tax", "custom")
 * @returns Promise resolving to array of RegulatorySource objects for the specified category
 */
export async function getSourcesByCategory(
  category: string
): Promise<RegulatorySource[]> {
  const sources = await parseRegulatoryConfig();
  return sources.filter(
    (source) => source.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Gets regulatory sources filtered by priority level
 * @param priority - Priority level ("high", "medium", "low")
 * @returns Promise resolving to array of RegulatorySource objects for the specified priority
 */
export async function getSourcesByPriority(
  priority: string
): Promise<RegulatorySource[]> {
  const sources = await parseRegulatoryConfig();
  return sources.filter(
    (source) => source.priority.toLowerCase() === priority.toLowerCase()
  );
}
