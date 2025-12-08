import type { ABRRecord } from "@/types/datavalidation";

/**
 * Service for interacting with the Australian Business Register (ABR) API
 * Provides ABN/ACN lookup, name search, and validation
 */
export class ABRClient {
  private baseUrl =
    "https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx";
  private guid: string;

  constructor() {
    this.guid = process.env.ABR_GUID || "";
    if (!this.guid) {
      console.warn(
        "ABR_GUID environment variable is not set. ABR lookups will fail."
      );
    }
  }

  /**
   * Validate ABN format using weighted checksum
   */
  validateABNFormat(abn: string): {
    valid: boolean;
    formatted: string;
    error?: string;
  } {
    // Remove non-alphanumeric characters
    const cleanABN = abn.replace(/[^0-9]/g, "");

    if (cleanABN.length !== 11) {
      return {
        valid: false,
        formatted: abn,
        error: "ABN must be 11 digits",
      };
    }

    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    let sum = 0;

    for (let i = 0; i < 11; i++) {
      let digit = Number.parseInt(cleanABN[i], 10);
      // Subtract 1 from first digit
      if (i === 0) {
        digit -= 1;
      }
      sum += digit * weights[i];
    }

    const valid = sum % 89 === 0;

    // Format as XX XXX XXX XXX
    const formatted = `${cleanABN.slice(0, 2)} ${cleanABN.slice(2, 5)} ${cleanABN.slice(5, 8)} ${cleanABN.slice(8, 11)}`;

    return {
      valid,
      formatted: valid ? formatted : abn,
      error: valid ? undefined : "Invalid ABN checksum",
    };
  }

  /**
   * Validate ACN format using modulus 10 checksum
   */
  validateACNFormat(acn: string): {
    valid: boolean;
    formatted: string;
    error?: string;
  } {
    const cleanACN = acn.replace(/[^0-9]/g, "");

    if (cleanACN.length !== 9) {
      return {
        valid: false,
        formatted: acn,
        error: "ACN must be 9 digits",
      };
    }

    const weights = [8, 7, 6, 5, 4, 3, 2, 1];
    let sum = 0;

    for (let i = 0; i < 8; i++) {
      sum += Number.parseInt(cleanACN[i], 10) * weights[i];
    }

    const remainder = sum % 10;
    const complement = (10 - remainder) % 10;
    const checkDigit = Number.parseInt(cleanACN[8], 10);

    const valid = complement === checkDigit;

    // Format as XXX XXX XXX
    const formatted = `${cleanACN.slice(0, 3)} ${cleanACN.slice(3, 6)} ${cleanACN.slice(6, 9)}`;

    return {
      valid,
      formatted: valid ? formatted : acn,
      error: valid ? undefined : "Invalid ACN checksum",
    };
  }

  /**
   * Lookup entity details by ABN
   * Note: Implementation requires actual SOAP/XML parsing which is simplified here for now.
   * In a real implementation, we would use a SOAP client or fetch with XML body.
   */
  async lookupByABN(abn: string): Promise<ABRRecord | null> {
    const validation = this.validateABNFormat(abn);
    if (!validation.valid) {
      return null;
    }

    // Mock implementation for development until actual XML parsing is set up
    // This allows the agent to function without a valid ABR GUID during initial dev
    if (process.env.NODE_ENV === "development" && !this.guid) {
      console.log("Mocking ABR lookup for dev");
      return Promise.resolve({
        abn: validation.formatted,
        abnStatus: "Active",
        entityName: "EXAMPLE PTY LTD",
        entityType: "Australian Private Company",
        gstRegistered: true,
        gstRegistrationDate: new Date("2020-01-01"),
        businessNames: ["EXAMPLE TRADING"],
      });
    }

    try {
      // TODO: Implement actual ABR SOAP request
      // const response = await fetch(`${this.baseUrl}/SearchByABNv201408`, ...);
      // const data = await response.text();
      // Parse XML...
      return Promise.resolve(null);
    } catch (error) {
      console.error("ABR Lookup failed:", error);
      return Promise.resolve(null);
    }
  }

  /**
   * Lookup entity details by ACN
   */
  async lookupByACN(acn: string): Promise<ABRRecord | null> {
    const validation = this.validateACNFormat(acn);
    if (!validation.valid) {
      return null;
    }

    // TODO: Implement actual ABR SOAP request for ACN
    return Promise.resolve(null);
  }

  /**
   * Search for entities by name
   */
  async searchByName(name: string): Promise<ABRRecord[]> {
    if (!name || name.length < 3) return [];

    // TODO: Implement actual ABR SOAP request for name search
    return Promise.resolve([]);
  }
}

export const abrClient = new ABRClient();
