export type FollowUpTone = "polite" | "firm" | "final";

interface FollowUpParams {
  customerName: string;
  totalOutstanding: number;
  riskScore: number;
}

export function generateFollowUpPrompt({
  customerName,
  totalOutstanding,
  riskScore,
}: FollowUpParams): string {
  let tone: FollowUpTone = "polite";
  if (riskScore > 0.7) tone = "final";
  else if (riskScore > 0.3) tone = "firm";

  const amountStr = totalOutstanding.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });

  let prompt = `Draft a ${tone} follow-up email to ${customerName} regarding their outstanding balance of ${amountStr}.`;

  if (tone === "polite") {
    prompt += `\n\nContext: The customer has a low risk score (${riskScore.toFixed(2)}). Keep it friendly and helpful. Assume it might be an oversight.`;
  } else if (tone === "firm") {
    prompt += `\n\nContext: The customer has a medium risk score (${riskScore.toFixed(2)}). Be professional but firm. Request payment within 7 days.`;
  } else {
    prompt += `\n\nContext: The customer has a high risk score (${riskScore.toFixed(2)}). Use strong language requesting immediate settlement to avoid further action.`;
  }

  prompt +=
    "\n\nPlease include placeholders for specific Invoice Numbers and Due Dates as [Invoice Details].";

  return prompt;
}
