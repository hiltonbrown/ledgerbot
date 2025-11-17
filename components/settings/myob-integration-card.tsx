"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Integration } from "./integration-card";

interface MyobConnection {
  id: string;
  businessId: string;
  businessName: string | null;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  connectionStatus: string | null;
  lastError: string | null;
}

interface MyobIntegrationCardProps {
  integration: Integration;
  initialConnection: MyobConnection | null;
}

export function MyobIntegrationCard({
  integration,
  initialConnection,
}: MyobIntegrationCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connection, setConnection] = useState<MyobConnection | null>(
    initialConnection
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const myobStatus = params.get("myob");
    const errorParam = params.get("error");

    if (myobStatus === "connected") {
      setSuccessMessage("Successfully connected to MYOB!");
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
      const response = await fetch("/api/myob/auth");

      if (!response.ok) {
        throw new Error("Failed to initialize MYOB authentication");
      }

      const data = await response.json();

      // Redirect to MYOB OAuth page
      window.location.href = data.url;
    } catch (err) {
      console.error("MYOB connection error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect to MYOB"
      );
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/myob/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        let errorMessage = "Failed to disconnect MYOB";
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
      setSuccessMessage("Disconnected from MYOB.");
      router.refresh();
    } catch (err) {
      console.error("MYOB disconnection error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to disconnect from MYOB"
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
              Business: {connection.businessName || connection.businessId}
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

          {/* Error Details Section - Only show if connection status is error */}
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
                  {isConnecting ? "Reconnecting..." : "Reconnect to MYOB"}
                </Button>
                <p className="text-muted-foreground text-xs">
                  This will open MYOB in a new window to re-authorize the
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

      {hasConnection && (
        <div className="text-muted-foreground text-xs">
          <p>
            <strong>Business ID:</strong> {connection.businessId}
          </p>
          <p className="mt-1">
            <strong>Connected:</strong>{" "}
            {new Date(connection.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
