import "server-only";

import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";
import type {
  CodingSuggestion,
  EmailDraft,
  GSTCode,
  PaymentRiskFlag,
  SupplierRiskLevel,
} from "@/types/ap";

/**
 * Extract invoice data from a file URL
 * This is the core extraction function that can be called directly or via tool
 */
export async function extractInvoiceData(
  fileUrl: string,
  fileType: "pdf" | "image",
  modelId = "anthropic-claude-sonnet-4-5"
) {
  try {
    // Restrict fileUrl to trusted origins to prevent SSRF
    const TRUSTED_FILE_HOSTNAMES = [
      "cdn.example.com",
      "storage.googleapis.com",
      // add any additional trusted hostnames here
    ];
    let parsedUrl;
    try {
      parsedUrl = new URL(fileUrl);
    } catch (_e) {
      throw new Error("Invalid fileUrl format");
    }
    // Ensure protocol and hostname match allow-list
    if (
      parsedUrl.protocol !== "https:" ||
      !TRUSTED_FILE_HOSTNAMES.includes(parsedUrl.hostname)
    ) {
      throw new Error(
        `fileUrl must use HTTPS and be on a trusted host: ${parsedUrl.hostname}`
      );
    }
    console.log(
      `[AP Agent] Extracting invoice data from ${fileType} at ${fileUrl} using model ${modelId}`
    );

    // Fetch the file from the URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    // Validate file size before loading into memory
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const contentLengthHeader = fileResponse.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (contentLength > MAX_FILE_SIZE) {
        throw new Error(
          `File size (${contentLength} bytes) exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes.`
        );
      }
    }
    // Convert to base64 for vision API
    const arrayBuffer = await fileResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine media type from response headers or file type
    const contentType = fileResponse.headers.get("content-type");
    let mediaType = contentType || "image/jpeg";

    // Fallback based on fileType if content-type not available
    if (!contentType) {
      if (fileType === "pdf") {
        mediaType = "application/pdf";
      } else {
        // For images, default to jpeg but could be png, webp, etc.
        mediaType = "image/jpeg";
      }
    }

    // Define the extraction schema
    const invoiceSchema = z.object({
      supplierName: z
        .string()
        .optional()
        .describe("Business name of the supplier/vendor"),
      supplierABN: z
        .string()
        .optional()
        .describe("Australian Business Number (11 digits)"),
      supplierAddress: z
        .string()
        .optional()
        .describe("Full address of the supplier"),
      supplierEmail: z.string().optional().describe("Email address"),
      supplierPhone: z.string().optional().describe("Phone number"),
      invoiceNumber: z
        .string()
        .optional()
        .describe("Invoice or tax invoice number"),
      invoiceDate: z
        .string()
        .optional()
        .describe("Invoice date in YYYY-MM-DD format"),
      dueDate: z
        .string()
        .optional()
        .describe("Payment due date in YYYY-MM-DD format"),
      purchaseOrderNumber: z
        .string()
        .optional()
        .describe("PO number if present"),
      subtotal: z.number().optional().describe("Subtotal amount before GST"),
      gstAmount: z
        .number()
        .optional()
        .describe("GST/tax amount (10% for Australian invoices)"),
      totalAmount: z.number().optional().describe("Total amount including GST"),
      lineItems: z
        .array(
          z.object({
            description: z.string().describe("Item description"),
            quantity: z.number().optional().describe("Quantity"),
            unitPrice: z.number().optional().describe("Unit price"),
            amount: z.number().describe("Line item total amount"),
            gstIncluded: z
              .boolean()
              .optional()
              .describe("Whether GST is included"),
          })
        )
        .optional()
        .describe("Line items from the invoice"),
      paymentTerms: z
        .string()
        .optional()
        .describe("Payment terms (e.g., Net 30)"),
      bankDetails: z
        .object({
          accountName: z.string().optional(),
          bsb: z.string().optional(),
          accountNumber: z.string().optional(),
        })
        .optional()
        .describe("Bank account details for payment"),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe("Confidence score of the extraction (0-1)"),
      warnings: z.array(z.string()).describe("Any warnings or issues found"),
    });

    // Create data URL for the image
    const dataUrl = `data:${mediaType};base64,${base64}`;

    // Use specified AI model with vision to extract invoice data
    const result = await generateObject({
      model: myProvider.languageModel(modelId),
      schema: invoiceSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: dataUrl,
            },
            {
              type: "text",
              text: `Analyze this invoice image and extract all relevant information following Australian tax invoice requirements.

Extract the following information:
- Supplier/vendor details (name, ABN, address, contact info)
- Invoice metadata (invoice number, dates, PO number if present)
- Financial details (subtotal, GST at 10%, total)
- All line items with descriptions, quantities, unit prices, and amounts
- Payment terms and bank details if visible

Important guidelines:
- Dates must be in YYYY-MM-DD format
- ABN should be 11 digits (remove spaces if present)
- GST for Australian invoices is 10% of subtotal
- Line items should include all products/services listed
- Provide a confidence score (0-1) based on image quality and data completeness
- List any warnings or issues (missing info, unclear text, etc.)

If any field is not clearly visible or not present on the invoice, leave it as undefined.`,
            },
          ],
        },
      ],
    });

    const invoiceData = result.object;

    // Validate and enhance the extracted data
    const warnings = invoiceData.warnings || [];

    // Validate ABN format if present
    if (invoiceData.supplierABN) {
      const abnDigits = invoiceData.supplierABN.replace(/\s/g, "");
      if (abnDigits.length !== 11 || !/^\d+$/.test(abnDigits)) {
        warnings.push("ABN format appears invalid - should be 11 digits");
      }
    } else {
      warnings.push("ABN not found on invoice - manual verification required");
    }

    // Validate email format if present
    if (invoiceData.supplierEmail) {
      // Use a lenient regex that checks for basic email structure
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(invoiceData.supplierEmail)) {
        warnings.push(
          "Email format appears invalid - please verify supplier email address"
        );
      }
    }

    // Validate GST calculation if amounts are present
    if (invoiceData.subtotal && invoiceData.gstAmount) {
      const expectedGst = Math.round(invoiceData.subtotal * 0.1 * 100) / 100;
      const actualGst = Math.round(invoiceData.gstAmount * 100) / 100;
      if (Math.abs(expectedGst - actualGst) > 0.5) {
        warnings.push(
          `GST calculation may be incorrect - expected ~$${expectedGst.toFixed(2)} but found $${actualGst.toFixed(2)}`
        );
      }
    }

    // Validate total calculation
    if (
      invoiceData.subtotal &&
      invoiceData.gstAmount &&
      invoiceData.totalAmount
    ) {
      const expectedTotal =
        Math.round((invoiceData.subtotal + invoiceData.gstAmount) * 100) / 100;
      const actualTotal = Math.round(invoiceData.totalAmount * 100) / 100;
      if (Math.abs(expectedTotal - actualTotal) > 0.5) {
        warnings.push("Total amount calculation may be incorrect");
      }
    }

    // Check for required fields
    if (!invoiceData.supplierName) {
      warnings.push("Supplier name not detected");
    }
    if (!invoiceData.invoiceNumber) {
      warnings.push("Invoice number not detected");
    }
    if (!invoiceData.invoiceDate) {
      warnings.push("Invoice date not detected");
    }
    if (!invoiceData.lineItems || invoiceData.lineItems.length === 0) {
      warnings.push("No line items detected - may require manual entry");
    }

    return {
      success: true,
      invoiceData: {
        ...invoiceData,
        warnings,
        rawText: `Extracted from ${fileUrl}`,
      },
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
}

