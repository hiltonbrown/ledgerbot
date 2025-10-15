"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PERIODS = [
	{ value: "7d", label: "Last 7 days" },
	{ value: "30d", label: "Last 30 days" },
	{ value: "90d", label: "Last 90 days" },
	{ value: "all", label: "All time" },
] as const;

export function UsagePeriodSelector() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const currentPeriod = searchParams.get("period") ?? "30d";

	const handlePeriodChange = (period: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("period", period);
		router.push(`${pathname}?${params.toString()}`);
	};

	return (
		<div className="flex flex-wrap items-center gap-2">
			{PERIODS.map((period) => (
				<Button
					key={period.value}
					className={cn(
						"transition-colors",
						currentPeriod === period.value &&
							"bg-primary text-primary-foreground hover:bg-primary/90",
					)}
					onClick={() => handlePeriodChange(period.value)}
					size="sm"
					type="button"
					variant={currentPeriod === period.value ? "default" : "outline"}
				>
					{period.label}
				</Button>
			))}
		</div>
	);
}
