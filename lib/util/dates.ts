/**
 * Date utility helpers for AR agent
 */

/**
 * Calculate days between two dates
 * Returns positive number if b is after a
 */
export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / msPerDay);
}

/**
 * Get asOf date or default to today
 */
export function asOfOrToday(asOf?: string | Date): Date {
  if (!asOf) return new Date();
  if (asOf instanceof Date) return asOf;
  return new Date(asOf);
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
export function formatIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format date for display (Australian format: DD/MM/YYYY)
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse ISO date string to Date
 */
export function parseIsoDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date, relativeTo?: Date): boolean {
  const reference = relativeTo || new Date();
  return date < reference;
}

/**
 * Check if a date is overdue (past due date)
 */
export function isOverdue(dueDate: Date, asOf?: Date): boolean {
  const reference = asOf || new Date();
  return daysBetween(dueDate, reference) > 0;
}

/**
 * Get days overdue (0 if not overdue)
 */
export function getDaysOverdue(dueDate: Date, asOf?: Date): number {
  const reference = asOf || new Date();
  return Math.max(0, daysBetween(dueDate, reference));
}

/**
 * Get business days between two dates (excluding weekends)
 * Simple implementation - doesn't account for public holidays
 */
export function businessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 days")
 */
export function formatRelativeTime(date: Date, relativeTo?: Date): string {
  const reference = relativeTo || new Date();
  const days = daysBetween(reference, date);

  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/**
 * Get quarter end date for a given date
 */
export function getQuarterEnd(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  const year = date.getFullYear();
  const quarterEndMonth = (quarter + 1) * 3; // 3, 6, 9, 12

  return new Date(year, quarterEndMonth, 0); // Last day of quarter
}

/**
 * Check if date is within range
 */
export function isWithinRange(
  date: Date,
  start: Date,
  end: Date
): boolean {
  return date >= start && date <= end;
}
