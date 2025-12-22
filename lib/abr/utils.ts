import type { AbrQueryKind } from "@/types/abr";

/**
 * Normalises an identifier by removing all non-digit characters.
 */
export function normaliseAbn(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Validates an Australian Business Number (ABN) using the official modulus 89 algorithm.
 * Reference: https://abr.business.gov.au/Help/AbnFormat
 */
export function validateAbnChecksum(abn: string): boolean {
  // ABN must be 11 digits
  if (!/^\d{11}$/.test(abn)) {
    return false;
  }

  // ABN cannot start with 0 (after normalisation, though usually handled by subtraction)
  // Actually, the subtraction step handles the 0 check effectively as (0-1) would mess up the weights if not allowed?
  // The ATO says "11 digit number".

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = abn.split("").map((d) => Number.parseInt(d, 10));

  // 1. Subtract 1 from the first (left-most) digit
  digits[0] -= 1;

  // 2. Multiply each digit by its weighting factor & 3. Sum the results
  const sum = digits.reduce(
    (prev, curr, index) => prev + curr * weights[index],
    0
  );

  // 4. Divide by 89. If the remainder is 0, the ABN is valid.
  return sum % 89 === 0;
}

/**
 * Validates an Australian Company Number (ACN) using the weighted sum algorithm.
 * Reference: https://asic.gov.au/for-business/registering-a-company/steps-to-register-a-company/australian-company-numbers/australian-company-number-acn-check-digit/
 */
export function validateAcnChecksum(acn: string): boolean {
  if (!/^\d{9}$/.test(acn)) {
    return false;
  }

  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  const digits = acn.split("").map((d) => Number.parseInt(d, 10));
  const checkDigit = digits.pop()!; // The last digit is the check digit

  const sum = digits.reduce(
    (prev, curr, index) => prev + curr * weights[index],
    0
  );

  const remainder = sum % 10;
  const complement = 10 - remainder;
  const calculatedCheckDigit = complement === 10 ? 0 : complement;

  return calculatedCheckDigit === checkDigit;
}

/**
 * Classifies a search query string.
 * Supports natural language by extracting potential ABNs.
 */
export function classifyAbrQuery(input: string): {
  kind: AbrQueryKind;
  value: string;
} {
  const normalised = normaliseAbn(input);

  // Check for direct 11-digit ABN match
  if (normalised.length === 11 && validateAbnChecksum(normalised)) {
    return { kind: "ABN", value: normalised };
  }

  // Check for direct 9-digit ACN match
  if (normalised.length === 9 && validateAcnChecksum(normalised)) {
    return { kind: "ACN", value: normalised };
  }

  // Attempt to extract ABN from a mixed string (e.g. "ABN 12 345 678 901")
  const potentialAbns = input.match(/\b\d{2}\s*\d{3}\s*\d{3}\s*\d{3}\b/g);
  if (potentialAbns) {
    for (const match of potentialAbns) {
      const clean = normaliseAbn(match);
      if (validateAbnChecksum(clean)) {
        return { kind: "ABN", value: clean };
      }
    }
  }

  // Default to Business Name if it has at least 2 characters
  if (input.trim().length >= 2) {
    return { kind: "BusinessName", value: input.trim() };
  }

  return { kind: "Unknown", value: input };
}
