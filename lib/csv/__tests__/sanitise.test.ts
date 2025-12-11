/**
 * Tests for CSV Security Sanitisation
 */

import { describe, expect, it } from "@jest/globals";
import type {
  SpreadsheetArtifact,
  SpreadsheetCell,
  SpreadsheetRow,
} from "@/artifacts/sheet/types";
import {
  artifactNeedsSanitisation,
  countSanitisationNeeded,
  requiresSanitisation,
  sanitiseCellForExport,
  sanitiseRawValue,
  sanitiseRowForExport,
  sanitiseSpreadsheetForExport,
} from "../sanitise";

describe("requiresSanitisation", () => {
  it("should detect formula injection attempts", () => {
    expect(requiresSanitisation("=SUM(A1:A10)")).toBe(true);
    expect(requiresSanitisation("+1234")).toBe(true);
    expect(requiresSanitisation("-1234")).toBe(true);
    expect(requiresSanitisation("@SUM(A1)")).toBe(true);
  });

  it("should not flag normal values", () => {
    expect(requiresSanitisation("Normal text")).toBe(false);
    expect(requiresSanitisation("123")).toBe(false);
    expect(requiresSanitisation("")).toBe(false);
    expect(requiresSanitisation("Email: test@example.com")).toBe(false);
  });

  it("should handle whitespace", () => {
    expect(requiresSanitisation("  =SUM(A1)")).toBe(true);
    expect(requiresSanitisation("  normal  ")).toBe(false);
  });
});

