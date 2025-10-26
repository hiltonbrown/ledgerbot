"use client";

import {
  BarChart3,
  Calculator,
  FileText,
  MessageSquare,
  Network,
  Scale,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  AgentConfigCard,
  SettingRow,
} from "@/components/settings/agent-config-card";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function AgentSettingsPage() {
  const [systemEnabled, setSystemEnabled] = useState(false);

  // Document-Processing Agent state
  const [docProcessingEnabled, setDocProcessingEnabled] = useState(true);
  const [ocrQuality, setOcrQuality] = useState("medium");
  const [autoValidation, setAutoValidation] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState("85");
  const [humanReviewThreshold, setHumanReviewThreshold] = useState("60");
  const [supportedDocTypes, setSupportedDocTypes] = useState({
    invoices: true,
    receipts: true,
    statements: true,
    bills: false,
  });

  // Reconciliation Agent state
  const [reconciliationEnabled, setReconciliationEnabled] = useState(true);
  const [fuzzySensitivity, setFuzzySensitivity] = useState("75");
  const [autoApproveThreshold, setAutoApproveThreshold] = useState("95");
  const [maxDiscrepancy, setMaxDiscrepancy] = useState("10.00");
  const [notifications, setNotifications] = useState({
    mismatches: true,
    resolved: false,
    requiresReview: true,
  });

  // Tax and Compliance Agent state
  const [taxComplianceEnabled, setTaxComplianceEnabled] = useState(true);
  const [jurisdiction, setJurisdiction] = useState<string[]>(["nsw"]);
  const [complianceTypes, setComplianceTypes] = useState({
    gst: true,
    superannuation: true,
    payg: true,
    fbt: false,
    payrollTax: false,
  });
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [requireHumanAudit, setRequireHumanAudit] = useState(true);

  // Reporting and Analytics Agent state
  const [reportingEnabled, setReportingEnabled] = useState(true);
  const [reportTypes, setReportTypes] = useState({
    profitLoss: true,
    balanceSheet: true,
    cashFlow: true,
    kpiDashboard: false,
  });
  const [reportSchedule, setReportSchedule] = useState("monthly");
  const [reportFormat, setReportFormat] = useState("pdf");
  const [includeCommentary, setIncludeCommentary] = useState(true);

  // Forecasting and Budgeting Agent state
  const [forecastingEnabled, setForecastingEnabled] = useState(false);
  const [forecastHorizon, setForecastHorizon] = useState("6");
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);
  const [scenarioTypes, setScenarioTypes] = useState({
    bestCase: true,
    worstCase: true,
    likelyCase: true,
  });
  const [historicalRange, setHistoricalRange] = useState("24");

  // Advisory and Q&A Agent state
  const [advisoryEnabled, setAdvisoryEnabled] = useState(true);
  const [responseConfidence, setResponseConfidence] = useState("70");
  const [hallucinationPrevention, setHallucinationPrevention] =
    useState("balanced");
  const [knowledgeBase, setKnowledgeBase] = useState("default");
  const [humanEscalation, setHumanEscalation] = useState(true);

  // Workflow Orchestration Agent state
  const [orchestrationEnabled, setOrchestrationEnabled] = useState(true);
  const [maxConcurrentAgents, setMaxConcurrentAgents] = useState("3");
  const [timeoutDuration, setTimeoutDuration] = useState("60");
  const [loggingLevel, setLoggingLevel] = useState("info");
  const [fallbackBehavior, setFallbackBehavior] = useState("retry");

  const handleSaveChanges = () => {
    // Placeholder for save functionality
    console.log("Saving agent configurations...");
  };

  return (
    <div className="space-y-8">
      <SettingsSection
        actions={
          <Button onClick={handleSaveChanges} size="sm">
            Save changes
          </Button>
        }
        description="Configure specialized LangChain agents to automate bookkeeping workflows and provide intelligent assistance."
        title="Agent configuration"
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm uppercase tracking-wide">
                Agent workspaces
              </h3>
              <p className="text-muted-foreground text-sm">
                Explore dedicated operational consoles for documents,
                reconciliation, compliance, analytics and more.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link href="/agents">Open agent workspaces</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/agents/docmanagement">View document intake</Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label
                className="font-semibold text-base"
                htmlFor="system-enabled"
              >
                Agent system
              </Label>
              <p className="text-muted-foreground text-sm">
                Master control for all AI agents in the system
              </p>
            </div>
            <Switch
              checked={systemEnabled}
              id="system-enabled"
              onCheckedChange={setSystemEnabled}
            />
          </div>

          {/* Document-Processing Agent */}
          <AgentConfigCard
            agent={{
              id: "document-processing",
              name: "Document-Processing Agent",
              description:
                "Automates ingestion, OCR, and validation for invoices, receipts, and other financial paperwork.",
              enabled: docProcessingEnabled,
              icon: <FileText className="h-5 w-5" />,
            }}
            onEnabledChange={setDocProcessingEnabled}
            onReset={() => {
              setOcrQuality("medium");
              setAutoValidation(true);
              setConfidenceThreshold("85");
              setHumanReviewThreshold("60");
            }}
          >
            <SettingRow
              description="Quality level for optical character recognition"
              label="OCR quality"
            >
              <Select onValueChange={setOcrQuality} value={ocrQuality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (fast)</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High (accurate)</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow label="Supported document types">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-sm" htmlFor="doc-invoices">
                    Invoices
                  </Label>
                  <Switch
                    checked={supportedDocTypes.invoices}
                    id="doc-invoices"
                    onCheckedChange={(checked) =>
                      setSupportedDocTypes((prev) => ({
                        ...prev,
                        invoices: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-sm" htmlFor="doc-receipts">
                    Receipts
                  </Label>
                  <Switch
                    checked={supportedDocTypes.receipts}
                    id="doc-receipts"
                    onCheckedChange={(checked) =>
                      setSupportedDocTypes((prev) => ({
                        ...prev,
                        receipts: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="doc-statements"
                  >
                    Bank statements
                  </Label>
                  <Switch
                    checked={supportedDocTypes.statements}
                    id="doc-statements"
                    onCheckedChange={(checked) =>
                      setSupportedDocTypes((prev) => ({
                        ...prev,
                        statements: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-sm" htmlFor="doc-bills">
                    Bills
                  </Label>
                  <Switch
                    checked={supportedDocTypes.bills}
                    id="doc-bills"
                    onCheckedChange={(checked) =>
                      setSupportedDocTypes((prev) => ({
                        ...prev,
                        bills: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </SettingRow>

            <SettingRow
              description="Automatically validate extracted data"
              label="Auto-validation"
            >
              <Switch
                checked={autoValidation}
                onCheckedChange={setAutoValidation}
              />
            </SettingRow>

            <SettingRow
              description="Minimum confidence for auto-processing (0-100%)"
              label="Confidence threshold"
            >
              <Input
                max="100"
                min="0"
                onChange={(e) => setConfidenceThreshold(e.target.value)}
                type="number"
                value={confidenceThreshold}
              />
            </SettingRow>

            <SettingRow
              description="Threshold for requiring human review (0-100%)"
              label="Human review threshold"
            >
              <Input
                max="100"
                min="0"
                onChange={(e) => setHumanReviewThreshold(e.target.value)}
                type="number"
                value={humanReviewThreshold}
              />
            </SettingRow>
          </AgentConfigCard>

          {/* Reconciliation Agent */}
          <AgentConfigCard
            agent={{
              id: "reconciliation",
              name: "Reconciliation Agent",
              description:
                "Matches bank feeds with ledger activity to highlight mismatches that need review.",
              enabled: reconciliationEnabled,
              icon: <Calculator className="h-5 w-5" />,
            }}
            onEnabledChange={setReconciliationEnabled}
            onReset={() => {
              setFuzzySensitivity("75");
              setAutoApproveThreshold("95");
              setMaxDiscrepancy("10.00");
            }}
          >
            <SettingRow
              description="Sensitivity for fuzzy matching (0-100%)"
              label="Fuzzy matching sensitivity"
            >
              <Input
                max="100"
                min="0"
                onChange={(e) => setFuzzySensitivity(e.target.value)}
                type="number"
                value={fuzzySensitivity}
              />
            </SettingRow>

            <SettingRow
              description="Auto-approve matches above this confidence (0-100%)"
              label="Auto-approve threshold"
            >
              <Input
                max="100"
                min="0"
                onChange={(e) => setAutoApproveThreshold(e.target.value)}
                type="number"
                value={autoApproveThreshold}
              />
            </SettingRow>

            <SettingRow
              description="Maximum discrepancy amount (AUD)"
              label="Max discrepancy"
            >
              <Input
                min="0"
                onChange={(e) => setMaxDiscrepancy(e.target.value)}
                step="0.01"
                type="number"
                value={maxDiscrepancy}
              />
            </SettingRow>

            <SettingRow label="Notification settings">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="notif-mismatches"
                  >
                    Mismatches found
                  </Label>
                  <Switch
                    checked={notifications.mismatches}
                    id="notif-mismatches"
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({
                        ...prev,
                        mismatches: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="notif-resolved"
                  >
                    Mismatches resolved
                  </Label>
                  <Switch
                    checked={notifications.resolved}
                    id="notif-resolved"
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({
                        ...prev,
                        resolved: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-sm" htmlFor="notif-review">
                    Requires review
                  </Label>
                  <Switch
                    checked={notifications.requiresReview}
                    id="notif-review"
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({
                        ...prev,
                        requiresReview: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </SettingRow>
          </AgentConfigCard>

          {/* Tax and Compliance Agent */}
          <AgentConfigCard
            agent={{
              id: "tax-compliance",
              name: "Tax and Compliance Agent",
              description:
                "Provides guidance on GST, superannuation, tax law, reporting deadlines, and compliance obligations.",
              enabled: taxComplianceEnabled,
              icon: <Scale className="h-5 w-5" />,
            }}
            onEnabledChange={setTaxComplianceEnabled}
            onReset={() => {
              setJurisdiction(["nsw"]);
              setShowDisclaimer(true);
              setRequireHumanAudit(true);
            }}
          >
            <SettingRow
              description="Australian states and territories for payroll tax"
              label="Payroll Tax"
            >
              <MultiSelect
                onChange={setJurisdiction}
                options={[
                  { label: "New South Wales", value: "nsw" },
                  { label: "Victoria", value: "vic" },
                  { label: "Queensland", value: "qld" },
                  { label: "South Australia", value: "sa" },
                  { label: "Western Australia", value: "wa" },
                  { label: "Tasmania", value: "tas" },
                  { label: "Northern Territory", value: "nt" },
                  { label: "Australian Capital Territory", value: "act" },
                ]}
                placeholder="Select states/territories..."
                selected={jurisdiction}
              />
            </SettingRow>

            <SettingRow label="Compliance types">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="compliance-gst"
                  >
                    GST
                  </Label>
                  <Switch
                    checked={complianceTypes.gst}
                    id="compliance-gst"
                    onCheckedChange={(checked) =>
                      setComplianceTypes((prev) => ({ ...prev, gst: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="compliance-super"
                  >
                    Superannuation
                  </Label>
                  <Switch
                    checked={complianceTypes.superannuation}
                    id="compliance-super"
                    onCheckedChange={(checked) =>
                      setComplianceTypes((prev) => ({
                        ...prev,
                        superannuation: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="compliance-payg"
                  >
                    PAYG withholding
                  </Label>
                  <Switch
                    checked={complianceTypes.payg}
                    id="compliance-payg"
                    onCheckedChange={(checked) =>
                      setComplianceTypes((prev) => ({
                        ...prev,
                        payg: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="compliance-fbt"
                  >
                    Fringe Benefits Tax
                  </Label>
                  <Switch
                    checked={complianceTypes.fbt}
                    id="compliance-fbt"
                    onCheckedChange={(checked) =>
                      setComplianceTypes((prev) => ({ ...prev, fbt: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="compliance-payroll-tax"
                  >
                    Payroll Tax
                  </Label>
                  <Switch
                    checked={complianceTypes.payrollTax}
                    id="compliance-payroll-tax"
                    onCheckedChange={(checked) =>
                      setComplianceTypes((prev) => ({
                        ...prev,
                        payrollTax: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </SettingRow>

            <SettingRow
              description="Show legal disclaimer with advice"
              label="Display disclaimer"
            >
              <Switch
                checked={showDisclaimer}
                onCheckedChange={setShowDisclaimer}
              />
            </SettingRow>

            <SettingRow
              description="Require human audit for critical advice"
              label="Human audit required"
            >
              <Switch
                checked={requireHumanAudit}
                onCheckedChange={setRequireHumanAudit}
              />
            </SettingRow>
          </AgentConfigCard>

          {/* Reporting and Analytics Agent */}
          <AgentConfigCard
            agent={{
              id: "reporting-analytics",
              name: "Reporting and Analytics Agent",
              description:
                "Generates financial statements and dashboards to keep stakeholders informed.",
              enabled: reportingEnabled,
              icon: <BarChart3 className="h-5 w-5" />,
            }}
            onEnabledChange={setReportingEnabled}
            onReset={() => {
              setReportSchedule("monthly");
              setReportFormat("pdf");
              setIncludeCommentary(true);
            }}
          >
            <SettingRow label="Report types">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-sm" htmlFor="report-pl">
                    Profit & Loss
                  </Label>
                  <Switch
                    checked={reportTypes.profitLoss}
                    id="report-pl"
                    onCheckedChange={(checked) =>
                      setReportTypes((prev) => ({
                        ...prev,
                        profitLoss: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-sm" htmlFor="report-bs">
                    Balance Sheet
                  </Label>
                  <Switch
                    checked={reportTypes.balanceSheet}
                    id="report-bs"
                    onCheckedChange={(checked) =>
                      setReportTypes((prev) => ({
                        ...prev,
                        balanceSheet: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-sm" htmlFor="report-cf">
                    Cash Flow
                  </Label>
                  <Switch
                    checked={reportTypes.cashFlow}
                    id="report-cf"
                    onCheckedChange={(checked) =>
                      setReportTypes((prev) => ({
                        ...prev,
                        cashFlow: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-sm" htmlFor="report-kpi">
                    KPI Dashboard
                  </Label>
                  <Switch
                    checked={reportTypes.kpiDashboard}
                    id="report-kpi"
                    onCheckedChange={(checked) =>
                      setReportTypes((prev) => ({
                        ...prev,
                        kpiDashboard: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </SettingRow>

            <SettingRow
              description="Auto-generation frequency"
              label="Report schedule"
            >
              <Select onValueChange={setReportSchedule} value={reportSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow
              description="Default export format"
              label="Report format"
            >
              <Select onValueChange={setReportFormat} value={reportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow
              description="Include AI-generated commentary and insights"
              label="Include commentary"
            >
              <Switch
                checked={includeCommentary}
                onCheckedChange={setIncludeCommentary}
              />
            </SettingRow>
          </AgentConfigCard>

          {/* Forecasting and Budgeting Agent */}
          <AgentConfigCard
            agent={{
              id: "forecasting-budgeting",
              name: "Forecasting and Budgeting Agent",
              description:
                "Builds forward-looking cash flow and budget scenarios from historical performance.",
              enabled: forecastingEnabled,
              icon: <TrendingUp className="h-5 w-5" />,
            }}
            onEnabledChange={setForecastingEnabled}
            onReset={() => {
              setForecastHorizon("6");
              setShowConfidenceInterval(true);
              setHistoricalRange("24");
            }}
          >
            <SettingRow
              description="Forecast period in months (1-12)"
              label="Forecast horizon"
            >
              <Input
                max="12"
                min="1"
                onChange={(e) => setForecastHorizon(e.target.value)}
                type="number"
                value={forecastHorizon}
              />
            </SettingRow>

            <SettingRow
              description="Show confidence intervals in forecasts"
              label="Confidence intervals"
            >
              <Switch
                checked={showConfidenceInterval}
                onCheckedChange={setShowConfidenceInterval}
              />
            </SettingRow>

            <SettingRow label="Scenario types">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="scenario-best"
                  >
                    Best case
                  </Label>
                  <Switch
                    checked={scenarioTypes.bestCase}
                    id="scenario-best"
                    onCheckedChange={(checked) =>
                      setScenarioTypes((prev) => ({
                        ...prev,
                        bestCase: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="scenario-worst"
                  >
                    Worst case
                  </Label>
                  <Switch
                    checked={scenarioTypes.worstCase}
                    id="scenario-worst"
                    onCheckedChange={(checked) =>
                      setScenarioTypes((prev) => ({
                        ...prev,
                        worstCase: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="scenario-likely"
                  >
                    Most likely
                  </Label>
                  <Switch
                    checked={scenarioTypes.likelyCase}
                    id="scenario-likely"
                    onCheckedChange={(checked) =>
                      setScenarioTypes((prev) => ({
                        ...prev,
                        likelyCase: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </SettingRow>

            <SettingRow
              description="Historical data range in months"
              label="Historical range"
            >
              <Input
                max="60"
                min="6"
                onChange={(e) => setHistoricalRange(e.target.value)}
                type="number"
                value={historicalRange}
              />
            </SettingRow>
          </AgentConfigCard>

          {/* Advisory and Q&A Agent */}
          <AgentConfigCard
            agent={{
              id: "advisory-qa",
              name: "Advisory and Q&A Agent",
              description:
                "Regulatory-aware conversational assistant for Australian tax law, Fair Work awards, and compliance queries with citations and confidence scoring.",
              enabled: advisoryEnabled,
              icon: <MessageSquare className="h-5 w-5" />,
            }}
            onEnabledChange={setAdvisoryEnabled}
            onReset={() => {
              setResponseConfidence("70");
              setHallucinationPrevention("balanced");
              setKnowledgeBase("default");
              setHumanEscalation(true);
            }}
          >
            <SettingRow
              description="Minimum confidence for responses (0-100%)"
              label="Response confidence threshold"
            >
              <Input
                max="100"
                min="0"
                onChange={(e) => setResponseConfidence(e.target.value)}
                type="number"
                value={responseConfidence}
              />
            </SettingRow>

            <SettingRow
              description="Balance between safety and flexibility"
              label="Hallucination prevention"
            >
              <Select
                onValueChange={setHallucinationPrevention}
                value={hallucinationPrevention}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">
                    Conservative (safest)
                  </SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="aggressive">
                    Aggressive (most flexible)
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow
              description="Regulatory knowledge base sources"
              label="Knowledge base"
            >
              <Select onValueChange={setKnowledgeBase} value={knowledgeBase}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    All regulatory sources
                  </SelectItem>
                  <SelectItem value="australian-tax">
                    ATO tax rulings only
                  </SelectItem>
                  <SelectItem value="australian-employment">
                    Fair Work awards only
                  </SelectItem>
                  <SelectItem value="state-payroll">
                    State payroll tax only
                  </SelectItem>
                  <SelectItem value="custom">Custom documents</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow label="Regulatory source categories">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="kb-fair-work"
                  >
                    Fair Work awards
                  </Label>
                  <Switch
                    checked
                    disabled
                    id="kb-fair-work"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="kb-ato"
                  >
                    ATO tax rulings
                  </Label>
                  <Switch
                    checked
                    disabled
                    id="kb-ato"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="font-normal text-sm"
                    htmlFor="kb-payroll"
                  >
                    State payroll tax
                  </Label>
                  <Switch
                    checked
                    disabled
                    id="kb-payroll"
                  />
                </div>
              </div>
            </SettingRow>

            <SettingRow
              description="Show regulatory citations with responses"
              label="Display citations"
            >
              <Switch
                checked
                disabled
              />
            </SettingRow>

            <SettingRow
              description="Escalate low-confidence queries to human experts"
              label="Human escalation"
            >
              <Switch
                checked={humanEscalation}
                onCheckedChange={setHumanEscalation}
              />
            </SettingRow>
          </AgentConfigCard>

          {/* Workflow Orchestration Agent */}
          <AgentConfigCard
            agent={{
              id: "workflow-orchestration",
              name: "Workflow Orchestration Agent",
              description:
                "Manages task routing and coordination across all agents in the system.",
              enabled: orchestrationEnabled,
              icon: <Network className="h-5 w-5" />,
            }}
            onEnabledChange={setOrchestrationEnabled}
            onReset={() => {
              setMaxConcurrentAgents("3");
              setTimeoutDuration("60");
              setLoggingLevel("info");
              setFallbackBehavior("retry");
            }}
          >
            <SettingRow
              description="Maximum agents running simultaneously"
              label="Max concurrent agents"
            >
              <Input
                max="10"
                min="1"
                onChange={(e) => setMaxConcurrentAgents(e.target.value)}
                type="number"
                value={maxConcurrentAgents}
              />
            </SettingRow>

            <SettingRow
              description="Agent timeout in seconds"
              label="Timeout duration"
            >
              <Input
                max="300"
                min="10"
                onChange={(e) => setTimeoutDuration(e.target.value)}
                type="number"
                value={timeoutDuration}
              />
            </SettingRow>

            <SettingRow
              description="System logging verbosity"
              label="Logging level"
            >
              <Select onValueChange={setLoggingLevel} value={loggingLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug (verbose)</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error (minimal)</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow
              description="Behavior when an agent fails"
              label="Fallback behavior"
            >
              <Select
                onValueChange={setFallbackBehavior}
                value={fallbackBehavior}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retry">Retry once</SelectItem>
                  <SelectItem value="retry-multiple">
                    Retry multiple times
                  </SelectItem>
                  <SelectItem value="skip">Skip and continue</SelectItem>
                  <SelectItem value="fail">Fail immediately</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </AgentConfigCard>
        </div>
      </SettingsSection>
    </div>
  );
}
