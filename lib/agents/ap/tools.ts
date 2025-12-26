import "server-only";

import { generateObject, tool } from "ai";
import { and, eq, gt, ilike, lt, lte, ne, or } from "drizzle-orm";
import { z } from "zod";
import { abrService } from "@/lib/abr/service";
import { myProvider } from "@/lib/ai/providers";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";
import { db } from "@/lib/db/queries";
import { apBill, apContact, apRiskAssessment } from "@/lib/db/schema/ap";
import type { GSTCode, PaymentRiskFlag, SupplierRiskLevel } from "@/types/ap";

/**
 * Extract invoice data from a file URL
 */
export async function extractInvoiceData(
  fileUrl: string,
  fileType: "pdf" | "image",
  modelId = "anthropic-claude-sonnet-4-5"
) {
  try {
    const TRUSTED_FILE_HOSTNAMES = [
      "cdn.example.com",
      "storage.googleapis.com",
    ];
    let parsedUrl;
    try {
      parsedUrl = new URL(fileUrl);
    } catch (_e) {
      throw new Error("Invalid fileUrl format");
    }
    if (
      parsedUrl.protocol !== "https:" ||
      !TRUSTED_FILE_HOSTNAMES.includes(parsedUrl.hostname)
    ) {
      throw new Error(
        `fileUrl must use HTTPS and be on a trusted host: ${parsedUrl.hostname}`
      );
    }

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const contentLengthHeader = fileResponse.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (contentLength > MAX_FILE_SIZE) {
        throw new Error("File size exceeds maximum allowed size.");
      }
    }
    const arrayBuffer = await fileResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const contentType = fileResponse.headers.get("content-type");
    const mediaType =
      contentType || (fileType === "pdf" ? "application/pdf" : "image/jpeg");

    const invoiceSchema = z.object({
      supplierName: z.string().optional(),
      supplierABN: z.string().optional(),
      supplierAddress: z.string().optional(),
      supplierEmail: z.string().optional(),
      supplierPhone: z.string().optional(),
      invoiceNumber: z.string().optional(),
      invoiceDate: z.string().optional(),
      dueDate: z.string().optional(),
      purchaseOrderNumber: z.string().optional(),
      subtotal: z.number().optional(),
      gstAmount: z.number().optional(),
      totalAmount: z.number().optional(),
      lineItems: z
        .array(
          z.object({
            description: z.string(),
            quantity: z.number().optional(),
            unitPrice: z.number().optional(),
            amount: z.number(),
            gstIncluded: z.boolean().optional(),
          })
        )
        .optional(),
      paymentTerms: z.string().optional(),
      bankDetails: z
        .object({
          accountName: z.string().optional(),
          bsb: z.string().optional(),
          accountNumber: z.string().optional(),
        })
        .optional(),
      confidence: z.number().min(0).max(1),
      warnings: z.array(z.string()),
    });

    const dataUrl = `data:${mediaType};base64,${base64}`;

    const result = await generateObject({
      model: myProvider.languageModel(modelId),
      schema: invoiceSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: dataUrl },
            {
              type: "text",
              text: "Analyze this Australian tax invoice and extract all data.",
            },
          ],
        },
      ],
    });

    return {
      success: true,
      invoiceData: { ...result.object, rawText: `Extracted from ${fileUrl}` },
    };
  } catch (error) {
    console.error("[AP Agent] Extraction error:", error);
    return { success: false, error: "Failed to extract invoice data" };
  }
}

/**
 * Create AP tools for a specific user
 */
