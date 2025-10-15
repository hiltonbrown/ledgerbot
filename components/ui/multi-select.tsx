"use client";

import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
	label: string;
	value: string;
};

type MultiSelectProps = {
	options: MultiSelectOption[];
	selected: string[];
	onChange: (selected: string[]) => void;
	placeholder?: string;
	className?: string;
};

export function MultiSelect({
	options,
	selected,
	onChange,
	placeholder = "Select items...",
	className,
}: MultiSelectProps) {
	const handleSelect = (value: string, checked: boolean) => {
		const newSelected = checked
			? [...selected, value]
			: selected.filter((item) => item !== value);
		onChange(newSelected);
	};

	const handleRemove = (value: string, e: React.MouseEvent) => {
		e.stopPropagation();
		onChange(selected.filter((item) => item !== value));
	};

	const selectedLabels = selected
		.map((value) => options.find((option) => option.value === value))
		.filter(Boolean);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className={cn(
						"h-auto min-h-10 w-full justify-between hover:bg-background",
						className,
					)}
					variant="outline"
				>
					<div className="flex flex-wrap gap-1">
						{selected.length > 0 ? (
							selectedLabels.map((option) => (
								<Badge
									className="mr-1"
									key={option?.value}
									variant="secondary"
								>
									{option?.label}
									<button
										className="ring-offset-background focus:ring-ring ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
										onClick={(e) => option && handleRemove(option.value, e)}
										type="button"
									>
										<X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
									</button>
								</Badge>
							))
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</div>
					<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
				{options.map((option) => (
					<DropdownMenuCheckboxItem
						checked={selected.includes(option.value)}
						key={option.value}
						onCheckedChange={(checked) => handleSelect(option.value, checked)}
					>
						{option.label}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
