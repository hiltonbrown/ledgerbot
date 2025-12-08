export function normaliseIdentifier(raw: string): {
  kind: "ABN" | "ACN" | "UNKNOWN";
  digits: string;
} {
  const digits = raw.replace(/\D+/g, "");

  if (digits.length === 11) {
    return { kind: "ABN", digits };
  }

  if (digits.length === 9) {
    return { kind: "ACN", digits };
  }

  return { kind: "UNKNOWN", digits };
}

export function abnChecksumIsValid(abn: string): boolean {
  if (!/^\d{11}$/.test(abn)) {
    return false;
  }

  const digits = abn.split("").map(Number);
  digits[0] = digits[0] - 1;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

  const total = digits.reduce((sum, digit, index) => sum + digit * weights[index], 0);

  return total % 89 === 0;
}

export function isValidAbn(abn: string): boolean {
  if (!/^\d{11}$/.test(abn)) {
    return false;
  }

  if (abn.startsWith("0")) {
    return false;
  }

  return abnChecksumIsValid(abn);
}
