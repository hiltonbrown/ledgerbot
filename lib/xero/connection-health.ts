import "server-only";

import {
  deactivateXeroConnection,
  getAllActiveXeroConnections,
  updateXeroConnectionStatus,
} from "@/lib/db/queries";
import { decryptToken } from "./encryption";
import type { XeroConnection } from "./types";

/**
 * Connection health status
 */
export type ConnectionHealth = {
  connectionId: string;
  tenantId: string;
  tenantName: string | null;
  isHealthy: boolean;
  status: "healthy" | "warning" | "error" | "expired";
  issues: string[];
  lastCheckedAt: Date;
  tokenExpiresAt: Date;
  tokenExpiresInMinutes: number;
  refreshTokenAge: number; // Days since refresh token was issued
  refreshTokenExpiresInDays: number;
  lastApiCallAge?: number; // Days since last API call
};

/**
 * Health check result for all connections
 */
export type HealthCheckResult = {
  totalConnections: number;
  healthyConnections: number;
  warningConnections: number;
  errorConnections: number;
  expiredConnections: number;
  connections: ConnectionHealth[];
  executedAt: Date;
};

/**
 * Xero best practice: Monitor connection health proactively
 * This helps identify issues before they affect users
 *
 * Checks performed:
 * - Access token expiry (should be refreshed before expiry)
 * - Refresh token age (expires after 60 days)
 * - Connection staleness (no API calls for extended period)
 * - Connection status in Xero
 */
export async function checkConnectionHealth(
  connection: XeroConnection
): Promise<ConnectionHealth> {
  const now = new Date();
  const issues: string[] = [];
  let status: ConnectionHealth["status"] = "healthy";

  // Check access token expiry
  const expiresAt = new Date(connection.expiresAt);
  const tokenExpiresInMs = expiresAt.getTime() - now.getTime();
  const tokenExpiresInMinutes = Math.floor(tokenExpiresInMs / (60 * 1000));

  if (tokenExpiresInMinutes <= 0) {
    issues.push("Access token expired");
    status = "error";
  } else if (tokenExpiresInMinutes <= 5) {
    issues.push("Access token expires in less than 5 minutes");
    status = "warning";
  }

  // Check refresh token age (60-day limit)
  const refreshTokenIssuedAt = new Date(connection.refreshTokenIssuedAt);
  const refreshTokenAge = Math.floor(
    (now.getTime() - refreshTokenIssuedAt.getTime()) / (24 * 60 * 60 * 1000)
  );
  const refreshTokenExpiresInDays = 60 - refreshTokenAge;

  if (refreshTokenAge >= 60) {
    issues.push("Refresh token expired (60+ days old)");
    status = "expired";
  } else if (refreshTokenAge >= 55) {
    issues.push(`Refresh token expires in ${refreshTokenExpiresInDays} days`);
    if (status === "healthy") status = "warning";
  }

  // Check connection staleness (no API calls for 30+ days)
  let lastApiCallAge: number | undefined;
  if (connection.lastApiCallAt) {
    lastApiCallAge = Math.floor(
      (now.getTime() - new Date(connection.lastApiCallAt).getTime()) /
        (24 * 60 * 60 * 1000)
    );
    if (lastApiCallAge >= 30) {
      issues.push(
        `No API calls for ${lastApiCallAge} days (connection may be unused)`
      );
      if (status === "healthy") status = "warning";
    }
  }

  // Check connection status field
  if (connection.connectionStatus === "disconnected") {
    issues.push("Connection marked as disconnected");
    status = "error";
  } else if (connection.connectionStatus === "error") {
    issues.push(
      `Connection has error: ${connection.lastError || "Unknown error"}`
    );
    status = "error";
  }

  // Check if connection is active
  if (!connection.isActive) {
    issues.push("Connection is inactive");
    status = "error";
  }

  return {
    connectionId: connection.id,
    tenantId: connection.tenantId,
    tenantName: connection.tenantName,
    isHealthy: status === "healthy",
    status,
    issues,
    lastCheckedAt: now,
    tokenExpiresAt: expiresAt,
    tokenExpiresInMinutes,
    refreshTokenAge,
    refreshTokenExpiresInDays,
    lastApiCallAge,
  };
}

/**
 * Run health check on all active connections
 * Returns summary and detailed health status for each connection
 */
