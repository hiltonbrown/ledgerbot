import { Search } from "lucide-react";
import { Suspense } from "react";
import { ContactComparisonTable } from "@/components/agents/datavalidation/contact-comparison-table";
import { ContactDetailPanel } from "@/components/agents/datavalidation/contact-detail-panel";
import { VerificationSummaryCards } from "@/components/agents/datavalidation/verification-summary-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDashboardData, verifyContactAction } from "./actions";
import { ClientPage } from "./client-page"; // We'll move interactive parts to a client component

export const metadata = {
  title: "Data Validation Agent | LedgerBot",
  description:
    "Validate customer and supplier data against ABR and ASIC registries",
};

export default async function DataValidationPage() {
  // Initial data fetch
  const data = await getDashboardData();

  return (
    <div className="flex h-full flex-col space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-3xl tracking-tight">Data Validation</h2>
          <p className="text-muted-foreground">
            Verify contacts against ABR and ASIC registries to ensure
            compliance.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Sync button placeholder */}
          <Button variant="outline">Sync Contacts</Button>
          <Button>Run Bulk Verification</Button>
        </div>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <VerificationSummaryCards summary={data.stats} />
      </Suspense>

      <ClientPage initialData={data} />
    </div>
  );
}
