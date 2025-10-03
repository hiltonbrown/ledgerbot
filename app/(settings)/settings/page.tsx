import Link from "next/link";
import {
  type Integration,
  IntegrationCard,
} from "@/components/settings/integration-card";
import { SettingsSection } from "@/components/settings/settings-section";
import { UsageSummary as UsageSummaryComponent } from "@/components/settings/usage-summary";
import { Button } from "@/components/ui/button";
import { getFileSummary } from "../api/files/data";
import { getUsageSummary } from "../api/usage/data";
import { getUserSettings } from "../api/user/data";

const integrations: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    description:
      "Create channels, share message summaries, and push alerts to your workspace.",
    status: "connected",
    docsUrl: "https://api.slack.com/apps",
  },
  {
    id: "github",
    name: "GitHub",
    description:
      "Sync pull requests, triage issues, and review deployment history without leaving chat.",
    status: "available",
    docsUrl: "https://docs.github.com/en/rest",
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "Publish artifacts to documentation hubs and embed live dashboards.",
    status: "coming-soon",
    docsUrl: "https://developers.notion.com/",
  },
];

export default function SettingsPage() {
  const [userSettings, usageSummary, fileSummary] = [
    getUserSettings(),
    getUsageSummary(),
    getFileSummary(),
  ];

  const recentFiles = fileSummary.files.slice(0, 3);

  return (
    <div className="space-y-8">
      <SettingsSection
        actions={
          <Button asChild variant="outline">
            <Link href="/settings/user">Manage profile</Link>
          </Button>
        }
        description="Keep contact details current so teammates and billing contacts stay in sync."
        title="Account overview"
      >
        <dl className="grid gap-6 md:grid-cols-3">
          <div className="space-y-1">
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              Name
            </dt>
            <dd className="font-medium text-foreground text-sm">
              {userSettings.name}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              Email
            </dt>
            <dd className="font-medium text-foreground text-sm">
              {userSettings.email}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              Role
            </dt>
            <dd className="font-medium text-foreground text-sm">
              {userSettings.jobTitle}
            </dd>
          </div>
        </dl>
        <p className="text-muted-foreground text-sm">{userSettings.about}</p>
      </SettingsSection>

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
