import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "../schema";

export const arContact = pgTable(
  "ArContact",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    externalRef: varchar("externalRef", { length: 255 }), // Xero contact ID
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ar_contact_user_id_idx").on(table.userId),
    externalRefIdx: index("ar_contact_external_ref_idx").on(table.externalRef),
  })
);

export type ArContact = InferSelectModel<typeof arContact>;
export type ArContactInsert = typeof arContact.$inferInsert;

export const arInvoice = pgTable(
  "ArInvoice",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    contactId: uuid("contactId")
      .notNull()
      .references(() => arContact.id),
    number: varchar("number", { length: 50 }).notNull(),
    issueDate: timestamp("issueDate").notNull(),
    dueDate: timestamp("dueDate").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("AUD"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    amountPaid: numeric("amountPaid", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    amountOutstanding: numeric("amountOutstanding", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    creditNoteAmount: numeric("creditNoteAmount", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    status: varchar("status", { length: 20 })
      .notNull()
      .default("awaiting_payment"),
    ageingBucket: varchar("ageingBucket", {
      length: 20,
      enum: ["Current", "1-30", "31-60", "61-90", "90+"],
    }),
    externalRef: varchar("externalRef", { length: 255 }).notNull(), // Xero invoice ID
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ar_invoice_user_id_idx").on(table.userId),
    contactIdIdx: index("ar_invoice_contact_id_idx").on(table.contactId),
    statusIdx: index("ar_invoice_status_idx").on(table.status),
    dueDateIdx: index("ar_invoice_due_date_idx").on(table.dueDate),
    externalRefIdx: index("ar_invoice_external_ref_idx").on(table.externalRef),
    externalRefUserIdUnique: uniqueIndex(
      "ar_invoice_external_ref_user_id_unique"
    ).on(table.externalRef, table.userId),
  })
);

export type ArInvoice = InferSelectModel<typeof arInvoice>;
export type ArInvoiceInsert = typeof arInvoice.$inferInsert;

export const arPayment = pgTable(
  "ArPayment",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    invoiceId: uuid("invoiceId")
      .notNull()
      .references(() => arInvoice.id, { onDelete: "cascade" }),
    contactId: uuid("contactId").references(() => arContact.id), // Denormalized for easier querying
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    paidAt: timestamp("paidAt").notNull(),
    method: varchar("method", { length: 50 }),
    reference: varchar("reference", { length: 255 }),
    externalRef: varchar("externalRef", { length: 255 }), // Xero payment ID
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    invoiceIdIdx: index("ar_payment_invoice_id_idx").on(table.invoiceId),
    contactIdIdx: index("ar_payment_contact_id_idx").on(table.contactId),
    paidAtIdx: index("ar_payment_paid_at_idx").on(table.paidAt),
    externalRefIdx: index("ar_payment_external_ref_idx").on(table.externalRef),
  })
);

export type ArPayment = InferSelectModel<typeof arPayment>;
export type ArPaymentInsert = typeof arPayment.$inferInsert;

