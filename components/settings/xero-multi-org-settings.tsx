"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Star, Trash2 } from "lucide-react";

export interface XeroConnectionSummary {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantType?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  expiresAt: Date;
  displayOrder?: number | null;
}

interface XeroMultiOrgSettingsProps {
  connections: XeroConnectionSummary[];
  multiOrgMode: boolean;
  onToggleMultiOrg: (enabled: boolean) => Promise<void>;
  onSetPrimary: (tenantId: string) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
}

export function XeroMultiOrgSettings({
  connections,
  multiOrgMode,
  onToggleMultiOrg,
  onSetPrimary,
  onDisconnect,
}: XeroMultiOrgSettingsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleMultiOrg = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      await onToggleMultiOrg(enabled);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetPrimary = async (tenantId: string) => {
    setIsUpdating(true);
    try {
      await onSetPrimary(tenantId);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect this organisation? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsUpdating(true);
    try {
      await onDisconnect(connectionId);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Multi-organisation mode</CardTitle>
          <CardDescription>
            Enable advanced features for working with multiple Xero organisations
            at the same time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="multi-org-mode">Enable multi-org mode</Label>
              <p className="text-sm text-muted-foreground">
                Access data from multiple organisations in a single conversation.
              </p>
            </div>
            <Switch
              id="multi-org-mode"
              checked={multiOrgMode}
              onCheckedChange={handleToggleMultiOrg}
              disabled={isUpdating || connections.length < 2}
            />
          </div>
          {connections.length < 2 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Connect at least two organisations to enable multi-org mode.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected organisations</CardTitle>
          <CardDescription>
            Manage your connected Xero organisations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{connection.tenantName}</p>
                      {connection.isPrimary ? (
                        <Badge className="text-xs">
                          <Star className="mr-1 h-3 w-3" /> Primary
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {connection.tenantType ?? "Organisation"} • Expires{" "}
                      {new Date(connection.expiresAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!connection.isPrimary ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSetPrimary(connection.tenantId)}
                      disabled={isUpdating}
                    >
                      Set as primary
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDisconnect(connection.id)}
                    disabled={isUpdating || connections.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
