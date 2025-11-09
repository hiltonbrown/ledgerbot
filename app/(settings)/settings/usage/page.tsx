import { format } from "date-fns";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ModelComparisonChart } from "@/components/settings/model-comparison-chart";
import { ModelTokenUsage } from "@/components/settings/model-token-usage";
import { SettingsSection } from "@/components/settings/settings-section";
import { TokenUsageChart } from "@/components/settings/token-usage-chart";
import { TokenUsageSummaryCards } from "@/components/settings/token-usage-summary-cards";
import { UsagePeriodSelector } from "@/components/settings/usage-period-selector";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getTokenUsageSummary } from "../../api/usage/data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function UsagePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const period = (searchParams.period ?? "30d") as "7d" | "30d" | "90d" | "all";

  // Get authenticated user
  const user = await getAuthUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-3xl">Token Usage Tracking</h1>
          <p className="text-muted-foreground">
            Track token usage, costs, and performance across AI models
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-semibold text-lg">Authentication Required</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Please sign in to view usage tracking
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch token usage data
  const tokenSummary = await getTokenUsageSummary(user.id, period);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-semibold text-3xl">Token Usage Tracking</h1>
          <p className="text-muted-foreground">
            Track token usage, costs, and performance across AI models
          </p>
        </div>
        <div className="shrink-0">
          <UsagePeriodSelector />
        </div>
      </div>

      {/* Billing Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="flex flex-col gap-1 text-xs sm:flex-row sm:gap-4">
            <p>
              <strong className="font-medium">Billing cycle:</strong>{" "}
              {tokenSummary.billingCycle}
            </p>
            <p>
              <strong className="font-medium">Last updated:</strong>{" "}
              {format(
                new Date(tokenSummary.lastUpdated),
                "MMM d, yyyy 'at' h:mm a"
              )}
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <SettingsSection title="Overview">
        <TokenUsageSummaryCards summary={tokenSummary} />
      </SettingsSection>

      {/* Usage Over Time Chart */}
      <TokenUsageChart timeseries={tokenSummary.timeseries} />

      {/* Model Breakdown */}
      <SettingsSection title="Usage by Model">
        <ModelTokenUsage models={tokenSummary.byModel} />
      </SettingsSection>

      {/* Model Comparison Chart */}
      <ModelComparisonChart models={tokenSummary.byModel} />
    </div>
  );
}