export const arCustomerHistory = pgTable(
  "ArCustomerHistory",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    customerId: uuid("customerId")
      .notNull()
      .references(() => arContact.id, { onDelete: "cascade" }),
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull(),
    numInvoices: integer("numInvoices").notNull().default(0),
    numLatePayments: integer("numLatePayments").notNull().default(0),
    avgDaysLate: real("avgDaysLate").notNull().default(0),
    maxDaysLate: integer("maxDaysLate").notNull().default(0),
    percentInvoices90Plus: real("percentInvoices90Plus").notNull().default(0),
    totalOutstanding: numeric("totalOutstanding", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    maxInvoiceOutstanding: numeric("maxInvoiceOutstanding", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalBilledLast12Months: numeric("totalBilledLast12Months", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    lastPaymentDate: timestamp("lastPaymentDate"),
    creditTermsDays: integer("creditTermsDays").default(0),
    riskScore: real("riskScore").default(0),
    computedAt: timestamp("computedAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ar_customer_history_user_id_idx").on(table.userId),
    customerIdIdx: index("ar_customer_history_customer_id_idx").on(
      table.customerId
    ),
    computedAtIdx: index("ar_customer_history_computed_at_idx").on(
      table.computedAt
    ),
    userIdCustomerIdUnique: uniqueIndex(
      "ar_customer_history_user_id_customer_id_unique"
    ).on(table.userId, table.customerId),
  })
);

export type ArCustomerHistory = InferSelectModel<typeof arCustomerHistory>;
export type ArCustomerHistoryInsert = typeof arCustomerHistory.$inferInsert;

export const arReminder = pgTable(
  "ArReminder",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    invoiceId: uuid("invoiceId")
      .notNull()
      .references(() => arInvoice.id, { onDelete: "cascade" }),
    templateId: varchar("templateId", { length: 50 }).notNull(),
    tone: varchar("tone", { length: 20 }).notNull(), // polite, firm, final
    plannedAt: timestamp("plannedAt").notNull(),
    sent: boolean("sent").notNull().default(false),
    sentAt: timestamp("sentAt"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    invoiceIdIdx: index("ar_reminder_invoice_id_idx").on(table.invoiceId),
    plannedAtIdx: index("ar_reminder_planned_at_idx").on(table.plannedAt),
    sentIdx: index("ar_reminder_sent_idx").on(table.sent),
  })
);

export type ArReminder = InferSelectModel<typeof arReminder>;
export type ArReminderInsert = typeof arReminder.$inferInsert;

export const arJobRun = pgTable(
  "ArJobRun",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    startedAt: timestamp("startedAt").notNull().defaultNow(),
    completedAt: timestamp("completedAt"),
    status: varchar("status", { length: 20 }).notNull().default("running"), // running, success, failed
    customersProcessed: integer("customersProcessed").default(0),
    highRiskFlagged: integer("highRiskFlagged").default(0),
    errors:
      jsonb("errors").$type<Array<{ message: string; customerId?: string }>>(),
    stats: jsonb("stats").$type<{
      dso: number; // Days Sales Outstanding
      percentOver90Days: number;
      riskDistribution: { low: number; medium: number; high: number };
    }>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ar_job_run_user_id_idx").on(table.userId),
    statusIdx: index("ar_job_run_status_idx").on(table.status),
    startedAtIdx: index("ar_job_run_started_at_idx").on(table.startedAt),
  })
);

export type ArJobRun = InferSelectModel<typeof arJobRun>;
export type ArJobRunInsert = typeof arJobRun.$inferInsert;

export const arCommsArtefact = pgTable(
  "ArCommsArtefact",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    invoiceId: uuid("invoiceId")
      .notNull()
      .references(() => arInvoice.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 20 }).notNull(), // email, sms
    subject: text("subject"), // For email
    body: text("body").notNull(),
    tone: varchar("tone", { length: 20 }).notNull(), // polite, firm, final
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ar_comms_artefact_user_id_idx").on(table.userId),
    invoiceIdIdx: index("ar_comms_artefact_invoice_id_idx").on(table.invoiceId),
    channelIdx: index("ar_comms_artefact_channel_idx").on(table.channel),
    createdAtIdx: index("ar_comms_artefact_created_at_idx").on(table.createdAt),
  })
);

export type ArCommsArtefact = InferSelectModel<typeof arCommsArtefact>;
export type ArCommsArtefactInsert = typeof arCommsArtefact.$inferInsert;

export const arNote = pgTable(
  "ArNote",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    invoiceId: uuid("invoiceId")
      .notNull()
      .references(() => arInvoice.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    visibility: varchar("visibility", { length: 20 })
      .notNull()
      .default("private"), // private, shared
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    invoiceIdIdx: index("ar_note_invoice_id_idx").on(table.invoiceId),
    userIdIdx: index("ar_note_user_id_idx").on(table.userId),
  })
);

export type ArNote = InferSelectModel<typeof arNote>;
export type ArNoteInsert = typeof arNote.$inferInsert;