export async function checkAllConnectionsHealth(): Promise<HealthCheckResult> {
  const connections = await getAllActiveXeroConnections();
  const healthChecks = await Promise.all(
    connections.map((conn) => checkConnectionHealth(conn))
  );

  const result: HealthCheckResult = {
    totalConnections: connections.length,
    healthyConnections: healthChecks.filter((h) => h.status === "healthy")
      .length,
    warningConnections: healthChecks.filter((h) => h.status === "warning")
      .length,
    errorConnections: healthChecks.filter((h) => h.status === "error").length,
    expiredConnections: healthChecks.filter((h) => h.status === "expired")
      .length,
    connections: healthChecks,
    executedAt: new Date(),
  };

  return result;
}

/**
 * Cleanup expired and stale connections
 * Xero best practice: Remove unused connections to avoid unnecessary billing
 *
 * This will:
 * - Deactivate connections with expired refresh tokens (60+ days)
 * - Mark stale connections (90+ days without API calls) as disconnected
 *
 * @param dryRun If true, only returns what would be cleaned up without making changes
 */
export async function cleanupStaleConnections(
  dryRun = false
): Promise<{
  expiredCount: number;
  staleCount: number;
  expired: string[];
  stale: string[];
}> {
  const connections = await getAllActiveXeroConnections();
  const now = new Date();

  const expired: string[] = [];
  const stale: string[] = [];

  for (const connection of connections) {
    // Check for expired refresh tokens (60+ days)
    const refreshTokenAge = Math.floor(
      (now.getTime() - new Date(connection.refreshTokenIssuedAt).getTime()) /
        (24 * 60 * 60 * 1000)
    );

    if (refreshTokenAge >= 60) {
      expired.push(connection.id);
      if (!dryRun) {
        await deactivateXeroConnection(connection.id);
        console.log(
          `[Connection Cleanup] Deactivated expired connection ${connection.id} (tenant: ${connection.tenantName})`
        );
      }
      continue;
    }

    // Check for stale connections (90+ days without API calls)
    if (connection.lastApiCallAt) {
      const lastApiCallAge = Math.floor(
        (now.getTime() - new Date(connection.lastApiCallAt).getTime()) /
          (24 * 60 * 60 * 1000)
      );

      if (lastApiCallAge >= 90) {
        stale.push(connection.id);
        if (!dryRun) {
          await updateXeroConnectionStatus(connection.id, {
            connectionStatus: "disconnected",
            lastError:
              "Connection marked as inactive due to 90+ days of inactivity",
          });
          console.log(
            `[Connection Cleanup] Marked stale connection ${connection.id} as disconnected (tenant: ${connection.tenantName}, ${lastApiCallAge} days inactive)`
          );
        }
      }
    }
  }

  return {
    expiredCount: expired.length,
    staleCount: stale.length,
    expired,
    stale,
  };
}

/**
 * Validate a connection against Xero's /connections endpoint
 * Xero best practice: Verify connection status before critical operations
 *
 * This ensures the connection still exists in Xero and hasn't been revoked by the user
 */
export async function validateConnectionWithXero(
  connectionId: string
): Promise<{
  isValid: boolean;
  exists: boolean;
  error?: string;
  xeroConnectionId?: string;
  updatedDateUtc?: string;
}> {
  try {
    const connection = await getAllActiveXeroConnections().then((conns) =>
      conns.find((c) => c.id === connectionId)
    );

    if (!connection) {
      return {
        isValid: false,
        exists: false,
        error: "Connection not found in database",
      };
    }

    const accessToken = decryptToken(connection.accessToken);

    // Call Xero /connections endpoint
    const response = await fetch("https://api.xero.com/connections", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        isValid: false,
        exists: false,
        error: `Xero API error: ${response.status} ${response.statusText}`,
      };
    }

    const connections = await response.json();

    // Find this tenant in the connections
    const xeroConnection = connections.find(
      (c: any) => c.tenantId === connection.tenantId
    );

    if (!xeroConnection) {
      return {
        isValid: false,
        exists: false,
        error: "Connection not found in Xero (may have been disconnected)",
      };
    }

    return {
      isValid: true,
      exists: true,
      xeroConnectionId: xeroConnection.id,
      updatedDateUtc: xeroConnection.updatedDateUtc,
    };
  } catch (error) {
    return {
      isValid: false,
      exists: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error validating connection",
    };
  }
}
