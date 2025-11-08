"use client";

import Link from "next/link";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "../toast";

type XeroConnection = {
  id: string;
  tenantName: string | null;
  isActive: boolean;
  chartOfAccountsSyncedAt: Date | null;
  accountCount?: number;
};

type XeroCompanySelectorProps = {
  connections: XeroConnection[];
  activeConnectionId?: string;
  onConnectionChange?: (connectionId: string) => void;
  showAddNew?: boolean;
  showViewAll?: boolean;
  disabled?: boolean;
};

export function XeroCompanySelector({
  connections,
  activeConnectionId,
  onConnectionChange,
  showAddNew = false,
  showViewAll = true,
  disabled = false,
}: XeroCompanySelectorProps) {
  const [isSwitching, setIsSwitching] = useState(false);

  const handleCompanySelect = async (value: string) => {
    if (value === "add-new") {
      // Redirect to Xero auth
      window.location.href = "/api/xero/auth";
      return;
    }

    if (value === activeConnectionId) {
      // Already selected
      return;
    }

    setIsSwitching(true);

    try {
      const response = await fetch("/api/xero/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectionId: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch organization");
      }

      toast({
        type: "success",
        description: "Successfully switched Xero organization",
      });

      // Call the optional callback
      if (onConnectionChange) {
        onConnectionChange(value);
      }

      // Reload to update chart of accounts in system prompt
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Error switching organization:", error);
      toast({
        type: "error",
        description: "Failed to switch organization. Please try again.",
      });
    } finally {
      setIsSwitching(false);
    }
  };

  const selectValue = activeConnectionId || "";
  const selectDisabled = disabled || isSwitching || connections.length === 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="xero-company-select">Xero Organization</Label>
      <Select
        disabled={selectDisabled}
        onValueChange={handleCompanySelect}
        value={selectValue}
      >
        <SelectTrigger
          aria-label="Select Xero organization"
          id="xero-company-select"
        >
          <SelectValue
            placeholder={
              connections.length === 0
                ? "No organizations connected"
                : "Select organization"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {connections.map((conn) => (
            <SelectItem key={conn.id} value={conn.id}>
              <div className="flex flex-col">
                <span className="font-medium">
                  {conn.tenantName || "Unknown Organization"}
                  {conn.isActive && " (Active)"}
                </span>
                {conn.chartOfAccountsSyncedAt && (
                  <span className="text-muted-foreground text-xs">
                    {conn.accountCount
                      ? `${conn.accountCount} accounts`
                      : "Synced"}{" "}
                    •{" "}
                    {new Date(
                      conn.chartOfAccountsSyncedAt
                    ).toLocaleDateString()}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
          {showAddNew && <SelectItem value="add-new">Add new...</SelectItem>}
        </SelectContent>
      </Select>
      {showViewAll && (
        <Link
          className="text-primary text-xs hover:underline"
          href="/settings/integrations/xero/select-org"
        >
          View all organizations
        </Link>
      )}
    </div>
  );
}
