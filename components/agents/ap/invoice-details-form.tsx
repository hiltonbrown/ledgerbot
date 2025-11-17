"use client";

import {
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ExtractedInvoiceData } from "@/types/ap";

interface InvoiceDetailsFormProps {
  fileUrl: string | null;
  fileType: "pdf" | "image" | null;
  isProcessing: boolean;
  extractedData: ExtractedInvoiceData | null;
  onSaveToDraft: (data: ExtractedInvoiceData) => Promise<void>;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  accountCode?: string;
  taxType: string;
}

export function InvoiceDetailsForm({
  fileUrl,
  fileType,
  isProcessing,
  extractedData,
  onSaveToDraft,
}: InvoiceDetailsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  // Form state
  const [supplierName, setSupplierName] = useState("");
  const [supplierABN, setSupplierABN] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Update form when extracted data changes
  useEffect(() => {
    if (extractedData) {
      setSupplierName(extractedData.supplierName || "");
      setSupplierABN(extractedData.supplierABN || "");
      setInvoiceNumber(extractedData.invoiceNumber || "");
      setInvoiceDate(extractedData.invoiceDate || "");
      setDueDate(extractedData.dueDate || "");
      setSubtotal(extractedData.subtotal || 0);
      setGstAmount(extractedData.gstAmount || 0);
      setTotalAmount(extractedData.totalAmount || 0);

      if (extractedData.lineItems && extractedData.lineItems.length > 0) {
        setLineItems(
          extractedData.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.amount,
            amount: item.amount,
            accountCode: "",
            taxType: item.gstIncluded ? "INPUT2" : "NONE",
          }))
        );
      }
    }
  }, [extractedData]);

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        accountCode: "",
        taxType: "INPUT2",
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const updatedLineItems = [...lineItems];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: value,
    };

    // Recalculate amount if quantity or unit price changes
    if (field === "quantity" || field === "unitPrice") {
      const quantity = field === "quantity" ? Number(value) : updatedLineItems[index].quantity;
      const unitPrice = field === "unitPrice" ? Number(value) : updatedLineItems[index].unitPrice;
      updatedLineItems[index].amount = quantity * unitPrice;
    }

    setLineItems(updatedLineItems);

    // Recalculate totals
    const newSubtotal = updatedLineItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    setSubtotal(newSubtotal);
    setGstAmount(newSubtotal * 0.1); // Assuming 10% GST
    setTotalAmount(newSubtotal * 1.1);
  };

  const handleSaveToDraft = async () => {
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      await onSaveToDraft({
        supplierName,
        supplierABN,
        invoiceNumber,
        invoiceDate,
        dueDate,
        subtotal,
        gstAmount,
        totalAmount,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          gstIncluded: item.taxType === "INPUT2",
        })),
      });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Failed to save draft:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!fileUrl) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-[600px] flex-col items-center justify-center p-8">
          <div className="rounded-full bg-muted p-6">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="mt-4 font-medium text-muted-foreground">
            No invoice uploaded
          </p>
          <p className="text-muted-foreground text-sm">
            Upload an invoice to start processing
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isProcessing) {
    return (
      <Card>
        <CardContent className="flex min-h-[600px] flex-col items-center justify-center p-8">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="font-medium text-lg">Processing invoice...</p>
          <p className="text-muted-foreground text-sm">
            Extracting data and validating
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Invoice Details
          </CardTitle>
          {extractedData && (
            <Badge variant="secondary">
              {Math.round((extractedData.confidence || 0) * 100)}% confidence
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="space-y-6 p-6">
            {/* Warnings */}
            {extractedData?.warnings && extractedData.warnings.length > 0 && (
              <div className="rounded-md border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900 text-sm dark:text-amber-100">
                      Validation Warnings
                    </p>
                    <ul className="mt-1 space-y-1 text-amber-800 text-xs dark:text-amber-200">
                      {extractedData.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Supplier Information</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="supplierName">Supplier Name *</Label>
                  <Input
                    id="supplierName"
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                    value={supplierName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierABN">ABN</Label>
                  <Input
                    id="supplierABN"
                    onChange={(e) => setSupplierABN(e.target.value)}
                    placeholder="11 digit ABN"
                    value={supplierABN}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Invoice Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Invoice Details</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                  <Input
                    id="invoiceNumber"
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-001"
                    value={invoiceNumber}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceDate">Invoice Date *</Label>
                  <Input
                    id="invoiceDate"
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    type="date"
                    value={invoiceDate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    onChange={(e) => setDueDate(e.target.value)}
                    type="date"
                    value={dueDate}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Line Items</h3>
                </div>
                <Button onClick={handleAddLineItem} size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div
                    className="rounded-md border bg-muted/30 p-4"
                    key={index}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium text-sm">
                        Item {index + 1}
                      </span>
                      <Button
                        onClick={() => handleRemoveLineItem(index)}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor={`description-${index}`}>
                          Description
                        </Label>
                        <Input
                          id={`description-${index}`}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Item description"
                          value={item.description}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                        <Input
                          id={`quantity-${index}`}
                          min="1"
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          type="number"
                          value={item.quantity}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`unitPrice-${index}`}>
                          Unit Price
                        </Label>
                        <Input
                          id={`unitPrice-${index}`}
                          min="0"
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              "unitPrice",
                              Number(e.target.value)
                            )
                          }
                          step="0.01"
                          type="number"
                          value={item.unitPrice}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`accountCode-${index}`}>
                          Account Code
                        </Label>
                        <Input
                          id={`accountCode-${index}`}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              "accountCode",
                              e.target.value
                            )
                          }
                          placeholder="e.g., 400"
                          value={item.accountCode}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <div className="rounded-md border bg-muted px-3 py-2 font-medium text-sm">
                          ${item.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {lineItems.length === 0 && (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <p className="text-muted-foreground text-sm">
                      No line items. Click "Add Item" to get started.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  GST (10%)
                </span>
                <span className="font-medium">${gstAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={isSaving || !supplierName || !invoiceNumber}
                onClick={handleSaveToDraft}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : saveStatus === "success" ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save as Draft
                  </>
                )}
              </Button>
            </div>

            {saveStatus === "error" && (
              <div className="rounded-md border border-red-500 bg-red-50 p-3 dark:bg-red-950">
                <p className="text-red-900 text-sm dark:text-red-100">
                  Failed to save draft. Please try again.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