export const arCreditNote = pgTable(
  "ArCreditNote",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    contactId: uuid("contactId")
      .notNull()
      .references(() => arContact.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 50 }).notNull(),
    issueDate: timestamp("issueDate").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("AUD"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    amountAllocated: numeric("amountAllocated", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    amountRemaining: numeric("amountRemaining", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, authorised, paid, voided
    externalRef: varchar("externalRef", { length: 255 }).notNull(), // Xero credit note ID
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ar_credit_note_user_id_idx").on(table.userId),
    contactIdIdx: index("ar_credit_note_contact_id_idx").on(table.contactId),
    statusIdx: index("ar_credit_note_status_idx").on(table.status),
    issueDateIdx: index("ar_credit_note_issue_date_idx").on(table.issueDate),
    externalRefIdx: index("ar_credit_note_external_ref_idx").on(
      table.externalRef
    ),
    externalRefUserIdUnique: uniqueIndex(
      "ar_credit_note_external_ref_user_id_unique"
    ).on(table.externalRef, table.userId),
  })
);

export type ArCreditNote = InferSelectModel<typeof arCreditNote>;
export type ArCreditNoteInsert = typeof arCreditNote.$inferInsert;

// Follow-up Context Types
export type FollowUpTone = "polite" | "firm" | "final";

export type FollowUpContextData = {
  prompt: string;
  metadata: {
    customerId: string;
    customerName: string;
    totalOutstanding: number;
    riskScore: number;
    invoiceCount: number;
    followUpType: FollowUpTone;
  };
};

export const arFollowUpContext = pgTable(
  "ArFollowUpContext",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    contactId: uuid("contactId")
      .notNull()
      .references(() => arContact.id, { onDelete: "cascade" }),
    contextData: jsonb("contextData").$type<FollowUpContextData>().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userContactIdx: index("ar_followup_context_user_contact_idx").on(
      table.userId,
      table.contactId
    ),
    expiresAtIdx: index("ar_followup_context_expires_at_idx").on(
      table.expiresAt
    ),
  })
);

export type ArFollowUpContext = InferSelectModel<typeof arFollowUpContext>;
export type ArFollowUpContextInsert = typeof arFollowUpContext.$inferInsert;

export const arOverpayment = pgTable(
  "ArOverpayment",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    contactId: uuid("contactId")
      .notNull()
      .references(() => arContact.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 3 }).notNull().default("AUD"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    amountAllocated: numeric("amountAllocated", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    amountRemaining: numeric("amountRemaining", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    date: timestamp("date").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("authorised"),
    externalRef: varchar("externalRef", { length: 255 }).notNull(), // Xero OverpaymentID
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ar_overpayment_user_id_idx").on(table.userId),
    contactIdIdx: index("ar_overpayment_contact_id_idx").on(table.contactId),
    externalRefIdx: index("ar_overpayment_external_ref_idx").on(
      table.externalRef
    ),
    externalRefUserIdUnique: uniqueIndex(
      "ar_overpayment_external_ref_user_id_unique"
    ).on(table.externalRef, table.userId),
  })
);

export type ArOverpayment = InferSelectModel<typeof arOverpayment>;
export type ArOverpaymentInsert = typeof arOverpayment.$inferInsert;

export const arPrepayment = pgTable(
  "ArPrepayment",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    contactId: uuid("contactId")
      .notNull()
      .references(() => arContact.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 3 }).notNull().default("AUD"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    amountAllocated: numeric("amountAllocated", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    amountRemaining: numeric("amountRemaining", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    date: timestamp("date").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("authorised"),
    externalRef: varchar("externalRef", { length: 255 }).notNull(), // Xero PrepaymentID
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ar_prepayment_user_id_idx").on(table.userId),
    contactIdIdx: index("ar_prepayment_contact_id_idx").on(table.contactId),
    externalRefIdx: index("ar_prepayment_external_ref_idx").on(
      table.externalRef
    ),
    externalRefUserIdUnique: uniqueIndex(
      "ar_prepayment_external_ref_user_id_unique"
    ).on(table.externalRef, table.userId),
  })
);

export type ArPrepayment = InferSelectModel<typeof arPrepayment>;
export type ArPrepaymentInsert = typeof arPrepayment.$inferInsert;
