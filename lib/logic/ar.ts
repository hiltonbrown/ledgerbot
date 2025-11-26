import { differenceInDays, isAfter, startOfDay, subMonths } from "date-fns";
import type { ArInvoice, ArPayment } from "../db/schema/ar";

export type AgeingBucket = "Current" | "1-30" | "31-60" | "61-90" | "90+";

export function calculateAgeingBucket(
  dueDate: Date,
  amountOutstanding: number,
  referenceDate: Date = new Date()
): AgeingBucket | null {
  if (amountOutstanding <= 0) {
    return null;
  }

  const daysOverdue = differenceInDays(
    startOfDay(referenceDate),
    startOfDay(dueDate)
  );

  if (daysOverdue <= 0) return "Current";
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}

export interface CustomerHistoryStats {
  numInvoices: number;
  numLatePayments: number;
  avgDaysLate: number;
  maxDaysLate: number;
  percentInvoices90Plus: number;
  totalOutstanding: number;
  maxInvoiceOutstanding: number;
  totalBilledLast12Months: number;
  lastPaymentDate: Date | null;
  creditTermsDays: number; // Estimated
  riskScore: number;
}

export function calculateCustomerHistory(
  invoices: ArInvoice[],
  payments: ArPayment[]
): CustomerHistoryStats {
  let numInvoices = 0;
  let numLatePayments = 0;
  let totalDaysLate = 0;
  let maxDaysLate = 0;
  let totalOutstanding = 0;
  let maxInvoiceOutstanding = 0;
  let totalBilledLast12Months = 0;
  let count90Plus = 0;
  let lastPaymentDate: Date | null = null;

  const now = new Date();
  const twelveMonthsAgo = subMonths(now, 12);

  // Sort payments by date desc
  const sortedPayments = [...payments].sort(
    (a, b) => b.paidAt.getTime() - a.paidAt.getTime()
  );
  if (sortedPayments.length > 0) {
    lastPaymentDate = sortedPayments[0].paidAt;
  }

  for (const invoice of invoices) {
    numInvoices++;
    const outstanding = Number(invoice.amountOutstanding);
    const total = Number(invoice.total);

    totalOutstanding += outstanding;
    if (outstanding > maxInvoiceOutstanding) {
      maxInvoiceOutstanding = outstanding;
    }

    if (isAfter(invoice.issueDate, twelveMonthsAgo)) {
      totalBilledLast12Months += total;
    }

    // Check ageing bucket for 90+
    // We can re-calculate or use stored bucket if trusted.
    // Let's re-calculate to be sure based on current date.
    const bucket = calculateAgeingBucket(invoice.dueDate, outstanding, now);
    if (bucket === "90+") {
      count90Plus++;
    }

    // Check for late payments
    const invoicePayments = payments.filter((p) => p.invoiceId === invoice.id);

    // If fully paid, check if it was late
    if (outstanding <= 0 && invoicePayments.length > 0) {
      const latestPayment = invoicePayments.sort(
        (a, b) => b.paidAt.getTime() - a.paidAt.getTime()
      )[0];

      if (
        isAfter(startOfDay(latestPayment.paidAt), startOfDay(invoice.dueDate))
      ) {
        numLatePayments++;
        const daysLate = differenceInDays(
          startOfDay(latestPayment.paidAt),
          startOfDay(invoice.dueDate)
        );
        totalDaysLate += daysLate;
        if (daysLate > maxDaysLate) {
          maxDaysLate = daysLate;
        }
      }
    } else if (
      outstanding > 0 &&
      isAfter(startOfDay(now), startOfDay(invoice.dueDate))
    ) {
      // Currently overdue - consider this for maxDaysLate?
      // Requirement says "late defined as payment_date > due_date".
      // If not paid yet, technically it's not a "late payment" event yet, but it IS late.
      // For risk scoring, current overdue days is very relevant.
      // Let's include current overdue days in maxDaysLate calculation.
      const currentDaysLate = differenceInDays(
        startOfDay(now),
        startOfDay(invoice.dueDate)
      );
      if (currentDaysLate > maxDaysLate) {
        maxDaysLate = currentDaysLate;
      }
    }
  }

  const avgDaysLate = numLatePayments > 0 ? totalDaysLate / numLatePayments : 0;
  const percentInvoices90Plus =
    numInvoices > 0 ? (count90Plus / numInvoices) * 100 : 0;
  const creditTermsDays = 30; // Default/Placeholder

  const stats: CustomerHistoryStats = {
    numInvoices,
    numLatePayments,
    avgDaysLate,
    maxDaysLate,
    percentInvoices90Plus,
    totalOutstanding,
    maxInvoiceOutstanding,
    totalBilledLast12Months,
    lastPaymentDate,
    creditTermsDays,
    riskScore: 0, // Calculated below
  };

  stats.riskScore = calculateRiskScore(stats);
  return stats;
}

