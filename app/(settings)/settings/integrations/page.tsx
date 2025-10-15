import {
  type Integration,
  IntegrationCard,
} from "@/components/settings/integration-card";
import { SettingsSection } from "@/components/settings/settings-section";

export const dynamic = "force-dynamic";

const accountingIntegrations: Integration[] = [
  {
    id: "xero",
    name: "Xero",
    description:
      "Sync invoices, expenses, and bank transactions. Automate reconciliation and generate financial reports.",
    status: "connected",
    docsUrl: "https://developer.xero.com/documentation/",
  },
  {
    id: "myob",
    name: "MYOB Business",
    description:
      "Connect accounts payable and receivable. Import transactions and export journals seamlessly.",
    status: "available",
    docsUrl: "https://developer.myob.com/api/accountright/",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description:
      "Access chart of accounts, customers, and vendors. Create invoices and track payments in real-time.",
    status: "coming-soon",
    docsUrl: "https://developer.intuit.com/app/developer/qbo/docs/get-started",
  },
  {
    id: "zoho",
    name: "Zoho Books",
    description:
      "Manage estimates, bills, and purchase orders. Sync contacts and automate expense tracking workflows.",
    status: "coming-soon",
    docsUrl: "https://www.zoho.com/books/api/v3/",
  },
];

const payrollIntegrations: Integration[] = [
  {
    id: "employment-hero",
    name: "Employment Hero",
    description:
      "Sync employee data, timesheets, and leave balances. Automate payroll processing and superannuation.",
    status: "available",
    docsUrl: "https://developer.employmenthero.com/",
  },
  {
    id: "deputy",
    name: "Deputy",
    description:
      "Import rosters, timesheets, and attendance records. Export wage costs and labor compliance data.",
    status: "available",
    docsUrl: "https://developer.deputy.com/",
  },
  {
    id: "microkeeper",
    name: "Microkeeper",
    description:
      "Connect time and attendance systems. Sync payroll schedules and generate award interpretation reports.",
    status: "coming-soon",
    docsUrl: "https://microkeeper.com/",
  },
  {
    id: "rippling",
    name: "Rippling",
    description:
      "Integrate HR, IT, and payroll data. Automate onboarding workflows and benefits administration.",
    status: "coming-soon",
    docsUrl: "https://developer.rippling.com/",
  },
  {
    id: "tanda",
    name: "Tanda",
    description:
      "Sync workforce management and timesheets. Connect scheduling data and export payroll summaries.",
    status: "coming-soon",
    docsUrl: "https://my.tanda.co/api/v2/documentation",
  },
  {
    id: "deel",
    name: "Deel",
    description:
      "Manage global payroll and contractor payments. Automate compliance, invoicing, and international compensation.",
    status: "coming-soon",
    docsUrl: "https://developer.deel.com/",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <SettingsSection
        description="Connect your accounting software to sync financial data and automate workflows."
        title="Accounting"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {accountingIntegrations.map((integration) => (
            <IntegrationCard integration={integration} key={integration.id} />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        description="Integrate payroll and workforce management systems to streamline employee data and time tracking."
        title="Payroll"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {payrollIntegrations.map((integration) => (
            <IntegrationCard integration={integration} key={integration.id} />
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
