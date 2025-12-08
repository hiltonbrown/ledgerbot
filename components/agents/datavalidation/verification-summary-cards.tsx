import { AlertTriangle, CheckCircle2, Users, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VerificationSummary } from "@/types/datavalidation";

interface VerificationSummaryCardsProps {
  summary: VerificationSummary;
}

export function VerificationSummaryCards({
  summary,
}: VerificationSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Total Contacts</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{summary.totalContacts}</div>
          <p className="text-muted-foreground text-xs">
            {summary.customers} customers, {summary.suppliers} suppliers
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Verified</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{summary.verified}</div>
          <p className="text-muted-foreground text-xs">
            {summary.totalContacts > 0
              ? Math.round((summary.verified / summary.totalContacts) * 100)
              : 0}
            % coverage
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Warnings</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{summary.warnings}</div>
          <p className="text-muted-foreground text-xs">Requires attention</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Errors</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{summary.errors}</div>
          <p className="text-muted-foreground text-xs">Invalid data detected</p>
        </CardContent>
      </Card>
    </div>
  );
}
