"use client";

import { useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import type { TokenUsageByModel } from "@/app/(settings)/api/usage/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";

export function ModelComparisonChart({
	models,
}: {
	models: TokenUsageByModel[];
}) {
	const chartData = useMemo(
		() =>
			models.map((model) => ({
				model: model.modelName.split(" ").slice(0, 2).join(" "), // Shorten name
				inputTokens: model.inputTokens,
				outputTokens: model.outputTokens,
			})),
		[models],
	);

	const chartConfig = useMemo<ChartConfig>(
		() => ({
			inputTokens: {
				label: "Input Tokens",
				color: "hsl(var(--chart-1))",
			},
			outputTokens: {
				label: "Output Tokens",
				color: "hsl(var(--chart-2))",
			},
		}),
		[],
	);

	if (models.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base font-semibold">
						Model Comparison
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed">
						<p className="text-muted-foreground text-sm">
							No usage data available yet
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base font-semibold">
					Model Comparison
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer className="h-[320px]" config={chartConfig}>
					<ResponsiveContainer>
						<BarChart barSize={32} data={chartData}>
							<CartesianGrid strokeDasharray="4 4" vertical={false} />
							<XAxis
								axisLine={false}
								dataKey="model"
								tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
								tickLine={false}
							/>
							<YAxis
								axisLine={false}
								tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
								tickLine={false}
							/>
							<ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted) / 0.25)" }} />
							<ChartLegend
								align="right"
								content={<ChartLegendContent />}
								verticalAlign="top"
								wrapperStyle={{ paddingBottom: 12 }}
							/>
							<Bar
								dataKey="inputTokens"
								fill="var(--color-inputTokens)"
								radius={[0, 0, 0, 0]}
								stackId="tokens"
							/>
							<Bar
								dataKey="outputTokens"
								fill="var(--color-outputTokens)"
								radius={[6, 6, 0, 0]}
								stackId="tokens"
							/>
						</BarChart>
					</ResponsiveContainer>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
