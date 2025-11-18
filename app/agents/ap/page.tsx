"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { InvoiceUploadZone } from "@/components/agents/ap/invoice-upload-zone";
import { InvoiceViewer } from "@/components/agents/ap/invoice-viewer";
import { InvoiceDetailsForm } from "@/components/agents/ap/invoice-details-form";
import type { ExtractedInvoiceData } from "@/types/ap";

export default function AccountsPayableAgentPage() {
  const [uploadedFile, setUploadedFile] = useState<{
    fileUrl: string;
    fileName: string;
    fileType: "pdf" | "image";
    mimeType: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("anthropic-claude-sonnet-4-5");

  // Load model preference from localStorage on mount
  useEffect(() => {
    const savedModel = localStorage.getItem("apAgentModel");
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  const { sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agents/ap",
      fetch,
      prepareSendMessagesRequest(request: any) {
        return {
          body: {
            messages: request.messages,
            settings: {
              model: selectedModel,
            },
          },
        };
      },
    }),
    onFinish: ({ message }) => {
      // Extract invoice data from tool results
      try {
        // Look for extractInvoiceData tool result in message parts
        const toolResultPart = message.parts?.find(
          (part) =>
            part.type === "tool-result" &&
            part.toolName === "extractInvoiceData"
        );

        if (toolResultPart && toolResultPart.type === "tool-result") {
          const result = toolResultPart.result;

          // The tool returns { success: true, invoiceData: {...} }
          if (result && typeof result === "object" && "invoiceData" in result) {
            const data = result.invoiceData;
            if (data) {
              console.log("[AP Agent] Invoice data extracted:", data);
              setExtractedData(data as ExtractedInvoiceData);
            }
          }
        }
      } catch (error) {
        console.error("[AP Agent] Failed to extract invoice data:", error);
      } finally {
        setIsProcessing(false);
      }
    },
  });

  const handleFileUploaded = (fileData: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    mimeType: string;
  }) => {
    setUploadedFile({
      ...fileData,
      fileType: fileData.fileType as "pdf" | "image",
    });
    setIsProcessing(true);
    setExtractedData(null);

    // Auto-trigger invoice processing
    const processingMessage = `Please process this invoice:

File: ${fileData.fileName}
URL: ${fileData.fileUrl}
Type: ${fileData.fileType}

Steps to complete:
1. Use the extractInvoiceData tool to extract all invoice details from the file
2. Validate the supplier ABN if provided
3. Check for duplicate invoices
4. Suggest GL account coding for line items

Please start by calling the extractInvoiceData tool with:
- fileUrl: ${fileData.fileUrl}
- fileType: ${fileData.fileType}

Extract all available fields including:
- Supplier details (name, ABN, address, contact info)
- Invoice metadata (number, dates, PO number)
- Financial details (subtotal, GST, total)
- Line items with descriptions and amounts
- Payment terms and bank details if available`;

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: processingMessage }],
    } as any);
  };

  const handleSaveToDraft = async (data: ExtractedInvoiceData) => {
    // Trigger the agent to create a draft bill in Xero
    const message = `Please create a draft bill in Xero with the following details:
Supplier: ${data.supplierName}
ABN: ${data.supplierABN || "Not provided"}
Invoice Number: ${data.invoiceNumber}
Invoice Date: ${data.invoiceDate}
Due Date: ${data.dueDate}
Subtotal: $${data.subtotal}
GST: $${data.gstAmount}
Total: $${data.totalAmount}

Line Items:
${data.lineItems?.map((item, i) => `${i + 1}. ${item.description}: $${item.amount}`).join("\n")}

Please match the vendor to an existing contact or create a new one, then create a draft bill in Xero.`;

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: message }],
    } as any);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <CreditCard className="h-8 w-8 text-primary" />
            Accounts Payable Agent
          </h1>
          <p className="text-muted-foreground">
            Upload invoices, extract data, match vendors, and create bills in
            Xero
          </p>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Upload Zone */}
        <div className="lg:col-span-3">
          <InvoiceUploadZone
            disabled={isProcessing}
            onFileUploaded={handleFileUploaded}
          />
        </div>

        {/* Center Column: Invoice Viewer */}
        <div className="lg:col-span-5">
          <InvoiceViewer
            fileName={uploadedFile?.fileName || null}
            fileType={uploadedFile?.fileType || null}
            fileUrl={uploadedFile?.fileUrl || null}
          />
        </div>

        {/* Right Column: Invoice Details Form */}
        <div className="lg:col-span-4">
          <InvoiceDetailsForm
            extractedData={extractedData}
            fileType={uploadedFile?.fileType || null}
            fileUrl={uploadedFile?.fileUrl || null}
            isProcessing={isProcessing}
            onSaveToDraft={handleSaveToDraft}
          />
        </div>
      </div>
    </div>
  );
}
