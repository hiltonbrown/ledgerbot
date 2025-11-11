/**
 * Diagnostic endpoint for Xero P&L reconciliation
 * Accessible at: /api/diagnostic/xero-pl
 */

import { NextResponse } from "next/server";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";

export const maxDuration = 60;

export async function GET() {
  try {
    // Get authenticated user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check for active Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    if (!xeroConnection) {
      return NextResponse.json(
        {
          error: "No active Xero connection",
          message: "Please connect your Xero account at /settings/integrations",
        },
        { status: 400 }
      );
    }

    const report = {
      userId: user.id,
      userEmail: user.email,
      xeroOrganisation: xeroConnection.tenantName,
      timestamp: new Date().toISOString(),
      tests: [] as any[],
    };

    // Test 1: Get P&L for October 2025
    report.tests.push({
      name: "October 2025 P&L Report",
      status: "running",
    });

    const plResult = await executeXeroMCPTool(
      user.id,
      "xero_get_profit_and_loss",
      {
        fromDate: "2025-10-01",
        toDate: "2025-10-31",
      }
    );

    const plData = JSON.parse(plResult.content[0].text);
    const plReport = plData.reports?.[0];

    report.tests[0].status = "completed";
    report.tests[0].data = {
      reportId: plReport?.reportID,
      reportName: plReport?.reportName,
      reportDate: plReport?.reportDate,
      updatedAt: plReport?.updatedDateUTC,
    };

    // Extract revenue and expenses from P&L
    let plRevenue = 0;
    let plExpenses = 0;

    if (plReport?.rows) {
      for (const row of plReport.rows) {
        if (row.rowType === "Section") {
          if (row.title === "Revenue" || row.title === "Income") {
            // Sum up revenue items
            if (row.rows) {
              for (const subRow of row.rows) {
                if (subRow.rowType === "Row" && subRow.cells?.[1]?.value) {
                  const value = Number.parseFloat(subRow.cells[1].value);
                  if (!Number.isNaN(value)) {
                    plRevenue += value;
                  }
                }
              }
            }
          } else if (
            (row.title === "Less Cost of Sales" ||
              row.title === "Cost of Sales" ||
              row.title === "Operating Expenses" ||
              row.title === "Expenses") &&
            row.rows
          ) {
            // Sum up expense items
            for (const subRow of row.rows) {
              if (subRow.rowType === "Row" && subRow.cells?.[1]?.value) {
                const value = Number.parseFloat(subRow.cells[1].value);
                if (!Number.isNaN(value)) {
                  plExpenses += Math.abs(value); // Ensure positive
                }
              }
            }
          }
        }
      }
    }

    report.tests[0].data.totals = {
      revenue: plRevenue,
      expenses: plExpenses,
      netProfit: plRevenue - plExpenses,
    };

    // Test 2: Get invoices for October 2025
    report.tests.push({
      name: "October 2025 Sales Invoices",
      status: "running",
    });

    const invoicesResult = await executeXeroMCPTool(
      user.id,
      "xero_list_invoices",
      {
        invoiceType: "ACCREC",
        dateFrom: "2025-10-01",
        dateTo: "2025-10-31",
      }
    );

    const invoices = JSON.parse(invoicesResult.content[0].text);
    let invoiceRevenue = 0;
    let invoiceTax = 0;

    for (const invoice of invoices) {
      invoiceRevenue += invoice.subTotal || 0;
      invoiceTax += invoice.totalTax || 0;
    }

    report.tests[1].status = "completed";
    report.tests[1].data = {
      count: invoices.length,
      subtotal: invoiceRevenue,
      tax: invoiceTax,
      total: invoiceRevenue + invoiceTax,
    };

    // Test 3: Get bills for October 2025
    report.tests.push({
      name: "October 2025 Supplier Bills",
      status: "running",
    });

    const billsResult = await executeXeroMCPTool(
      user.id,
      "xero_list_invoices",
      {
        invoiceType: "ACCPAY",
        dateFrom: "2025-10-01",
        dateTo: "2025-10-31",
      }
    );

    const bills = JSON.parse(billsResult.content[0].text);
    let billExpenses = 0;
    let billTax = 0;

    for (const bill of bills) {
      billExpenses += bill.subTotal || 0;
      billTax += bill.totalTax || 0;
    }

    report.tests[2].status = "completed";
    report.tests[2].data = {
      count: bills.length,
      subtotal: billExpenses,
      tax: billTax,
      total: billExpenses + billTax,
    };

    // Test 4: Calculate differences
    report.tests.push({
      name: "Reconciliation Analysis",
      status: "completed",
      data: {
        revenueDifference: plRevenue - invoiceRevenue,
        expenseDifference: plExpenses - billExpenses,
        netProfitFromTransactions: invoiceRevenue - billExpenses,
        netProfitFromPL: plRevenue - plExpenses,
        explanation: {
          revenue:
            Math.abs(plRevenue - invoiceRevenue) > 0.01
              ? "P&L includes additional revenue sources: bank deposits, manual journals, credit note adjustments"
              : "Revenue matches between P&L and invoices",
          expenses:
            Math.abs(plExpenses - billExpenses) > 0.01
              ? "P&L includes additional expenses: bank payments, manual journals, credit note adjustments"
              : "Expenses match between P&L and bills",
        },
      },
    });

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error("[Diagnostic] Error:", error);
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
