"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Integration } from "./integration-card";

interface XeroConnection {
  id: string;
  tenantId: string;
  tenantName: string | null;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  refreshTokenIssuedAt: Date;
  updatedAt: Date;
  connectionStatus: string | null;
  lastError: string | null;
  lastErrorType: string | null;
  lastCorrelationId: string | null;
}

interface XeroIntegrationCardProps {
  integration: Integration;
  initialConnections: XeroConnection[];
}

function getRefreshTokenStatus(refreshTokenIssuedAt: Date) {
  const now = Date.now();
  const issuedTime = new Date(refreshTokenIssuedAt).getTime();
  const ageMs = now - issuedTime;
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const SIXTY_DAYS = 60;
  const daysRemaining = SIXTY_DAYS - ageDays;

  let statusColor = "text-green-600";
  let statusText = "Healthy";
  let bgColor = "bg-green-500";

  if (ageDays >= SIXTY_DAYS) {
    statusColor = "text-red-600";
    statusText = "Expired";
    bgColor = "bg-red-500";
  } else if (ageDays > 55) {
    statusColor = "text-orange-600";
    statusText = "Expiring Soon";
    bgColor = "bg-orange-500";
  } else if (ageDays > 50) {
    statusColor = "text-yellow-600";
    statusText = "Good";
    bgColor = "bg-yellow-500";
  }

  return {
    ageDays,
    daysRemaining,
    statusColor,
    statusText,
    bgColor,
  };
}

function formatLastRefresh(updatedAt: Date): string {
  const now = Date.now();
  const updatedTime = new Date(updatedAt).getTime();
  const diffMs = now - updatedTime;
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return new Date(updatedAt).toLocaleDateString();
}

