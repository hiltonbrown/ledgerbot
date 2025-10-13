import Link from "next/link";
import { CpuIcon, FileIcon, GlobeIcon, SparklesIcon } from "@/components/icons";
import {
  type Integration,
  IntegrationCard,
} from "@/components/settings/integration-card";
import { QuickActions } from "@/components/settings/quick-actions";
import { SettingsSection } from "@/components/settings/settings-section";
import { UsageSummary as UsageSummaryComponent } from "@/components/settings/usage-summary";
import { Button } from "@/components/ui/button";
import { getFileSummary } from "../api/files/data";
import { getUsageSummary } from "../api/usage/data";

const integrations: Integration[] = [
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

export default function SettingsPage() {
  const [usageSummary, fileSummary] = [getUsageSummary(), getFileSummary()];

  const recentFiles = fileSummary.files.slice(0, 3);

  const quickActions = [
    {
      label: "Customize AI Prompts",
      href: "/settings/personalisation",
      description: "Personalize system, code, and sheet generation prompts",
      icon: <SparklesIcon size={20} />,
    },
    {
      label: "View Usage Details",
      href: "/settings/usage",
      description: "Track AI token usage and conversation history",
      icon: <CpuIcon size={20} />,
    },
    {
      label: "Manage Files",
      href: "/settings/files",
      description: "View and manage uploaded files and storage",
      icon: <FileIcon size={20} />,
    },
    {
      label: "Configure Integrations",
      href: "/settings/integrations",
      description: "Connect accounting tools and third-party services",
      icon: <GlobeIcon size={20} />,
    },
  ];

  return (
    <div className="space-y-8">
      <QuickActions actions={quickActions} />

      <SettingsSection
        actions={
          <Button asChild variant="outline">
            <Link href="/settings/usage">View usage details</Link>
          </Button>
        }
        description="Track plan consumption to avoid surprises at renewal time."
        title="Usage snapshot"
      >
        <UsageSummaryComponent summary={usageSummary} />
      </SettingsSection>

      <SettingsSection
        actions={
          <Button asChild variant="outline">
            <Link href="/settings/files">Open file manager</Link>
          </Button>
        }
        description={`Using ${fileSummary.usage.used} GB of ${fileSummary.usage.capacity} GB storage.`}
        title="Recent files"
      >
        <ul className="space-y-2">
          {recentFiles.map((file) => (
            <li
              className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              key={file.id}
            >
              <div>
                <p className="font-medium text-foreground text-sm">
                  {file.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {file.type} • {file.size} • Uploaded{" "}
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {file.status}
              </span>
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection
        actions={
          <Button asChild variant="outline">
            <Link href="/settings/integrations">Manage integrations</Link>
          </Button>
        }
        description="Connect your favorite tools to automate handoffs and sync context."
        title="Integrations"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <IntegrationCard integration={integration} key={integration.id} />
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
