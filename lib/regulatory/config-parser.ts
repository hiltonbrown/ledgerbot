import fs from "fs/promises";
import path from "path";

/**
 * Represents a single regulatory source defined in the configuration.
 */
export interface RegulatorySource {
  country: string; // "AU", "NZ", etc.
  section: string; // "Fair Work (Employment Law)"
  subsection: string; // "Minimum Wages"
  sourceType: string; // "web_scraping"
  url: string;
  updateFrequency: "daily" | "weekly" | "monthly" | "quarterly";
  priority: "high" | "medium" | "low";
  category: "award" | "tax_ruling" | "payroll_tax" | "custom";
}

const configPath = path.resolve(process.cwd(), "config/regulatory-sources.md");

/**
 * Parses the regulatory-sources.md file into an array of structured objects.
 *
 * @returns A promise that resolves to an array of RegulatorySource objects.
 *          Returns an empty array if the file cannot be read or parsed.
 */
export async function parseRegulatoryConfig(): Promise<RegulatorySource[]> {
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const lines = content.split("\n");

    const sources: RegulatorySource[] = [];
    let currentCountry = "";
    let currentSection = "";
    let currentSubsection = "";
    let currentSource: Partial<RegulatorySource> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("## ")) {
        const match = trimmedLine.match(/## (.*) \((.*)\)/);
        if (match) {
          currentCountry = match[2];
        }
      } else if (trimmedLine.startsWith("### ")) {
        currentSection = trimmedLine.substring(4).trim();
      } else if (trimmedLine.startsWith("#### ")) {
        // When a new subsection starts, save the previous source if it exists and is complete
        if (currentSource.url) {
          sources.push(currentSource as RegulatorySource);
        }
        currentSubsection = trimmedLine.substring(5).trim();
        currentSource = {
          country: currentCountry,
          section: currentSection,
          subsection: currentSubsection,
        };
      } else if (trimmedLine.startsWith("- **")) {
        const match = trimmedLine.match(/- \*\*(.*):\*\* (.*)/);
        if (match && currentSource) {
          const key = match[1].trim();
          const value = match[2].trim();
          switch (key) {
            case "Source Type":
              currentSource.sourceType = value;
              break;
            case "URL":
              currentSource.url = value;
              break;
            case "Update Frequency":
              currentSource.updateFrequency =
                value as RegulatorySource["updateFrequency"];
              break;
            case "Priority":
              currentSource.priority = value as RegulatorySource["priority"];
              break;
            case "Category":
              currentSource.category = value as RegulatorySource["category"];
              break;
          }
        }
      }
    }

    // Add the last processed source if it's complete
    if (currentSource.url) {
      sources.push(currentSource as RegulatorySource);
    }

    return sources;
  } catch (error) {
    console.error("Error parsing regulatory config:", error);
    return [];
  }
}

/**
 * Filters regulatory sources by country.
 *
 * @param country The 2-letter country code (e.g., "AU").
 * @returns A promise that resolves to an array of RegulatorySource objects for the specified country.
 */
export async function getSourcesByCountry(
  country: string
): Promise<RegulatorySource[]> {
  const allSources = await parseRegulatoryConfig();
  return allSources.filter((source) => source.country === country);
}

/**
 * Filters regulatory sources by category.
 *
 * @param category The category to filter by (e.g., "award", "tax_ruling").
 * @returns A promise that resolves to an array of RegulatorySource objects for the specified category.
 */
export async function getSourcesByCategory(
  category: "award" | "tax_ruling" | "payroll_tax" | "custom"
): Promise<RegulatorySource[]> {
  const allSources = await parseRegulatoryConfig();
  return allSources.filter((source) => source.category === category);
}

/**
 * Filters regulatory sources by priority.
 *
 * @param priority The priority to filter by (e.g., "high", "medium", "low").
 * @returns A promise that resolves to an array of RegulatorySource objects for the specified priority.
 */
export async function getSourcesByPriority(
  priority: "high" | "medium" | "low"
): Promise<RegulatorySource[]> {
  const allSources = await parseRegulatoryConfig();
  return allSources.filter((source) => source.priority === priority);
}
