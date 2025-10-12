import { CheckCircleFillIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
};

export function StatusBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Default",
}: StatusBadgeProps) {
  return (
    <Badge className="gap-1.5" variant={active ? "default" : "secondary"}>
      {active ? <CheckCircleFillIcon size={12} /> : null}
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
