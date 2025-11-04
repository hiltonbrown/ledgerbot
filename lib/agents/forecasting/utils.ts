export function formatNumberWithCurrency(value: number, currency: string) {
  if (!Number.isFinite(value)) {
    return `${currency} 0`;
  }

  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseMonthToDate(month: string) {
  const [year, monthPart] = month.split("-");
  const parsedYear = Number.parseInt(year, 10);
  const parsedMonth = Number.parseInt(monthPart, 10);

  if (!Number.isFinite(parsedYear) || !Number.isFinite(parsedMonth)) {
    return null;
  }

  return new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));
}

export function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addMonths(date: Date, months: number) {
  const clone = new Date(date.getTime());
  clone.setUTCMonth(clone.getUTCMonth() + months);
  return clone;
}

export function clampHorizon(months: number, { min, max }: { min: number; max: number }) {
  return Math.min(Math.max(months, min), max);
}

export function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}