describe("sanitiseRawValue", () => {
  it("should prefix formula characters with single quote", () => {
    expect(sanitiseRawValue("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitiseRawValue("+1234")).toBe("'+1234");
    expect(sanitiseRawValue("-1234")).toBe("'-1234");
    expect(sanitiseRawValue("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("should not modify safe values", () => {
    expect(sanitiseRawValue("Normal text")).toBe("Normal text");
    expect(sanitiseRawValue("123")).toBe("123");
  });
});

describe("sanitiseCellForExport", () => {
  it("should sanitise cells with formula injection", () => {
    const cell: SpreadsheetCell = {
      raw: "=SUM(A1:A10)",
      value: "=SUM(A1:A10)",
      type: "string",
      issues: [],
    };

    const sanitised = sanitiseCellForExport(cell);

    expect(sanitised.value).toBe("'=SUM(A1:A10)");
    expect(sanitised.securitySanitised).toBe(true);
    expect(sanitised.issues?.some((i) => i.code === "SECURITY_SANITISED")).toBe(
      true
    );
  });

  it("should preserve original raw value", () => {
    const cell: SpreadsheetCell = {
      raw: "=SUM(A1:A10)",
      value: "=SUM(A1:A10)",
      type: "string",
    };

    const sanitised = sanitiseCellForExport(cell);

    expect(sanitised.raw).toBe("=SUM(A1:A10)");
  });

  it("should not modify safe cells", () => {
    const cell: SpreadsheetCell = {
      raw: "Normal text",
      value: "Normal text",
      type: "string",
      issues: [],
    };

    const sanitised = sanitiseCellForExport(cell);

    expect(sanitised).toEqual(cell);
  });

  it("should preserve existing issues", () => {
    const cell: SpreadsheetCell = {
      raw: "=INVALID",
      value: "=INVALID",
      type: "string",
      issues: [{ code: "INVALID_TYPE", message: "Invalid type" }],
    };

    const sanitised = sanitiseCellForExport(cell);

    expect(sanitised.issues).toHaveLength(2);
    expect(sanitised.issues?.some((i) => i.code === "INVALID_TYPE")).toBe(true);
    expect(sanitised.issues?.some((i) => i.code === "SECURITY_SANITISED")).toBe(
      true
    );
  });

  it("should not duplicate SECURITY_SANITISED issue", () => {
    const cell: SpreadsheetCell = {
      raw: "=SUM(A1)",
      value: "=SUM(A1)",
      type: "string",
      issues: [{ code: "SECURITY_SANITISED", message: "Already flagged" }],
      securitySanitised: true,
    };

    const sanitised = sanitiseCellForExport(cell);

    const sanitisedIssues = sanitised.issues?.filter(
      (i) => i.code === "SECURITY_SANITISED"
    );
    expect(sanitisedIssues).toHaveLength(1);
  });
});

describe("sanitiseRowForExport", () => {
  it("should sanitise all cells in row", () => {
    const row: SpreadsheetRow = {
      lineNumber: 1,
      cells: [
        { raw: "=SUM(A1)", value: "=SUM(A1)", type: "string" },
        { raw: "Normal", value: "Normal", type: "string" },
      ],
      rowStatus: "valid",
    };

    const sanitised = sanitiseRowForExport(row);

    expect(sanitised.cells[0].securitySanitised).toBe(true);
    expect(sanitised.cells[1].securitySanitised).toBeUndefined();
  });

  it("should update row status from valid to warning", () => {
    const row: SpreadsheetRow = {
      lineNumber: 1,
      cells: [{ raw: "=SUM(A1)", value: "=SUM(A1)", type: "string" }],
      rowStatus: "valid",
    };

    const sanitised = sanitiseRowForExport(row);

    expect(sanitised.rowStatus).toBe("warning");
  });

  it("should not change row status if already warning or error", () => {
    const row1: SpreadsheetRow = {
      lineNumber: 1,
      cells: [{ raw: "=SUM(A1)", value: "=SUM(A1)", type: "string" }],
      rowStatus: "warning",
    };

    const row2: SpreadsheetRow = {
      lineNumber: 2,
      cells: [{ raw: "=SUM(A1)", value: "=SUM(A1)", type: "string" }],
      rowStatus: "error",
    };

    expect(sanitiseRowForExport(row1).rowStatus).toBe("warning");
    expect(sanitiseRowForExport(row2).rowStatus).toBe("error");
  });
});

describe("sanitiseSpreadsheetForExport", () => {
  it("should sanitise entire artifact", () => {
    const artifact = {
      id: "test",
      title: "Test",
      sourceFileName: "test.csv",
      encoding: "utf-8" as const,
      delimiter: ",",
      createdAt: new Date().toISOString(),
      rows: [
        {
          lineNumber: 1,
          cells: [
            { raw: "=SUM(A1)", value: "=SUM(A1)", type: "string" as const },
          ],
          rowStatus: "valid" as const,
        },
      ],
      summary: {
        totalRows: 1,
        validRows: 1,
        warningRows: 0,
        errorRows: 0,
      },
    };

    const sanitised = sanitiseSpreadsheetForExport(artifact);

    expect(sanitised.rows[0].cells[0].securitySanitised).toBe(true);
  });

  it("should update summary statistics", () => {
    const artifact = {
      id: "test",
      title: "Test",
      sourceFileName: "test.csv",
      encoding: "utf-8" as const,
      delimiter: ",",
      createdAt: new Date().toISOString(),
      rows: [
        {
          lineNumber: 1,
          cells: [
            { raw: "=SUM(A1)", value: "=SUM(A1)", type: "string" as const },
          ],
          rowStatus: "valid" as const,
        },
      ],
      summary: {
        totalRows: 1,
        validRows: 1,
        warningRows: 0,
        errorRows: 0,
      },
    };

    const sanitised = sanitiseSpreadsheetForExport(artifact);

    expect(sanitised.summary.validRows).toBe(0);
    expect(sanitised.summary.warningRows).toBe(1);
  });
});

describe("countSanitisationNeeded", () => {
  it("should count cells requiring sanitisation", () => {
    const artifact = {
      id: "test",
      title: "Test",
      sourceFileName: "test.csv",
      encoding: "utf-8" as const,
      delimiter: ",",
      createdAt: new Date().toISOString(),
      rows: [
        {
          lineNumber: 1,
          cells: [
            { raw: "=SUM(A1)", value: "=SUM(A1)", type: "string" as const },
            { raw: "Normal", value: "Normal", type: "string" as const },
          ],
          rowStatus: "valid" as const,
        },
        {
          lineNumber: 2,
          cells: [
            { raw: "+123", value: "+123", type: "string" as const },
            { raw: "Normal", value: "Normal", type: "string" as const },
          ],
          rowStatus: "valid" as const,
        },
      ],
      summary: {
        totalRows: 2,
        validRows: 2,
        warningRows: 0,
        errorRows: 0,
      },
    };

    expect(countSanitisationNeeded(artifact)).toBe(2);
  });
});

describe("artifactNeedsSanitisation", () => {
  it("should return true if any cell needs sanitisation", () => {
    const artifact = {
      id: "test",
      title: "Test",
      sourceFileName: "test.csv",
      encoding: "utf-8" as const,
      delimiter: ",",
      createdAt: new Date().toISOString(),
      rows: [
        {
          lineNumber: 1,
          cells: [
            { raw: "=SUM(A1)", value: "=SUM(A1)", type: "string" as const },
          ],
          rowStatus: "valid" as const,
        },
      ],
      summary: {
        totalRows: 1,
        validRows: 1,
        warningRows: 0,
        errorRows: 0,
      },
    };

    expect(artifactNeedsSanitisation(artifact)).toBe(true);
  });

  it("should return false if no cells need sanitisation", () => {
    const artifact = {
      id: "test",
      title: "Test",
      sourceFileName: "test.csv",
      encoding: "utf-8" as const,
      delimiter: ",",
      createdAt: new Date().toISOString(),
      rows: [
        {
          lineNumber: 1,
          cells: [{ raw: "Normal", value: "Normal", type: "string" as const }],
          rowStatus: "valid" as const,
        },
      ],
      summary: {
        totalRows: 1,
        validRows: 1,
        warningRows: 0,
        errorRows: 0,
      },
    };

    expect(artifactNeedsSanitisation(artifact)).toBe(false);
  });
});
