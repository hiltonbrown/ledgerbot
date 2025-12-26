import { eq } from "drizzle-orm";
// import { parse } from "csv-parse";
// import fs from "fs";
// import path from "path";
// import { pipeline } from "stream/promises";
import { db } from "@/lib/db/queries";
import {
  dvAsicBusinessNames,
  dvAsicCompanies,
} from "@/lib/db/schema/datavalidation";
import type {
  ASICBusinessNameRecord,
  ASICCompanyRecord,
} from "@/types/datavalidation";

/**
 * Service for managing ASIC Datasets (Companies and Business Names)
 * Handles downloading, parsing, and querying large CSV datasets
 */
export class ASICDatasetService {
  // URLs for weekly ASIC datasets
  private companiesCsvUrl =
    "https://data.gov.au/data/dataset/7b8656f9-606d-4337-af29-66b89b2eeefb/resource/5c3914e6-413e-4a2c-b890-bf8efe3eabf2/download/company_202512.csv";
  private businessNamesCsvUrl =
    "https://data.gov.au/data/dataset/bc515135-4bb6-4d50-957a-3713709a76d3/resource/55ad4b1c-5eeb-44ea-8b29-d410da431be3/download/business_names_202512.csv";

  /**
   * Find company by ACN
   */
  async findCompanyByACN(acn: string): Promise<ASICCompanyRecord | null> {
    const cleanACN = acn.replace(/\s/g, "");

    const result = await db.query.dvAsicCompanies.findFirst({
      where: eq(dvAsicCompanies.acn, cleanACN),
    });

    if (!result) return null;

    return {
      companyName: result.companyName,
      acn: result.acn,
      abn: result.abn || undefined,
      type: result.type || "",
      class: result.class || "",
      subClass: result.subClass || undefined,
      status: result.status as "Registered" | "Deregistered",
      registrationDate: result.registrationDate
        ? new Date(result.registrationDate)
        : new Date(), // Fallback
      deregistrationDate: result.deregistrationDate
        ? new Date(result.deregistrationDate)
        : undefined,
    };
  }

  /**
   * Find company by ABN
   */
  async findCompanyByABN(abn: string): Promise<ASICCompanyRecord | null> {
    const cleanABN = abn.replace(/\s/g, "");

    const result = await db.query.dvAsicCompanies.findFirst({
      where: eq(dvAsicCompanies.abn, cleanABN),
    });

    if (!result) return null;

    return {
      companyName: result.companyName,
      acn: result.acn,
      abn: result.abn || undefined,
      type: result.type || "",
      class: result.class || "",
      subClass: result.subClass || undefined,
      status: result.status as "Registered" | "Deregistered",
      registrationDate: result.registrationDate
        ? new Date(result.registrationDate)
        : new Date(),
      deregistrationDate: result.deregistrationDate
        ? new Date(result.deregistrationDate)
        : undefined,
    };
  }

  /**
   * Find business names by ABN
   */
  async findBusinessNameByABN(abn: string): Promise<ASICBusinessNameRecord[]> {
    const cleanABN = abn.replace(/\s/g, "");

    const results = await db.query.dvAsicBusinessNames.findMany({
      where: eq(dvAsicBusinessNames.abn, cleanABN),
    });

    return results.map((r) => ({
      businessName: r.businessName,
      abn: r.abn,
      status: r.status as "Active" | "Cancelled",
      registrationDate: r.registrationDate
        ? new Date(r.registrationDate)
        : new Date(),
      cancellationDate: r.cancellationDate
        ? new Date(r.cancellationDate)
        : undefined,
    }));
  }

  // Placeholder for dataset download logic
  // Real implementation would require handling large file streams (~3M records)
  // which might timeout in a serverless function.
  // Best suited for a background worker or edge runtimes with longer processing limits.

  async isRefreshNeeded(): Promise<boolean> {
    // Check datasetDate of latest record
    const latest = await db.query.dvAsicCompanies.findFirst({
      orderBy: (companies, { desc }) => [desc(companies.datasetDate)],
    });

    if (!latest) return true;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return new Date(latest.datasetDate) < oneWeekAgo;
  }
}

export const asicDatasetService = new ASICDatasetService();