/**
 * Validate Australian Business Number (ABN)
 * In production, this would call the ABR (Australian Business Register) API
 */
export const validateABNTool = tool({
  description:
    "Validates an Australian Business Number (ABN) and retrieves business entity information. Use this to verify supplier legitimacy and GST registration status.",
  inputSchema: z.object({
    abn: z
      .string()
      .describe(
        "The 11-digit ABN to validate (spaces and hyphens will be removed)"
      ),
  }),
  execute: async ({ abn }: { abn: string }) => {
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
export const suggestBillCodingTool = tool({
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
  execute: async ({
    supplierName,
    lineItems,
    chartOfAccounts,
  }: {
    supplierName: string;
    lineItems: Array<{ description: string; amount: number }>;
    chartOfAccounts?: Array<{ code: string; name: string; type: string }>;
  }) => {
    try {
      console.log(
        `[AP Agent] Generating coding suggestions for ${lineItems.length} line items from ${supplierName}`
      );

      // AI-powered coding suggestion logic
      // In production, this would use LLM with context about chart of accounts
      const suggestions: CodingSuggestion[] = lineItems.map(
        (item: { description: string; amount: number }, index: number) => {
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
            const matchingAccount = chartOfAccounts.find(
              (acc: { code: string; name: string; type: string }) =>
                acc.name
                  .toLowerCase()
                  .includes(suggestedAccountName.toLowerCase())
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
        }
      );

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
export const checkDuplicateBillsTool = tool({
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
  execute: async ({
    supplierName,
    amount,
    date,
    checkDays,
  }: {
    supplierName: string;
    amount: number;
    date: string;
    checkDays: number;
  }) => {
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
export const generatePaymentProposalTool = tool({
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
  execute: async ({ paymentDate }: { paymentDate: string }) => {
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
export const assessPaymentRiskTool = tool({
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
  execute: async ({
    billId,
    amount,
    hasABN,
    hasTaxInvoice,
    isApproved,
    supplierStatus,
    averageAmount,
  }: {
    billId: string;
    amount: number;
    hasABN: boolean;
    hasTaxInvoice: boolean;
    isApproved: boolean;
    supplierStatus: "active" | "inactive" | "pending" | "blocked";
    averageAmount?: number;
  }) => {
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
export const generateEmailDraftTool = tool({
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
  execute: async ({
    purpose,
    supplierName,
    supplierEmail,
    subject,
    context: emailContext,
  }: {
    purpose: "follow_up" | "reminder" | "query" | "payment_advice";
    supplierName: string;
    supplierEmail: string;
    subject?: string;
    context: string;
  }) => {
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
export const extractInvoiceDataTool = tool({
  description:
    "Extracts structured invoice data from an uploaded PDF or image file URL. Returns supplier details, invoice number, dates, line items, amounts, and GST information for Australian tax invoices.",
  inputSchema: z.object({
    fileUrl: z.string().describe("Public URL to the PDF or image file"),
    fileType: z.enum(["pdf", "image"]).describe("Type of file being processed"),
    model: z
      .string()
      .optional()
      .describe(
        "AI model to use for extraction (defaults to anthropic-claude-sonnet-4-5)"
      ),
  }),
  execute: async ({
    fileUrl,
    fileType,
    model,
  }: {
    fileUrl: string;
    fileType: "pdf" | "image";
    model?: string;
  }) => {
    return extractInvoiceData(fileUrl, fileType, model);
  },
});

/**
 * Match supplier to existing Xero contact or propose new contact creation
 * Requires Xero connection
 */
export const matchVendorTool = tool({
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
  execute: async ({
    supplierName,
    supplierABN,
    supplierEmail,
  }: {
    supplierName: string;
    supplierABN?: string;
    supplierEmail?: string;
  }) => {
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
    xero_list_bills: tool({
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
      execute: async (args: {
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        contactId?: string;
        limit?: number;
      }) => {
        const result = await executeXeroMCPTool(userId, "xero_list_invoices", {
          ...args,
          invoiceType: "ACCPAY", // Bills are ACCPAY type
        });
        return result.content[0].text;
      },
    }),

    xero_get_bill: tool({
      description:
        "Get detailed information about a specific supplier bill from Xero including line items, payments, and attachments.",
      inputSchema: z.object({
        invoiceId: z.string().describe("Xero invoice ID"),
      }),
      execute: async (args: { invoiceId: string }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_invoice",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_suppliers: tool({
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
      execute: async (args: { searchTerm?: string; limit?: number }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_contacts",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_accounts: tool({
      description:
        "Get chart of accounts from Xero for expense coding suggestions. Filter by EXPENSE or DIRECTCOSTS types for AP purposes.",
      inputSchema: z.object({
        accountType: z
          .enum(["EXPENSE", "DIRECTCOSTS", "OVERHEADS"])
          .optional()
          .describe("Filter by account type for expense coding"),
      }),
      execute: async (args: { accountType?: string }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_accounts",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_tax_rates: tool({
      description:
        "Get list of GST/tax rates configured in Xero for accurate tax coding on bills.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_tax_rates",
          {}
        );
        return result.content[0].text;
      },
    }),

    xero_list_payments: tool({
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
      execute: async (args: {
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
      }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_payments",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_create_bill: tool({
      description:
        "Creates a new supplier bill (ACCPAY invoice) in Xero with line items. Bills are created in DRAFT status for user review before approval. Returns the created bill details including Xero invoice ID.",
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
      }),
      execute: async ({
        contactId,
        invoiceNumber,
        date,
        dueDate,
        reference,
        lineItems,
      }: {
        contactId: string;
        invoiceNumber: string;
        date: string;
        dueDate: string;
        reference?: string;
        lineItems: Array<{
          description: string;
          quantity?: number;
          unitAmount: number;
          accountCode: string;
          taxType?: string;
        }>;
      }) => {
        try {
          console.log(
            `[AP Agent] Creating Xero bill ${invoiceNumber} for contact ${contactId}`
          );

          // Use the xero_create_bill MCP tool to create the bill in Xero
          const result = await executeXeroMCPTool(userId, "xero_create_bill", {
            contactId,
            invoiceNumber,
            date,
            dueDate,
            reference,
            lineItems,
            status: "DRAFT", // Always create as draft for user review
          });

          // Parse the JSON response
          const response = JSON.parse(result.content[0].text);

          if (response.success && response.invoice) {
            const invoice = response.invoice;
            return {
              success: true,
              invoiceId: invoice.invoiceID,
              invoiceNumber: invoice.invoiceNumber || invoiceNumber,
              status: invoice.status,
              total: invoice.total,
            };
          }

          // If not successful, return error
          return {
            success: false,
            error: response.message || "Failed to create bill in Xero",
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

    xero_create_contact: tool({
      description:
        "Creates a new supplier contact in Xero. Use this when a vendor match is not found and a new supplier needs to be added.",
      inputSchema: z.object({
        name: z.string().describe("Supplier/contact name (required)"),
        email: z.string().optional().describe("Supplier email address"),
        phone: z.string().optional().describe("Supplier phone number"),
      }),
      execute: async ({
        name,
        email,
        phone,
      }: {
        name: string;
        email?: string;
        phone?: string;
      }) => {
        try {
          console.log(`[AP Agent] Creating Xero contact: ${name}`);

          // Use the xero_create_contact MCP tool to create the contact in Xero
          const result = await executeXeroMCPTool(
            userId,
            "xero_create_contact",
            {
              name,
              email,
              phone,
            }
          );

          // Parse the JSON response
          const response = JSON.parse(result.content[0].text);

          if (response.success && response.contact) {
            const contact = response.contact;
            return {
              success: true,
              contactId: contact.contactID,
              name: contact.name,
            };
          }

          // If not successful, return error
          return {
            success: false,
            error: response.message || "Failed to create contact in Xero",
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
