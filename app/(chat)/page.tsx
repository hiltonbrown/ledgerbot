import { and, desc, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArContextBanner } from "@/components/ar-context-banner";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { chatModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db, saveChatIfNotExists, saveMessages } from "@/lib/db/queries";
import { arContact, arInvoice } from "@/lib/db/schema/ar";
import {
  generateFollowUpContext,
  generateFollowUpRequest,
} from "@/lib/logic/ar-chat";
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
  const initialMessages: any[] = [];

  if (context === "ar_followup") {
    const customerId = params.customerId as string;
    const outstanding = Number(params.outstanding || 0);
    const riskScore = Number(params.riskScore || 0);

    // Fetch customer and invoice details from the database
    let customer = {
      name: "Customer",
      email: null as string | null,
      phone: null as string | null,
    };
    let invoices: Array<{
      number: string;
      issueDate: string;
      dueDate: string;
      total: string;
      amountDue: string;
      daysOverdue: number;
      currency: string;
    }> = [];

    if (customerId) {
      // Fetch contact details from AR tables
      const contact = await db.query.arContact.findFirst({
        where: and(
          eq(arContact.id, customerId),
          eq(arContact.userId, user.clerkId)
        ),
        columns: { name: true, email: true, phone: true },
      });

      if (contact) {
        customer = {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
        };

        // Fetch invoices for this contact
        const arInvoices = await db
          .select()
          .from(arInvoice)
          .where(
            and(
              eq(arInvoice.contactId, customerId),
              eq(arInvoice.userId, user.clerkId)
            )
          )
          .orderBy(desc(arInvoice.dueDate));

        // Filter to unpaid invoices and map to expected format
        invoices = arInvoices
          .filter((inv) => Number.parseFloat(inv.amountOutstanding) > 0)
          .map((inv) => ({
            number: inv.number,
            issueDate: inv.issueDate.toISOString(),
            dueDate: inv.dueDate.toISOString(),
            total: inv.total,
            amountDue: inv.amountOutstanding,
            daysOverdue: Math.max(
              0,
              Math.floor(
                (new Date().getTime() - inv.dueDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            ),
            currency: inv.currency || "AUD",
          }));
      }
    }

    const contextPrompt = generateFollowUpContext({
      customer,
      sender: {
        name: userSettings.name,
        companyName: userSettings.personalisation.companyName,
        email: userSettings.email,
        // Phone is not currently available in userSettings, but could be added if available
      },
      totalOutstanding: outstanding,
      riskScore,
      invoices,
    });

    // Create the chat first to satisfy foreign key constraint
    await saveChatIfNotExists({
      id,
      userId: user.id,
      title: `Follow-up: ${customer.name}`,
      visibility: "private",
    });

    // Save context as a system message to the database
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: generateUUID(),
          role: "system",
          content: contextPrompt,
          createdAt: new Date(),
          parts: [{ type: "text", text: contextPrompt }],
          attachments: [],
          confidence: null,
          citations: null,
          needsReview: null,
        },
      ],
    });

    autoSendInput = generateFollowUpRequest({
      customer,
      totalOutstanding: outstanding,
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
        initialMessages={initialMessages}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
        suggestions={suggestions}
      />
      <DataStreamHandler chatId={id} />
    </>
  );
}
