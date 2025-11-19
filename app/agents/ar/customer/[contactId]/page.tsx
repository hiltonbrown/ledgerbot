"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CustomerInvoice = {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  status: string;
  daysOverdue: number;
  currency: string;
  notes: Array<{
    id: string;
    body: string;
    createdAt: string;
    visibility: string;
  }>;
  artefacts: Array<{
    id: string;
    channel: string;
    subject: string | null;
    body: string;
    tone: string;
    createdAt: string;
  }>;
};

type CustomerData = {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  invoices: CustomerInvoice[];
  summary: {
    totalOutstanding: number;
    invoiceCount: number;
    oldestInvoiceDays: number;
  };
};

export default function CustomerDetailPage() {
  const params = useParams();
  const contactId = params?.contactId as string;

  const [data, setData] = useState<CustomerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(
    new Set()
  );

  const loadCustomerData = useCallback(async () => {
    if (!contactId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/ar/customer/${contactId}`);

      if (!response.ok) {
        throw new Error("Failed to load customer data");
      }

      const customerData: CustomerData = await response.json();
      setData(customerData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load customer data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  const toggleInvoiceExpanded = (invoiceId: string) => {
    setExpandedInvoices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: string | number) => {
    const value =
      typeof amount === "string" ? Number.parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getRiskColor = (daysOverdue: number) => {
    if (daysOverdue <= 0) {
      return "text-green-600";
    }
    if (daysOverdue <= 30) {
      return "text-yellow-600";
    }
    if (daysOverdue <= 60) {
      return "text-orange-600";
    }
    if (daysOverdue <= 90) {
      return "text-red-600";
    }
    return "text-red-800";
  };

  const getRiskBadge = (daysOverdue: number) => {
    if (daysOverdue <= 0) {
      return { label: "Current", variant: "secondary" as const };
    }
    if (daysOverdue <= 30) {
      return { label: "Low", variant: "secondary" as const };
    }
    if (daysOverdue <= 60) {
      return { label: "Medium", variant: "default" as const };
    }
    if (daysOverdue <= 90) {
      return { label: "High", variant: "destructive" as const };
    }
    return { label: "Critical", variant: "destructive" as const };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return { label: "Paid", variant: "secondary" as const };
      case "partially_paid":
        return { label: "Partial", variant: "default" as const };
      case "overdue":
        return { label: "Overdue", variant: "destructive" as const };
      default:
        return { label: "Awaiting", variant: "outline" as const };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">
              Loading customer data...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">{error || "Customer not found"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/agents/ar">
        <Button size="sm" variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to AR Dashboard
        </Button>
      </Link>

      {/* Customer Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{data.customer.name}</CardTitle>
              <div className="mt-2 space-y-1">
                {data.customer.email && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Mail className="h-4 w-4" />
                    <span>{data.customer.email}</span>
                  </div>
                )}
                {data.customer.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Phone className="h-4 w-4" />
                    <span>{data.customer.phone}</span>
                  </div>
                )}
              </div>
            </div>
            <Link
              href={`/?ar_contact=${data.customer.id}&ar_name=${encodeURIComponent(data.customer.name)}`}
            >
              <Button>
                <MessageSquare className="mr-2 h-4 w-4" />
                Draft Reminders
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Total Outstanding
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(data.summary.totalOutstanding)}
            </div>
            <p className="text-muted-foreground text-xs">
              Across {data.summary.invoiceCount} unpaid invoice
              {data.summary.invoiceCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{data.invoices.length}</div>
            <p className="text-muted-foreground text-xs">
              All invoices (paid + unpaid)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Oldest Invoice
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {data.summary.oldestInvoiceDays} days
            </div>
            <p className="text-muted-foreground text-xs">Days overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]" />
                <TableHead>Invoice #</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Days Overdue</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invoices.map((invoice) => {
                const isExpanded = expandedInvoices.has(invoice.id);
                const risk = getRiskBadge(invoice.daysOverdue);
                const status = getStatusBadge(invoice.status);
                const hasDetails =
                  invoice.notes.length > 0 || invoice.artefacts.length > 0;

                return (
                  <>
                    <TableRow key={invoice.id}>
                      <TableCell>
                        {hasDetails && (
                          <Button
                            onClick={() => toggleInvoiceExpanded(invoice.id)}
                            size="sm"
                            variant="ghost"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.number}
                      </TableCell>
                      <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.amountPaid)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(invoice.amountDue)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${getRiskColor(invoice.daysOverdue)}`}
                      >
                        {invoice.daysOverdue}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={risk.variant}>{risk.label}</Badge>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row - Notes and Artefacts */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <div className="space-y-4 py-4">
                            {/* Notes Section */}
                            {invoice.notes.length > 0 && (
                              <div>
                                <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                                  <StickyNote className="h-4 w-4" />
                                  Notes ({invoice.notes.length})
                                </h4>
                                <div className="space-y-2">
                                  {invoice.notes.map((note) => (
                                    <Card className="bg-muted/50" key={note.id}>
                                      <CardContent className="pt-4">
                                        <p className="text-sm">{note.body}</p>
                                        <p className="mt-2 text-muted-foreground text-xs">
                                          {formatDate(note.createdAt)} •{" "}
                                          {note.visibility}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Communication Artefacts Section */}
                            {invoice.artefacts.length > 0 && (
                              <div>
                                <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                                  <Mail className="h-4 w-4" />
                                  Communication History (
                                  {invoice.artefacts.length})
                                </h4>
                                <div className="space-y-2">
                                  {invoice.artefacts.map((artefact) => (
                                    <Card
                                      className="bg-muted/50"
                                      key={artefact.id}
                                    >
                                      <CardContent className="pt-4">
                                        <div className="mb-2 flex items-center gap-2">
                                          <Badge variant="outline">
                                            {artefact.channel}
                                          </Badge>
                                          <Badge variant="secondary">
                                            {artefact.tone}
                                          </Badge>
                                        </div>
                                        {artefact.subject && (
                                          <p className="font-semibold text-sm">
                                            {artefact.subject}
                                          </p>
                                        )}
                                        <p className="mt-2 line-clamp-3 text-sm">
                                          {artefact.body}
                                        </p>
                                        <p className="mt-2 text-muted-foreground text-xs">
                                          {formatDate(artefact.createdAt)}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>

          {data.invoices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No invoices found for this customer
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Timeline */}
      {(() => {
        // Collect all notes and artefacts from all invoices
        const allCommunications: Array<{
          type: "note" | "artefact";
          date: Date;
          invoiceNumber: string;
          data:
            | {
                id: string;
                body: string;
                createdAt: string;
                visibility: string;
              }
            | {
                id: string;
                channel: string;
                subject: string | null;
                body: string;
                tone: string;
                createdAt: string;
              };
        }> = [];

        for (const invoice of data.invoices) {
          for (const note of invoice.notes) {
            allCommunications.push({
              type: "note",
              date: new Date(note.createdAt),
              invoiceNumber: invoice.number,
              data: note,
            });
          }
          for (const artefact of invoice.artefacts) {
            allCommunications.push({
              type: "artefact",
              date: new Date(artefact.createdAt),
              invoiceNumber: invoice.number,
              data: artefact,
            });
          }
        }

        // Sort by date (newest first)
        allCommunications.sort((a, b) => b.date.getTime() - a.date.getTime());

        if (allCommunications.length === 0) {
          return null;
        }

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Communication Timeline ({allCommunications.length})
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                All notes and communication history across all invoices
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allCommunications.map((comm, _index) => {
                  if (comm.type === "note") {
                    const note = comm.data as {
                      id: string;
                      body: string;
                      createdAt: string;
                      visibility: string;
                    };
                    return (
                      <div
                        className="border-muted-foreground/20 border-l-2 pl-4"
                        key={`${comm.type}-${note.id}`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <StickyNote className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">Note</Badge>
                          <span className="text-muted-foreground text-xs">
                            Invoice {comm.invoiceNumber}
                          </span>
                          <Badge variant="secondary">{note.visibility}</Badge>
                        </div>
                        <p className="my-2 text-sm">{note.body}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatDate(note.createdAt)}
                        </p>
                      </div>
                    );
                  }
                  const artefact = comm.data as {
                    id: string;
                    channel: string;
                    subject: string | null;
                    body: string;
                    tone: string;
                    createdAt: string;
                  };
                  return (
                    <div
                      className="border-muted-foreground/20 border-l-2 pl-4"
                      key={`${comm.type}-${artefact.id}`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">{artefact.channel}</Badge>
                        <span className="text-muted-foreground text-xs">
                          Invoice {comm.invoiceNumber}
                        </span>
                        <Badge variant="secondary">{artefact.tone}</Badge>
                      </div>
                      {artefact.subject && (
                        <p className="my-1 font-semibold text-sm">
                          {artefact.subject}
                        </p>
                      )}
                      <p className="my-2 line-clamp-3 text-sm">
                        {artefact.body}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(artefact.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
