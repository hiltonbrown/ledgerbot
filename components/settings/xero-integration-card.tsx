"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  connectionStatus: string | null;
  lastError: string | null;
  lastErrorType: string | null;
  lastCorrelationId: string | null;
}

interface XeroIntegrationCardProps {
  integration: Integration;
  initialConnections: XeroConnection[];
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
          </div>

          {/* Error Details Section */}
          {activeConnection.lastError && (
            <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-red-900 text-xs dark:text-red-200">
                    Connection Error
                  </p>
                  <p className="text-red-800 text-xs dark:text-red-300">
                    {activeConnection.lastError}
                  </p>
                  {activeConnection.lastErrorType && (
                    <p className="text-red-700 text-xs dark:text-red-400">
                      Error type: {activeConnection.lastErrorType}
                    </p>
                  )}
                  {activeConnection.lastCorrelationId && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-700 text-xs hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                        Technical Details
                      </summary>
                      <div className="mt-1 rounded bg-red-100 p-2 font-mono text-[10px] text-red-900 dark:bg-red-900/20 dark:text-red-200">
                        <p>
                          Correlation ID: {activeConnection.lastCorrelationId}
                        </p>
                        <p className="mt-1 text-red-700 dark:text-red-400">
                          Include this ID when contacting support
                        </p>
                      </div>
                    </details>
                  )}
                </div>
              </div>
              {(activeConnection.lastErrorType === "authorization" ||
                activeConnection.lastErrorType === "token") && (
                <Button
                  className="w-full"
                  disabled={isConnecting}
                  onClick={handleConnect}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isConnecting ? "Reconnecting..." : "Reconnect to Xero"}
                </Button>
              )}
            </div>
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
