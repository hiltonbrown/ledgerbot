"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, Check } from "lucide-react";

export interface XeroOrganisationSummary {
  tenantId: string;
  tenantName: string;
  isPrimary: boolean;
  tenantType?: string | null;
}

interface OrganisationSelectorProps {
  organisations: XeroOrganisationSummary[];
  selectedTenantId?: string;
  onSelect: (tenantId: string) => void;
  className?: string;
}

export function OrganisationSelector({
  organisations,
  selectedTenantId,
  onSelect,
  className,
}: OrganisationSelectorProps) {
  const [current, setCurrent] = useState<string | undefined>(selectedTenantId);

  useEffect(() => {
    if (selectedTenantId !== undefined) {
      setCurrent(selectedTenantId);
    } else if (!current) {
      const primary = organisations.find((organisation) => organisation.isPrimary);
      if (primary) {
        setCurrent(primary.tenantId);
      }
    }
  }, [current, organisations, selectedTenantId]);

  if (organisations.length === 0) {
    return null;
  }

  if (organisations.length === 1) {
    const organisation = organisations[0];
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>{organisation.tenantName}</span>
      </div>
    );
  }

  return (
    <Select
      value={current}
      onValueChange={(value) => {
        setCurrent(value);
        onSelect(value);
      }}
    >
      <SelectTrigger className={cn("w-[240px]", className)}>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <SelectValue placeholder="Select organisation" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {organisations.map((organisation) => (
          <SelectItem key={organisation.tenantId} value={organisation.tenantId}>
            <div className="flex w-full items-center justify-between gap-2">
              <span>{organisation.tenantName}</span>
              {organisation.isPrimary ? (
                <Badge variant="secondary" className="text-xs">
                  Primary
                </Badge>
              ) : null}
              {current === organisation.tenantId ? (
                <Check className="h-4 w-4 text-primary" />
              ) : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
