"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface XeroConnection {
  id: string;
  tenantId: string;
  tenantName: string | null;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
}

interface XeroOrganizationCardProps {
  connection: XeroConnection;
}

export function XeroOrganizationCard({
  connection,
}: XeroOrganizationCardProps) {
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwitch = async () => {
    setIsSwitching(true);
    setError(null);

    try {
      const response = await fetch("/api/xero/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectionId: connection.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch organization");
      }

      // Redirect back to integrations page
      router.push("/settings/integrations?xero=switched");
      router.refresh();
    } catch (err) {
      console.error("Organization switch error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to switch organization"
      );
      setIsSwitching(false);
    }
  };

  return (
    <Card className={connection.isActive ? "border-primary" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">
            {connection.tenantName || "Unnamed Organization"}
          </CardTitle>
          {connection.isActive && (
            <span className="rounded-full bg-primary px-2 py-1 font-medium text-primary-foreground text-xs">
              Active
            </span>
          )}
        </div>
        <CardDescription className="break-all text-xs">
          Tenant ID: {connection.tenantId}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        <div>
          <p className="font-medium text-muted-foreground">Connected:</p>
          <p>{new Date(connection.createdAt).toLocaleDateString("en-AU")}</p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Token Expires:</p>
          <p>{new Date(connection.expiresAt).toLocaleDateString("en-AU")}</p>
        </div>
      </CardContent>

      {error && (
        <CardContent className="pt-0">
          <div className="rounded-md bg-destructive/10 p-3 text-destructive text-xs">
            {error}
          </div>
        </CardContent>
      )}

      {!connection.isActive && (
        <CardFooter>
          <Button
            className="w-full"
            disabled={isSwitching}
            onClick={handleSwitch}
            type="button"
          >
            {isSwitching ? "Switching..." : "Switch to this organization"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
