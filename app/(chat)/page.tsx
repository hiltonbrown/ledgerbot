import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArContextBanner } from "@/components/ar-context-banner";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { chatModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { arContact } from "@/lib/db/schema/ar";
import { generateFollowUpPrompt } from "@/lib/logic/ar-chat";
import { generateUUID } from "@/lib/utils";
import { getUserSettings } from "../(settings)/api/user/data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ searchParams }: PageProps) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const arContactId = params.ar_contact as string | undefined;
  const arContactName = params.ar_name as string | undefined;

  const id = generateUUID();
  const userSettings = await getUserSettings();
  let suggestions = userSettings.suggestions;
  const defaultModel = userSettings.personalisation.defaultModel;
  const defaultReasoning = userSettings.personalisation.defaultReasoning;

  // AR Follow-up Context
  const context = params.context as string | undefined;
  let autoSendInput: string | undefined;

  if (context === "ar_followup") {
    const customerId = params.customerId as string;
    const outstanding = Number(params.outstanding || 0);
    const riskScore = Number(params.riskScore || 0);

    // Fetch customer name if not provided (though it should be in params or we can fetch)
    let customerName = "Customer";
    if (customerId) {
      const contact = await db.query.arContact.findFirst({
        where: eq(arContact.id, customerId),
        columns: { name: true },
      });
      if (contact) {
        customerName = contact.name;
      }
    }

    autoSendInput = generateFollowUpPrompt({
      customerName,
      totalOutstanding: outstanding,
      riskScore,
    });
  }

  // Fetch AR context if parameters are present
  let arContext: {
    customer: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    };
    invoices: Array<{
      id: string;
      number: string;
      total: string;
      amountPaid: string;
      amountDue: string;
      daysOverdue: number;
    }>;
    summary: {
      totalOutstanding: number;
      invoiceCount: number;
      oldestInvoiceDays: number;
    };
  } | null = null;

  if (arContactId) {
    try {
      // Get host from headers for server-side fetch
      const headersList = await headers();
      const host = headersList.get("host") || "localhost:3000";
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const baseUrl = `${protocol}://${host}`;

      const response = await fetch(
        `${baseUrl}/api/agents/ar/customer/${arContactId}`,
        {
          headers: {
            Cookie: (await cookies()).toString(),
          },
        }
      );

      if (response.ok) {
        const fetchedContext = await response.json();
        arContext = fetchedContext;

        // Create AR-specific suggestions
        const arSuggestions = [
          {
            id: "ar-email-reminder",
            text: `Draft polite email reminders for ${arContactName || "customer"} regarding ${fetchedContext.summary.invoiceCount} overdue invoice${fetchedContext.summary.invoiceCount !== 1 ? "s" : ""} totaling $${fetchedContext.summary.totalOutstanding.toFixed(2)}`,
            enabled: true,
            order: 1,
          },
          {
            id: "ar-sms-reminder",
            text: `Draft SMS reminder for ${arContactName || "customer"} about the oldest invoice (${fetchedContext.summary.oldestInvoiceDays} days overdue)`,
            enabled: true,
            order: 2,
          },
          {
            id: "ar-call-script",
            text: `Create a call script for following up on overdue payments with ${arContactName || "customer"}`,
            enabled: true,
            order: 3,
          },
          {
            id: "ar-payment-plan",
            text: `Suggest a payment plan for ${arContactName || "customer"}'s outstanding balance of $${fetchedContext.summary.totalOutstanding.toFixed(2)}`,
            enabled: true,
            order: 4,
          },
        ];

        // Replace suggestions with AR-specific ones
        suggestions = arSuggestions;
      }
    } catch (error) {
      console.error("[AR Context] Failed to fetch customer data:", error);
    }
  }

  // Initialize model selector with user's AI preferences
  // Priority: 1) Valid cookie value, 2) User's default model, 3) System default
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const initialModelId = modelIdFromCookie?.value;
  const isValidModelId =
    initialModelId && chatModelIds.includes(initialModelId);

  // Use cookie model if valid, otherwise fall back to user's default model, then system default
  const selectedModel = isValidModelId
    ? initialModelId
    : defaultModel || DEFAULT_CHAT_MODEL;

  return (
    <>
      {arContext && (
        <div
          className="fixed right-0 left-0 z-40 px-4 pt-2"
          style={{ top: "var(--header-height, 4rem)" }}
        >
          <div className="mx-auto max-w-4xl">
            <ArContextBanner
              customer={arContext.customer}
              summary={arContext.summary}
            />
          </div>
        </div>
      )}
      <Chat
        autoResume={false}
        autoSendInput={autoSendInput}
        firstName={userSettings.personalisation.firstName}
        id={id}
        initialChatModel={selectedModel}
        initialDefaultReasoning={defaultReasoning}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
        suggestions={suggestions}
      />
      <DataStreamHandler chatId={id} />
    </>
  );
}