export function XeroIntegrationCard({
  integration,
  initialConnections,
}: XeroIntegrationCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connections, setConnections] =
    useState<XeroConnection[]>(initialConnections);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    if (initialConnections.length === 0) {
      return "";
    }

    const initialActive =
      initialConnections.find((conn) => conn.isActive) || initialConnections[0];

    return initialActive.id;
  });

  useEffect(() => {
    setConnections(initialConnections);
  }, [initialConnections]);

  const activeConnection = connections.find((conn) => conn.isActive);
  const hasConnections = connections.length > 0;
  const connectionStatusLabel =
    activeConnection?.connectionStatus === "connected"
      ? "Connected"
      : activeConnection?.connectionStatus === "error"
        ? "Connection Error"
        : "Not Connected";
  const isStatusConnected = activeConnection?.connectionStatus === "connected";

  // Check for OAuth callback success/error/switch
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xeroStatus = params.get("xero");
    const errorParam = params.get("error");

    if (xeroStatus === "connected") {
      setSuccessMessage("Successfully connected to Xero!");
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh to get updated connection status
      router.refresh();
    } else if (xeroStatus === "switched") {
      setSuccessMessage("Successfully switched organization!");
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
    } else if (errorParam) {
      setError(`Connection failed: ${errorParam.replace(/_/g, " ")}`);
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [router]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/xero/auth");

      if (!response.ok) {
        throw new Error("Failed to initialize Xero authentication");
      }

      const data = await response.json();

      // Redirect to Xero OAuth page
      window.location.href = data.url;
    } catch (err) {
      console.error("Xero connection error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect to Xero"
      );
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/xero/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        let errorMessage = "Failed to disconnect Xero";
        try {
          const errorData = await response.json();
          if (errorData && typeof errorData.error === "string") {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error("Failed to parse disconnect error:", parseError);
        }
        throw new Error(errorMessage);
      }

      setConnections([]);
      setSuccessMessage("Disconnected from Xero.");
      router.refresh();
    } catch (err) {
      console.error("Xero disconnection error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to disconnect from Xero"
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSwitch = async (connectionId: string) => {
    setIsSwitching(true);
    setError(null);

    try {
      const response = await fetch("/api/xero/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch organization");
      }

      // Refetch connections from server to ensure consistency
      const refreshed = await fetch("/api/xero/connections");
      if (!refreshed.ok) {
        let errorMsg = "Failed to refresh connections after switch";
        try {
          const errorData = await refreshed.json();
          if (errorData && errorData.message) {
            errorMsg += `: ${errorData.message}`;
          }
        } catch {
          // If response is not JSON, ignore
        }
        throw new Error(errorMsg);
      }
      const refreshedData = await refreshed.json();
      const refreshedConnections: XeroConnection[] =
        refreshedData?.connections ?? [];

      setConnections(refreshedConnections);
      const newActive =
        refreshedConnections.find((conn) => conn.isActive) ??
        refreshedConnections[0];
      setSelectedCompanyId(newActive?.id ?? "");
      setSuccessMessage("Successfully switched organization!");
      router.refresh();
    } catch (err) {
      console.error("Organization switch error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to switch organization"
      );
    } finally {
      setIsSwitching(false);
    }
  };

  useEffect(() => {
    if (connections.length === 0) {
      setSelectedCompanyId("");
      return;
    }

    const active = connections.find((conn) => conn.isActive);
    if (active) {
      setSelectedCompanyId(active.id);
      return;
    }

    setSelectedCompanyId(connections[0].id);
  }, [connections]);

  const handleCompanySelect = async (value: string) => {
    if (value === "add-new") {
      // Do not update selectedCompanyId here; let OAuth callback flow handle it
      void handleConnect();
      return;
    }

    if (!value || value === selectedCompanyId) {
      return;
    }

    setSelectedCompanyId(value);
    await handleSwitch(value);
  };

  const selectValue = hasConnections
    ? selectedCompanyId === ""
      ? undefined
      : selectedCompanyId
    : "add-new";
  const selectDisabled = isConnecting || isDisconnecting || isSwitching;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-base text-foreground">
          {integration.name}
        </h3>
        <span className="rounded-full border px-2 py-1 font-medium text-muted-foreground text-xs capitalize">
          {hasConnections ? "connected" : "available"}
        </span>
      </div>
      <p className="text-muted-foreground text-sm">{integration.description}</p>

      {hasConnections && activeConnection && (
        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p className="font-medium text-foreground">
              Organisation: {activeConnection.tenantName || "Unknown"}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${isStatusConnected ? "bg-green-500" : "bg-red-500"}`}
              />
              <span
                className={`font-medium ${isStatusConnected ? "text-green-600" : "text-red-600"}`}
              >
                {connectionStatusLabel}
              </span>
            </div>

            {/* Refresh Token Status */}
            {(() => {
              const tokenStatus = getRefreshTokenStatus(
                activeConnection.refreshTokenIssuedAt
              );
              const lastRefresh = formatLastRefresh(
                activeConnection.updatedAt
              );

              return (
                <div className="mt-3 space-y-1.5 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Refresh Token
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${tokenStatus.bgColor}`}
                      />
                      <span className={`font-medium ${tokenStatus.statusColor}`}>
                        {tokenStatus.statusText}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Token Age</span>
                    <span className="font-medium text-foreground">
                      {tokenStatus.ageDays} day
                      {tokenStatus.ageDays !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Expires In</span>
                    <span
                      className={`font-medium ${tokenStatus.daysRemaining <= 5 ? "text-red-600" : tokenStatus.daysRemaining <= 10 ? "text-orange-600" : "text-foreground"}`}
                    >
                      {tokenStatus.daysRemaining > 0
                        ? `${tokenStatus.daysRemaining} day${tokenStatus.daysRemaining !== 1 ? "s" : ""}`
                        : "Expired"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Last Refresh</span>
                    <span className="font-medium text-foreground">
                      {lastRefresh}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Error Details Section - Only show if connection status is error */}
          {activeConnection.lastError && !isStatusConnected && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <p className="text-sm">{activeConnection.lastError}</p>
                <Button
                  className="w-full"
                  disabled={isConnecting}
                  onClick={handleConnect}
                  size="sm"
                  type="button"
                  variant="default"
                >
                  {isConnecting ? "Reconnecting..." : "Reconnect to Xero"}
                </Button>
                <p className="text-muted-foreground text-xs">
                  This will open Xero in a new window to re-authorize the
                  connection.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-500/10 p-3 text-green-600 text-xs">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-destructive text-xs">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          disabled={
            hasConnections || isConnecting || isDisconnecting || isSwitching
          }
          onClick={handleConnect}
          type="button"
          variant="default"
        >
          {isConnecting ? "Connecting..." : "Connect"}
        </Button>
        <Button
          disabled={!hasConnections || isDisconnecting || isConnecting}
          onClick={handleDisconnect}
          type="button"
          variant="destructive"
        >
          {isDisconnecting ? "Disconnecting..." : "Disconnect"}
        </Button>
      </div>
      <div className="space-y-2">
        <label
          className="font-medium text-foreground text-xs"
          htmlFor="company-select"
        >
          Company
        </label>
        <Select
          disabled={selectDisabled}
          onValueChange={handleCompanySelect}
          value={selectValue}
        >
          <SelectTrigger aria-label="Select Xero company" id="company-select">
            <SelectValue placeholder="Add new..." />
          </SelectTrigger>
          <SelectContent>
            {connections.map((conn) => (
              <SelectItem key={conn.id} value={conn.id}>
                {conn.tenantName || "Unknown Organization"}
                {conn.isActive && " (Active)"}
              </SelectItem>
            ))}
            <SelectItem value="add-new">Add new...</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1">
          <Link
            className="text-primary text-xs hover:underline"
            href="/settings/integrations/xero/select-org"
          >
            View all organizations
          </Link>
          <Link
            className="text-primary text-xs hover:underline"
            href="/settings/chartofaccounts"
          >
            Manage Chart of Accounts
          </Link>
        </div>
      </div>
    </div>
  );
}
