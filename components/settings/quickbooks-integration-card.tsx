"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Integration } from "./integration-card";

interface QuickBooksConnection {
  id: string;
  realmId: string;
  companyName: string | null;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  refreshTokenIssuedAt: Date;
  updatedAt: Date;
  connectionStatus: string | null;
  lastError: string | null;
  lastErrorType: string | null;
  environment: string;
}

interface QuickBooksIntegrationCardProps {
  integration: Integration;
  initialConnection: QuickBooksConnection | null;
}

// QuickBooks refresh token expires after 100 days
// Thresholds for warning and critical status:
const REFRESH_TOKEN_EXPIRY_DAYS = 100;
const CRITICAL_THRESHOLD_DAYS = 95; // 5 days before expiry
const WARNING_THRESHOLD_DAYS = 90; // 10 days before expiry

function getRefreshTokenStatus(refreshTokenIssuedAt: Date) {
  const now = Date.now();
  const issuedTime = new Date(refreshTokenIssuedAt).getTime();
  const ageMs = now - issuedTime;
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const daysRemaining = REFRESH_TOKEN_EXPIRY_DAYS - ageDays;

  let statusColor = "text-green-600";
  let statusText = "Healthy";
  let bgColor = "bg-green-500";

  if (ageDays >= REFRESH_TOKEN_EXPIRY_DAYS) {
    statusColor = "text-red-600";
    statusText = "Expired";
    bgColor = "bg-red-500";
  } else if (ageDays > CRITICAL_THRESHOLD_DAYS) {
    statusColor = "text-orange-600";
    statusText = "Expiring Soon";
    bgColor = "bg-orange-500";
  } else if (ageDays > WARNING_THRESHOLD_DAYS) {
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

export function QuickBooksIntegrationCard({
  integration,
  initialConnection,
}: QuickBooksIntegrationCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connection, setConnection] = useState<QuickBooksConnection | null>(
    initialConnection
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    setConnection(initialConnection);
  }, [initialConnection]);

  const hasConnection = connection !== null;
  const connectionStatusLabel =
    connection?.connectionStatus === "connected"
      ? "Connected"
      : connection?.connectionStatus === "error"
        ? "Connection Error"
        : "Not Connected";
  const isStatusConnected = connection?.connectionStatus === "connected";

  // Check for OAuth callback success/error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qbStatus = params.get("quickbooks");
    const errorParam = params.get("error");

    if (qbStatus === "connected") {
      setSuccessMessage("Successfully connected to QuickBooks!");
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh to get updated connection status
      router.refresh();
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
      const response = await fetch("/api/quickbooks/auth");

      if (!response.ok) {
        throw new Error("Failed to initialize QuickBooks authentication");
      }

      const data = await response.json();

      // Redirect to QuickBooks OAuth page
      window.location.href = data.url;
    } catch (err) {
      console.error("QuickBooks connection error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect to QuickBooks"
      );
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/quickbooks/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        let errorMessage = "Failed to disconnect QuickBooks";
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

      setConnection(null);
      setSuccessMessage("Disconnected from QuickBooks.");
      router.refresh();
    } catch (err) {
      console.error("QuickBooks disconnection error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to disconnect from QuickBooks"
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-base text-foreground">
          {integration.name}
        </h3>
        <span className="rounded-full border px-2 py-1 font-medium text-muted-foreground text-xs capitalize">
          {hasConnection ? "connected" : "available"}
        </span>
      </div>
      <p className="text-muted-foreground text-sm">{integration.description}</p>

      {hasConnection && connection && (
        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p className="font-medium text-foreground">
              Company: {connection.companyName || "Unknown"}
            </p>
            <p className="mt-1 text-muted-foreground">
              Environment:{" "}
              <span className="font-medium text-foreground capitalize">
                {connection.environment}
              </span>
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
                connection.refreshTokenIssuedAt
              );
              const lastRefresh = formatLastRefresh(connection.updatedAt);

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

          {/* Error Details Section */}
          {connection.lastError && !isStatusConnected && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <p className="text-sm">{connection.lastError}</p>
                <Button
                  className="w-full"
                  disabled={isConnecting}
                  onClick={handleConnect}
                  size="sm"
                  type="button"
                  variant="default"
                >
                  {isConnecting ? "Reconnecting..." : "Reconnect to QuickBooks"}
                </Button>
                <p className="text-muted-foreground text-xs">
                  This will open QuickBooks in a new window to re-authorize the
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
          disabled={hasConnection || isConnecting || isDisconnecting}
          onClick={handleConnect}
          type="button"
          variant="default"
        >
          {isConnecting ? "Connecting..." : "Connect"}
        </Button>
        <Button
          disabled={!hasConnection || isDisconnecting || isConnecting}
          onClick={handleDisconnect}
          type="button"
          variant="destructive"
        >
          {isDisconnecting ? "Disconnecting..." : "Disconnect"}
        </Button>
      </div>
    </div>
  );
}
