/**
 * Integration tests for buildSpreadsheetArtifactFromCsv
 */

import { describe, expect, it } from "@jest/globals";
import { buildSpreadsheetArtifactFromCsv } from "../toSpreadsheetArtifact";

describe("buildSpreadsheetArtifactFromCsv", () => {
  describe("basic artifact building", () => {
    it("should build artifact from simple CSV", async () => {
      const csv = "Name,Age,City\nJohn,30,Sydney\nJane,25,Melbourne";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
      });

      expect(artifact.id).toBeDefined();
      expect(artifact.title).toBe("test");
      expect(artifact.sourceFileName).toBe("test.csv");
      expect(artifact.encoding).toBe("utf-8");
      expect(artifact.delimiter).toBe(",");
      expect(artifact.header).toEqual(["Name", "Age", "City"]);
      expect(artifact.rows).toHaveLength(2);
      expect(artifact.createdAt).toBeDefined();
    });

    it("should handle CSV without header", async () => {
      const csv = "John,30,Sydney\nJane,25,Melbourne";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
        hasHeader: false,
      });

      expect(artifact.header).toBeUndefined();
      expect(artifact.rows).toHaveLength(2);
    });

    it("should handle empty CSV", async () => {
      const csv = "";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "empty.csv",
      });

      expect(artifact.rows).toHaveLength(0);
      expect(artifact.summary.totalRows).toBe(0);
    });
  });

  describe("schema validation", () => {
    it("should apply bank-feed-v1 schema", async () => {
      const csv =
        "Date,Description,Amount,Balance\n15/01/2024,Payment,1000.50,5000.00\n16/01/2024,Invoice,-500,4500";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "bank.csv",
        importType: "bank-feed-v1",
      });

      expect(artifact.schemaId).toBe("bank-feed-v1");
      expect(artifact.rows).toHaveLength(2);

      const firstRow = artifact.rows[0];
      expect(firstRow.cells[0].type).toBe("date");
      expect(firstRow.cells[1].type).toBe("string");
      expect(firstRow.cells[2].type).toBe("number");
      expect(firstRow.cells[3].type).toBe("number");
    });

    it("should detect missing required fields", async () => {
      const csv =
        "Date,Description,Amount,Balance\n,Payment,1000.50,5000.00";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "bank.csv",
        importType: "bank-feed-v1",
      });

      const firstRow = artifact.rows[0];
      expect(firstRow.rowStatus).toBe("error");
      expect(
        firstRow.cells[0].issues?.some(
          (i) => i.code === "MISSING_REQUIRED"
        )
      ).toBe(true);
    });

    it("should detect invalid types", async () => {
      const csv =
        "Date,Description,Amount,Balance\ninvalid-date,Payment,not-a-number,5000.00";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "bank.csv",
        importType: "bank-feed-v1",
      });

      const firstRow = artifact.rows[0];
      expect(firstRow.rowStatus).toBe("error");
      expect(
        firstRow.cells[0].issues?.some((i) => i.code === "INVALID_TYPE")
      ).toBe(true);
      expect(
        firstRow.cells[2].issues?.some((i) => i.code === "INVALID_TYPE")
      ).toBe(true);
    });
  });

  describe("summary statistics", () => {
    it("should compute correct summary", async () => {
      const csv = `Date,Description,Amount
15/01/2024,Valid,100
invalid,Invalid,abc
16/01/2024,Valid,200`;

      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
        importType: "bank-feed-v1",
      });

      expect(artifact.summary.totalRows).toBe(3);
      expect(artifact.summary.errorRows).toBeGreaterThan(0);
      expect(artifact.summary.validRows).toBeGreaterThan(0);
    });
  });

  describe("column mismatch detection", () => {
    it("should detect rows with wrong column count", async () => {
      const csv = "A,B,C\n1,2,3\n4,5\n6,7,8,9";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
      });

      // Row with 2 columns (missing one)
      const row1 = artifact.rows[0];
      expect(row1.rowStatus).toBe("warning");
      expect(
        row1.cells[0].issues?.some((i) => i.code === "COLUMN_MISMATCH")
      ).toBe(true);

      // Row with 4 columns (extra one)
      const row2 = artifact.rows[1];
      expect(row2.rowStatus).toBe("warning");
      expect(
        row2.cells[0].issues?.some((i) => i.code === "COLUMN_MISMATCH")
      ).toBe(true);
    });
  });

  describe("encoding detection", () => {
    it("should detect encoding warnings", async () => {
      const csv = "Name,City\nJohn,Syd�ney";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
      });

      expect(artifact.encoding).toBe("unknown");
      const row = artifact.rows[0];
      expect(
        row.cells[1].issues?.some((i) => i.code === "ENCODING_WARNING")
      ).toBe(true);
    });
  });

  describe("row status determination", () => {
    it("should mark rows as valid when no issues", async () => {
      const csv = "Name,Age\nJohn,30\nJane,25";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
      });

      expect(artifact.rows[0].rowStatus).toBe("valid");
      expect(artifact.rows[1].rowStatus).toBe("valid");
    });

    it("should mark rows as warning for minor issues", async () => {
      const csv = "A,B,C\n1,2\n3,4,5";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
      });

      expect(artifact.rows[0].rowStatus).toBe("warning");
    });

    it("should mark rows as error for critical issues", async () => {
      const csv = "Date\ninvalid-date";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
        importType: "bank-feed-v1",
      });

      expect(artifact.rows[0].rowStatus).toBe("error");
    });
  });

  describe("line number tracking", () => {
    it("should track correct line numbers with header", async () => {
      const csv = "A,B\n1,2\n3,4\n5,6";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
        hasHeader: true,
      });

      expect(artifact.rows[0].lineNumber).toBe(2);
      expect(artifact.rows[1].lineNumber).toBe(3);
      expect(artifact.rows[2].lineNumber).toBe(4);
    });

    it("should track correct line numbers without header", async () => {
      const csv = "1,2\n3,4\n5,6";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
        hasHeader: false,
      });

      expect(artifact.rows[0].lineNumber).toBe(1);
      expect(artifact.rows[1].lineNumber).toBe(2);
      expect(artifact.rows[2].lineNumber).toBe(3);
    });
  });

  describe("ArrayBuffer input", () => {
    it("should handle ArrayBuffer input", async () => {
      const csv = "Name,Age\nJohn,30";
      const buffer = new TextEncoder().encode(csv).buffer;
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: buffer,
        sourceFileName: "test.csv",
      });

      expect(artifact.rows).toHaveLength(1);
      expect(artifact.rows[0].cells[0].value).toBe("John");
    });
  });

  describe("generic schema fallback", () => {
    it("should use generic schema when no importType specified", async () => {
      const csv = "A,B,C\n1,2,3";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
      });

      expect(artifact.schemaId).toBeUndefined();
      // All cells should be strings (no type validation)
      expect(artifact.rows[0].cells[0].type).toBe("string");
    });

    it("should use generic schema for unknown importType", async () => {
      const csv = "A,B,C\n1,2,3";
      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "test.csv",
        importType: "unknown-schema",
      });

      expect(artifact.schemaId).toBeUndefined();
    });
  });

  describe("complex validation scenarios", () => {
    it("should handle invoice import schema", async () => {
      const csv = `Invoice Number,Invoice Date,Due Date,Customer Name,Amount,Tax,Total
INV-001,15/01/2024,31/01/2024,Acme Corp,1000.00,100.00,1100.00
INV-002,16/01/2024,31/01/2024,Widget Inc,2000.00,200.00,2200.00`;

      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "invoices.csv",
        importType: "invoice-import-v1",
      });

      expect(artifact.schemaId).toBe("invoice-import-v1");
      expect(artifact.summary.validRows).toBe(2);
      expect(artifact.summary.errorRows).toBe(0);
    });

    it("should validate range constraints", async () => {
      const csv = `Invoice Number,Invoice Date,Due Date,Customer Name,Amount,Tax,Total
INV-001,15/01/2024,31/01/2024,Acme Corp,-100.00,100.00,1100.00`;

      const artifact = await buildSpreadsheetArtifactFromCsv({
        input: csv,
        sourceFileName: "invoices.csv",
        importType: "invoice-import-v1",
      });

      const firstRow = artifact.rows[0];
      expect(firstRow.rowStatus).toBe("warning");
      expect(
        firstRow.cells[4].issues?.some((i) => i.code === "OUT_OF_RANGE")
      ).toBe(true);
    });
  });
});