/**
 * Calculates a risk score between 0 (low risk) and 1 (high risk).
 *
 * Factors & Weights:
 * - Late Payment Rate (30%): num_late_payments / num_invoices
 * - Avg Days Late (20%): Normalized against 90 days cap
 * - Max Days Late (10%): Normalized against 120 days cap
 * - % Invoices > 90 Days (20%): Direct percentage
 * - Credit Terms (5%): Normalized (shorter terms = higher risk? Actually usually longer terms = higher exposure, but prompt says "shorter terms -> higher risk"??
 *   Wait, usually shorter terms means we want money faster because they are risky.
 *   Or maybe if they HAVE shorter terms, they are treated as riskier?
 *   Let's follow prompt: "shorter terms -> higher risk".
 *   Maybe it means if we enforce shorter terms it's because they are risky.
 *   Let's normalize: 0 days = 1.0 risk, 30 days = 0.5, 60+ days = 0.0?
 * - Days Since Last Payment (5%): Normalized against 60 days
 * - Outstanding / Total Billed (10%): Ratio, capped at 1.0
 */
export function calculateRiskScore(stats: CustomerHistoryStats): number {
  if (stats.numInvoices === 0) return 0; // No history = Low risk (or unknown, but 0 is safe start)

  // 1. Late Payment Rate (30%)
  const latePaymentRate = stats.numLatePayments / stats.numInvoices;

  // 2. Avg Days Late (20%) - Cap at 90 days for max risk
  const avgDaysLateScore = Math.min(stats.avgDaysLate, 90) / 90;

  // 3. Max Days Late (10%) - Cap at 120 days
  const maxDaysLateScore = Math.min(stats.maxDaysLate, 120) / 120;

  // 4. % Invoices > 90 Days (20%)
  const percent90PlusScore = stats.percentInvoices90Plus / 100;

  // 5. Credit Terms (5%) - Prompt: "shorter terms -> higher risk"
  // Let's assume standard is 30.
  // If terms < 14 days => High Risk (1.0)
  // If terms 14-30 days => Medium Risk (0.5)
  // If terms > 30 days => Low Risk (0.0)
  let creditTermsScore = 0;
  if (stats.creditTermsDays < 14) creditTermsScore = 1.0;
  else if (stats.creditTermsDays <= 30) creditTermsScore = 0.5;
  else creditTermsScore = 0.0;

  // 6. Days Since Last Payment (5%)
  let daysSinceLastPaymentScore = 0;
  if (stats.lastPaymentDate) {
    const daysSince = differenceInDays(
      startOfDay(new Date()),
      startOfDay(stats.lastPaymentDate)
    );
    // Cap at 60 days
    daysSinceLastPaymentScore = Math.min(daysSince, 60) / 60;
  } else {
    // No payments yet? If they have invoices but no payments, that's risky.
    // If they have no invoices, we returned 0 already.
    // So if numInvoices > 0 and no payments, risk is high.
    daysSinceLastPaymentScore = 1.0;
  }

  // 7. Outstanding / Total Billed (10%)
  let outstandingRatioScore = 0;
  if (stats.totalBilledLast12Months > 0) {
    outstandingRatioScore = Math.min(
      stats.totalOutstanding / stats.totalBilledLast12Months,
      1.0
    );
  } else if (stats.totalOutstanding > 0) {
    outstandingRatioScore = 1.0; // Outstanding but nothing billed in last 12m? Weird, but risky.
  }

  const score =
    latePaymentRate * 0.3 +
    avgDaysLateScore * 0.2 +
    maxDaysLateScore * 0.1 +
    percent90PlusScore * 0.2 +
    creditTermsScore * 0.05 +
    daysSinceLastPaymentScore * 0.05 +
    outstandingRatioScore * 0.1;

  return Number(score.toFixed(2));
}
