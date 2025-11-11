import "server-only";

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";
import type {
  ABNValidation,
  Bill,
  BillStatus,
  CodingSuggestion,
  EmailDraft,
  GSTCode,
  PaymentProposal,
  PaymentRiskFlag,
  SupplierRiskLevel,
} from "@/types/ap";

/**
 * Validate Australian Business Number (ABN)
 * In production, this would call the ABR (Australian Business Register) API
 */
export const validateABNTool = createTool({
  id: "validateABN",
  description:
    "Validates an Australian Business Number (ABN) and retrieves business entity information. Use this to verify supplier legitimacy and GST registration status.",
  inputSchema: z.object({
    abn: z
      .string()
      .describe(
        "The 11-digit ABN to validate (spaces and hyphens will be removed)"
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    validation: z
      .object({
        abn: z.string(),
        isValid: z.boolean(),
        entityName: z.string().optional(),
        entityType: z.string().optional(),
        gstRegistered: z.boolean().optional(),
        message: z.string().optional(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { abn } = context;

    try {
      // Remove spaces and hyphens
      const cleanABN = abn.replace(/[\s-]/g, "");

      // Basic validation: 11 digits
      if (!/^\d{11}$/.test(cleanABN)) {
        return {
          success: false,
          validation: {
            abn: cleanABN,
            isValid: false,
            message: "ABN must be 11 digits",
          },
        };
      }

      // TODO: In production, integrate with ABR SOAP API or third-party service
      // For now, return a mock validation result
      console.log("[AP Agent] ABN validation (stub):", cleanABN);

      return {
        success: true,
        validation: {
          abn: cleanABN,
          isValid: true,
          entityName: "Example Business Pty Ltd",
          entityType: "Australian Private Company",
          gstRegistered: true,
          message:
            "ABN validation stub - integrate with ABR API for production",
        },
      };
    } catch (error) {
      console.error("[AP Agent] ABN validation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "ABN validation failed",
      };
    }
  },
});

/**
 * Suggest GL account coding and GST treatment for bill line items
 */
export const suggestBillCodingTool = createTool({
  id: "suggestBillCoding",
  description:
    "Analyzes bill line item descriptions and suggests appropriate GL account codes and GST tax codes for Australian businesses. Returns coding suggestions with confidence scores and reasoning.",
  inputSchema: z.object({
    supplierName: z.string().describe("Name of the supplier"),
    lineItems: z
      .array(
        z.object({
          description: z.string(),
          amount: z.number(),
        })
      )
      .describe("Array of line items from the bill"),
    chartOfAccounts: z
      .array(
        z.object({
          code: z.string(),
          name: z.string(),
          type: z.string(),
        })
      )
      .optional()
      .describe("Available GL accounts from Xero (if connected)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    suggestions: z
      .array(
        z.object({
          lineItemIndex: z.number(),
          description: z.string(),
          suggestedAccount: z.string(),
          suggestedAccountName: z.string(),
          suggestedGSTCode: z.string(),
          confidence: z.number(),
          reasoning: z.string(),
        })
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { supplierName, lineItems, chartOfAccounts } = context;

    try {
      console.log(
        `[AP Agent] Generating coding suggestions for ${lineItems.length} line items from ${supplierName}`
      );

      // AI-powered coding suggestion logic
      // In production, this would use LLM with context about chart of accounts
      const suggestions: CodingSuggestion[] = lineItems.map((item, index) => {
        const description = item.description.toLowerCase();

        // Rule-based suggestions (simplified - production would use ML)
        let suggestedAccount = "400";
        let suggestedAccountName = "Office Expenses";
        let suggestedGSTCode: GSTCode = "INPUT_TAX";
        let confidence = 0.6;
        let reasoning = "Default expense categorization";

        // Match common patterns
        if (
          description.includes("software") ||
          description.includes("subscription") ||
          description.includes("saas")
        ) {
          suggestedAccount = "404";
          suggestedAccountName = "Software & Subscriptions";
          suggestedGSTCode = "INPUT_TAX";
          confidence = 0.85;
          reasoning =
            "Software/SaaS subscription typically coded to IT expenses with GST";
        } else if (
          description.includes("rent") ||
          description.includes("lease")
        ) {
          suggestedAccount = "420";
          suggestedAccountName = "Rent";
          suggestedGSTCode = "GST_FREE";
          confidence = 0.9;
          reasoning = "Commercial rent is typically GST-free in Australia";
        } else if (
          description.includes("advertising") ||
          description.includes("marketing")
        ) {
          suggestedAccount = "450";
          suggestedAccountName = "Advertising & Marketing";
          suggestedGSTCode = "INPUT_TAX";
          confidence = 0.88;
          reasoning = "Marketing expenses with GST input tax credit";
        } else if (
          description.includes("stationery") ||
          description.includes("supplies")
        ) {
          suggestedAccount = "461";
          suggestedAccountName = "Office Supplies";
          suggestedGSTCode = "INPUT_TAX";
          confidence = 0.82;
          reasoning = "Office supplies typically include GST";
        } else if (
          description.includes("professional fees") ||
          description.includes("consulting")
        ) {
          suggestedAccount = "485";
          suggestedAccountName = "Professional Fees";
          suggestedGSTCode = "INPUT_TAX";
          confidence = 0.87;
          reasoning = "Professional services typically include GST";
        }

        // Override with actual chart of accounts if available
        if (chartOfAccounts && chartOfAccounts.length > 0) {
          const matchingAccount = chartOfAccounts.find((acc) =>
            acc.name.toLowerCase().includes(suggestedAccountName.toLowerCase())
          );
          if (matchingAccount) {
            suggestedAccount = matchingAccount.code;
            suggestedAccountName = matchingAccount.name;
            confidence = Math.min(0.95, confidence + 0.1);
            reasoning += " (matched to your chart of accounts)";
          }
        }

        return {
          lineItemIndex: index,
          description: item.description,
          suggestedAccount,
          suggestedAccountName,
          suggestedGSTCode,
          confidence,
          reasoning,
        };
      });

      return {
        success: true,
        suggestions,
      };
    } catch (error) {
      console.error("[AP Agent] Coding suggestion error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate coding suggestions",
      };
    }
  },
});

/**
 * Check for duplicate bills in the system
 */
export const checkDuplicateBillsTool = createTool({
  id: "checkDuplicateBills",
  description:
    "Checks if a bill is a potential duplicate by comparing supplier, amount, date, and reference number against recent bills. Helps prevent double-payment.",
  inputSchema: z.object({
    supplierName: z.string().describe("Supplier name"),
    billNumber: z.string().optional().describe("Bill/invoice number"),
    amount: z.number().describe("Bill total amount"),
    date: z.string().describe("Bill date (YYYY-MM-DD)"),
    checkDays: z
      .number()
      .optional()
      .default(90)
      .describe("Number of days to look back for duplicates"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    isDuplicate: z.boolean(),
    duplicateCount: z.number(),
    potentialDuplicates: z
      .array(
        z.object({
          billId: z.string(),
          billNumber: z.string(),
          amount: z.number(),
          date: z.string(),
          similarity: z.number(),
        })
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { supplierName, amount, date, checkDays } = context;

    try {
      console.log(
        `[AP Agent] Checking for duplicate bills from ${supplierName} for $${amount}`
      );

      // TODO: In production, query database for similar bills
      // For now, return mock result showing no duplicates
      return {
        success: true,
        isDuplicate: false,
        duplicateCount: 0,
        potentialDuplicates: [],
      };
    } catch (error) {
      console.error("[AP Agent] Duplicate check error:", error);
      return {
        success: false,
        isDuplicate: false,
        duplicateCount: 0,
        error:
          error instanceof Error ? error.message : "Duplicate check failed",
      };
    }
  },
});

/**
 * Generate payment run proposal
 */
export const generatePaymentProposalTool = createTool({
  id: "generatePaymentProposal",
  description:
    "Generates a payment run proposal based on due dates, approval status, and risk assessment. Prioritizes urgent payments and flags high-risk items for review.",
  inputSchema: z.object({
    paymentDate: z.string().describe("Proposed payment date (YYYY-MM-DD)"),
    includeOverdue: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include overdue bills"),
    maxAmount: z.number().optional().describe("Maximum total payment amount"),
    excludeDisputed: z
      .boolean()
      .optional()
      .default(true)
      .describe("Exclude disputed bills"),
    requireApproval: z
      .boolean()
      .optional()
      .default(true)
      .describe("Only include approved bills"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    proposal: z
      .object({
        batchName: z.string(),
        proposedDate: z.string(),
        bills: z.array(
          z.object({
            billId: z.string(),
            billNumber: z.string(),
            supplierName: z.string(),
            amount: z.number(),
            dueDate: z.string(),
            priority: z.enum(["urgent", "due_soon", "normal"]),
          })
        ),
        totalAmount: z.number(),
        billCount: z.number(),
        riskSummary: z.object({
          critical: z.number(),
          high: z.number(),
          medium: z.number(),
          low: z.number(),
        }),
        recommendations: z.array(z.string()),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { paymentDate } = context;

    try {
      console.log(`[AP Agent] Generating payment proposal for ${paymentDate}`);

      // TODO: In production, query database for bills meeting criteria
      // This is a mock implementation
      const proposal = {
        batchName: `Payment Run - ${paymentDate}`,
        proposedDate: new Date(paymentDate).toISOString(),
        bills: [
          // Mock data - would be populated from database
          {
            billId: "INV-001",
            billNumber: "INV-001",
            supplierName: "Example Supplier Pty Ltd",
            amount: 2500.0,
            dueDate: new Date(paymentDate).toISOString(),
            priority: "due_soon" as const,
          },
        ],
        totalAmount: 2500.0,
        billCount: 1,
        riskSummary: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 1,
        },
        recommendations: [
          "All bills in this batch have been approved",
          "No high-risk items identified",
          "Total payment amount is within normal range",
        ],
      };

      return {
        success: true,
        proposal,
      };
    } catch (error) {
      console.error("[AP Agent] Payment proposal error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate payment proposal",
      };
    }
  },
});

/**
 * Assess payment risk for a bill
 */
export const assessPaymentRiskTool = createTool({
  id: "assessPaymentRisk",
  description:
    "Evaluates payment risk factors for a bill including missing information, supplier status, approval status, and unusual patterns. Returns risk level and specific flags.",
  inputSchema: z.object({
    billId: z.string().describe("Bill ID to assess"),
    supplierName: z.string().describe("Supplier name"),
    amount: z.number().describe("Bill amount"),
    hasABN: z.boolean().describe("Whether supplier has valid ABN"),
    hasTaxInvoice: z.boolean().describe("Whether tax invoice is attached"),
    isApproved: z.boolean().describe("Whether bill is approved"),
    supplierStatus: z
      .enum(["active", "inactive", "pending", "blocked"])
      .describe("Current supplier status"),
    averageAmount: z
      .number()
      .optional()
      .describe("Supplier's average bill amount for comparison"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    risk: z
      .object({
        level: z.enum(["low", "medium", "high", "critical"]),
        flags: z.array(z.string()),
        score: z.number(),
        recommendations: z.array(z.string()),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const {
      billId,
      amount,
      hasABN,
      hasTaxInvoice,
      isApproved,
      supplierStatus,
      averageAmount,
    } = context;

    try {
      console.log(`[AP Agent] Assessing payment risk for bill ${billId}`);

      const flags: PaymentRiskFlag[] = [];
      const recommendations: string[] = [];
      let riskScore = 0;

      // Check for missing information
      if (!hasABN) {
        flags.push("missing_abn");
        riskScore += 20;
        recommendations.push(
          "Request ABN from supplier for GST compliance and validation"
        );
      }

      if (!hasTaxInvoice) {
        flags.push("missing_tax_invoice");
        riskScore += 15;
        recommendations.push(
          "Request valid tax invoice to claim GST input tax credit"
        );
      }

      if (!isApproved) {
        flags.push("missing_approval");
        riskScore += 30;
        recommendations.push("Obtain required approval before payment");
      }

      // Check supplier status
      if (supplierStatus === "inactive") {
        flags.push("inactive_supplier");
        riskScore += 25;
        recommendations.push(
          "Verify supplier is still operational before payment"
        );
      }

      if (supplierStatus === "blocked") {
        flags.push("inactive_supplier");
        riskScore += 50;
        recommendations.push(
          "Supplier is blocked - investigate before payment"
        );
      }

      // Check for unusual amount
      if (averageAmount && amount > averageAmount * 2) {
        flags.push("unusual_amount");
        riskScore += 15;
        recommendations.push(
          `Amount is ${Math.round((amount / averageAmount) * 100)}% of supplier's average - verify legitimacy`
        );
      }

      // Determine risk level
      let riskLevel: SupplierRiskLevel;
      if (riskScore >= 60) {
        riskLevel = "critical";
      } else if (riskScore >= 40) {
        riskLevel = "high";
      } else if (riskScore >= 20) {
        riskLevel = "medium";
      } else {
        riskLevel = "low";
      }

      if (recommendations.length === 0) {
        recommendations.push("No significant risk factors identified");
      }

      return {
        success: true,
        risk: {
          level: riskLevel,
          flags,
          score: riskScore,
          recommendations,
        },
      };
    } catch (error) {
      console.error("[AP Agent] Risk assessment error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to assess payment risk",
      };
    }
  },
});

/**
 * Generate email draft for supplier communication
 */
export const generateEmailDraftTool = createTool({
  id: "generateEmailDraft",
  description:
    "Generates professional email draft for supplier communication including payment advice, follow-ups, queries, and reminders. Returns draft as text artifact for user review - does NOT send emails.",
  inputSchema: z.object({
    purpose: z
      .enum(["follow_up", "reminder", "query", "payment_advice"])
      .describe("Purpose of the email"),
    supplierName: z.string().describe("Supplier name"),
    supplierEmail: z.string().describe("Supplier email address"),
    subject: z.string().optional().describe("Email subject line"),
    context: z
      .string()
      .describe(
        "Additional context (e.g., bill numbers, amounts, issues to address)"
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    draft: z
      .object({
        to: z.string(),
        subject: z.string(),
        body: z.string(),
        purpose: z.string(),
        createdAt: z.string(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const {
      purpose,
      supplierName,
      supplierEmail,
      subject,
      context: emailContext,
    } = context;

    try {
      console.log(
        `[AP Agent] Generating ${purpose} email draft for ${supplierName}`
      );

      let emailSubject = subject;
      let emailBody = "";

      // Generate purpose-specific email templates
      switch (purpose) {
        case "follow_up":
          emailSubject =
            emailSubject ||
            `Follow-up: Outstanding invoice from ${supplierName}`;
          emailBody = `Dear ${supplierName},

I hope this email finds you well.

${emailContext}

We are following up to ensure all documentation is in order for processing payment. Please provide any missing information at your earliest convenience.

If you have any questions or concerns, please don't hesitate to contact us.

Kind regards,
[Your Name]
Accounts Payable Team`;
          break;

        case "reminder":
          emailSubject = emailSubject || "Reminder: Missing information";
          emailBody = `Dear ${supplierName},

This is a friendly reminder regarding:

${emailContext}

To ensure timely payment, please provide the requested information as soon as possible.

Thank you for your cooperation.

Best regards,
[Your Name]
Accounts Payable Team`;
          break;

        case "query":
          emailSubject = emailSubject || "Query regarding invoice";
          emailBody = `Dear ${supplierName},

We are processing your invoice and have the following query:

${emailContext}

Could you please provide clarification or additional information?

We appreciate your prompt response.

Best regards,
[Your Name]
Accounts Payable Team`;
          break;

        case "payment_advice":
          emailSubject = emailSubject || "Payment advice";
          emailBody = `Dear ${supplierName},

Please be advised that the following payment has been scheduled:

${emailContext}

The payment will be processed on the scheduled date. Please allow 1-2 business days for funds to appear in your account.

Thank you for your business.

Kind regards,
[Your Name]
Accounts Payable Team`;
          break;
      }

      const draft: EmailDraft = {
        to: supplierEmail,
        subject: emailSubject,
        body: emailBody,
        purpose,
        createdAt: new Date(),
      };

      return {
        success: true,
        draft: {
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
          purpose: draft.purpose,
          createdAt: draft.createdAt.toISOString(),
        },
      };
    } catch (error) {
      console.error("[AP Agent] Email draft generation error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate email draft",
      };
    }
  },
});

/**
 * Extract invoice data from uploaded PDF or image
 */
export const extractInvoiceDataTool = createTool({
  id: "extractInvoiceData",
  description:
    "Extracts structured invoice data from an uploaded PDF or image file URL. Returns supplier details, invoice number, dates, line items, amounts, and GST information for Australian tax invoices.",
  inputSchema: z.object({
    fileUrl: z.string().describe("Public URL to the PDF or image file"),
    fileType: z.enum(["pdf", "image"]).describe("Type of file being processed"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    invoiceData: z
      .object({
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
        rawText: z.string().optional(),
        confidence: z.number().optional(),
        warnings: z.array(z.string()).optional(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { fileUrl, fileType } = context;

    try {
      console.log(
        `[AP Agent] Extracting invoice data from ${fileType} at ${fileUrl}`
      );

      // TODO: In production, use AI vision model or OCR service to extract data
      // For now, return a mock extraction result
      // This would integrate with Anthropic Claude with vision or similar service

      const warnings: string[] = [];

      // Mock extraction - in production this would use AI/OCR
      const invoiceData = {
        supplierName: "Example Supplier Pty Ltd",
        supplierABN: "12345678901",
        supplierAddress: "123 Business Street, Sydney NSW 2000",
        invoiceNumber: "INV-2024-001",
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        subtotal: 1000.0,
        gstAmount: 100.0,
        totalAmount: 1100.0,
        lineItems: [
          {
            description: "Professional services",
            quantity: 1,
            unitPrice: 1000.0,
            amount: 1000.0,
            gstIncluded: false,
          },
        ],
        paymentTerms: "30 days",
        confidence: 0.75,
        warnings: [
          "This is a mock extraction - integrate with AI vision or OCR service for production use",
          "Some fields may not be detected from scanned invoices",
        ],
      };

      return {
        success: true,
        invoiceData,
      };
    } catch (error) {
      console.error("[AP Agent] Invoice extraction error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract invoice data",
      };
    }
  },
});

/**
 * Match supplier to existing Xero contact or propose new contact creation
 * Requires Xero connection
 */
export const matchVendorTool = createTool({
  id: "matchVendor",
  description:
    "Matches extracted supplier information to existing Xero contacts using fuzzy name matching. Returns exact matches, similar contacts, or suggests creating a new contact.",
  inputSchema: z.object({
    supplierName: z.string().describe("Supplier name from invoice"),
    supplierABN: z.string().optional().describe("Supplier ABN if available"),
    supplierEmail: z
      .string()
      .optional()
      .describe("Supplier email if available"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    match: z
      .object({
        matched: z.boolean(),
        contact: z
          .object({
            contactId: z.string(),
            name: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
            isSupplier: z.boolean(),
          })
          .optional(),
        suggestions: z
          .array(
            z.object({
              contactId: z.string(),
              name: z.string(),
              similarity: z.number(),
              email: z.string().optional(),
            })
          )
          .optional(),
        shouldCreateNew: z.boolean(),
        proposedContact: z
          .object({
            name: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
            taxNumber: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { supplierName, supplierABN, supplierEmail } = context;

    try {
      console.log(`[AP Agent] Matching vendor: ${supplierName}`);

      // TODO: In production, query Xero contacts and perform fuzzy matching
      // This is a mock implementation

      // Mock: No exact match found, suggest creating new
      const match = {
        matched: false,
        suggestions: [],
        shouldCreateNew: true,
        proposedContact: {
          name: supplierName,
          email: supplierEmail,
          taxNumber: supplierABN,
        },
      };

      return {
        success: true,
        match,
      };
    } catch (error) {
      console.error("[AP Agent] Vendor matching error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to match vendor",
      };
    }
  },
});

/**
 * Create Xero-specific AP tools for users with active connection
 */
export function createAPXeroTools(userId: string) {
  return {
    xero_list_bills: createTool({
      id: "xero_list_bills",
      description:
        "Get supplier bills (ACCPAY invoices) from Xero. Use this to fetch bills for payment runs, approval workflows, or reconciliation.",
      inputSchema: z.object({
        status: z
          .enum(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"])
          .optional()
          .describe("Filter by bill status"),
        dateFrom: z
          .string()
          .optional()
          .describe("Start date for date range (YYYY-MM-DD)"),
        dateTo: z
          .string()
          .optional()
          .describe("End date for date range (YYYY-MM-DD)"),
        contactId: z.string().optional().describe("Filter by supplier ID"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of bills to return"),
      }),
      outputSchema: z.string(),
      execute: async ({ context }) => {
        const result = await executeXeroMCPTool(userId, "xero_list_invoices", {
          ...context,
          invoiceType: "ACCPAY", // Bills are ACCPAY type
        });
        return result.content[0].text;
      },
    }),

    xero_get_bill: createTool({
      id: "xero_get_bill",
      description:
        "Get detailed information about a specific supplier bill from Xero including line items, payments, and attachments.",
      inputSchema: z.object({
        invoiceId: z.string().describe("Xero invoice ID"),
      }),
      outputSchema: z.string(),
      execute: async ({ context }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_invoice",
          context
        );
        return result.content[0].text;
      },
    }),

    xero_list_suppliers: createTool({
      id: "xero_list_suppliers",
      description:
        "Get list of suppliers from Xero. Use this to validate vendor information and check payment details.",
      inputSchema: z.object({
        searchTerm: z
          .string()
          .optional()
          .describe("Search suppliers by name or email"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of suppliers to return"),
      }),
      outputSchema: z.string(),
      execute: async ({ context }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_contacts",
          context
        );
        return result.content[0].text;
      },
    }),

    xero_list_accounts: createTool({
      id: "xero_list_accounts",
      description:
        "Get chart of accounts from Xero for expense coding suggestions. Filter by EXPENSE or DIRECTCOSTS types for AP purposes.",
      inputSchema: z.object({
        accountType: z
          .enum(["EXPENSE", "DIRECTCOSTS", "OVERHEADS"])
          .optional()
          .describe("Filter by account type for expense coding"),
      }),
      outputSchema: z.string(),
      execute: async ({ context }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_accounts",
          context
        );
        return result.content[0].text;
      },
    }),

    xero_list_tax_rates: createTool({
      id: "xero_list_tax_rates",
      description:
        "Get list of GST/tax rates configured in Xero for accurate tax coding on bills.",
      inputSchema: z.object({}),
      outputSchema: z.string(),
      execute: async () => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_tax_rates",
          {}
        );
        return result.content[0].text;
      },
    }),

    xero_list_payments: createTool({
      id: "xero_list_payments",
      description:
        "Get list of payments from Xero to track payment history and reconcile payment runs.",
      inputSchema: z.object({
        dateFrom: z
          .string()
          .optional()
          .describe("Filter payments from this date (YYYY-MM-DD)"),
        dateTo: z
          .string()
          .optional()
          .describe("Filter payments to this date (YYYY-MM-DD)"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of payments to return"),
      }),
      outputSchema: z.string(),
      execute: async ({ context }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_payments",
          context
        );
        return result.content[0].text;
      },
    }),

    xero_create_bill: createTool({
      id: "xero_create_bill",
      description:
        "Creates a new supplier bill (ACCPAY invoice) in Xero with line items and optionally attaches a PDF. Returns the created bill details including Xero invoice ID.",
      inputSchema: z.object({
        contactId: z
          .string()
          .describe("Xero contact ID for the supplier (required)"),
        invoiceNumber: z.string().describe("Invoice/bill number from supplier"),
        date: z.string().describe("Invoice date (YYYY-MM-DD)"),
        dueDate: z.string().describe("Due date for payment (YYYY-MM-DD)"),
        reference: z
          .string()
          .optional()
          .describe("Optional reference or PO number"),
        lineItems: z
          .array(
            z.object({
              description: z.string().describe("Line item description"),
              quantity: z.number().default(1).describe("Quantity (default 1)"),
              unitAmount: z.number().describe("Unit price excluding GST"),
              accountCode: z
                .string()
                .describe("Expense account code from chart of accounts"),
              taxType: z
                .string()
                .default("INPUT2")
                .describe(
                  "Tax type (INPUT2 for GST on expenses, NONE for GST-free)"
                ),
            })
          )
          .describe("Array of line items for the bill"),
        attachmentUrl: z
          .string()
          .optional()
          .describe("Optional URL to PDF invoice to attach"),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        invoiceId: z.string().optional(),
        invoiceNumber: z.string().optional(),
        status: z.string().optional(),
        total: z.number().optional(),
        error: z.string().optional(),
      }),
      execute: async ({ context }) => {
        const {
          contactId,
          invoiceNumber,
          date,
          dueDate,
          reference,
          lineItems,
          attachmentUrl,
        } = context;

        try {
          console.log(
            `[AP Agent] Creating Xero bill ${invoiceNumber} for contact ${contactId}`
          );

          // TODO: In production, use Xero API to create invoice
          // This is a mock implementation showing the expected structure

          // Step 1: Create the invoice via Xero API
          const mockInvoiceId = `INV-${Date.now()}`;

          // Step 2: If attachment provided, upload to Xero
          if (attachmentUrl) {
            console.log(
              `[AP Agent] Would attach PDF from ${attachmentUrl} to invoice ${mockInvoiceId}`
            );
            // TODO: Download PDF and upload as attachment to Xero invoice
          }

          return {
            success: true,
            invoiceId: mockInvoiceId,
            invoiceNumber,
            status: "DRAFT",
            total: lineItems.reduce(
              (sum, item) => sum + item.quantity * item.unitAmount,
              0
            ),
          };
        } catch (error) {
          console.error("[AP Agent] Error creating Xero bill:", error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to create bill in Xero",
          };
        }
      },
    }),

    xero_create_contact: createTool({
      id: "xero_create_contact",
      description:
        "Creates a new supplier contact in Xero. Use this when a vendor match is not found and a new supplier needs to be added.",
      inputSchema: z.object({
        name: z.string().describe("Supplier/contact name (required)"),
        email: z.string().optional().describe("Supplier email address"),
        phone: z.string().optional().describe("Supplier phone number"),
        taxNumber: z.string().optional().describe("ABN or tax number"),
        isSupplier: z
          .boolean()
          .default(true)
          .describe("Mark as supplier (default true)"),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        contactId: z.string().optional(),
        name: z.string().optional(),
        error: z.string().optional(),
      }),
      execute: async ({ context }) => {
        const { name, email, phone, taxNumber, isSupplier } = context;

        try {
          console.log(`[AP Agent] Creating Xero contact: ${name}`);

          // TODO: In production, use Xero API to create contact
          // This is a mock implementation

          const mockContactId = `CONTACT-${Date.now()}`;

          return {
            success: true,
            contactId: mockContactId,
            name,
          };
        } catch (error) {
          console.error("[AP Agent] Error creating Xero contact:", error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to create contact in Xero",
          };
        }
      },
    }),
  };
}
