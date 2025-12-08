/// <reference types="vitest" />

import { describe, expect, it } from "vitest";
import { abnChecksumIsValid, isValidAbn, normaliseIdentifier } from "@/lib/abr/validate";

describe("normaliseIdentifier", () => {
  it("strips punctuation and whitespace", () => {
    const result = normaliseIdentifier("51 824 753 556");
    expect(result).toEqual({ kind: "ABN", digits: "51824753556" });
  });

  it("detects ACN when nine digits", () => {
    const result = normaliseIdentifier("123 456 789");
    expect(result).toEqual({ kind: "ACN", digits: "123456789" });
  });

  it("returns UNKNOWN for other lengths", () => {
    const result = normaliseIdentifier("abc123");
    expect(result).toEqual({ kind: "UNKNOWN", digits: "123" });
  });
});

describe("isValidAbn", () => {
  it("accepts ABNs that pass checksum", () => {
    expect(isValidAbn("51824753556")).toBe(true);
  });

  it("rejects ABNs with invalid checksum", () => {
    expect(isValidAbn("51824753557")).toBe(false);
  });

  it("rejects ABNs starting with zero", () => {
    expect(isValidAbn("01824753556")).toBe(false);
  });

  it("rejects non-numeric ABNs", () => {
    expect(isValidAbn("51AB4753556")).toBe(false);
  });
});

describe("abnChecksumIsValid", () => {
  it("validates according to modulus 89 rule", () => {
    expect(abnChecksumIsValid("51824753556")).toBe(true);
    expect(abnChecksumIsValid("51824753557")).toBe(false);
  });

  it("returns false for incorrect length", () => {
    expect(abnChecksumIsValid("123456789")).toBe(false);
    expect(abnChecksumIsValid("123456789012")).toBe(false);
  });

  it("returns false for non-numeric values", () => {
    expect(abnChecksumIsValid("abcd1234567")).toBe(false);
  });
});
