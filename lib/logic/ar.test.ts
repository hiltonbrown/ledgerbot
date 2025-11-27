import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { subDays } from "date-fns";
import {
  calculateAgeingBucket,
  calculateCustomerHistory,
  calculateRiskScore,
} from "./ar";

// Mock types since we don't want to depend on DB during unit tests if possible,
// or we just cast objects.
const mockInvoice = (overrides: any = {}) => ({
  id: "inv-1",
  dueDate: new Date(),
  amountOutstanding: "100",
  ...overrides,
});

const mockPayment = (overrides: any = {}) => ({
  id: "pay-1",
  invoiceId: "inv-1",
  paidAt: new Date(),
  amount: "100",
  ...overrides,
});

describe("AR Logic", () => {
  describe("calculateAgeingBucket", () => {
    const today = new Date("2023-01-01");

    it("returns null if amountOutstanding is <= 0", () => {
      assert.strictEqual(calculateAgeingBucket(new Date(), 0), null);
      assert.strictEqual(calculateAgeingBucket(new Date(), -10), null);
    });

    it("returns Current if not overdue", () => {
      const dueDate = new Date("2023-01-02"); // Future
      assert.strictEqual(calculateAgeingBucket(dueDate, 100, today), "Current");

      const sameDate = new Date("2023-01-01");
      assert.strictEqual(
        calculateAgeingBucket(sameDate, 100, today),
        "Current"
      );
    });

    it("returns 1-30 if overdue by 1-30 days", () => {
      const dueDate = subDays(today, 1);
      assert.strictEqual(calculateAgeingBucket(dueDate, 100, today), "1-30");

      const dueDate30 = subDays(today, 30);
      assert.strictEqual(calculateAgeingBucket(dueDate30, 100, today), "1-30");
    });

    it("returns 31-60 if overdue by 31-60 days", () => {
      const dueDate = subDays(today, 31);
      assert.strictEqual(calculateAgeingBucket(dueDate, 100, today), "31-60");

      const dueDate60 = subDays(today, 60);
      assert.strictEqual(calculateAgeingBucket(dueDate60, 100, today), "31-60");
    });

    it("returns 61-90 if overdue by 61-90 days", () => {
      const dueDate = subDays(today, 61);
      assert.strictEqual(calculateAgeingBucket(dueDate, 100, today), "61-90");

      const dueDate90 = subDays(today, 90);
      assert.strictEqual(calculateAgeingBucket(dueDate90, 100, today), "61-90");
    });

    it("returns 90+ if overdue by > 90 days", () => {
      const dueDate = subDays(today, 91);
      assert.strictEqual(calculateAgeingBucket(dueDate, 100, today), "90+");
    });
  });

  describe("calculateCustomerHistory", () => {
    it("calculates basic stats correctly", () => {
      const invoices = [
        mockInvoice({ id: "1", amountOutstanding: "100" }),
        mockInvoice({ id: "2", amountOutstanding: "200" }),
      ] as any[];
      const payments = [] as any[];

      const stats = calculateCustomerHistory(invoices, payments);
      assert.strictEqual(stats.numInvoices, 2);
      assert.strictEqual(stats.totalOutstanding, 300);
      assert.strictEqual(stats.maxInvoiceOutstanding, 200);
      assert.strictEqual(stats.numLatePayments, 0);
    });

    it("detects late payments", () => {
      const dueDate = new Date("2023-01-01");
      const paidDate = new Date("2023-01-05"); // 4 days late

      const invoices = [
        mockInvoice({ id: "1", dueDate, amountOutstanding: "0" }),
      ] as any[];

      const payments = [
        mockPayment({ invoiceId: "1", paidAt: paidDate }),
      ] as any[];

      const stats = calculateCustomerHistory(invoices, payments);
      assert.strictEqual(stats.numLatePayments, 1);
      assert.strictEqual(stats.avgDaysLate, 4);
    });

    it("handles partial payments correctly", () => {
      const dueDate = subDays(new Date(), 10); // Overdue
      const invoices = [
        mockInvoice({ id: "1", dueDate, amountOutstanding: "50" }), // Partially paid
      ] as any[];

      const payments = [
        mockPayment({
          invoiceId: "1",
          paidAt: subDays(new Date(), 5),
          amount: "50",
        }),
      ] as any[];

      const stats = calculateCustomerHistory(invoices, payments);
      // Overdue invoices with outstanding balance count as late payments
      assert.strictEqual(stats.numLatePayments, 1);
      assert.strictEqual(stats.totalOutstanding, 50);
      assert.strictEqual(stats.maxDaysLate, 10);
      assert.strictEqual(stats.avgDaysLate, 10);
    });
  });

  describe("calculateRiskScore", () => {
    it("calculates low risk for perfect history", () => {
      const stats = {
        numInvoices: 10,
        numLatePayments: 0,
        avgDaysLate: 0,
        maxDaysLate: 0,
        percentInvoices90Plus: 0,
        totalOutstanding: 0,
        maxInvoiceOutstanding: 0,
        totalBilledLast12Months: 1000,
        lastPaymentDate: new Date(),
        creditTermsDays: 30,
        riskScore: 0,
      };
      // Expected: 0.5 * 0.05 (credit terms) + 0 (others) = 0.025 -> 0.03
      // Wait, credit terms 30 days = 0.5 score * 0.05 weight = 0.025.
      // Days since last payment = 0.
      // Outstanding ratio = 0.
      // Total = 0.025. Rounded to 2 decimals = 0.03? Or 0.02?
      // 0.025.toFixed(2) is "0.03" (rounds up usually) or "0.02"?
      // JS toFixed(2) for 0.025 is "0.03".

      const score = calculateRiskScore(stats);
      assert.ok(score < 0.1, `Score ${score} should be low`);
    });

    it("calculates high risk for bad history", () => {
      const stats = {
        numInvoices: 10,
        numLatePayments: 10, // 1.0 * 0.30 = 0.30
        avgDaysLate: 90, // 1.0 * 0.20 = 0.20
        maxDaysLate: 120, // 1.0 * 0.10 = 0.10
        percentInvoices90Plus: 100, // 1.0 * 0.20 = 0.20
        totalOutstanding: 1000,
        maxInvoiceOutstanding: 100,
        totalBilledLast12Months: 1000, // Ratio 1.0 * 0.10 = 0.10
        lastPaymentDate: subDays(new Date(), 100), // > 60 days = 1.0 * 0.05 = 0.05
        creditTermsDays: 7, // < 14 days = 1.0 * 0.05 = 0.05
        riskScore: 0,
      };
      // Total = 0.30 + 0.20 + 0.10 + 0.20 + 0.10 + 0.05 + 0.05 = 1.00

      const score = calculateRiskScore(stats);
      assert.strictEqual(score, 1.0);
    });
  });
});
