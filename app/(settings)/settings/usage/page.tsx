import { format } from "date-fns";
import { SettingsSection } from "@/components/settings/settings-section";
import { ModelComparisonChart } from "@/components/settings/model-comparison-chart";
import { ModelTokenUsage } from "@/components/settings/model-token-usage";
import { TokenUsageChart } from "@/components/settings/token-usage-chart";
import { TokenUsageSummaryCards } from "@/components/settings/token-usage-summary-cards";
import { UsagePeriodSelector } from "@/components/settings/usage-period-selector";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getTokenUsageSummary } from "../../api/usage/data";

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
			<div className="space-y-8">
				<SettingsSection
					description="Please sign in to view usage tracking"
					title="Usage tracking"
				>
					<p className="text-muted-foreground text-sm">
						Authentication required
					</p>
				</SettingsSection>
			</div>
		);
	}

	// Fetch token usage data
	const tokenSummary = await getTokenUsageSummary(user.id, period);

	return (
		<div className="space-y-8">
			{/* Header with Period Selector */}
			<SettingsSection
				actions={<UsagePeriodSelector />}
				description="Track token usage, costs, and performance across AI models"
				title="Token Usage Tracking"
			>
				<div className="space-y-2 text-muted-foreground text-sm">
					<p>
						Billing cycle: <span className="font-medium">{tokenSummary.billingCycle}</span>
					</p>
					<p>
						Last updated:{" "}
						<span className="font-medium">
							{format(new Date(tokenSummary.lastUpdated), "MMM d, yyyy 'at' h:mm a")}
						</span>
					</p>
				</div>
			</SettingsSection>

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
