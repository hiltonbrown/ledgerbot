"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export type Integration = {
  id: string;
  name: string;
  description: string;
  status: "connected" | "available" | "coming-soon";
  docsUrl: string;
};

export function IntegrationCard({ integration }: { integration: Integration }) {
  const [status, setStatus] = useState(integration.status);
  const isConnected = status === "connected";

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground text-base">{integration.name}</h3>
        <span
          className="border capitalize font-medium rounded-full px-2 py-1 text-muted-foreground text-xs"
        >
          {status.replace("-", " ")}
        </span>
      </div>
      <p className="text-muted-foreground text-sm">{integration.description}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button asChild type="button" variant="ghost">
          <a href={integration.docsUrl} rel="noreferrer" target="_blank">
            View docs
          </a>
        </Button>
        {status === "coming-soon" ? (
          <span className="text-muted-foreground text-xs">Coming soon</span>
        ) : (
          <Button
            onClick={() => setStatus(isConnected ? "available" : "connected")}
            type="button"
            variant={isConnected ? "destructive" : "default"}
          >
            {isConnected ? "Disconnect" : "Connect"}
          </Button>
        )}
      </div>
    </div>
  );
}
