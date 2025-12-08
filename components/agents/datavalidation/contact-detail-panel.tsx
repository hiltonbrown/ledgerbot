"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type {
  VerificationResult,
  XeroContactRecord,
} from "@/types/datavalidation";
import {
  GSTStatusBadge,
  VerificationStatusBadge,
} from "./verification-status-badge";

interface ContactDetailPanelProps {
  contact: XeroContactRecord;
  verificationResult?: VerificationResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify?: (contactId: string) => Promise<void>;
}

export function ContactDetailPanel({
  contact,
  verificationResult,
  open,
  onOpenChange,
  onVerify,
}: ContactDetailPanelProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "comparison" | "registry" | "xero"
  >("comparison");

  const handleVerify = async () => {
    if (onVerify) {
      setIsVerifying(true);
      await onVerify(contact.contactId);
      setIsVerifying(false);
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-[800px] overflow-y-auto sm:w-[540px]">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{contact.name}</SheetTitle>
            {verificationResult && (
              <VerificationStatusBadge
                status={verificationResult.verificationStatus}
              />
            )}
          </div>
          <SheetDescription>
            Xero Contact ID: {contact.contactId}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="flex gap-2">
            <Button
              disabled={isVerifying}
              onClick={handleVerify}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isVerifying ? "animate-spin" : ""}`}
              />
              Re-verify
            </Button>
            <Button asChild size="sm" variant="outline">
              <a
                href={`https://go.xero.com/Contacts/View/${contact.contactId}`}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View in Xero
              </a>
            </Button>
          </div>

          {verificationResult?.issues &&
            verificationResult.issues.length > 0 && (
              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Verification Issues
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  {verificationResult.issues.map((issue, i) => (
                    <div className="flex items-start gap-2" key={i}>
                      {issue.type === "error" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
                      ) : issue.type === "warning" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500" />
                      ) : (
                        <Info className="mt-0.5 h-4 w-4 text-blue-500" />
                      )}
                      <div>
                        <span className="mr-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                          {issue.code.replace(/_/g, " ")}
                        </span>
                        <span>{issue.message}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          <div className="w-full">
            <div className="flex w-full border-b">
              {(["comparison", "registry", "xero"] as const).map((tab) => (
                <button
                  className={cn(
                    "flex-1 px-4 py-2 font-medium text-sm transition-colors hover:text-primary",
                    activeTab === tab
                      ? "border-primary border-b-2 text-primary"
                      : "text-muted-foreground"
                  )}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} Data
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {activeTab === "comparison" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/30 p-4">
                    <h4 className="mb-3 font-medium text-muted-foreground text-sm">
                      Xero
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">
                          Name
                        </div>
                        <div className="font-medium">{contact.name}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">ABN</div>
                        <div className="font-mono">
                          {contact.taxNumber || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">ACN</div>
                        <div className="font-mono">
                          {contact.companyNumber || "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-4">
                    <h4 className="mb-3 font-medium text-muted-foreground text-sm">
                      Registry (Best Match)
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">
                          Entity Name
                        </div>
                        <div className="font-medium">
                          {verificationResult?.abrRecord?.entityName ||
                            verificationResult?.asicCompanyMatch?.companyName ||
                            "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">
                          ABN Status
                        </div>
                        <div className="flex items-center gap-2">
                          {verificationResult?.abrRecord ? (
                            <>
                              <span className="font-mono">
                                {verificationResult.abrRecord.abn}
                              </span>
                              <Badge
                                className="h-5 text-[10px]"
                                variant={
                                  verificationResult.abrRecord.abnStatus ===
                                  "Active"
                                    ? "outline"
                                    : "destructive"
                                }
                              >
                                {verificationResult.abrRecord.abnStatus}
                              </Badge>
                            </>
                          ) : (
                            "-"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">
                          GST Status
                        </div>
                        <div>
                          {verificationResult?.abrRecord ? (
                            <GSTStatusBadge
                              registered={
                                verificationResult.abrRecord.gstRegistered
                              }
                            />
                          ) : (
                            "-"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "registry" && (
                <>
                  {/* ABR Section */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Australian Business Register (ABR)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {verificationResult?.abrRecord ? (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-muted-foreground">
                              Entity Name
                            </div>
                            <div className="col-span-2 font-medium">
                              {verificationResult.abrRecord.entityName}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-muted-foreground">
                              Entity Type
                            </div>
                            <div className="col-span-2">
                              {verificationResult.abrRecord.entityType}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-muted-foreground">ABN</div>
                            <div className="col-span-2 font-mono">
                              {verificationResult.abrRecord.abn}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-muted-foreground">
                              GST Registered
                            </div>
                            <div className="col-span-2">
                              {verificationResult.abrRecord.gstRegistered
                                ? `Yes (since ${verificationResult.abrRecord.gstRegistrationDate?.toLocaleDateString()})`
                                : "No"}
                            </div>
                          </div>
                          {verificationResult.abrRecord.businessNames.length >
                            0 && (
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-muted-foreground">
                                Business Names
                              </div>
                              <div className="col-span-2">
                                <ul className="list-inside list-disc">
                                  {verificationResult.abrRecord.businessNames.map(
                                    (bn) => (
                                      <li key={bn}>{bn}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-muted-foreground italic">
                          No ABR record found
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ASIC Company Section */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">ASIC Companies</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {verificationResult?.asicCompanyMatch ? (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-muted-foreground">
                              Company Name
                            </div>
                            <div className="col-span-2 font-medium">
                              {verificationResult.asicCompanyMatch.companyName}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-muted-foreground">ACN</div>
                            <div className="col-span-2 font-mono">
                              {verificationResult.asicCompanyMatch.acn}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-muted-foreground">
                              Type/Class
                            </div>
                            <div className="col-span-2">
                              {verificationResult.asicCompanyMatch.type} (
                              {verificationResult.asicCompanyMatch.class})
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-muted-foreground">Status</div>
                            <div className="col-span-2">
                              <Badge
                                variant={
                                  verificationResult.asicCompanyMatch.status ===
                                  "Registered"
                                    ? "outline"
                                    : "destructive"
                                }
                              >
                                {verificationResult.asicCompanyMatch.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-muted-foreground">
                              Registration Date
                            </div>
                            <div className="col-span-2">
                              {new Date(
                                verificationResult.asicCompanyMatch
                                  .registrationDate
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-muted-foreground italic">
                          No ASIC Company record found
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {activeTab === "xero" && (
                <div className="space-y-4 rounded-lg bg-muted/30 p-4 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-muted-foreground">Name</div>
                    <div className="col-span-2 font-medium">{contact.name}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-muted-foreground">Tax Number</div>
                    <div className="col-span-2 font-mono">
                      {contact.taxNumber || "-"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-muted-foreground">Company Number</div>
                    <div className="col-span-2 font-mono">
                      {contact.companyNumber || "-"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-muted-foreground">Email</div>
                    <div className="col-span-2">
                      {contact.emailAddress || "-"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-muted-foreground">Phone</div>
                    <div className="col-span-2">{contact.phone || "-"}</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-muted-foreground">Type</div>
                    <div className="col-span-2">
                      {contact.isCustomer && (
                        <Badge className="mr-1" variant="secondary">
                          Customer
                        </Badge>
                      )}
                      {contact.isSupplier && (
                        <Badge variant="secondary">Supplier</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
