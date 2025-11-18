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
    onFinish: (message) => {
      // Check if the response contains extracted invoice data
      // This would be returned from the extractInvoiceData tool
      try {
        const content = message.parts
          ?.map((part) => (part.type === "text" ? part.text : null))
          .filter(Boolean)
          .join("");

        // Parse for JSON data in the response
        const jsonMatch = content?.match(/\{[\s\S]*"invoiceData"[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          if (data.invoiceData) {
            setExtractedData(data.invoiceData);
          }
        }
      } catch (error) {
        console.error("Failed to parse invoice data:", error);
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
    const processingMessage = `I've uploaded an invoice file: ${fileData.fileName}. Please extract the invoice data using the extractInvoiceData tool, match the vendor using matchVendor, validate the ABN, check for duplicates, suggest GL coding with suggestBillCoding, and provide a risk assessment. File URL: ${fileData.fileUrl}, File Type: ${fileData.fileType}`;

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
