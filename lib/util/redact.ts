/**
 * Redaction utilities for PII protection in logs and streams
 */

/**
 * Mask an email address, showing only first 2 chars and domain
 * Example: john.doe@example.com → jo***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";

  const [local, domain] = email.split("@");
  if (local.length <= 2) return `***@${domain}`;

  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Mask a phone number, showing only last 3 digits
 * Example: +61 412 345 678 → ***678
 */
export function maskPhone(phone: string): string {
  if (!phone) return "***";

  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 3) return "***";

  return `***${digits.slice(-3)}`;
}

/**
 * Redact PII from an object or string
 * Searches for email and phone patterns and masks them
 */
export function redactPii(data: unknown): unknown {
  if (typeof data === "string") {
    // Email pattern
    let redacted = data.replace(
      /([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
      (match, local, domain) => {
        if (local.length <= 2) return `***@${domain}`;
        return `${local.slice(0, 2)}***@${domain}`;
      }
    );

    // Phone pattern (basic international format)
    redacted = redacted.replace(
      /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g,
      (match) => {
        const digits = match.replace(/\D/g, "");
        if (digits.length <= 3) return "***";
        return `***${digits.slice(-3)}`;
      }
    );

    return redacted;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactPii(item));
  }

  if (data && typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Redact specific fields
      if (key === "email" && typeof value === "string") {
        result[key] = maskEmail(value);
      } else if (key === "phone" && typeof value === "string") {
        result[key] = maskPhone(value);
      } else {
        result[key] = redactPii(value);
      }
    }
    return result;
  }

  return data;
}

/**
 * Redact PII from log messages
 * Safe to use with console.log, logger, etc.
 */
export function redactLog(...args: unknown[]): unknown[] {
  return args.map((arg) => redactPii(arg));
}

/**
 * Create a redacted version of an invoice for logging
 */
export function redactInvoiceForLog(invoice: {
  id: string;
  number: string;
  total: string | number;
  contact?: { email?: string; phone?: string; name: string };
}): unknown {
  return {
    id: invoice.id,
    number: invoice.number,
    total: invoice.total,
    contact: invoice.contact
      ? {
          name: invoice.contact.name,
          email: invoice.contact.email
            ? maskEmail(invoice.contact.email)
            : undefined,
          phone: invoice.contact.phone
            ? maskPhone(invoice.contact.phone)
            : undefined,
        }
      : undefined,
  };
}
