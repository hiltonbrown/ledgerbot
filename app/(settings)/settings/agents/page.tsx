import { SettingsSection } from "@/components/settings/settings-section";

const plannedAgents = [
  {
    name: "Document-processing agent",
    summary:
      "Automates ingestion, OCR, and validation for invoices, receipts, and other financial paperwork.",
  },
  {
    name: "Reconciliation agent",
    summary:
      "Matches bank feeds with ledger activity to highlight mismatches that need review.",
  },
  {
    name: "Reporting & analytics agent",
    summary:
      "Generates financial statements and dashboards to keep stakeholders informed.",
  },
  {
    name: "Forecasting & budgeting agent",
    summary:
      "Builds forward-looking cash flow and budget scenarios from historical performance.",
  },
];

export default function AgentSettingsPage() {
  return (
    <div className="space-y-8">
      <SettingsSection
        description="Configure how specialised LedgerBot agents collaborate on bookkeeping workflows."
        title="Agent configuration"
      >
        <div className="space-y-6 text-sm text-muted-foreground">
          <p>
            Agent controls are coming soon. You&apos;ll be able to assign dedicated
            AI teammates to document processing, reconciliations, reporting, and
            more—without leaving the settings area.
          </p>
          <div className="space-y-3">
            <p className="font-medium text-foreground text-sm">Planned agents</p>
            <ul className="list-disc space-y-2 pl-5">
              {plannedAgents.map((agent) => (
                <li key={agent.name}>
                  <span className="font-medium text-foreground">{agent.name}:</span> {agent.summary}
                </li>
              ))}
            </ul>
          </div>
          <p>
            Have ideas or requirements? Share feedback with the LedgerBot team so
            we can prioritise the automations your workflow needs most.
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}
