#!/usr/bin/env tsx
/**
 * Test script to diagnose Xero P&L discrepancies
 * Usage: pnpm exec tsx scripts/test-xero-pl.ts
 */

import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";

async function testProfitAndLoss() {
  console.log("🔍 Testing Xero Profit & Loss API...\n");

  // Get user ID from environment or use a test user
  const userId = process.env.TEST_USER_ID;

  if (!userId) {
    console.error("❌ TEST_USER_ID environment variable not set");
    console.log("   Set it with: export TEST_USER_ID=<your-user-id>");
    process.exit(1);
  }

  // Test 1: Get P&L for October 2025
  console.log("📊 Test 1: October 2025 P&L");
  console.log("   From: 2025-10-01");
  console.log("   To:   2025-10-31\n");

  try {
    const result = await executeXeroMCPTool(
      userId,
      "xero_get_profit_and_loss",
      {
        fromDate: "2025-10-01",
        toDate: "2025-10-31",
      }
    );

    const plData = JSON.parse(result.content[0].text);
    console.log("✅ P&L Retrieved Successfully\n");
    console.log("Report Metadata:");
    console.log(`  Report ID: ${plData.reports?.[0]?.reportID || "N/A"}`);
    console.log(`  Report Name: ${plData.reports?.[0]?.reportName || "N/A"}`);
    console.log(`  Report Type: ${plData.reports?.[0]?.reportType || "N/A"}`);
    console.log(`  Report Date: ${plData.reports?.[0]?.reportDate || "N/A"}`);
    console.log(
      `  Updated At: ${plData.reports?.[0]?.updatedDateUTC || "N/A"}`
    );

    // Extract key sections
    const report = plData.reports?.[0];
    if (report?.rows) {
      console.log("\n📈 Report Structure:");
      for (const row of report.rows) {
        if (row.rowType === "Section" && row.title) {
          console.log(`\n  ${row.title}:`);
          if (row.rows) {
            for (const subRow of row.rows) {
              if (subRow.cells && subRow.cells.length > 0) {
                const label = subRow.cells[0]?.value || "N/A";
                const value = subRow.cells[1]?.value || "0";
                console.log(`    - ${label}: ${value}`);
              }
            }
          }
        }
      }
    }

    // Test 2: Get detailed breakdown with periods
    console.log("\n\n📊 Test 2: October 2025 P&L with Monthly Periods");
    console.log("   From: 2025-10-01");
    console.log("   To:   2025-10-31");
    console.log("   Periods: 1");
    console.log("   Timeframe: MONTH\n");

    const detailedResult = await executeXeroMCPTool(
      userId,
      "xero_get_profit_and_loss",
      {
        fromDate: "2025-10-01",
        toDate: "2025-10-31",
        periods: 1,
        timeframe: "MONTH",
      }
    );

    const _detailedData = JSON.parse(detailedResult.content[0].text);
    console.log("✅ Detailed P&L Retrieved Successfully\n");

    // Compare with invoices for the same period
    console.log("\n📋 Test 3: Cross-checking with Invoices");
    console.log("   Fetching invoices for October 2025...\n");

    const invoicesResult = await executeXeroMCPTool(
      userId,
      "xero_list_invoices",
      {
        invoiceType: "ACCREC",
        dateFrom: "2025-10-01",
        dateTo: "2025-10-31",
        status: "AUTHORISED",
      }
    );

    const invoices = JSON.parse(invoicesResult.content[0].text);
    console.log(`✅ Retrieved ${invoices.length} invoices\n`);

    // Calculate total revenue from invoices
    let totalRevenue = 0;
    let totalTax = 0;
    for (const invoice of invoices) {
      totalRevenue += invoice.subTotal || 0;
      totalTax += invoice.totalTax || 0;
    }

    console.log("Invoice Totals:");
    console.log(`  Subtotal: $${totalRevenue.toFixed(2)}`);
    console.log(`  Tax: $${totalTax.toFixed(2)}`);
    console.log(`  Total: $${(totalRevenue + totalTax).toFixed(2)}\n`);

    // Get bills (expenses) for the same period
    console.log("📋 Test 4: Fetching Bills for October 2025...\n");

    const billsResult = await executeXeroMCPTool(userId, "xero_list_invoices", {
      invoiceType: "ACCPAY",
      dateFrom: "2025-10-01",
      dateTo: "2025-10-31",
    });

    const bills = JSON.parse(billsResult.content[0].text);
    console.log(`✅ Retrieved ${bills.length} bills\n`);

    // Calculate total expenses from bills
    let totalExpenses = 0;
    let totalExpensesTax = 0;
    for (const bill of bills) {
      totalExpenses += bill.subTotal || 0;
      totalExpensesTax += bill.totalTax || 0;
    }

    console.log("Bill Totals:");
    console.log(`  Subtotal: $${totalExpenses.toFixed(2)}`);
    console.log(`  Tax: $${totalExpensesTax.toFixed(2)}`);
    console.log(`  Total: $${(totalExpenses + totalExpensesTax).toFixed(2)}\n`);

    // Calculate net profit from transactions
    const netFromTransactions = totalRevenue - totalExpenses;
    console.log("🧮 Calculated from Transactions:");
    console.log(`  Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`  Expenses: $${totalExpenses.toFixed(2)}`);
    console.log(`  Net Profit: $${netFromTransactions.toFixed(2)}\n`);

    console.log("\n✅ All tests completed!");
    console.log("\n📝 Summary:");
    console.log("   1. P&L report retrieved successfully from Xero API");
    console.log(
      `   2. Found ${invoices.length} sales invoices and ${bills.length} bills`
    );
    console.log(
      "   3. Compare the P&L report figures with calculated transaction totals"
    );
    console.log("\n⚠️  NOTE: P&L may differ from invoice/bill totals due to:");
    console.log("   - Payments and receipts timing (cash vs accrual)");
    console.log("   - Manual journal entries");
    console.log("   - Bank transactions");
    console.log("   - Tracking categories");
    console.log("   - Currency conversions");
  } catch (error) {
    console.error("\n❌ Error during testing:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error("\nStack trace:");
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the test
testProfitAndLoss().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
