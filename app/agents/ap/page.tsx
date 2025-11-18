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

  const { sendMessage, messages } = useChat({
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
    onFinish: () => {
      setIsProcessing(false);
    },
  });

  // Watch for tool results in messages and extract invoice data
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    // Look through all messages for extractInvoiceData tool results
    for (const message of messages) {
      if (!message.parts || message.parts.length === 0) continue;

      try {
        // Find extractInvoiceData tool call
        const extractToolCall = message.parts.find((part) => {
          return (
            part.type === "tool-call" &&
            "toolName" in part &&
            part.toolName === "extractInvoiceData"
          );
        });

        if (extractToolCall && "toolCallId" in extractToolCall) {
          const toolCallId = extractToolCall.toolCallId;

          // Find the corresponding tool result
          const toolResultPart = message.parts.find(
            (part) =>
              part.type === "tool-result" &&
              "toolCallId" in part &&
              part.toolCallId === toolCallId
          );

          if (toolResultPart && "result" in toolResultPart) {
            const result = toolResultPart.result;

            // Extract invoice data from tool result
            if (result && typeof result === "object" && "invoiceData" in result) {
              const data = result.invoiceData;
              if (data) {
                console.log("[AP Agent] Invoice data extracted:", data);
                setExtractedData(data as ExtractedInvoiceData);
                setIsProcessing(false);
                return; // Stop after finding the first result
              }
            }
          }
        }
      } catch (error) {
        console.error("[AP Agent] Error extracting invoice data:", error);
      }
    }
  }, [messages]);

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
