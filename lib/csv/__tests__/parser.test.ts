/**
 * Tests for CSV Parser
 */

import { describe, expect, it } from "@jest/globals";
import { parseCsv } from "../parser";

describe("parseCsv", () => {
  describe("basic parsing", () => {
    it("should parse simple CSV with header", () => {
      const csv = "Name,Age,City\nJohn,30,Sydney\nJane,25,Melbourne";
      const result = parseCsv(csv, { hasHeader: true });

      expect(result.header).toEqual(["Name", "Age", "City"]);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(["John", "30", "Sydney"]);
      expect(result.rows[1]).toEqual(["Jane", "25", "Melbourne"]);
      expect(result.delimiter).toBe(",");
      expect(result.encoding).toBe("utf-8");
      expect(result.parseErrors).toHaveLength(0);
    });

    it("should parse CSV without header", () => {
      const csv = "John,30,Sydney\nJane,25,Melbourne";
      const result = parseCsv(csv, { hasHeader: false });

      expect(result.header).toBeNull();
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(["John", "30", "Sydney"]);
    });

    it("should handle empty CSV", () => {
      const csv = "";
      const result = parseCsv(csv);

      expect(result.header).toBeNull();
      expect(result.rows).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
    });

    it("should handle CSV with only header", () => {
      const csv = "Name,Age,City";
      const result = parseCsv(csv, { hasHeader: true });

      expect(result.header).toEqual(["Name", "Age", "City"]);
      expect(result.rows).toHaveLength(0);
    });
  });

  describe("delimiter detection", () => {
    it("should detect comma delimiter", () => {
      const csv = "a,b,c\n1,2,3";
      const result = parseCsv(csv);

      expect(result.delimiter).toBe(",");
    });

    it("should detect semicolon delimiter", () => {
      const csv = "a;b;c\n1;2;3";
      const result = parseCsv(csv);

      expect(result.delimiter).toBe(";");
    });

    it("should use explicit delimiter when provided", () => {
      const csv = "a;b;c\n1;2;3";
      const result = parseCsv(csv, { delimiter: ";" });

      expect(result.delimiter).toBe(";");
      expect(result.rows[0]).toEqual(["1", "2", "3"]);
    });
  });

  describe("encoding detection", () => {
    it("should detect clean UTF-8 encoding", () => {
      const csv = "Name,City\nJohn,Sydney";
      const result = parseCsv(csv);

      expect(result.encoding).toBe("utf-8");
    });

    it("should detect encoding issues", () => {
      const csv = "Name,City\nJohn,Syd�ney";
      const result = parseCsv(csv);

      expect(result.encoding).toBe("unknown");
    });
  });

  describe("ArrayBuffer input", () => {
    it("should parse ArrayBuffer input", () => {
      const csv = "Name,Age\nJohn,30";
      const buffer = new TextEncoder().encode(csv).buffer;
      const result = parseCsv(buffer, { hasHeader: true });

      expect(result.header).toEqual(["Name", "Age"]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(["John", "30"]);
    });
  });

  describe("quoted values", () => {
    it("should handle quoted values with commas", () => {
      const csv = 'Name,Description\nJohn,"A person, with a comma"';
      const result = parseCsv(csv, { hasHeader: true });

      expect(result.rows[0]).toEqual(["John", "A person, with a comma"]);
    });

    it("should handle quoted values with newlines", () => {
      const csv = 'Name,Description\nJohn,"Line 1\nLine 2"';
      const result = parseCsv(csv, { hasHeader: true });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0][1]).toContain("Line 1");
    });
  });

  describe("empty rows", () => {
    it("should filter out completely empty rows", () => {
      const csv = "Name,Age\nJohn,30\n\n\nJane,25";
      const result = parseCsv(csv, { hasHeader: true });

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(["John", "30"]);
      expect(result.rows[1]).toEqual(["Jane", "25"]);
    });

    it("should keep rows with at least one non-empty cell", () => {
      const csv = "Name,Age\nJohn,\n,25";
      const result = parseCsv(csv, { hasHeader: true });

      expect(result.rows).toHaveLength(2);
    });
  });

  describe("type handling", () => {
    it("should never auto-infer types (all values are strings)", () => {
      const csv = "Name,Age,Amount,Valid\nJohn,30,100.50,true";
      const result = parseCsv(csv, { hasHeader: true });

      const row = result.rows[0];
      expect(typeof row[0]).toBe("string"); // "John"
      expect(typeof row[1]).toBe("string"); // "30"
      expect(typeof row[2]).toBe("string"); // "100.50"
      expect(typeof row[3]).toBe("string"); // "true"
    });
  });
});