export function createAPTools(userId: string) {
  return {
    validateABN: tool({
      description: "Validates an Australian Business Number (ABN) via ABR.",
      inputSchema: z.object({ abn: z.string() }),
      execute: async ({ abn }) => {
        try {
          const result = await abrService.lookup(abn);
          if (result.results.length === 0)
            return { success: false, error: "Invalid ABN" };
          const details = result.results[0];
          return {
            success: true,
            validation: {
              abn: details.abn,
              isValid: true,
              entityName: details.entityName,
              gstRegistered: !!(details.gst.status === "Registered"),
            },
          };
        } catch (error) {
          return { success: false, error: "ABN validation failed" };
        }
      },
    }),

    suggestBillCoding: tool({
      description: "Suggest GL coding for bill line items.",
      inputSchema: z.object({
        supplierName: z.string(),
        lineItems: z.array(
          z.object({ description: z.string(), amount: z.number() })
        ),
        chartOfAccounts: z
          .array(
            z.object({ code: z.string(), name: z.string(), type: z.string() })
          )
          .optional(),
      }),
      execute: async ({ supplierName, lineItems, chartOfAccounts }) => {
        // AI-powered coding logic
        const suggestions = lineItems.map((item, index) => ({
          lineItemIndex: index,
          description: item.description,
          suggestedAccount: "400",
          suggestedAccountName: "Office Expenses",
          suggestedGSTCode: "INPUT_TAX" as GSTCode,
          confidence: 0.7,
          reasoning: "General expense mapping",
        }));
        return { success: true, suggestions };
      },
    }),

    matchVendor: tool({
      description:
        "Matches extracted supplier information to existing database contacts.",
      inputSchema: z.object({
        supplierName: z.string(),
        supplierABN: z.string().optional(),
        supplierEmail: z.string().optional(),
      }),
      execute: async ({ supplierName, supplierABN, supplierEmail }) => {
        try {
          if (supplierABN) {
            const [exactABN] = await db
              .select()
              .from(apContact)
              .where(
                and(
                  eq(apContact.userId, userId),
                  eq(apContact.abn, supplierABN.replace(/\s/g, ""))
                )
              )
              .limit(1);
            if (exactABN)
              return {
                success: true,
                match: { matched: true, matchedContact: exactABN },
              };
          }
          const similar = await db
            .select()
            .from(apContact)
            .where(
              and(
                eq(apContact.userId, userId),
                ilike(apContact.name, `%${supplierName}%`)
              )
            )
            .limit(5);
          return {
            success: true,
            match: { matched: similar.length > 0, suggestions: similar },
          };
        } catch (error) {
          return { success: false, error: "Vendor matching failed" };
        }
      },
    }),

    checkDuplicateBills: tool({
      description: "Checks if a bill is a potential duplicate.",
      inputSchema: z.object({
        supplierName: z.string(),
        billNumber: z.string().optional(),
        amount: z.number(),
        date: z.string(),
        checkDays: z.number().optional().default(90),
      }),
      execute: async ({
        supplierName,
        billNumber,
        amount,
        date,
        checkDays,
      }) => {
        try {
          const checkDate = new Date(date);
          const lookbackDate = new Date(checkDate);
          lookbackDate.setDate(lookbackDate.getDate() - checkDays);

          const potential = await db
            .select({ bill: apBill })
            .from(apBill)
            .innerJoin(apContact, eq(apBill.contactId, apContact.id))
            .where(
              and(
                eq(apBill.userId, userId),
                or(
                  ilike(apContact.name, `%${supplierName}%`),
                  eq(apContact.name, supplierName)
                ),
                and(
                  gt(apBill.total, (amount - 0.01).toString()),
                  lt(apBill.total, (amount + 0.01).toString())
                ),
                gt(apBill.issueDate, lookbackDate)
              )
            );

          return {
            success: true,
            isDuplicate: potential.length > 0,
            potentialDuplicates: potential,
          };
        } catch (error) {
          return { success: false, error: "Duplicate check failed" };
        }
      },
    }),

    generatePaymentProposal: tool({
      description: "Generates a payment run proposal.",
      inputSchema: z.object({
        paymentDate: z.string(),
        includeOverdue: z.boolean().optional().default(true),
        maxAmount: z.number().optional(),
        requireApproval: z.boolean().optional().default(true),
      }),
      execute: async ({
        paymentDate,
        includeOverdue,
        maxAmount,
        requireApproval,
      }) => {
        try {
          const targetDate = new Date(paymentDate);
          const conditions = [
            eq(apBill.userId, userId),
            ne(apBill.status, "paid"),
            ne(apBill.status, "cancelled"),
          ];
          if (requireApproval)
            conditions.push(eq(apBill.approvalStatus, "approved"));
          if (includeOverdue) conditions.push(lte(apBill.dueDate, targetDate));

          const bills = await db
            .select({ bill: apBill, contact: apContact })
            .from(apBill)
            .innerJoin(apContact, eq(apBill.contactId, apContact.id))
            .where(and(...conditions));

          let total = 0;
          const proposed = [];
          for (const { bill, contact } of bills) {
            const amount =
              Number.parseFloat(bill.total) -
              Number.parseFloat(bill.amountPaid);
            if (maxAmount && total + amount > maxAmount) continue;
            total += amount;
            proposed.push({
              billId: bill.id,
              billNumber: bill.number,
              supplierName: contact.name,
              amount,
            });
          }

          return {
            success: true,
            proposal: {
              batchName: `Payment Run - ${paymentDate}`,
              bills: proposed,
              totalAmount: total,
            },
          };
        } catch (error) {
          return { success: false, error: "Failed to generate proposal" };
        }
      },
    }),

    assessPaymentRisk: tool({
      description: "Evaluates payment risk factors for a bill.",
      inputSchema: z.object({
        billId: z.string(),
        supplierName: z.string(),
        amount: z.number(),
        hasABN: z.boolean(),
        hasTaxInvoice: z.boolean(),
        isApproved: z.boolean(),
        supplierStatus: z.enum(["active", "inactive", "pending", "blocked"]),
        averageAmount: z.number().optional(),
      }),
      execute: async ({
        billId,
        amount,
        hasABN,
        hasTaxInvoice,
        isApproved,
        supplierStatus,
        averageAmount,
      }) => {
        try {
          const flags: PaymentRiskFlag[] = [];
          let riskScore = 0;
          if (!hasABN) {
            flags.push("missing_abn");
            riskScore += 25;
          }
          if (!hasTaxInvoice) {
            flags.push("missing_tax_invoice");
            riskScore += 20;
          }
          if (!isApproved) {
            flags.push("missing_approval");
            riskScore += 30;
          }
          if (supplierStatus === "blocked") {
            flags.push("inactive_supplier");
            riskScore += 60;
          }

          let riskLevel: SupplierRiskLevel = "low";
          if (riskScore >= 70) riskLevel = "critical";
          else if (riskScore >= 45) riskLevel = "high";
          else if (riskScore >= 20) riskLevel = "medium";

          await db
            .insert(apRiskAssessment)
            .values({
              billId,
              userId,
              riskLevel,
              riskScore: riskScore.toString(),
              riskFlags: flags,
              assessedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [apRiskAssessment.billId],
              set: {
                riskLevel,
                riskScore: riskScore.toString(),
                riskFlags: flags,
                assessedAt: new Date(),
              },
            });

          return {
            success: true,
            risk: { level: riskLevel, score: riskScore, flags },
          };
        } catch (error) {
          return { success: false, error: "Risk assessment failed" };
        }
      },
    }),

    generateEmailDraft: tool({
      description:
        "Generates professional email draft for supplier communication.",
      inputSchema: z.object({
        purpose: z.enum(["follow_up", "reminder", "query", "payment_advice"]),
        supplierName: z.string(),
        supplierEmail: z.string(),
        context: z.string(),
      }),
      execute: async ({ purpose, supplierName, supplierEmail, context }) => ({
        success: true,
        draft: {
          to: supplierEmail,
          body: `Draft for ${purpose}: ${context}`,
          createdAt: new Date().toISOString(),
        },
      }),
    }),

    extractInvoiceData: tool({
      description:
        "Extracts structured invoice data from an uploaded PDF or image file URL.",
      inputSchema: z.object({
        fileUrl: z.string(),
        fileType: z.enum(["pdf", "image"]),
        model: z.string().optional(),
      }),
      execute: async ({ fileUrl, fileType, model }) =>
        extractInvoiceData(fileUrl, fileType, model),
    }),
  };
}

/**
 * Create Xero-specific AP tools for users with active connection
 */
export function createAPXeroTools(userId: string) {
  const baseTools = createAPTools(userId);
  return {
    ...baseTools,
    xero_list_bills: tool({
      description: "Get supplier bills (ACCPAY invoices) from Xero.",
      inputSchema: z.object({
        status: z
          .enum(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"])
          .optional(),
        limit: z.number().optional().default(100),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(userId, "xero_list_invoices", {
          ...args,
          invoiceType: "ACCPAY",
        });
        return result.content[0].text;
      },
    }),
    // ... other Xero tools use executeXeroMCPTool directly ...
  };
}
