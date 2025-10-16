"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Integration } from "./integration-card";

interface XeroIntegrationCardProps {
	integration: Integration;
	initialConnection: {
		tenantName: string;
		expiresAt: Date;
	} | null;
}

export function XeroIntegrationCard({
	integration,
	initialConnection,
}: XeroIntegrationCardProps) {
	const [isConnecting, setIsConnecting] = useState(false);
	const [isDisconnecting, setIsDisconnecting] = useState(false);
	const [connection, setConnection] = useState(initialConnection);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const isConnected = connection !== null;

	// Check for OAuth callback success/error
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const xeroStatus = params.get("xero");
		const errorParam = params.get("error");

		if (xeroStatus === "connected") {
			setSuccessMessage("Successfully connected to Xero!");
			// Clear URL params
			window.history.replaceState({}, "", window.location.pathname);
			// Refresh to get updated connection status
			window.location.reload();
		} else if (errorParam) {
			setError(`Connection failed: ${errorParam.replace(/_/g, " ")}`);
			// Clear URL params
			window.history.replaceState({}, "", window.location.pathname);
		}
	}, []);

	const handleConnect = async () => {
		setIsConnecting(true);
		setError(null);

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

		try {
			const response = await fetch("/api/xero/disconnect", {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to disconnect Xero");
			}

			setConnection(null);
		} catch (err) {
			console.error("Xero disconnection error:", err);
			setError(
				err instanceof Error ? err.message : "Failed to disconnect from Xero"
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
					{isConnected ? "connected" : "available"}
				</span>
			</div>
			<p className="text-muted-foreground text-sm">{integration.description}</p>

			{isConnected && connection && (
				<div className="rounded-md bg-muted/50 p-3 text-xs">
					<p className="font-medium text-foreground">
						Organisation: {connection.tenantName}
					</p>
					<p className="text-muted-foreground">
						Token expires: {new Date(connection.expiresAt).toLocaleDateString()}
					</p>
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
				<Button asChild type="button" variant="ghost">
					<a href={integration.docsUrl} rel="noreferrer" target="_blank">
						View docs
					</a>
				</Button>
				<Button
					disabled={isConnecting || isDisconnecting}
					onClick={isConnected ? handleDisconnect : handleConnect}
					type="button"
					variant={isConnected ? "destructive" : "default"}
				>
					{isConnecting
						? "Connecting..."
						: isDisconnecting
							? "Disconnecting..."
							: isConnected
								? "Disconnect"
								: "Connect"}
				</Button>
			</div>
		</div>
	);
}
