import {
  type Integration,
  IntegrationCard,
} from "@/components/settings/integration-card";
import { SettingsSection } from "@/components/settings/settings-section";

const integrations: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    description:
      "Sync channels for project updates and push AI-generated insights to team conversations.",
    status: "connected",
    docsUrl: "https://api.slack.com/apps",
  },
  {
    id: "github",
    name: "GitHub",
    description:
      "Automatically summarize pull requests and keep deployment history aligned with chat threads.",
    status: "available",
    docsUrl: "https://docs.github.com/en/rest",
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "Publish artifacts into shared documentation hubs and embed live status dashboards.",
    status: "coming-soon",
    docsUrl: "https://developers.notion.com/",
  },
  {
    id: "linear",
    name: "Linear",
    description:
      "Create issues, triage bugs, and subscribe to workflow events without context switching.",
    status: "available",
    docsUrl: "https://developers.linear.app/",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <SettingsSection
        description="Enable integrations per workspace to control access to external data sources."
        title="Integration settings"
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
