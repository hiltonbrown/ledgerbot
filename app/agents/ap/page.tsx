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
  });

  const handleFileUploaded = async (fileData: {
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

    try {
      console.log("[AP Agent] Calling extraction API for file:", fileData.fileName);

      // Call the extraction API directly
      const response = await fetch("/api/agents/ap/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl: fileData.fileUrl,
          fileType: fileData.fileType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("[AP Agent] Extraction result:", result);

      if (result.success && result.invoiceData) {
        console.log("[AP Agent] Setting extracted data:", result.invoiceData);
        setExtractedData(result.invoiceData);
      } else {
        console.error("[AP Agent] Extraction failed:", result.error);
        // Show error to user
        alert(`Failed to extract invoice data: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("[AP Agent] Error during extraction:", error);
      alert(`Error extracting invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncToXero = async (data: ExtractedInvoiceData) => {
    // Trigger the agent to create a bill in Xero
    const message = `Please create a bill in Xero with the following details:
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

Steps:
1. Match the vendor to an existing Xero contact or create a new one
2. Create a draft bill in Xero with these details
3. Confirm when complete`;

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
            onSyncToXero={handleSyncToXero}
          />
        </div>
      </div>
    </div>
  );
}
