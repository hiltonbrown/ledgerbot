import type { TokenUsageSummary } from "@/app/(settings)/api/usage/data";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function formatNumber(num: number): string {
	return num.toLocaleString();
}

function formatCost(cost: number): string {
	return `$${cost.toFixed(4)}`;
}

function formatPercentage(value: number, total: number): number {
	if (total === 0) return 0;
	return Math.round((value / total) * 100);
}

export function TokenUsageSummaryCards({
	summary,
}: {
	summary: TokenUsageSummary;
}) {
	const mostUsedModel =
		summary.byModel.length > 0 ? summary.byModel[0] : null;
	const avgCostPerRequest =
		summary.byModel.length > 0
			? summary.totalCost /
				summary.byModel.reduce((sum, m) => sum + m.requestCount, 0)
			: 0;

	const inputPercentage = formatPercentage(
		summary.totalInputTokens,
		summary.totalTokens,
	);
	const outputPercentage = formatPercentage(
		summary.totalOutputTokens,
		summary.totalTokens,
	);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<Card>
				<CardHeader>
					<CardDescription>Total Tokens</CardDescription>
					<CardTitle className="text-2xl">
						{formatNumber(summary.totalTokens)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-xs">
						Combined input and output tokens
					</p>
					<Progress className="mt-2" value={100} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardDescription>Input Tokens</CardDescription>
					<CardTitle className="text-2xl">
						{formatNumber(summary.totalInputTokens)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-xs">
						{inputPercentage}% of total tokens
					</p>
					<Progress className="mt-2" value={inputPercentage} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardDescription>Output Tokens</CardDescription>
					<CardTitle className="text-2xl">
						{formatNumber(summary.totalOutputTokens)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-xs">
						{outputPercentage}% of total tokens
					</p>
					<Progress className="mt-2" value={outputPercentage} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardDescription>Total Cost</CardDescription>
					<CardTitle className="text-2xl">
						{formatCost(summary.totalCost)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-xs">
						Aggregated across all models
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardDescription>Most Used Model</CardDescription>
					<CardTitle className="text-base">
						{mostUsedModel?.modelName ?? "No data"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{mostUsedModel ? (
						<>
							<p className="text-muted-foreground text-xs">
								{formatNumber(mostUsedModel.totalTokens)} tokens (
								{formatPercentage(
									mostUsedModel.totalTokens,
									summary.totalTokens,
								)}
								%)
							</p>
							<Progress
								className="mt-2"
								value={formatPercentage(
									mostUsedModel.totalTokens,
									summary.totalTokens,
								)}
							/>
						</>
					) : (
						<p className="text-muted-foreground text-xs">No usage data yet</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardDescription>Avg Cost per Request</CardDescription>
					<CardTitle className="text-2xl">
						{formatCost(avgCostPerRequest)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-xs">
						Based on all completed requests
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
