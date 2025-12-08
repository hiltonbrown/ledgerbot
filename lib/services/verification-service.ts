import { abrClient } from "@/lib/services/abr-client";
import { asicDatasetService } from "@/lib/services/asic-dataset-service";
import type {
  ABRRecord,
  ASICBusinessNameRecord,
  ASICCompanyRecord,
  VerificationIssue,
  VerificationResult,
  XeroContactRecord,
} from "@/types/datavalidation";
// import leven from "leven"; // We'll implement a simple Levenshtein distance or use a library if available

/**
 * Service for verifying Xero contacts against Australian business registries
 */
export class VerificationService {
  /**
   * Calculate similarity between two strings (0-1)
   * Uses Levenshtein distance
   */
  calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;
    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const track = Array(s2.length + 1)
      .fill(null)
      .map(() => Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= s2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const distance = track[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
  }

  /**
   * Verify a single contact record
   */
  async verifyContact(contact: XeroContactRecord): Promise<VerificationResult> {
    const issues: VerificationIssue[] = [];
    let abrRecord: ABRRecord | undefined;
    let asicCompanyMatch: ASICCompanyRecord | undefined;
    let asicBusinessNameMatch: ASICBusinessNameRecord | undefined;

    // 1. Validate ABN
    if (contact.taxNumber) {
      const abnValidation = abrClient.validateABNFormat(contact.taxNumber);
      if (abnValidation.valid) {
        // ABN Lookup
        const abrResult = await abrClient.lookupByABN(contact.taxNumber);
        if (abrResult) {
          abrRecord = abrResult;

          if (abrResult.abnStatus !== "Active") {
            issues.push({
              type: "error",
              code: "ABN_CANCELLED",
              message: `ABN is ${abrResult.abnStatus}`,
              field: "taxNumber",
            });
          }

          if (!abrResult.gstRegistered) {
            issues.push({
              type: "warning",
              code: "NOT_GST_REGISTERED",
              message: "Entity is not registered for GST",
              field: "gstRegistered",
            });
          }

          // Name Matching with ABR Entity Name
          const similarity = this.calculateNameSimilarity(
            contact.name,
            abrResult.entityName
          );
          if (similarity < 0.8) {
            // Check business names
            const bestBnMatch = abrResult.businessNames.reduce(
              (max, bn) =>
                Math.max(max, this.calculateNameSimilarity(contact.name, bn)),
              0
            );

            if (bestBnMatch < 0.8) {
              issues.push({
                type: "warning",
                code: "NAME_MISMATCH",
                message: `Contact name '${contact.name}' does not match ABR Entity Name '${abrResult.entityName}' (Similarity: ${Math.round(similarity * 100)}%)`,
                field: "name",
              });
            }
          }
        } else {
          issues.push({
            type: "warning",
            code: "ABN_NOT_FOUND",
            message: "ABN not found in ABR",
            field: "taxNumber",
          });
        }

        // ASIC Business Name Lookup via ABN
        const bnMatches = await asicDatasetService.findBusinessNameByABN(
          contact.taxNumber
        );
        // Find best match by name if multiple
        if (bnMatches.length > 0) {
          asicBusinessNameMatch =
            bnMatches.find(
              (bn) =>
                this.calculateNameSimilarity(contact.name, bn.businessName) >
                0.9
            ) || bnMatches[0];

          if (asicBusinessNameMatch.status !== "Active") {
            issues.push({
              type: "warning",
              code: "BUSINESS_NAME_CANCELLED",
              message: `Business Name '${asicBusinessNameMatch.businessName}' is ${asicBusinessNameMatch.status}`,
              field: "name",
            });
          }
        }
      } else {
        issues.push({
          type: "error",
          code: "INVALID_ABN_FORMAT",
          message: `Invalid ABN format: ${abnValidation.error}`,
          field: "taxNumber",
        });
      }
    } else {
      issues.push({
        type: "info",
        code: "MISSING_ABN",
        message: "No ABN provided for contact",
        field: "taxNumber",
      });
    }

    // 2. Validate ACN
    if (contact.companyNumber) {
      const acnValidation = abrClient.validateACNFormat(contact.companyNumber);
      if (acnValidation.valid) {
        // ASIC Company Lookup
        const company = await asicDatasetService.findCompanyByACN(
          contact.companyNumber
        );
        if (company) {
          asicCompanyMatch = company;
          if (company.status === "Deregistered") {
            issues.push({
              type: "error",
              code: "COMPANY_DEREGISTERED",
              message: `Company '${company.companyName}' is Deregistered`,
              field: "companyNumber",
            });
          }

          const similarity = this.calculateNameSimilarity(
            contact.name,
            company.companyName
          );
          if (similarity < 0.8) {
            issues.push({
              type: "warning",
              code: "NAME_MISMATCH_ACN",
              message: `Contact name matches ACN but differs from Company Name '${company.companyName}'`,
              field: "name",
            });
          }
        } else {
          issues.push({
            type: "warning",
            code: "ACN_NOT_FOUND",
            message: "ACN not found in ASIC Companies dataset",
            field: "companyNumber",
          });
        }
      } else {
        issues.push({
          type: "error",
          code: "INVALID_ACN_FORMAT",
          message: `Invalid ACN format: ${acnValidation.error}`,
          field: "companyNumber",
        });
      }
    } else if (!contact.taxNumber) {
      // Only warn if neither is present
      issues.push({
        type: "info",
        code: "MISSING_ACN",
        message: "No ACN provided",
        field: "companyNumber",
      });
    }

    // Determine overall status
    let verificationStatus: VerificationResult["verificationStatus"] =
      "verified";
    if (issues.some((i) => i.type === "error")) {
      verificationStatus = "errors";
    } else if (issues.some((i) => i.type === "warning")) {
      verificationStatus = "warnings";
    }

    return {
      xeroContact: contact,
      asicCompanyMatch,
      asicBusinessNameMatch,
      abrRecord,
      verificationStatus,
      issues,
      verifiedAt: new Date(),
    };
  }
}

export const verificationService = new VerificationService();
