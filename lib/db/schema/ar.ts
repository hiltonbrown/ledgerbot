import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
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
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
    status: varchar("status", { length: 20 })
      .notNull()
      .default("awaiting_payment"),
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
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    paidAt: timestamp("paidAt").notNull(),
    method: varchar("method", { length: 50 }),
    reference: varchar("reference", { length: 255 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    invoiceIdIdx: index("ar_payment_invoice_id_idx").on(table.invoiceId),
    paidAtIdx: index("ar_payment_paid_at_idx").on(table.paidAt),
  })
);

export type ArPayment = InferSelectModel<typeof arPayment>;
export type ArPaymentInsert = typeof arPayment.$inferInsert;

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

export const arCommsArtefact = pgTable(
  "ArCommsArtefact",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
