"use client";

import { RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type { XeroAccount } from "@/lib/db/schema";
import { toast } from "../toast";

type ChartOfAccountsDisplayProps = {
  accounts: XeroAccount[];
  syncedAt: Date | null;
  organisationName?: string;
  onSync?: () => void;
  showSyncButton?: boolean;
  collapsible?: boolean;
  maxAccountsPreview?: number;
};

export function ChartOfAccountsDisplay({
  accounts,
  syncedAt,
  organisationName,
  onSync,
  showSyncButton = true,
  collapsible = false,
  maxAccountsPreview,
}: ChartOfAccountsDisplayProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      const response = await fetch("/api/xero/chart-of-accounts/sync", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to sync chart of accounts");
      }

      const data = await response.json();

      toast({
        type: "success",
        description: `Successfully synced ${data.accountCount} accounts`,
      });

      if (onSync) {
        onSync();
      }

      // Reload to update the display
      window.location.reload();
    } catch (error) {
      console.error("Error syncing chart of accounts:", error);
      toast({
        type: "error",
        description: "Failed to sync chart of accounts. Please try again.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter accounts based on search query
  const filteredAccounts = accounts.filter((account) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      (account.code || "").toLowerCase().includes(query) ||
      (account.name || "").toLowerCase().includes(query) ||
      account.type?.toLowerCase().includes(query) ||
      account._class?.toLowerCase().includes(query)
    );
  });

  // Group accounts by class
  const groupedAccounts = filteredAccounts.reduce(
    (acc, account) => {
      const accountClass = account._class || "OTHER";
      if (!acc[accountClass]) {
        acc[accountClass] = [];
      }
      acc[accountClass].push(account);
      return acc;
    },
    {} as Record<string, XeroAccount[]>
  );

  // Sort accounts within each group by code
  for (const key of Object.keys(groupedAccounts)) {
    groupedAccounts[key].sort((a, b) =>
      (a.code || "").localeCompare(b.code || "")
    );
  }

  // Class order for display
  const classOrder = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

  // Limit accounts for preview mode
  const displayAccounts = maxAccountsPreview
    ? filteredAccounts.slice(0, maxAccountsPreview)
    : filteredAccounts;

  const AccountList = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-medium text-sm">
              {filteredAccounts.length} account
              {filteredAccounts.length !== 1 ? "s" : ""}
            </p>
            {syncedAt && (
              <p className="text-muted-foreground text-xs">
                Last synced: {new Date(syncedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        {showSyncButton && (
          <Button
            disabled={isSyncing}
            onClick={handleSync}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by code, name, or type..."
          type="search"
          value={searchQuery}
        />
      </div>

      {/* Accounts grouped by class */}
      {maxAccountsPreview ? (
        // Preview mode - flat list
        <div className="space-y-1 rounded-md border p-4">
          {displayAccounts.map((account) => (
            <div
              className="flex items-center justify-between py-1 text-sm"
              key={account.accountID}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground text-xs">
                  {account.code}
                </span>
                <span>{account.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {account.type && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                    {account.type}
                  </span>
                )}
                {account.status === "ARCHIVED" && (
                  <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Archived
                  </span>
                )}
              </div>
            </div>
          ))}
          {maxAccountsPreview < filteredAccounts.length && (
            <p className="pt-2 text-center text-muted-foreground text-xs">
              +{filteredAccounts.length - maxAccountsPreview} more accounts
            </p>
          )}
        </div>
      ) : (
        // Full view - grouped by class
        <div className="space-y-4">
          {classOrder.map((accountClass) => {
            const classAccounts = groupedAccounts[accountClass];
            if (!classAccounts || classAccounts.length === 0) return null;

            return (
              <div className="rounded-md border" key={accountClass}>
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center justify-between bg-muted/50 p-3 text-left font-medium text-sm hover:bg-muted">
                    <span>
                      {accountClass}S ({classAccounts.length})
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="divide-y">
                      {classAccounts.map((account) => (
                        <div
                          className="flex items-center justify-between p-3"
                          key={account.accountID}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium font-mono text-sm">
                                {account.code}
                              </span>
                              <span className="text-sm">{account.name}</span>
                            </div>
                            {account.description && (
                              <span className="text-muted-foreground text-xs">
                                {account.description}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {account.type && (
                              <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground text-xs">
                                {account.type}
                              </span>
                            )}
                            {account.status === "ARCHIVED" && (
                              <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}

          {/* OTHER accounts if any */}
          {groupedAccounts.OTHER && groupedAccounts.OTHER.length > 0 && (
            <div className="rounded-md border">
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between bg-muted/50 p-3 text-left font-medium text-sm hover:bg-muted">
                  <span>OTHER ({groupedAccounts.OTHER.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="divide-y">
                    {groupedAccounts.OTHER.map((account) => (
                      <div
                        className="flex items-center justify-between p-3"
                        key={account.accountID}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono text-sm">
                            {account.code}
                          </span>
                          <span className="text-sm">{account.name}</span>
                        </div>
                        {account.type && (
                          <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground text-xs">
                            {account.type}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (collapsible) {
    return (
      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border bg-muted/30 p-4 text-left hover:bg-muted">
          <div>
            <h4 className="font-medium text-sm">Chart of Accounts</h4>
            {organisationName && (
              <p className="text-muted-foreground text-xs">
                {organisationName}
              </p>
            )}
          </div>
          <div className="text-right text-muted-foreground text-xs">
            {accounts.length} accounts
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <AccountList />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return <AccountList />;
}
