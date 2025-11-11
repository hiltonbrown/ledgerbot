"use client";

import { useChat } from "ai/react";
import {
  CreditCard,
  FileText,
  Loader2,
  MessageSquare,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export default function AccountsPayableAgentPage() {
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/agents/ap",
      initialMessages: [],
    });

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/agents/ap/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }

      const data = await response.json();
      setUploadedFile({
        url: data.fileUrl,
        name: data.fileName,
        type: data.fileType,
      });

      // Auto-trigger invoice processing
      const processingMessage = `I've uploaded an invoice file: ${data.fileName}. Please extract the invoice data, match the vendor, suggest coding, and create a draft bill in Xero if connected. File URL: ${data.fileUrl}`;

      // Programmatically submit the message
      const submitEvent = new Event(
        "submit"
      ) as unknown as FormEvent<HTMLFormElement>;
      handleInputChange({
        target: { value: processingMessage },
      } as ChangeEvent<HTMLTextAreaElement>);

      // Small delay to ensure input is set
      setTimeout(() => {
        handleSubmit(submitEvent);
      }, 100);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice Upload Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              Upload Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              accept="application/pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />

            <Button
              className="w-full"
              disabled={isUploading}
              onClick={handleUploadClick}
              size="lg"
              variant="outline"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Select Invoice File
                </>
              )}
            </Button>

            <p className="text-muted-foreground text-xs">
              Supported: PDF, JPG, PNG (max 10MB)
            </p>

            {uploadError && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3">
                <p className="font-medium text-destructive text-sm">
                  Upload Error
                </p>
                <p className="text-destructive text-xs">{uploadError}</p>
              </div>
            )}

            {uploadedFile && (
              <div className="rounded-md border bg-muted p-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{uploadedFile.name}</p>
                    <Badge className="mt-1" variant="secondary">
                      {uploadedFile.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-md border bg-muted/50 p-3">
              <h4 className="font-semibold text-sm">Processing Steps</h4>
              <ol className="space-y-1 text-muted-foreground text-xs">
                <li>1. Extract invoice data (OCR/AI)</li>
                <li>2. Match or create vendor</li>
                <li>3. Validate ABN and check duplicates</li>
                <li>4. Suggest GL coding and tax codes</li>
                <li>5. Create draft bill in Xero</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              AP Agent Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="mb-4 h-96 rounded-md border bg-muted/20 p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <CreditCard className="mx-auto mb-2 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">
                      Upload an invoice to get started, or ask me anything about
                      accounts payable
                    </p>
                    <div className="mt-4 space-y-2">
                      <p className="font-semibold text-muted-foreground text-xs">
                        Example queries:
                      </p>
                      <ul className="space-y-1 text-muted-foreground text-xs">
                        <li>• "Show me all unpaid bills from last month"</li>
                        <li>• "Generate a payment run for next Friday"</li>
                        <li>• "What bills need approval?"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      className={`rounded-md border p-3 ${
                        message.role === "user"
                          ? "bg-primary/5"
                          : "bg-background"
                      }`}
                      key={message.id}
                    >
                      <p className="mb-1 font-semibold text-muted-foreground text-xs uppercase">
                        {message.role === "user" ? "You" : "AP Agent"}
                      </p>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <form className="space-y-2" onSubmit={handleSubmit}>
              <Textarea
                disabled={isLoading}
                onChange={handleInputChange}
                placeholder="Ask about bills, vendors, payments, or upload an invoice above..."
                rows={3}
                value={input}
              />
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  {uploadedFile
                    ? "File uploaded - processing automatically"
                    : "Type your question or upload an invoice"}
                </p>
                <Button disabled={isLoading || !input.trim()} type="submit">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Thinking
                    </>
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              className="justify-start"
              disabled={isLoading}
              onClick={() => {
                handleInputChange({
                  target: {
                    value: "Show me all unpaid bills that are overdue",
                  },
                } as ChangeEvent<HTMLTextAreaElement>);
                setTimeout(() => {
                  const submitEvent = new Event(
                    "submit"
                  ) as unknown as FormEvent<HTMLFormElement>;
                  handleSubmit(submitEvent);
                }, 100);
              }}
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              Overdue Bills
            </Button>

            <Button
              className="justify-start"
              disabled={isLoading}
              onClick={() => {
                handleInputChange({
                  target: {
                    value: "Generate a payment run proposal for this Friday",
                  },
                } as ChangeEvent<HTMLTextAreaElement>);
                setTimeout(() => {
                  const submitEvent = new Event(
                    "submit"
                  ) as unknown as FormEvent<HTMLFormElement>;
                  handleSubmit(submitEvent);
                }, 100);
              }}
              variant="outline"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Payment Run
            </Button>

            <Button
              className="justify-start"
              disabled={isLoading}
              onClick={() => {
                handleInputChange({
                  target: {
                    value: "List all bills awaiting approval",
                  },
                } as ChangeEvent<HTMLTextAreaElement>);
                setTimeout(() => {
                  const submitEvent = new Event(
                    "submit"
                  ) as unknown as FormEvent<HTMLFormElement>;
                  handleSubmit(submitEvent);
                }, 100);
              }}
              variant="outline"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Pending Approval
            </Button>

            <Button
              className="justify-start"
              disabled={isLoading}
              onClick={() => {
                handleInputChange({
                  target: {
                    value:
                      "What vendors do I have in my system? Show me the top 5 by spend.",
                  },
                } as ChangeEvent<HTMLTextAreaElement>);
                setTimeout(() => {
                  const submitEvent = new Event(
                    "submit"
                  ) as unknown as FormEvent<HTMLFormElement>;
                  handleSubmit(submitEvent);
                }, 100);
              }}
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              Top Vendors
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
