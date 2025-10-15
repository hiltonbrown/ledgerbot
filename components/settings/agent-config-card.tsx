"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export type AgentConfig = {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	icon?: ReactNode;
};

type AgentConfigCardProps = {
	agent: AgentConfig;
	onEnabledChange?: (enabled: boolean) => void;
	onReset?: () => void;
	children: ReactNode;
};

export function AgentConfigCard({
	agent,
	onEnabledChange,
	onReset,
	children,
}: AgentConfigCardProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [enabled, setEnabled] = useState(agent.enabled);

	const handleEnabledChange = (checked: boolean) => {
		setEnabled(checked);
		onEnabledChange?.(checked);
	};

	const handleReset = () => {
		onReset?.();
	};

	return (
		<Collapsible
			className="rounded-lg border bg-card"
			onOpenChange={setIsOpen}
			open={isOpen}
		>
			<div className="flex items-center justify-between gap-4 p-4">
				<div className="flex flex-1 items-center gap-3">
					{agent.icon ? (
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
							{agent.icon}
						</div>
					) : null}
					<div className="flex-1 space-y-1">
						<div className="flex items-center gap-2">
							<h3 className="font-semibold text-base">{agent.name}</h3>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Info className="h-4 w-4 text-muted-foreground" />
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">
										<p className="text-sm">{agent.description}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<p className="text-muted-foreground text-sm">
							{agent.description}
						</p>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-3">
					<div className="flex items-center gap-2">
						<Label className="text-sm" htmlFor={`${agent.id}-enabled`}>
							{enabled ? "Enabled" : "Disabled"}
						</Label>
						<Switch
							checked={enabled}
							id={`${agent.id}-enabled`}
							onCheckedChange={handleEnabledChange}
						/>
					</div>
					<CollapsibleTrigger asChild>
						<Button size="sm" type="button" variant="ghost">
							{isOpen ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
							<span className="sr-only">Toggle configuration</span>
						</Button>
					</CollapsibleTrigger>
				</div>
			</div>

			<CollapsibleContent>
				<div className="border-t p-4">
					<div className="space-y-6">
						{children}
						<div className="flex justify-end pt-4">
							<Button onClick={handleReset} size="sm" variant="outline">
								Reset to defaults
							</Button>
						</div>
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

type SettingRowProps = {
	label: string;
	description?: string;
	children: ReactNode;
};

export function SettingRow({ label, description, children }: SettingRowProps) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="space-y-0.5">
				<Label className="text-sm font-medium">{label}</Label>
				{description ? (
					<p className="text-muted-foreground text-xs">{description}</p>
				) : null}
			</div>
			<div className="sm:w-64">{children}</div>
		</div>
	);
}
