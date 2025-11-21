"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Banknote, Clock, List } from "lucide-react";

export type FilterType = "all" | "high-risk" | "bank-changes" | "overdue";

interface APFilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts?: {
    all: number;
    highRisk: number;
    bankChanges: number;
    overdue: number;
  };
}

export function APFilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}: APFilterTabsProps) {
  const filters: Array<{
    id: FilterType;
    label: string;
    icon: typeof List;
    count?: number;
  }> = [
    { id: "all", label: "All", icon: List, count: counts?.all },
    {
      id: "high-risk",
      label: "High Risk",
      icon: AlertTriangle,
      count: counts?.highRisk,
    },
    {
      id: "bank-changes",
      label: "Bank Changes",
      icon: Banknote,
      count: counts?.bankChanges,
    },
    { id: "overdue", label: "Overdue", icon: Clock, count: counts?.overdue },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;

        return (
          <Button
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            {filter.label}
            {filter.count !== undefined && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 font-semibold text-xs ${
                  isActive ? "bg-white/20" : "bg-muted"
                }`}
              >
                {filter.count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
