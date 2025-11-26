/**
 * Tests for CSV Validation and Normalisation
 */

import { describe, expect, it } from "@jest/globals";
import {
  normaliseBoolean,
  normaliseDate,
  normaliseNumber,
  validateCell,
} from "../validation";

describe("normaliseNumber", () => {
  it("should parse simple numbers", () => {
    expect(normaliseNumber("123")).toBe(123);
    expect(normaliseNumber("123.45")).toBe(123.45);
    expect(normaliseNumber("-123.45")).toBe(-123.45);
  });

  it("should handle thousand separators", () => {
    expect(normaliseNumber("1,000")).toBe(1000);
    expect(normaliseNumber("1,000,000")).toBe(1_000_000);
    expect(normaliseNumber("1 000")).toBe(1000);
  });

  it("should handle currency symbols", () => {
    expect(normaliseNumber("$1000")).toBe(1000);
    expect(normaliseNumber("£1000")).toBe(1000);
    expect(normaliseNumber("€1000")).toBe(1000);
    expect(normaliseNumber("AUD1000")).toBe(1000);
  });

  it("should handle accounting format (parentheses for negatives)", () => {
    expect(normaliseNumber("(1000)")).toBe(-1000);
    expect(normaliseNumber("($1000)")).toBe(-1000);
  });

  it("should handle percentages", () => {
    expect(normaliseNumber("50%")).toBe(50);
    expect(normaliseNumber("12.5%")).toBe(12.5);
  });

  it("should return null for invalid input", () => {
    expect(normaliseNumber("abc")).toBeNull();
    expect(normaliseNumber("")).toBeNull();
    expect(normaliseNumber("   ")).toBeNull();
  });

  it("should handle complex formats", () => {
    expect(normaliseNumber("$1,234.56")).toBe(1234.56);
    expect(normaliseNumber("($1,234.56)")).toBe(-1234.56);
  });
});

describe("normaliseDate", () => {
  it("should parse DD/MM/YYYY format", () => {
    const result = normaliseDate("15/01/2024");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(0); // January is 0
    expect(result?.getDate()).toBe(15);
  });

  it("should parse YYYY-MM-DD format", () => {
    const result = normaliseDate("2024-01-15");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
  });

  it("should parse MM/DD/YYYY format", () => {
    const result = normaliseDate("01/15/2024");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
  });

  it("should try multiple formats", () => {
    const formats = ["dd/MM/yyyy", "yyyy-MM-dd"];
    const result1 = normaliseDate("15/01/2024", formats);
    const result2 = normaliseDate("2024-01-15", formats);

    expect(result1).toBeInstanceOf(Date);
    expect(result2).toBeInstanceOf(Date);
  });

  it("should return null for invalid dates", () => {
    expect(normaliseDate("invalid")).toBeNull();
    expect(normaliseDate("32/13/2024")).toBeNull();
    expect(normaliseDate("")).toBeNull();
  });
});

describe("normaliseBoolean", () => {
  it("should parse true values", () => {
    expect(normaliseBoolean("true")).toBe(true);
    expect(normaliseBoolean("TRUE")).toBe(true);
    expect(normaliseBoolean("yes")).toBe(true);
    expect(normaliseBoolean("YES")).toBe(true);
    expect(normaliseBoolean("y")).toBe(true);
    expect(normaliseBoolean("1")).toBe(true);
    expect(normaliseBoolean("on")).toBe(true);
  });

  it("should parse false values", () => {
    expect(normaliseBoolean("false")).toBe(false);
    expect(normaliseBoolean("FALSE")).toBe(false);
    expect(normaliseBoolean("no")).toBe(false);
    expect(normaliseBoolean("NO")).toBe(false);
    expect(normaliseBoolean("n")).toBe(false);
    expect(normaliseBoolean("0")).toBe(false);
    expect(normaliseBoolean("off")).toBe(false);
  });

  it("should return null for invalid values", () => {
    expect(normaliseBoolean("invalid")).toBeNull();
    expect(normaliseBoolean("")).toBeNull();
    expect(normaliseBoolean("2")).toBeNull();
  });
});

describe("validateCell", () => {
  it("should validate string cells without schema", () => {
    const cell = validateCell("test value", null);

    expect(cell.raw).toBe("test value");
    expect(cell.value).toBe("test value");
    expect(cell.type).toBe("string");
    expect(cell.issues).toHaveLength(0);
  });

  it("should validate number cells", () => {
    const field = {
      name: "amount",
      columnHeader: "Amount",
      type: "number" as const,
      required: true,
    };

    const cell = validateCell("1234.56", field);

    expect(cell.value).toBe(1234.56);
    expect(cell.type).toBe("number");
    expect(cell.issues).toHaveLength(0);
  });

  it("should detect invalid number type", () => {
    const field = {
      name: "amount",
      columnHeader: "Amount",
      type: "number" as const,
    };

    const cell = validateCell("not a number", field);

    expect(cell.type).toBe("string"); // Fallback
    expect(cell.issues?.some((i) => i.code === "INVALID_TYPE")).toBe(true);
  });

  it("should validate required fields", () => {
    const field = {
      name: "name",
      columnHeader: "Name",
      type: "string" as const,
      required: true,
    };

    const cell = validateCell("", field);

    expect(cell.issues?.some((i) => i.code === "MISSING_REQUIRED")).toBe(true);
  });

  it("should validate number ranges", () => {
    const field = {
      name: "age",
      columnHeader: "Age",
      type: "number" as const,
      min: 0,
      max: 120,
    };

    const cell1 = validateCell("-5", field);
    expect(cell1.issues?.some((i) => i.code === "OUT_OF_RANGE")).toBe(true);

    const cell2 = validateCell("150", field);
    expect(cell2.issues?.some((i) => i.code === "OUT_OF_RANGE")).toBe(true);

    const cell3 = validateCell("50", field);
    expect(cell3.issues).toHaveLength(0);
  });

  it("should validate date fields", () => {
    const field = {
      name: "date",
      columnHeader: "Date",
      type: "date" as const,
      dateFormats: ["dd/MM/yyyy"],
    };

    const cell = validateCell("15/01/2024", field);

    expect(cell.type).toBe("date");
    expect(cell.value).toBeInstanceOf(Date);
    expect(cell.issues).toHaveLength(0);
  });

  it("should validate boolean fields", () => {
    const field = {
      name: "active",
      columnHeader: "Active",
      type: "boolean" as const,
    };

    const cell = validateCell("true", field);

    expect(cell.type).toBe("boolean");
    expect(cell.value).toBe(true);
    expect(cell.issues).toHaveLength(0);
  });

  it("should handle empty cells", () => {
    const field = {
      name: "optional",
      columnHeader: "Optional",
      type: "string" as const,
      required: false,
    };

    const cell = validateCell("", field);

    expect(cell.type).toBe("empty");
    expect(cell.value).toBeNull();
    expect(cell.issues).toHaveLength(0);
  });
});
