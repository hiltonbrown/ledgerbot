import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VerificationStatusBadgeProps {
  status: "verified" | "warnings" | "errors" | "pending";
  className?: string;
}

export function VerificationStatusBadge({
  status,
  className,
}: VerificationStatusBadgeProps) {
  switch (status) {
    case "verified":
      return (
        <Badge
          className={cn(
            "gap-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-50/80",
            className
          )}
          variant="outline"
        >
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </Badge>
      );
    case "warnings":
      return (
        <Badge
          className={cn(
            "gap-1 border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-50/80",
            className
          )}
          variant="outline"
        >
          <AlertTriangle className="h-3 w-3" />
          Warnings
        </Badge>
      );
    case "errors":
      return (
        <Badge
          className={cn(
            "gap-1 border-red-200 bg-red-50 text-red-700 hover:bg-red-50/80",
            className
          )}
          variant="outline"
        >
          <XCircle className="h-3 w-3" />
          Errors
        </Badge>
      );
    case "pending":
      return (
        <Badge
          className={cn("gap-1 text-muted-foreground", className)}
          variant="outline"
        >
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    default:
      return null;
  }
}

interface GSTStatusBadgeProps {
  registered: boolean;
  className?: string;
}

export function GSTStatusBadge({ registered, className }: GSTStatusBadgeProps) {
  if (registered) {
    return (
      <Badge
        className={cn(
          "gap-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-50/80",
          className
        )}
        variant="outline"
      >
        <span className="font-bold text-[10px]">GST</span>
      </Badge>
    );
  }
  return (
    <Badge
      className={cn(
        "gap-1 border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-50/80",
        className
      )}
      variant="outline"
    >
      <span className="font-bold text-[10px] line-through">GST</span>
    </Badge>
  );
}
